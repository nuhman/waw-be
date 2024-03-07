import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { nanoid } from "nanoid";
import { hashPassword, matchPassword } from "../utilities/auth.utitily.js";
import { ERROR_CODES } from "../utilities/consts/error.const.js";
import {
  RegisterUserInput,
  LoginUserInput,
  UserCompleteSchema,
} from "../schemas/auth.schema.js";

// Factory function pattern used for dependency injection of fastify plugins (e.g., fastify.pg)
export const authControllerFactory = (fastify: FastifyInstance) => {
  return {
    handleUserSignup: async (
      request: FastifyRequest<{ Body: RegisterUserInput }>,
      reply: FastifyReply
    ) => {
      const { name, email, password } = request.body;

      // check whether the email already exists in db
      const userExistCheck = await fastify.pg.query(
        "SELECT 1 FROM users WHERE email = $1 LIMIT 1",
        [email]
      );
      if ((userExistCheck?.rowCount || 0) > 0) {
        const { CODE, MESSAGE } = ERROR_CODES.AUTH.SIGNUP.DUPLICATE_EMAIL;
        return reply.code(409).send({
          errorCode: CODE,
          errorMessage: MESSAGE,
        });
      }

      const userid = nanoid();
      const createdAt = new Date().toISOString();
      const role = ["user"];
      const hashedPassword = await hashPassword(password);

      const query = {
        text: `INSERT INTO users (userid, name, email, passwordhash, created_at, updated_at, role, last_logout_at)
                        VALUES($1, $2, $3, $4, $5, $6, $7, $8)`,
        values: [
          userid,
          name,
          email,
          hashedPassword,
          createdAt,
          createdAt,
          role,
          null,
        ],
      };
      try {
        await fastify.pg.query(query);
        reply.code(201);
        return {
          userid,
          name,
          email,
          role,
        };
      } catch (err) {
        const { CODE, MESSAGE } = ERROR_CODES.AUTH.SIGNUP.SERVER_ERROR;
        fastify.log.error(MESSAGE, err);
        return reply.code(500).send({
          errorCode: CODE,
          errorMessage: MESSAGE,
        });
      }
    },
    handleGetAllUsers: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { rows } = await fastify.pg.query("SELECT * FROM users");
        return rows;
      } catch (err) {
        const { CODE, MESSAGE } = ERROR_CODES.AUTH.USER.FETCH_ALL_USERS;
        fastify.log.error(MESSAGE, err);
        return reply.code(500).send({
          errorCode: CODE,
          errorMessage: MESSAGE,
        });
      }
    },
    handleUserLogin: async (
      request: FastifyRequest<{ Body: LoginUserInput }>,
      reply: FastifyReply
    ) => {
      try {
        const { email, password } = request.body  as LoginUserInput;
        // Attempt to retrieve the user by email
        const userQuery = await fastify.pg.query(
          "SELECT * FROM users WHERE email = $1 LIMIT 1",
          [email]
        );
        if (userQuery.rowCount === 0) {
          const { CODE, MESSAGE } = ERROR_CODES.AUTH.LOGIN.EMAIL_NOT_EXIST;
          return reply.code(401).send({
            errorCode: CODE,
            errorMessage: MESSAGE,
          });
        }
        const user: UserCompleteSchema = userQuery.rows[0];

        // Verify the password
        const match = await matchPassword(password, user.passwordhash);
        if (!match) {
          const { CODE, MESSAGE } = ERROR_CODES.AUTH.LOGIN.PASSWORD_NOT_MATCH;
          return reply.code(401).send({
            errorCode: CODE,
            errorMessage: MESSAGE,
          });
        }

        const accessToken = await fastify.jwt.sign(
          {
            userid: user.userid,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          { expiresIn: "24h" }
        );

        const isLocalEnv = process.env.APP_ENV === "local";

        reply.setCookie("access_token", accessToken, {
          path: "/",
          httpOnly: !isLocalEnv,
          secure: !isLocalEnv,
          sameSite: "strict",
        });

        return reply.code(200).send({ accessToken });
      } catch (err) {
        const { CODE, MESSAGE } = ERROR_CODES.AUTH.LOGIN.SERVER_ERROR;
        fastify.log.error(MESSAGE, err);
        return reply.code(500).send({
          errorCode: CODE,
          errorMessage: MESSAGE,
        });
      }
    },
    handleUserLogout: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user;

        // update last_logout_at column value for the user
        await fastify.pg.query(
          "UPDATE users SET last_logout_at = $1 WHERE userid = $2",
          [new Date().toISOString(), user.userid]
        );

        // clear the access token cookie
        const isLocalEnv = process.env.APP_ENV === "local";
        reply.clearCookie("access_token", {
          path: "/",
          httpOnly: !isLocalEnv,
          secure: !isLocalEnv,
          sameSite: "strict",
        });
        return reply.code(200).send({ message: "user logged out!" });
      } catch (err) {
        fastify.log.error("Logout Error: ", err);
        return reply.code(500).send({
          errorCode: "LOGOUT_ERROR",
          errorMessage: "Failed to log out.",
        });
      }
    },
  };
};

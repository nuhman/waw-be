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
        text: `INSERT INTO users (userid, name, email, passwordhash, created_at, updated_at, role)
                        VALUES($1, $2, $3, $4, $5, $6, $7 )`,
        values: [
          userid,
          name,
          email,
          hashedPassword,
          createdAt,
          createdAt,
          role,
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
        const { email, password } = request.body;
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

        const accessToken = fastify.jwt.sign(
          {
            userid: user.userid,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          { expiresIn: "1h" }
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
  };
};

import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { nanoid } from "nanoid";
import { hashPassword, matchPassword } from "../utilities/auth.utitily.js";
import { ERROR_CODES } from "../utilities/consts/error.const.js";
import { GLOBAL, MESSAGES } from "../utilities/consts/app.const.js";
import {
  RegisterUserInput,
  LoginUserInput,
  UserCompleteSchema,
} from "../schemas/auth.schema.js";

/**
 * Creates auth-related route handlers with dependency injected fastify instance.
 * Factory function pattern used for dependency injection of fastify plugins (e.g., fastify.pg)
 *
 * @param {FastifyInstance} fastify - Fastify instance for accessing plugins and utilities.
 * @returns Object containing route handler functions.
 */
export const authControllerFactory = (fastify: FastifyInstance) => {
  return {
    // Handles user registration.
    handleUserSignup: async (
      request: FastifyRequest<{ Body: RegisterUserInput }>,
      reply: FastifyReply
    ) => {
      const { name, email, password } = request.body;

      // Checks for existing user by email.
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

      // New user registration logic.
      const userid = nanoid();
      const createdAt = new Date().toISOString();
      const role = [GLOBAL.userRole];
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
    // Handles fetching all registered users.
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
    // Handles authenticating a registered user via email and password
    handleUserLogin: async (
      request: FastifyRequest<{ Body: LoginUserInput }>,
      reply: FastifyReply
    ) => {
      try {
        const { email, password } = request.body as LoginUserInput;
        // Attempt to retrieve the user by email
        const userQuery = await fastify.pg.query(
          "SELECT * FROM users WHERE email = $1 LIMIT 1",
          [email]
        );

        // if no user with the given email is found, return error
        if (userQuery.rowCount === 0) {
          const { CODE, MESSAGE } = ERROR_CODES.AUTH.LOGIN.EMAIL_NOT_EXIST;
          return reply.code(401).send({
            errorCode: CODE,
            errorMessage: MESSAGE,
          });
        }
        const user: UserCompleteSchema = userQuery.rows[0];

        // verify the password using bcrypt
        const match = await matchPassword(password, user.passwordhash);
        // if wrong password was given, return error
        if (!match) {
          const { CODE, MESSAGE } = ERROR_CODES.AUTH.LOGIN.PASSWORD_NOT_MATCH;
          return reply.code(401).send({
            errorCode: CODE,
            errorMessage: MESSAGE,
          });
        }

        // sign the jwt token using the below payload. This payload can be retrieved later via `jwt.verify`
        const accessToken = await fastify.jwt.sign(
          {
            userid: user.userid,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          { expiresIn: GLOBAL.authCookie.expiry }
        );

        const isLocalEnv = process.env.APP_ENV === GLOBAL.appEnv.local;

        // set the jwt token in the client cookie for proper future access
        reply.setCookie(GLOBAL.authCookie.name, accessToken, {
          path: GLOBAL.authCookie.path,
          httpOnly: !isLocalEnv, // apply httpOnly if env is not local
          secure: !isLocalEnv, // apply secure if env is not local
          sameSite: GLOBAL.authCookie.sameSite as
            | boolean
            | "strict"
            | "lax"
            | "none"
            | undefined,
        });

        // login was successful, send back the jwt token in response
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
    // handles logging out an already logged in user.
    handleUserLogout: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // request contains user info - it was added via `authenticate` decorator
        const user = request.user;

        // update last_logout_at column value for the given user
        await fastify.pg.query(
          "UPDATE users SET last_logout_at = $1 WHERE userid = $2",
          [new Date().toISOString(), user.userid]
        );

        // clear the access token cookie
        const isLocalEnv = process.env.APP_ENV === GLOBAL.appEnv.local;
        reply.clearCookie(GLOBAL.authCookie.name, {
          path: GLOBAL.authCookie.path,
          httpOnly: !isLocalEnv,
          secure: !isLocalEnv,
          sameSite: GLOBAL.authCookie.sameSite as
            | boolean
            | "strict"
            | "lax"
            | "none"
            | undefined,
        });

        // log out was successful
        return reply.code(200).send(MESSAGES.logoutSuccess);
      } catch (err) {
        const { CODE, MESSAGE } = ERROR_CODES.AUTH.LOGIN.LOGOUT_ERROR;
        return reply.code(500).send({
          errorCode: CODE,
          errorMessage: MESSAGE,
        });
      }
    },
  };
};

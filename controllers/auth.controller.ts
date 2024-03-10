import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { nanoid } from "nanoid";
import { Transporter } from "nodemailer";
import logger from "../utilities/logger.js";
import { hashPassword, matchPassword } from "../utilities/auth.utitily.js";
import { sendEmail, formatEmailOptions } from "../utilities/email.utility.js";
import { generateShortId } from "../utilities/app.utility.js";
import { ERROR_CODES } from "../utilities/consts/error.const.js";
import { GLOBAL, MESSAGES } from "../utilities/consts/app.const.js";
import {
  RegisterUserInput,
  LoginUserInput,
  UserCompleteSchema,
  EmailVerificationInput,
  EmailVerificationResetInput,
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
      const requestId: string = generateShortId();
      const { name, email, password } = request.body;
      logger.info({
        handler: "handleUserSignup",
        requestId,
        email,
        timestamp: new Date().toISOString(),
      });

      // Checks for existing user by email.
      const userExistCheck = await fastify.pg.query(
        "SELECT 1 FROM users WHERE email = $1 LIMIT 1",
        [email]
      );
      if ((userExistCheck?.rowCount || 0) > 0) {
        const { CODE, MESSAGE } = ERROR_CODES.AUTH.SIGNUP.DUPLICATE_EMAIL;
        logger.warn({
          requestId,
          msg: MESSAGE,
          timestamp: new Date().toISOString(),
        });
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

      const userQuery = {
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

      // email verification
      const emailToken = generateShortId();
      const tokenValidMinutes = process.env.TOKEN_EXPIRY_MINUTES ?? 1;
      const expiryMinutes = Number(tokenValidMinutes) * 60 * 1000;
      const emailTokenExpiryAt = new Date(
        new Date().getTime() + expiryMinutes
      ).toISOString();

      const emailVerificationQuery = {
        text: `INSERT INTO user_verification (userid, email_token, email_token_expires_at, email_verified_status, phonenumber_token, phonenumber_token_expires_at, phonenumber_verified_status)
        VALUES($1, $2, $3, $4, $5, $6, $7)`,
        values: [
          userid,
          emailToken,
          emailTokenExpiryAt,
          false,
          emailToken,
          emailTokenExpiryAt,
          false,
        ],
      };

      try {
        const transporter: Transporter<any> | null =
          await fastify.emailTransport;

        if (!transporter) {
          const { CODE, MESSAGE } =
            ERROR_CODES.AUTH.SIGNUP.EMAIL_TRANSPORTER_FAILURE;
          logger.warn({
            requestId,
            msg: MESSAGE,
            timestamp: new Date().toISOString(),
          });
          return reply.code(500).send({
            errorCode: CODE,
            errorMessage: MESSAGE,
          });
        }

        const emailOptions = formatEmailOptions({
          receipentEmail: email,
          receipentName: name,
          key: "ev",
          additionalInfo: {
            emailToken,
          },
        });

        // Use the shared sendEmail function
        await sendEmail(transporter, emailOptions);

        logger.info({
          requestId,
          msg: MESSAGES.sendEmailVerificationCode,
        });

        await fastify.pg.query(userQuery);
        logger.info({
          requestId,
          msg: MESSAGES.userRecordsAdded,
        });

        await fastify.pg.query(emailVerificationQuery);
        logger.info({
          requestId,
          msg: MESSAGES.userVerificationRecordsAdded,
        });

        logger.info({
          requestId,
          msg: MESSAGES.executionCompleted,
          timestamp: new Date().toISOString(),
        });

        reply.code(201);
        return {
          userid,
          name,
          email,
          role,
        };
      } catch (err) {
        const { CODE, MESSAGE } = ERROR_CODES.AUTH.SIGNUP.SERVER_ERROR;
        logger.error({
          requestId,
          err,
          timestamp: new Date().toISOString(),
        });
        return reply.code(500).send({
          errorCode: CODE,
          errorMessage: MESSAGE,
        });
      }
    },
    // Handles fetching all registered users.
    handleGetAllUsers: async (request: FastifyRequest, reply: FastifyReply) => {
      const requestId: string = generateShortId();
      try {
        logger.info({
          handler: "handleGetAllUsers",
          requestId,
          timestamp: new Date().toISOString(),
        });

        const { rows } = await fastify.pg.query("SELECT * FROM users");
        logger.info({
          requestId,
          msg: MESSAGES.executionCompleted,
          timestamp: new Date().toISOString(),
        });
        return rows;
      } catch (err) {
        logger.error({
          requestId,
          err,
          timestamp: new Date().toISOString(),
        });
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
      const requestId: string = generateShortId();
      try {
        const { email, password } = request.body as LoginUserInput;

        logger.info({
          handler: "handleUserLogin",
          requestId,
          email,
          timestamp: new Date().toISOString(),
        });

        // Attempt to retrieve the user by email
        const userQuery = await fastify.pg.query(
          "SELECT * FROM users WHERE email = $1 LIMIT 1",
          [email]
        );

        // if no user with the given email is found, return error
        if (userQuery.rowCount === 0) {
          const { CODE, MESSAGE } = ERROR_CODES.AUTH.LOGIN.EMAIL_NOT_EXIST;
          logger.warn({
            requestId,
            msg: MESSAGE,
            timestamp: new Date().toISOString(),
          });
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
          logger.warn({
            requestId,
            msg: MESSAGE,
            timestamp: new Date().toISOString(),
          });
          return reply.code(401).send({
            errorCode: CODE,
            errorMessage: MESSAGE,
          });
        }

        // now check if user's email is verified or not
        const userVerificationQuery = await fastify.pg.query(
          "SELECT email_verified_status FROM user_verification WHERE userid = $1 LIMIT 1",
          [user.userid]
        );        
        
        // user verification is not completed, so return error
        if (
          userVerificationQuery.rowCount === 0 ||
          !userVerificationQuery.rows[0].email_verified_status
        ) {
          const { CODE, MESSAGE } = ERROR_CODES.AUTH.LOGIN.EMAIL_NOT_VERIFIED;
          logger.warn({
            requestId,
            msg: MESSAGE,
            timestamp: new Date().toISOString(),
          });
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
        logger.error({
          requestId,
          err,
          timestamp: new Date().toISOString(),
        });
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
      const requestId: string = generateShortId();

      try {
        // request contains user info - it was added via `authenticate` decorator
        const user = request.user;
        logger.info({
          handler: "handleUserLogout",
          requestId,
          userid: user.userid,
          timestamp: new Date().toISOString(),
        });

        // update last_logout_at column value for the given user
        await fastify.pg.query(
          "UPDATE users SET last_logout_at = $1 WHERE userid = $2",
          [new Date().toISOString(), user.userid]
        );

        logger.info({
          requestId,
          msg: MESSAGES.lastLogoutUpdated,
        });

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
        logger.info({
          requestId,
          msg: MESSAGES.executionCompleted,
          timestamp: new Date().toISOString(),
        });

        return reply.code(200).send(MESSAGES.logoutSuccess);
      } catch (err) {
        logger.error({
          requestId,
          err,
          timestamp: new Date().toISOString(),
        });

        const { CODE, MESSAGE } = ERROR_CODES.AUTH.LOGIN.LOGOUT_ERROR;
        return reply.code(500).send({
          errorCode: CODE,
          errorMessage: MESSAGE,
        });
      }
    },
    handleUserEmailVerify: async (
      request: FastifyRequest<{ Body: EmailVerificationInput }>,
      reply: FastifyReply
    ) => {
      const requestId: string = generateShortId();

      try {
        const { userid, verificationCode } = request.body;
        logger.info({
          handler: "handleUserEmailVerify",
          requestId,
          userid,
          timestamp: new Date().toISOString(),
        });

        // Check if the code matches and is not expired
        const res = await fastify.pg.query(
          "SELECT 1 FROM user_verification WHERE userid = $1 AND email_token = $2 AND email_token_expires_at > NOW()",
          [userid, verificationCode]
        );

        // code is valid
        if (res?.rowCount && res.rowCount > 0) {
          // so, update email_verified status to true
          await fastify.pg.query(
            "UPDATE user_verification SET email_verified_status = true WHERE userid = $1",
            [userid]
          );

          logger.info({
            requestId,
            msg: MESSAGES.emailVerifySuccess.message,
            timestamp: new Date().toISOString(),
          });

          return reply.code(200).send(MESSAGES.emailVerifySuccess);
        }

        logger.warn({
          requestId,
          msg: ERROR_CODES.AUTH.LOGIN.EMAIL_VERIFY_FAILURE.MESSAGE,
          timestamp: new Date().toISOString(),
        });

        return reply.code(401).send({
          errorCode: ERROR_CODES.AUTH.LOGIN.EMAIL_VERIFY_FAILURE.CODE,
          errorMessage: ERROR_CODES.AUTH.LOGIN.EMAIL_VERIFY_FAILURE.MESSAGE,
        });
      } catch (err) {
        logger.warn({
          requestId,
          err,
          timestamp: new Date().toISOString(),
        });
        const { CODE, MESSAGE } = ERROR_CODES.AUTH.SIGNUP.SERVER_ERROR;
        return reply.code(500).send({
          errorCode: CODE,
          errorMessage: MESSAGE,
        });
      }
    },
    handleUserEmailVerifyReset: async (
      request: FastifyRequest<{ Body: EmailVerificationResetInput }>,
      reply: FastifyReply
    ) => {
      const requestId: string = generateShortId();

      try {
        const { userid } = request.body;
        logger.info({
          handler: "handleUserEmailVerifyReset",
          requestId,
          userid,
          timestamp: new Date().toISOString(),
        });

        const emailToken = generateShortId();
        const tokenValidMinutes = process.env.TOKEN_EXPIRY_MINUTES ?? 1;
        console.log(
          "tokenValidMinutes: ",
          tokenValidMinutes,
          process.env.TOKEN_EXPIRY_MINUTES
        );
        const expiryMinutes = Number(tokenValidMinutes) * 60 * 1000;
        const emailTokenExpiryAt = new Date(
          new Date().getTime() + expiryMinutes
        ).toISOString();

        const emailVerificationQuery = {
          text: `UPDATE user_verification SET email_token = $1, email_token_expires_at = $2, email_verified_status = $3 WHERE userid = $4`,
          values: [emailToken, emailTokenExpiryAt, false, userid],
        };

        const transporter: Transporter<any> | null =
          await fastify.emailTransport;

        if (!transporter) {
          const { CODE, MESSAGE } =
            ERROR_CODES.AUTH.SIGNUP.EMAIL_TRANSPORTER_FAILURE;
          logger.warn({
            requestId,
            msg: MESSAGE,
            timestamp: new Date().toISOString(),
          });
          return reply.code(500).send({
            errorCode: CODE,
            errorMessage: MESSAGE,
          });
        }

        const email = await fetchEmailByUserId(fastify, userid);

        const emailOptions = formatEmailOptions({
          receipentEmail: email,
          receipentName: email,
          key: "ev",
          additionalInfo: {
            emailToken,
          },
        });

        await sendEmail(transporter, emailOptions);

        logger.info({
          requestId,
          msg: MESSAGES.sendEmailVerificationCode,
        });

        await fastify.pg.query(emailVerificationQuery);
        logger.info({
          requestId,
          msg: MESSAGES.emailtokenRegenerated,
          timestamp: new Date().toISOString(),
        });

        return reply.code(200).send(MESSAGES.emailVerifyCodeReset);
      } catch (err) {
        logger.info({
          requestId,
          err,
          timestamp: new Date().toISOString(),
        });
        const { CODE, MESSAGE } = ERROR_CODES.AUTH.SIGNUP.SERVER_ERROR;
        return reply.code(500).send({
          errorCode: CODE,
          errorMessage: MESSAGE,
        });
      }
    },
  };
};

const fetchEmailByUserId = async (
  fastify: FastifyInstance,
  userid: string
): Promise<string> => {
  try {
    const query = await fastify.pg.query(
      "SELECT email FROM users WHERE userid = $1 LIMIT 1",
      [userid]
    );

    // if no user with the given userid is found, return null
    if (query.rowCount === 0) {
      return "";
    }
    return query.rows[0].email;
  } catch {
    return "";
  }
};

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
  UserUpdateSchema,
  UserEmailUpdateInitSchema,
  PasswordResetInitReqSchema,
  PasswordResetVerifySchema,
  PasswordChangeSchema,
} from "../schemas/auth.schema.js";
import {
  addNewUser,
  checkUserExistsByEmail,
} from "../utilities/db/auth.utility.js";
import {
  mailConflictError,
  serverError,
} from "../utilities/error/auth.utility.js";

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

      try {
        const { email } = request.body;

        logger.info(requestId, {
          handler: "handleUserSignup",
          requestId,
          email,
          timestamp: new Date().toISOString(),
        });

        // Checks for existing user by email.
        const userExistCheck = await checkUserExistsByEmail(fastify, email);

        // if error, return conflict error
        if (userExistCheck) {
          return mailConflictError(reply, requestId);
        }

        // if no errors, add the user
        return addNewUser(fastify, reply, requestId, request.body);
      } catch (err) {
        return serverError(
          reply,
          requestId,
          ERROR_CODES.AUTH.SIGNUP.SERVER_ERROR
        );
      }
    },
    // Handles fetching all registered users.
    handleGetAllUsers: async (request: FastifyRequest, reply: FastifyReply) => {
      const requestId: string = generateShortId();
      try {
        logger.info(requestId, {
          handler: "handleGetAllUsers",
          requestId,
          timestamp: new Date().toISOString(),
        });

        const { rows } = await fastify.pg.query("SELECT * FROM users");
        logger.info(requestId, {
          requestId,
          msg: MESSAGES.executionCompleted,
          timestamp: new Date().toISOString(),
        });
        return rows;
      } catch (err) {
        logger.error(requestId, {
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

        logger.info(requestId, {
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
          logger.warn(requestId, {
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
          logger.warn(requestId, {
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
          logger.warn(requestId, {
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
        logger.error(requestId, {
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
        logger.info(requestId, {
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

        logger.info(requestId, {
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
        logger.info(requestId, {
          requestId,
          msg: MESSAGES.executionCompleted,
          timestamp: new Date().toISOString(),
        });

        return reply.code(200).send(MESSAGES.logoutSuccess);
      } catch (err) {
        logger.error(requestId, {
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
        logger.info(requestId, {
          handler: "handleUserEmailVerify",
          requestId,
          userid,
          timestamp: new Date().toISOString(),
        });

        // Check if the code matches and is not expired
        const res = await fastify.pg.query(
          "SELECT 1 FROM user_verification WHERE userid = $1 AND email_token = $2 AND email_token_expires_at > NOW() LIMIT 1",
          [userid, verificationCode]
        );
        // code is valid
        if (res?.rowCount && res.rowCount > 0) {
          // so, update email_verified status to true
          await fastify.pg.query(
            "UPDATE user_verification SET email_verified_status = true WHERE userid = $1",
            [userid]
          );

          logger.info(requestId, {
            requestId,
            msg: MESSAGES.emailVerifySuccess.message,
            timestamp: new Date().toISOString(),
          });

          return reply.code(200).send(MESSAGES.emailVerifySuccess);
        }

        logger.warn(requestId, {
          requestId,
          msg: ERROR_CODES.AUTH.LOGIN.EMAIL_VERIFY_FAILURE.MESSAGE,
          timestamp: new Date().toISOString(),
        });

        return reply.code(401).send({
          errorCode: ERROR_CODES.AUTH.LOGIN.EMAIL_VERIFY_FAILURE.CODE,
          errorMessage: ERROR_CODES.AUTH.LOGIN.EMAIL_VERIFY_FAILURE.MESSAGE,
        });
      } catch (err) {
        logger.warn(requestId, {
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
        logger.info(requestId, {
          handler: "handleUserEmailVerifyReset",
          requestId,
          userid,
          timestamp: new Date().toISOString(),
        });

        const emailToken = generateShortId();
        const tokenValidMinutes = process.env.TOKEN_EXPIRY_MINUTES ?? 1;
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
          logger.warn(requestId, {
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

        if (process.env.APP_ENV !== GLOBAL.appEnv.test) {
          await sendEmail(transporter, emailOptions);
          logger.info(requestId, {
            requestId,
            msg: MESSAGES.sendEmailVerificationCode,
          });
        }

        await fastify.pg.query(emailVerificationQuery);
        logger.info(requestId, {
          requestId,
          msg: MESSAGES.emailtokenRegenerated,
          timestamp: new Date().toISOString(),
        });

        return reply.code(200).send(MESSAGES.emailVerifyCodeReset);
      } catch (err) {
        logger.info(requestId, {
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
    handleUserBasicUpdate: async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const requestId: string = generateShortId();
      try {
        const user = request.user;
        const updateFields = request.body as UserUpdateSchema; // Fields to update

        logger.info(requestId, {
          handler: "handleUserBasicUpdate",
          requestId,
          userid: user.userid,
          updateFields,
          timestamp: new Date().toISOString(),
        });

        // Construct the update query dynamically based on provided fields
        const setClauses: Array<string> = [];
        const values: Array<string | string[] | undefined> = [];

        Object.keys(updateFields).forEach((key: string, index: number) => {
          const value: string | string[] | undefined =
            updateFields[key as keyof typeof updateFields];
          if (value !== undefined) {
            setClauses.push(`${key} = $${index + 1}`);
            values.push(value);
          }
        });

        // No fields provided to update
        if (setClauses.length === 0) {
          logger.warn(requestId, {
            requestId,
            msg: MESSAGES.noUpdateFields,
            timestamp: new Date().toISOString(),
          });
          return reply.code(400).send(MESSAGES.noUpdateFields);
        }

        const queryText = `UPDATE users SET ${setClauses.join(
          ", "
        )}, updated_at = $${setClauses.length + 1} WHERE userid = $${
          setClauses.length + 2
        } RETURNING userid, name, email, role`;
        values.push(new Date().toISOString());
        values.push(user.userid);

        const res = await fastify.pg.query({
          text: queryText,
          values,
        });

        // log out was successful
        logger.info(requestId, {
          requestId,
          msg: MESSAGES.executionCompleted,
          timestamp: new Date().toISOString(),
        });

        return reply.code(200).send(res.rows[0]);
      } catch (err) {
        logger.error(requestId, {
          requestId,
          err,
          timestamp: new Date().toISOString(),
        });

        const { CODE, MESSAGE } = ERROR_CODES.AUTH.USER.UPDATE.SERVER_ERROR;
        return reply.code(500).send({
          errorCode: CODE,
          errorMessage: MESSAGE,
        });
      }
    },
    handleUserPasswordUpdate: async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const requestId: string = generateShortId();
      try {
        const user = request.user;
        const updateFields = request.body as UserUpdateSchema; // Fields to update

        logger.info(requestId, {
          handler: "handleUserPasswordUpdate",
          requestId,
          userid: user.userid,
          timestamp: new Date().toISOString(),
        });

        if (!(updateFields.password && updateFields.new_password)) {
          logger.warn(requestId, {
            requestId,
            msg: MESSAGES.passwordChangeFieldsRequired,
            timestamp: new Date().toISOString(),
          });
          return reply.code(400).send(MESSAGES.passwordChangeFieldsRequired);
        }

        // get userdetails to fetch the current passwordhash of the user
        const currentUser: UserCompleteSchema | null = await fetchUseryUserId(
          fastify,
          user.userid
        );

        if (!currentUser) {
          logger.warn(requestId, {
            requestId,
            msg: MESSAGES.userRecordNotExist,
            timestamp: new Date().toISOString(),
          });
          return reply.code(400).send(MESSAGES.userRecordNotExist);
        }

        const passwordIsValid = await matchPassword(
          updateFields.password || "",
          currentUser.passwordhash
        );
        if (!passwordIsValid) {
          logger.warn(requestId, {
            requestId,
            msg: MESSAGES.currentPwdIncorrect,
            timestamp: new Date().toISOString(),
          });
          return reply.code(400).send(MESSAGES.currentPwdIncorrect);
        }

        // Hash new password
        const hashedNewPassword = await hashPassword(
          updateFields.new_password || ""
        );

        await fastify.pg.query(
          "UPDATE users SET passwordhash = $1, updated_at = $2 WHERE userid = $3",
          [hashedNewPassword, new Date().toISOString(), user.userid]
        );

        logger.info(requestId, {
          requestId,
          userid: user.userid,
          msg: "User Password Changed",
          timestamp: new Date().toISOString(),
        });

        await fastify.pg.query(
          "UPDATE users SET last_logout_at = $1 WHERE userid = $2",
          [new Date().toISOString(), user.userid]
        );

        logger.info(requestId, {
          requestId,
          userid: user.userid,
          msg: "User log out data updated",
          timestamp: new Date().toISOString(),
        });

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
        logger.info(requestId, {
          requestId,
          msg: MESSAGES.executionCompleted,
          timestamp: new Date().toISOString(),
        });

        return reply.code(200).send(MESSAGES.userUpdateSuccess);
      } catch (err) {
        logger.error(requestId, {
          requestId,
          err,
          timestamp: new Date().toISOString(),
        });

        const { CODE, MESSAGE } = ERROR_CODES.AUTH.USER.UPDATE.SERVER_ERROR;
        return reply.code(500).send({
          errorCode: CODE,
          errorMessage: MESSAGE,
        });
      }
    },
    handleUserEmailUpdateInit: async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const requestId: string = generateShortId();
      try {
        const user = request.user;
        const updateFields = request.body as UserEmailUpdateInitSchema; // Fields to update

        logger.info(requestId, {
          handler: "handleUserEmailUpdateInit",
          requestId,
          userid: user.userid,
          updateFields,
          timestamp: new Date().toISOString(),
        });

        // make sure new_email is not already present in the system
        const newEmailCheck: UserCompleteSchema | null = await fetchUserByEmail(
          fastify,
          updateFields.new_email
        );

        // if new mail is already present, return error
        if (newEmailCheck) {
          const { MESSAGE } = ERROR_CODES.AUTH.SIGNUP.DUPLICATE_EMAIL;
          logger.warn(requestId, {
            requestId,
            msg: MESSAGE,
            timestamp: new Date().toISOString(),
          });
          return reply.code(400).send({
            message: MESSAGE,
          });
        }

        const emailToken = generateShortId();
        const tokenValidMinutes = process.env.TOKEN_EXPIRY_MINUTES ?? 1;
        const expiryMinutes = Number(tokenValidMinutes) * 60 * 1000;
        const emailTokenExpiryAt = new Date(
          new Date().getTime() + expiryMinutes
        ).toISOString();

        await fastify.pg.query("DELETE FROM emails WHERE userid = $1", [
          user.userid,
        ]);

        const newEmailQuery = {
          text: `INSERT INTO emails (userid, current_email, new_email, email_token, email_token_expires_at, new_mail_verified)
          VALUES($1, $2, $3, $4, $5, $6)`,
          values: [
            user.userid,
            user.email,
            updateFields.new_email,
            emailToken,
            emailTokenExpiryAt,
            false,
          ],
        };

        const transporter: Transporter<any> | null =
          await fastify.emailTransport;

        if (!transporter) {
          const { CODE, MESSAGE } =
            ERROR_CODES.AUTH.SIGNUP.EMAIL_TRANSPORTER_FAILURE;
          logger.warn(requestId, {
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
          receipentEmail: updateFields.new_email,
          receipentName: user.name,
          key: "ev",
          additionalInfo: {
            emailToken,
          },
        });

        // Send mail if it's not a test environment
        if (process.env.APP_ENV !== GLOBAL.appEnv.test) {
          await sendEmail(transporter, emailOptions);
          logger.info(requestId, {
            requestId,
            msg: MESSAGES.sendEmailVerificationCode,
          });
        }

        await fastify.pg.query(newEmailQuery);

        logger.info(requestId, {
          requestId,
          userid: user.userid,
          msg: MESSAGES.emailTempUpdateSuccess,
          timestamp: new Date().toISOString(),
        });

        return reply.code(200).send(MESSAGES.emailTempUpdateSuccess);
      } catch (err) {
        logger.error(requestId, {
          requestId,
          err,
          timestamp: new Date().toISOString(),
        });

        const { CODE, MESSAGE } = ERROR_CODES.AUTH.USER.UPDATE.SERVER_ERROR;
        return reply.code(500).send({
          errorCode: CODE,
          errorMessage: MESSAGE,
        });
      }
    },
    handleUserEmailUpdateVerify: async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const requestId: string = generateShortId();
      try {
        const user = request.user;
        const { verificationCode } = request.body as EmailVerificationInput;
        logger.info(requestId, {
          handler: "handleUserEmailVerify",
          requestId,
          userid: user.userid,
          timestamp: new Date().toISOString(),
        });

        // Check if the code matches and is not expired
        const res = await fastify.pg.query(
          "SELECT 1 FROM emails WHERE userid = $1 AND email_token = $2 AND email_token_expires_at > NOW() LIMIT 1",
          [user.userid, verificationCode]
        );

        // code is valid
        if (res?.rowCount && res.rowCount > 0) {
          // so, update email_verified status to true
          const newEmailRow = await fastify.pg.query(
            "UPDATE emails SET new_mail_verified = true WHERE userid = $1 RETURNING new_email",
            [user.userid]
          );

          await fastify.pg.query(
            "UPDATE users SET email = $1, updated_at = $2 WHERE userid = $3",
            [
              newEmailRow.rows[0].new_email,
              new Date().toISOString(),
              user.userid,
            ]
          );

          logger.info(requestId, {
            requestId,
            msg: MESSAGES.emailVerifySuccess.message,
            timestamp: new Date().toISOString(),
          });

          return reply.code(200).send(MESSAGES.emailVerifySuccess);
        }

        logger.warn(requestId, {
          requestId,
          msg: ERROR_CODES.AUTH.LOGIN.EMAIL_VERIFY_FAILURE.MESSAGE,
          timestamp: new Date().toISOString(),
        });

        return reply.code(401).send({
          errorCode: ERROR_CODES.AUTH.LOGIN.EMAIL_VERIFY_FAILURE.CODE,
          errorMessage: ERROR_CODES.AUTH.LOGIN.EMAIL_VERIFY_FAILURE.MESSAGE,
        });
      } catch (err) {
        logger.error(requestId, {
          requestId,
          err,
          timestamp: new Date().toISOString(),
        });

        const { CODE, MESSAGE } = ERROR_CODES.AUTH.USER.UPDATE.SERVER_ERROR;
        return reply.code(500).send({
          errorCode: CODE,
          errorMessage: MESSAGE,
        });
      }
    },
    handleUserPasswordResetInit: async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const requestId: string = generateShortId();
      try {
        const { email } = request.body as PasswordResetInitReqSchema; // Fields to update

        logger.info(requestId, {
          handler: "handleUserPasswordResetInit",
          requestId,
          email,
          timestamp: new Date().toISOString(),
        });

        // make sure email is present
        const user: UserCompleteSchema | null = await fetchUserByEmail(
          fastify,
          email
        );

        // if user with the given mail is not  present, return error
        if (!user) {
          logger.warn(requestId, {
            requestId,
            msg: MESSAGES.emailNotExist.message,
            timestamp: new Date().toISOString(),
          });
          return reply.code(400).send(MESSAGES.emailNotExist);
        }

        // user is present, generate token and send it to email
        const emailToken = generateShortId();
        const tokenValidMinutes = process.env.TOKEN_EXPIRY_MINUTES ?? 1;
        const expiryMinutes = Number(tokenValidMinutes) * 60 * 1000;
        const emailTokenExpiryAt = new Date(
          new Date().getTime() + expiryMinutes
        ).toISOString();

        const passwordResetRequestQuery = {
          text: `INSERT INTO password_reset_requests (userid, reset_code, reset_code_expires_at)
          VALUES($1, $2, $3)`,
          values: [user.userid, emailToken, emailTokenExpiryAt],
        };

        const transporter: Transporter<any> | null =
          await fastify.emailTransport;
        if (!transporter) {
          const { CODE, MESSAGE } =
            ERROR_CODES.AUTH.SIGNUP.EMAIL_TRANSPORTER_FAILURE;
          logger.warn(requestId, {
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
          receipentName: user.name,
          key: "ev",
          additionalInfo: {
            emailToken,
          },
        });

        // Send mail if it's not a test environment
        if (process.env.APP_ENV !== GLOBAL.appEnv.test) {
          await sendEmail(transporter, emailOptions);
          logger.info(requestId, {
            requestId,
            msg: MESSAGES.sendEmailVerificationCode,
          });
        }

        await fastify.pg.query(
          "DELETE FROM password_reset_requests WHERE userid = $1",
          [user.userid]
        );

        await fastify.pg.query(passwordResetRequestQuery);

        logger.info(requestId, {
          requestId,
          userid: user.userid,
          msg: MESSAGES.passwordResetInit.message,
          timestamp: new Date().toISOString(),
        });

        return reply.code(200).send(MESSAGES.passwordResetInit);
      } catch (err) {
        logger.error(requestId, {
          requestId,
          err,
          timestamp: new Date().toISOString(),
        });

        const { CODE, MESSAGE } = ERROR_CODES.AUTH.USER.UPDATE.SERVER_ERROR;
        return reply.code(500).send({
          errorCode: CODE,
          errorMessage: MESSAGE,
        });
      }
    },
    handleUserPasswordResetVerify: async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const requestId: string = generateShortId();
      try {
        const { email, verificationCode } =
          request.body as PasswordResetVerifySchema; // Fields to update

        logger.info(requestId, {
          handler: "handleUserPasswordResetVerify",
          requestId,
          email,
          timestamp: new Date().toISOString(),
        });

        // make sure email is present
        const user: UserCompleteSchema | null = await fetchUserByEmail(
          fastify,
          email
        );

        // if user with the given mail is not  present, return error
        if (!user) {
          logger.warn(requestId, {
            requestId,
            msg: MESSAGES.emailNotExist.message,
            timestamp: new Date().toISOString(),
          });
          return reply.code(400).send(MESSAGES.emailNotExist);
        }

        // Check if the code matches and is not expired
        const res = await fastify.pg.query(
          "SELECT 1 FROM password_reset_requests WHERE userid = $1 AND reset_code = $2 AND reset_code_expires_at > NOW() AND is_verified = FALSE LIMIT 1",
          [user.userid, verificationCode]
        );

        // code is valid
        if (res?.rowCount && res.rowCount > 0) {
          // so, update verified status to true
          await fastify.pg.query(
            "UPDATE password_reset_requests SET status = $1, is_verified = $2 WHERE userid = $3",
            ["completed", true, user.userid]
          );

          logger.info(requestId, {
            requestId,
            msg: MESSAGES.emailVerifySuccess.message,
            timestamp: new Date().toISOString(),
          });

          return reply.code(200).send(MESSAGES.emailVerifySuccess);
        }

        logger.warn(requestId, {
          requestId,
          msg: ERROR_CODES.AUTH.LOGIN.EMAIL_VERIFY_FAILURE.MESSAGE,
          timestamp: new Date().toISOString(),
        });

        return reply.code(401).send({
          errorCode: ERROR_CODES.AUTH.LOGIN.EMAIL_VERIFY_FAILURE.CODE,
          errorMessage: ERROR_CODES.AUTH.LOGIN.EMAIL_VERIFY_FAILURE.MESSAGE,
        });
      } catch (err) {
        logger.error(requestId, {
          requestId,
          err,
          timestamp: new Date().toISOString(),
        });

        const { CODE, MESSAGE } = ERROR_CODES.AUTH.USER.UPDATE.SERVER_ERROR;
        return reply.code(500).send({
          errorCode: CODE,
          errorMessage: MESSAGE,
        });
      }
    },
    handleUserPasswordChange: async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const requestId: string = generateShortId();
      try {
        const { email, password } = request.body as PasswordChangeSchema; // Fields to update

        logger.info(requestId, {
          handler: "handleUserPasswordChange",
          requestId,
          email,
          timestamp: new Date().toISOString(),
        });

        // make sure email is present
        const user: UserCompleteSchema | null = await fetchUserByEmail(
          fastify,
          email
        );

        // if user with the given mail is not  present, return error
        if (!user) {
          logger.warn(requestId, {
            requestId,
            msg: MESSAGES.emailNotExist.message,
            timestamp: new Date().toISOString(),
          });
          return reply.code(400).send(MESSAGES.emailNotExist);
        }

        // Check if the password request is verified
        const res = await fastify.pg.query(
          "SELECT 1 FROM password_reset_requests WHERE userid = $1 AND is_verified = TRUE LIMIT 1",
          [user.userid]
        );

        // request is verified
        if (res?.rowCount && res.rowCount > 0) {
          // Hash new password
          const hashedNewPassword = await hashPassword(password);

          await fastify.pg.query(
            "UPDATE users SET passwordhash = $1, updated_at = $2 WHERE userid = $3",
            [hashedNewPassword, new Date().toISOString(), user.userid]
          );

          await fastify.pg.query(
            "DELETE FROM password_reset_requests WHERE userid = $1",
            [user.userid]
          );

          logger.info(requestId, {
            requestId,
            userid: user.userid,
            msg: MESSAGES.userUpdateSuccess.message,
            timestamp: new Date().toISOString(),
          });
          return reply.code(200).send(MESSAGES.userUpdateSuccess);
        }

        logger.warn(requestId, {
          requestId,
          msg: ERROR_CODES.AUTH.USER.PASSWORD_RESET.NOT_REQUESTED.MESSAGE,
          timestamp: new Date().toISOString(),
        });

        return reply.code(401).send({
          errorCode: ERROR_CODES.AUTH.USER.PASSWORD_RESET.NOT_REQUESTED.CODE,
          errorMessage:
            ERROR_CODES.AUTH.USER.PASSWORD_RESET.NOT_REQUESTED.MESSAGE,
        });
      } catch (err) {
        logger.error(requestId, {
          requestId,
          err,
          timestamp: new Date().toISOString(),
        });

        const { CODE, MESSAGE } = ERROR_CODES.AUTH.USER.UPDATE.SERVER_ERROR;
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

const fetchUseryUserId = async (
  fastify: FastifyInstance,
  userid: string
): Promise<UserCompleteSchema | null> => {
  try {
    const query = await fastify.pg.query(
      "SELECT * FROM users WHERE userid = $1 LIMIT 1",
      [userid]
    );

    // if no user with the given userid is found, return null
    if (query.rowCount === 0) {
      return null;
    }
    return query.rows[0];
  } catch {
    return null;
  }
};

const fetchUserByEmail = async (
  fastify: FastifyInstance,
  email: string
): Promise<UserCompleteSchema | null> => {
  try {
    const query = await fastify.pg.query(
      "SELECT * FROM users WHERE email = $1 LIMIT 1",
      [email]
    );

    // if no user with the given userid is found, return null
    if (query.rowCount === 0) {
      return null;
    }
    return query.rows[0];
  } catch {
    return null;
  }
};

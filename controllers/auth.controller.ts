import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import logger from "../utilities/logger.js";
import { matchPassword } from "../utilities/auth.utitily.js";
import { generateShortId } from "../utilities/app.utility.js";
import { ERROR_CODES } from "../utilities/consts/error.const.js";
import { GLOBAL } from "../utilities/consts/app.const.js";
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
  forgotPasswordChange,
  forgotPasswordResetInit,
  forgotPasswordResetVerify,
  getAllUsers,
  getEmailVerificationStatus,
  getUserByEmail,
  logoutUser,
  resendEmailVerificationCode,
  updateBasicUserDetails,
  updateEmailInit,
  updateEmailVerify,
  updateUserPassword,
  verifyUserEmailToken,
} from "../utilities/db/auth.db.js";
import { authError } from "../utilities/error/auth.error.js";

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
          return authError(
            409,
            reply,
            requestId,
            ERROR_CODES.AUTH.SIGNUP.DUPLICATE_EMAIL
          );
        }

        // if no errors, add the user
        return await addNewUser(fastify, reply, requestId, request.body);
      } catch (err) {
        return authError(
          500,
          reply,
          requestId,
          ERROR_CODES.AUTH.SIGNUP.SERVER_ERROR,
          err
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

        return await getAllUsers(fastify, requestId);
      } catch (err) {
        return authError(
          500,
          reply,
          requestId,
          ERROR_CODES.AUTH.USER.FETCH_ALL_USERS,
          err
        );
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
        const userQuery = await getUserByEmail(fastify, email);

        // if no user with the given email is found, return error
        if (userQuery.rowCount === 0) {
          return authError(
            400,
            reply,
            requestId,
            ERROR_CODES.AUTH.LOGIN.EMAIL_NOT_EXIST
          );
        }
        const user: UserCompleteSchema = userQuery.rows[0];

        // verify the password using bcrypt
        const match = await matchPassword(password, user.passwordhash);
        // if wrong password was given, return error
        if (!match) {
          return authError(
            401,
            reply,
            requestId,
            ERROR_CODES.AUTH.LOGIN.PASSWORD_NOT_MATCH
          );
        }

        // now check if user's email is verified or not
        const userVerificationQuery = await getEmailVerificationStatus(
          fastify,
          user.userid
        );

        // user verification is not completed, so return error
        if (
          userVerificationQuery.rowCount === 0 ||
          !userVerificationQuery.rows[0].email_verified_status
        ) {
          return authError(
            401,
            reply,
            requestId,
            ERROR_CODES.AUTH.LOGIN.EMAIL_NOT_VERIFIED
          );
        }

        // sign the jwt token using the below payload. This payload can be retrieved later via `jwt.verify`
        const accessToken = await signAuthToken(fastify, reply, user);

        // login was successful, send back the jwt token in response
        return reply.code(200).send({ accessToken });
      } catch (err) {
        return authError(
          500,
          reply,
          requestId,
          ERROR_CODES.AUTH.LOGIN.SERVER_ERROR,
          err
        );
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

        return await logoutUser(fastify, reply, requestId, user.userid);
      } catch (err) {
        return authError(
          500,
          reply,
          requestId,
          ERROR_CODES.AUTH.LOGIN.LOGOUT_ERROR,
          err
        );
      }
    },
    handleUserEmailVerify: async (
      request: FastifyRequest<{ Body: EmailVerificationInput }>,
      reply: FastifyReply
    ) => {
      const requestId: string = generateShortId();

      try {
        logger.info(requestId, {
          handler: "handleUserEmailVerify",
          requestId,
          userid: request.body.userid,
          timestamp: new Date().toISOString(),
        });

        return await verifyUserEmailToken(
          fastify,
          reply,
          requestId,
          request.body
        );
      } catch (err) {
        return authError(
          500,
          reply,
          requestId,
          ERROR_CODES.AUTH.SIGNUP.SERVER_ERROR,
          err
        );
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

        return await resendEmailVerificationCode(
          fastify,
          reply,
          requestId,
          userid
        );
      } catch (err) {
        return authError(
          500,
          reply,
          requestId,
          ERROR_CODES.AUTH.SIGNUP.SERVER_ERROR,
          err
        );
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

        return await updateBasicUserDetails(
          fastify,
          reply,
          requestId,
          updateFields,
          user.userid
        );
      } catch (err) {
        return authError(
          500,
          reply,
          requestId,
          ERROR_CODES.AUTH.USER.UPDATE.SERVER_ERROR,
          err
        );
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

        return await updateUserPassword(
          fastify,
          reply,
          requestId,
          updateFields,
          user.userid
        );
      } catch (err) {
        return authError(
          500,
          reply,
          requestId,
          ERROR_CODES.AUTH.USER.UPDATE.SERVER_ERROR,
          err
        );
      }
    },
    handleUserEmailUpdateInit: async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const requestId: string = generateShortId();
      try {
        const updateFields = request.body as UserEmailUpdateInitSchema; // Fields to update

        logger.info(requestId, {
          handler: "handleUserEmailUpdateInit",
          requestId,
          userid: request.user.userid,
          updateFields,
          timestamp: new Date().toISOString(),
        });

        return await updateEmailInit(
          fastify,
          request,
          reply,
          requestId,
          updateFields
        );
      } catch (err) {
        return authError(
          500,
          reply,
          requestId,
          ERROR_CODES.AUTH.USER.UPDATE.SERVER_ERROR,
          err
        );
      }
    },
    handleUserEmailUpdateVerify: async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const requestId: string = generateShortId();
      try {
        const payload = request.body as EmailVerificationInput;

        logger.info(requestId, {
          handler: "handleUserEmailVerify",
          requestId,
          userid: request.user,
          timestamp: new Date().toISOString(),
        });

        return await updateEmailVerify(
          fastify,
          request,
          reply,
          requestId,
          payload
        );
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
        const payload = request.body as PasswordResetInitReqSchema; // Fields to update

        logger.info(requestId, {
          handler: "handleUserPasswordResetInit",
          requestId,
          email: payload.email,
          timestamp: new Date().toISOString(),
        });

        return await forgotPasswordResetInit(
          fastify,
          reply,
          requestId,
          payload
        );
      } catch (err) {
        return authError(
          500,
          reply,
          requestId,
          ERROR_CODES.AUTH.USER.UPDATE.SERVER_ERROR,
          err
        );
      }
    },
    handleUserPasswordResetVerify: async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const requestId: string = generateShortId();
      try {
        const payload = request.body as PasswordResetVerifySchema; // Fields to update

        logger.info(requestId, {
          handler: "handleUserPasswordResetVerify",
          requestId,
          email: payload.email,
          timestamp: new Date().toISOString(),
        });

        return await forgotPasswordResetVerify(
          fastify,
          reply,
          requestId,
          payload
        );
      } catch (err) {
        return authError(
          500,
          reply,
          requestId,
          ERROR_CODES.AUTH.USER.UPDATE.SERVER_ERROR,
          err
        );
      }
    },
    handleUserPasswordChange: async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const requestId: string = generateShortId();
      try {
        const payload = request.body as PasswordChangeSchema; // Fields to update

        logger.info(requestId, {
          handler: "handleUserPasswordChange",
          requestId,
          email: payload.email,
          timestamp: new Date().toISOString(),
        });

        return await forgotPasswordChange(fastify, reply, requestId, payload);
      } catch (err) {
        return authError(
          500,
          reply,
          requestId,
          ERROR_CODES.AUTH.USER.UPDATE.SERVER_ERROR
        );
      }
    },
  };
};

const setAuthCookie = async (reply: FastifyReply, accessToken: string) => {
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
};

const signAuthToken = async (
  fastify: FastifyInstance,
  reply: FastifyReply,
  user: UserCompleteSchema
) => {
  const accessToken = await fastify.jwt.sign(
    {
      userid: user.userid,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    { expiresIn: GLOBAL.authCookie.expiry }
  );

  await setAuthCookie(reply, accessToken);
  return accessToken;
};

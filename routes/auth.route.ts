import { FastifyInstance } from "fastify";
import { $ref } from "../schemas/auth.schema.js";
import { authControllerFactory } from "../controllers/auth.controller.js";
import { parseAndFetchRateLimit } from "../utilities/app.utility.js";
import { RouteSchemas } from "../schemas/route.auth.schema.js";

/**
 * Registers authentication-related routes.
 *
 * @param {FastifyInstance} fastify - The encapsulated Fastify instance.
 * @param {object} options - Plugin options, if any.
 */
const authRoutes = async (fastify: FastifyInstance, options: object) => {
  const {
    handleUserSignup,
    handleGetAllUsers,
    handleUserLogin,
    handleUserLogout,
    handleUserEmailVerify,
    handleUserEmailVerifyReset,
    handleUserBasicUpdate,
    handleUserPasswordUpdate,
    handleUserEmailUpdateInit,
    handleUserEmailUpdateVerify,
    handleUserPasswordResetInit,
    handleUserPasswordResetVerify,
    handleUserPasswordChange,
  } = authControllerFactory(fastify);

  const {
    registerSchema,
    userSchema,
    loginSchema,
    verifyEmailSchema,
    verifyEmailResetSchema,
    updateUserBasicSchema,
    updateUserPasswordSchema,
    updateUserEmailSchema,
    updateUserEmailVerifySchema,
    resetPasswordInitSchema,
    resetPasswordVerifySchema,
    changePasswordSchema,
  } = RouteSchemas;

  // User registration route
  fastify.post(
    "/signup",
    {
      config: {
        // Apply custom rate limiting configuration to this route
        rateLimit: {
          max: parseAndFetchRateLimit(process.env.AUTH_RATE_LIMIT, 5),
        },
      },
      schema: registerSchema.schema,
    },
    handleUserSignup
  );

  // Route to get all users, requires authentication
  fastify.get(
    "/users",
    {
      preValidation: [fastify.authenticate], // Ensure user is authenticated
      schema: userSchema.schema,
    },
    handleGetAllUsers
  );

  // User login route
  fastify.post(
    "/login",
    {
      config: {
        // Apply custom rate limiting configuration to this route
        rateLimit: {
          max: parseAndFetchRateLimit(process.env.AUTH_RATE_LIMIT, 5),
        },
      },
      schema: loginSchema.schema,
    },
    handleUserLogin
  );

  // Logout route, requires user to be authenticated
  fastify.post(
    "/logout",
    {
      preValidation: [fastify.authenticate], // Ensure user is authenticated
    },
    handleUserLogout
  );

  // Verify Email using secret token
  fastify.post("/verifyEmail", verifyEmailSchema, handleUserEmailVerify);

  // Reset secret token to validate email
  fastify.post(
    "/verifyEmailReset",
    {
      config: {
        // Apply custom rate limiting configuration to this route
        rateLimit: {
          max: parseAndFetchRateLimit(process.env.TOKEN_RATE_LIMIT, 1),
        },
      },
      schema: verifyEmailResetSchema.schema,
    },
    handleUserEmailVerifyReset
  );

  fastify.patch(
    "/userBasicUpdate",
    {
      preValidation: [fastify.authenticate], // Ensure user is authenticated
      schema: updateUserBasicSchema.schema,
    },
    handleUserBasicUpdate
  );

  fastify.patch(
    "/userPasswordUpdate",
    {
      preValidation: [fastify.authenticate], // Ensure user is authenticated
      schema: updateUserPasswordSchema.schema,
    },
    handleUserPasswordUpdate
  );

  fastify.post(
    "/userEmailUpdateInit",
    {
      preValidation: [fastify.authenticate], // Ensure user is authenticated
      schema: updateUserEmailSchema.schema,
    },
    handleUserEmailUpdateInit
  );

  fastify.patch(
    "/userEmailUpdateVerify",
    {
      preValidation: [fastify.authenticate], // Ensure user is authenticated
      schema: updateUserEmailVerifySchema.schema,
    },
    handleUserEmailUpdateVerify
  );

  fastify.post(
    "/resetPasswordInit",
    {
      schema: resetPasswordInitSchema.schema,
    },
    handleUserPasswordResetInit
  );

  fastify.patch(
    "/resetPasswordVerify",
    {
      schema: resetPasswordVerifySchema.schema,
    },
    handleUserPasswordResetVerify
  );

  fastify.patch(
    "/changePassword",
    {
      schema: changePasswordSchema.schema,
    },
    handleUserPasswordChange
  );
};

export default authRoutes;

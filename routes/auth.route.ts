import { FastifyInstance } from "fastify";
import { $ref } from "../schemas/auth.schema.js";
import { authControllerFactory } from "../controllers/auth.controller.js";
import { parseAndFetchRateLimit } from "../utilities/app.utility.js";

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
  } = authControllerFactory(fastify);

  // Define schema for user registration endpoint.
  const registerSchema = {
    schema: {
      description: "Sign up a new user",
      tags: ["User", "SignUp"],
      summary: "Sign up a new user",
      body: $ref("registerUserSchema"),
      response: {
        200: $ref("registerUserSuccessSchema"),
        409: $ref("authFailureSchema"),
      },
    },
  };

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

  // Schema for fetching all users
  const userSchema = {
    schema: {
      description: "Get all users registered on the application",
      tags: ["User"],
      summary: "Get all users registered on the application",
      response: {
        200: $ref("userSchema"),
        409: $ref("authFailureSchema"),
      },
    },
  };

  // Route to get all users, requires authentication
  fastify.get(
    "/users",
    {
      preValidation: [fastify.authenticate], // Ensure user is authenticated
      schema: userSchema.schema,
    },
    handleGetAllUsers
  );

  // Schema for user login
  const loginSchema = {
    schema: {
      description: "Log In a valid user",
      tags: ["User", "Login"],
      summary:
        "Log In a user if valid credentials are provided by setting jwt token cookie",
      body: $ref("loginUserSchema"),
      response: {
        200: $ref("loginUserSuccessSchema"),
        409: $ref("authFailureSchema"),
      },
    },
  };

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
  const verifyEmailSchema = {
    schema: {
      description: "Verify email of a signed up user",
      tags: ["User", "SignUp", "Verification"],
      summary: "Verify email of a signed up user",
      body: $ref("emailVerificationRequestSchema"),
      response: {
        200: $ref("emailVerificationSuccessSchema"),
        409: $ref("authFailureSchema"),
      },
    },
  };

  fastify.post("/verifyEmail", verifyEmailSchema, handleUserEmailVerify);

  // Reset secret token to validate email
  const verifyEmailResetSchema = {
    schema: {
      description: "Reset and send email verification code",
      tags: ["User", "SignUp", "Verification"],
      summary: "Reset and send email verification code",
      body: $ref("emailVerificationResetRequestSchema"),
      response: {
        200: $ref("emailVerificationSuccessSchema"),
        409: $ref("authFailureSchema"),
      },
    },
  };

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

  const updateUserBasicSchema = {
    schema: {
      description: "Update basic profile details of a logged in user",
      tags: ["User", "Update"],
      summary: "Update basic profile details of a logged in user",
      body: $ref("updateUserBasicSchema"),
      response: {
        200: $ref("registerUserSuccessSchema"),
        409: $ref("authFailureSchema"),
      },
    },
  };

  fastify.patch(
    "/userBasicUpdate",
    {
      preValidation: [fastify.authenticate], // Ensure user is authenticated
      schema: updateUserBasicSchema.schema,
    },
    handleUserBasicUpdate
  );

  const updateUserPasswordSchema = {
    schema: {
      description: "Update password of a logged in user",
      tags: ["User", "Update"],
      summary: "Update password of a logged in user",
      body: $ref("updateUserPasswordSchema"),
      response: {
        200: $ref("updateUserSuccessSchema"),
        409: $ref("authFailureSchema"),
      },
    },
  };

  fastify.patch(
    "/userPasswordUpdate",
    {
      preValidation: [fastify.authenticate], // Ensure user is authenticated
      schema: updateUserPasswordSchema.schema,
    },
    handleUserPasswordUpdate
  );
};

export default authRoutes;

import { FastifyInstance } from "fastify";
import { $ref } from "../schemas/auth.schema.js";
import { authControllerFactory } from "../controllers/auth.controller.js";

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options
 */

const authRoutes = async (fastify: FastifyInstance, options: object) => {
  const {
    handleUserSignup,
    handleGetAllUsers,
    handleUserLogin,
    handleUserLogout,
  } = authControllerFactory(fastify);

  /* Sign Up or Register a new User */
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

  fastify.post("/signup", registerSchema, handleUserSignup);

  /* Retrieve list of all users present in the system */
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

  fastify.get(
    "/users",
    {
      preValidation: [fastify.authenticate],
      schema: userSchema.schema,
    },
    handleGetAllUsers
  );

  /* Log In a valid user */
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

  fastify.post("/login", loginSchema, handleUserLogin);

  /* Log out */
  fastify.post(
    "/logout",
    {
      preValidation: [fastify.authenticate],
    },
    handleUserLogout
  );
};

export default authRoutes;

import { FastifyInstance } from "fastify";
import { $ref } from "../schemas/auth.schema.js";
import { authControllerFactory } from "../controllers/auth.controller.js";

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options
 */

const authroutes = async (fastify: FastifyInstance, options: object) => {
  const { handleUserSignup, handleGetAllUsers } =
    authControllerFactory(fastify);

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

  fastify.get("/users", userSchema, handleGetAllUsers);
};

export default authroutes;

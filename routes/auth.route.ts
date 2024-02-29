import { FastifyInstance } from "fastify";
import { $ref } from "../schemas/auth.schema.js";

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options
 */

const authroutes = async (fastify: FastifyInstance, options: object) => {
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
  fastify.post("/signup", registerSchema, async (request, reply) => {
    return { _id: "fb45j21", email: "demo@example.com", roles: ["user"] };
  });
};

export default authroutes;

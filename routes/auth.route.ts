import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { $ref, RegisterUserInput } from "../schemas/auth.schema.js";

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

  fastify.post(
    "/signup",
    registerSchema,
    async (request: FastifyRequest<{ Body: RegisterUserInput }>, reply: FastifyReply) => {
      const { name, email, password } = request.body;

      return {
        userid: "fb45j21",
        name: "Eden Hazard",
        email: "demo@example.com",
        role: ["user"],
      };
    }
  );

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

  fastify.get("/users", userSchema, async (request, reply) => {
    try {
      const { rows } = await fastify.pg.query("SELECT * FROM users");
      console.log(rows);
      return rows;
    } catch (err) {
      fastify.log.error("failed to fetch all users: ", err);
    }
  });
};

export default authroutes;

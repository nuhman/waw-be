import { FastifyInstance } from "fastify";

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options
 */

const authroutes = async (
  fastify: FastifyInstance,
  options: object,
  next: Function
) => {
  const registerSchema = {
    schema: {
      description: "Sign up a new user",
      tags: ["User", "SignUp"],
      summary: "Sign up a new user",
      body: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string" },
          password: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            _id: { type: "string" },
            email: { type: "string" },
            roles: { type: "array", items: { type: "string" } },
          },
        },
        409: {
          type: "object",
          properties: {
            errorcode: { type: "string" },
            errormessage: { type: "string" },
          },
        },
      },
    },
  };
  fastify.post("/signup", registerSchema, async (request, reply) => {
    return { _id: "fb45j21", email: "demo@example.com", roles: ["user"] };
  });

  next();
};

export default authroutes;

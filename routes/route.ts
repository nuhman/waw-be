import { FastifyInstance } from "fastify";

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://fastify.dev/docs/latest/Reference/Plugins/#plugin-options
 */

const approutes = async (fastify: FastifyInstance, options: object) => {
  fastify.get("/", async (request, reply) => {
    return { message: "Hello world" };
  });
  const opts = {};
  fastify.post("/", opts, async (request, reply) => {
    return request.body;
  });
};

export default approutes;

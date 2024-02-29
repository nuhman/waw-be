import { FastifyInstance } from "fastify";

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options
 */

const approutes = async (fastify: FastifyInstance, options: object) => {
  fastify.get("/healthcheck", async (request, reply) => {
    return { message: "App is up and running!" };
  });
  fastify.get("/", async (request, reply) => {
    return { message: "Hello world" };
  });
  const opts = {};
  fastify.post("/", opts, async (request, reply) => {
    return request.body;
  });
};

export default approutes;

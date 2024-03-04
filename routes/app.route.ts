import { FastifyInstance } from "fastify";

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options
 */

const appRoutes = async (fastify: FastifyInstance, options: object) => {
  fastify.get("/healthcheck", async (request, reply) => {
    return { message: "App is up and running!" };
  });
};

export default appRoutes;

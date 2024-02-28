/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://fastify.dev/docs/latest/Reference/Plugins/#plugin-options
 */

const approutes = async (fastify, options) => {
  fastify.get("/", async (request, reply) => {
    return { message: "Successfuly swqeyyxxdone!!!" };
  });
  const opts = {};
  fastify.post("/", opts, async (request, reply) => {
    return request.body;
  });
};

export default approutes;

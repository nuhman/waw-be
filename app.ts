import Fastify, { FastifyHttpOptions, FastifyInstance } from "fastify";
import approutes from "./routes/route.js";

//method to initializes a fastify server instance
export const build = (
  options: FastifyHttpOptions<any> | undefined
): FastifyInstance<any> => {
  const fastify = Fastify(options);

  // register plugins
  fastify.register(approutes);

  return fastify;
};

import Fastify, { FastifyHttpOptions, FastifyInstance } from "fastify";
import authroutes from "./routes/auth.route.js";
import approutes from "./routes/app.route.js";
import { authSchemas } from "./schemas/auth.schema.js";

//method to initializes a fastify server instance
export const build = (
  options: FastifyHttpOptions<any> | undefined
): FastifyInstance<any> => {
  const fastify = Fastify(options);

  // add schemas
  for (let authSchema of [...authSchemas]) {
    fastify.addSchema(authSchema);
  }

  // register plugins
  fastify.register(authroutes);
  fastify.register(approutes);

  return fastify;
};

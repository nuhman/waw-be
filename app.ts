import Fastify, { FastifyHttpOptions, FastifyInstance } from "fastify";
import authroutes from "./routes/auth.route.js";
import approutes from "./routes/app.route.js";
import { authSchemas } from "./schemas/auth.schema.js";
import dbConnector from "./db.js";

//method to initializes a fastify server instance
export const build = (
  options: FastifyHttpOptions<any> | undefined
): FastifyInstance<any> => {
  const fastify = Fastify(options);

  // register db
  fastify.register(dbConnector);

  // add schemas
  for (let authSchema of [...authSchemas]) {
    fastify.addSchema(authSchema);
  }

  // register routes
  fastify.register(authroutes);
  fastify.register(approutes);

  return fastify;
};

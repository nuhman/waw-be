import Fastify, { FastifyHttpOptions, FastifyInstance } from "fastify";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyPostgres from "@fastify/postgres";
import fjwt from "@fastify/jwt";
import fCookie from "@fastify/cookie";
import logger from "./utilities/logger.js";
import { authDecoratorFactory } from "./decorators/auth.decorator.js";
import authRoutes from "./routes/auth.route.js";
import appRoutes from "./routes/app.route.js";
import { authSchemas } from "./schemas/auth.schema.js";
import { parseAndFetchRateLimit } from "./utilities/app.utility.js";
import { getEmailTransporter } from "./utilities/email.utility.js";

//method to initializes a fastify server instance
export const build = async (
  options: FastifyHttpOptions<any> | undefined
): Promise<FastifyInstance<any>> => {
  const fastify = Fastify(options);

  // Add the onRequest hook here
  fastify.addHook("onRequest", async (request, reply) => {
    logger.info(`Incoming request: ${request.method} ${request.url}`);
  });

  // Register rate limiting with configurable limits
  await fastify.register(fastifyRateLimit, {
    max: parseAndFetchRateLimit(process.env.GLOBAL_RATE_LIMIT),
    timeWindow: "1 minute",
  });

  // register db
  await fastify.register(fastifyPostgres, {
    connectionString: `postgres://${encodeURIComponent(
      process.env.DBUSER || ""
    )}:${encodeURIComponent(process.env.DBPASSWORD || "")}@${
      process.env.DBHOST
    }:${5432}/${process.env.DBNAME}`,
  });

  // add schemas
  for (let authSchema of [...authSchemas]) {
    fastify.addSchema(authSchema);
  }

  // register jwt & cookie for auth related decoration
  await fastify.register(fjwt, { secret: process.env.JWT_SECRET || "" });
  await fastify.register(fCookie, { secret: process.env.COOKIE_SECRET || "" });

  // add decorators

  //decorator to verify whether JWT tokens are present for protected routes
  const { authDecorator } = authDecoratorFactory(fastify);
  await fastify.decorate("authenticate", authDecorator);

  const emailTransport = getEmailTransporter();
  await fastify.decorate("emailTransport", emailTransport);

  // register routes
  await fastify.register(authRoutes);
  await fastify.register(appRoutes);

  return fastify;
};

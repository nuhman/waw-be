import Fastify, { FastifyHttpOptions, FastifyInstance } from "fastify";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyPostgres from "@fastify/postgres";
import fjwt from "@fastify/jwt";
import fCookie from "@fastify/cookie";
import { authDecoratorFactory } from "./decorators/auth.decorator.js";
import authRoutes from "./routes/auth.route.js";
import appRoutes from "./routes/app.route.js";
import { authSchemas } from "./schemas/auth.schema.js";
import dotenv from "dotenv";

dotenv.config();

// Environment variables validation
const requiredEnv = [
  "DBUSER",
  "DBPASSWORD",
  "DBHOST",
  "DBNAME",
  "JWT_SECRET",
  "COOKIE_SECRET",
];
const missingEnv = requiredEnv.filter((envName) => !process.env[envName]);
if (missingEnv.length) {
  throw new Error(
    `Missing required environment variables: ${missingEnv.join(", ")}`
  );
}

//method to initializes a fastify server instance
export const build = async (
  options: FastifyHttpOptions<any> | undefined
): Promise<FastifyInstance<any>> => {
  const fastify = Fastify(options);

  // register rate limiting
  await fastify.register(fastifyRateLimit, {
    max: 60,
    timeWindow: "1 minute",
  });

  // register db
  fastify.register(fastifyPostgres, {
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
  fastify.register(fjwt, { secret: process.env.JWT_SECRET || "" });
  fastify.register(fCookie, { secret: process.env.COOKIE_SECRET || "" });

  // add decorators

  //decorator to verify whether JWT tokens are present for protected routes
  const { authDecorator } = authDecoratorFactory(fastify);
  fastify.decorate("authenticate", authDecorator);

  // register routes
  fastify.register(authRoutes);
  fastify.register(appRoutes);

  return fastify;
};

import Fastify, { FastifyHttpOptions, FastifyInstance } from "fastify";
import fastifyPostgres from "@fastify/postgres";
import authroutes from "./routes/auth.route.js";
import approutes from "./routes/app.route.js";
import { authSchemas } from "./schemas/auth.schema.js";
import dotenv from "dotenv";

dotenv.config();

// Environment variables validation
const requiredEnv = ["DBUSER", "DBPASSWORD", "DBHOST", "DBNAME"];
const missingEnv = requiredEnv.filter((envName) => !process.env[envName]);
if (missingEnv.length) {
  throw new Error(
    `Missing required environment variables: ${missingEnv.join(", ")}`
  );
}

//method to initializes a fastify server instance
export const build = (
  options: FastifyHttpOptions<any> | undefined
): FastifyInstance<any> => {
  const fastify = Fastify(options);

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

  // register routes
  fastify.register(authroutes);
  fastify.register(approutes);

  return fastify;
};

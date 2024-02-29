import fastifyPlugin from "fastify-plugin";
import { FastifyInstance } from "fastify";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

const dbClient = new Client({
  user: process.env.DBUSER,
  password: process.env.DBPASSWORD,
  host: process.env.DBHOST,
  database: process.env.DBNAME,
  port: 5432,
});

const dbConnector = async (fastify: FastifyInstance, options: object) => {
  try {
    await dbClient.connect();
    fastify.log.info("db connected!");
    fastify.decorate("db", { client: dbClient });
  } catch (err) {
    fastify.log.error("db connection failed: ", err);
    console.log(err);
  }
};

export default fastifyPlugin(dbConnector);

import { build } from "./app.js";
import dotenv from "dotenv";
import { validateEnv, constructRequiredEnv } from "./utilities/app.utility.js";
import logger from "./utilities/logger.js";

dotenv.config();

// make sure all required environment variables are loaded
validateEnv(constructRequiredEnv());

// set application timezone
process.env.TZ = "UTC";

// define and initialize fastify app instance
const app = await build({ logger: true });

// gracefully shutdown the application, on termination
const listeners = ["SIGINT", "SIGTERM"];
listeners.forEach((signal) => {
  // Register an event listener for each termination signal
  process.on(signal, async () => {
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      logger.error("Failed to close the application gracefully:", err);
      process.exit(1);
    }
  });
});

// method to boot up the Fastify app
const start = async () => {
  try {
    await app.listen({ port: 3000 });
  } catch (err) {
    logger.error("Failed to boot up the application:", err);
    process.exit(1);
  }
};

start();

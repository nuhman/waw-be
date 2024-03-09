import { build } from "./app.js";
import logger from "./utilities/logger.js";

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

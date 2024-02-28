//'use strict';

import Fastify from "fastify";
import approutes from "./routes/route.js";

const fastify = Fastify({
  logger: true,
});

fastify.register(approutes);

const start = async () => {
  try {
    const port = 3001;
    await fastify.listen({ port }, (err: Error | null, add: string) => {
      if (err) {
        console.error("Error occured while listening ", err);
      }
      console.log("App listening on: ", add);
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

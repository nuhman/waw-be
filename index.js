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
    await fastify.listen({ port });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

// async function routes(fastify, options) {
//   fastify.register(approutes);
// }

// export default routes;
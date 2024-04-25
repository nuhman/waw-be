import { FastifyInstance } from "fastify";
import { availabilityControllerFactory } from "../controllers/availability.controller.js";
import { RouteSchemas } from "../schemas/route.availability.schema.js";

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options
 */

const availabilityRoutes = async (
  fastify: FastifyInstance,
  options: object
) => {
  const { handleCreateAvailability } = availabilityControllerFactory(fastify);
  const { createAvailabilitySchema } = RouteSchemas;

  fastify.post(
    "/user/:userId/availability",
    {
      schema: createAvailabilitySchema.schema,
    },
    handleCreateAvailability
  );
};

export default availabilityRoutes;

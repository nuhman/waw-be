import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import logger from "../utilities/logger.js";
import { CreateAvailabilityInput } from "../schemas/availability.schema.js";
import { generateShortId } from "../utilities/app.utility.js";
import { availabilityError } from "../utilities/error/availability.error.js";
import { ERROR_CODES } from "../utilities/consts/error.const.js";
import { createAvailability } from "../utilities/db/availability.db.js";

/**
 * Creates availability-related route handlers with dependency injected fastify instance.
 * Factory function pattern used for dependency injection of fastify plugins (e.g., fastify.pg)
 *
 * @param {FastifyInstance} fastify - Fastify instance for accessing plugins and utilities.
 * @returns Object containing route handler functions.
 */

export const availabilityControllerFactory = (fastify: FastifyInstance) => {
  return {
    handleCreateAvailability: async (
      request: FastifyRequest<{
        Params: { userId: string };
        Body: CreateAvailabilityInput;
      }>,
      reply: FastifyReply
    ) => {
      const requestId: string = generateShortId();
      try {
        const { userId } = request.params;
        const { timeSlots } = request.body;

        logger.info(requestId, {
          handler: "handleCreateAvailability",
          requestId,
          userId,
          timestamp: new Date().toISOString(),
        });

        // Validate and save the user's availability
        await createAvailability(fastify, requestId, userId, timeSlots);

        return reply
          .code(200)
          .send({ message: "Availability created successfully" });
      } catch (err) {
        return availabilityError(
          500,
          reply,
          requestId,
          ERROR_CODES.AVAILABILITY.CREATE.SERVER_ERROR,
          err
        );
      }
    },
  };
};

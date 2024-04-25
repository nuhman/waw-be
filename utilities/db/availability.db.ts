import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import logger from "../logger.js";
import { MESSAGES } from "../consts/app.const.js";
import { TimeSlot } from "../../schemas/availability.schema.js";

export const createAvailability = async (
  fastify: FastifyInstance,
  requestId: string,
  userId: string,
  timeSlots: TimeSlot
) => {
  // Validate time slots
  if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
    throw new Error("Invalid time slots");
  }

  // Delete existing availability for the user
  const deleteQuery = {
    text: "DELETE FROM availability WHERE userid = $1",
    values: [userId],
  };
  await fastify.pg.query(deleteQuery);

  // Insert new availability for the user
  const insertQueries = timeSlots.map((timeSlot) => ({
    text: `
        INSERT INTO availability (userid, day_of_week, start_time, end_time)
        VALUES ($1, $2, $3, $4)
      `,
    values: [userId, timeSlot.dayOfWeek, timeSlot.startTime, timeSlot.endTime],
  }));

  await Promise.all(insertQueries.map((query) => fastify.pg.query(query)));

  logger.info(requestId, {
    requestId,
    msg: MESSAGES.availabilityCreated,
    timestamp: new Date().toISOString(),
  });
};

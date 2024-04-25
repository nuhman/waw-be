import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";

const createDayAvailability = z.object({
  dayOfWeek: z.string(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
});

const timeSlot = z.array(createDayAvailability);
export type TimeSlot = z.infer<typeof timeSlot>;

const createWeeklyAvailabilityPayload = z.object({
  timeSlots: timeSlot,
});

export type CreateAvailabilityInput = z.infer<
  typeof createWeeklyAvailabilityPayload
>;

const createAvailabilitySucccess = z.object({
  message: z.string(),
});

const createAvailabilityFailure = z.object({
  message: z.string(),
});

export const { schemas: availabilitySchemas, $ref } = buildJsonSchemas({
  createDayAvailability,
  createWeeklyAvailabilityPayload,
  timeSlot,
  createAvailabilitySucccess,
  createAvailabilityFailure,
});

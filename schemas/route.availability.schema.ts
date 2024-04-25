import { $ref } from "./availability.schema.js";

export const RouteSchemas = {
  createAvailabilitySchema: {
    schema: {
      description: "Create Weekly Availability of User",
      tags: ["User", "Availability"],
      summary: "Set weekly availability",
      body: $ref("createWeeklyAvailabilityPayload"),
      response: {
        200: $ref("createAvailabilitySucccess"),
        409: $ref("createAvailabilityFailure"),
      },
    },
  },
};

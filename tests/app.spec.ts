import { FastifyInstance } from "fastify";
import { test } from "@japa/runner";
import { build } from "../app.js";

test.group("GP: Application Setup", (group) => {
  let app: FastifyInstance<any> | null = null;
  group.setup(async () => {
    app = build({ logger: true });
    await app.ready();
  });
  group.teardown(async () => {
    if (app) {
      await app.close();
    }
  });

  test("Health Check Endpoint Responds Successfully", async (t) => {
    const response = await app?.inject({
      method: "GET",
      url: "/healthcheck",
    });

    //const response = await t.client.get("/healthcheck"); //If testing against live server
    t.assert.equal(
      response?.statusCode,
      200,
      "Expected status code 200 for health check"
    );
  });
});

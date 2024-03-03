import { FastifyInstance } from "fastify";
import { test } from "@japa/runner";
import * as sinon from "sinon";
import { build } from "../app.js";
import { mockUserResponse } from "./fixtures/auth.fixture.js";

test.group("GP: Authentication", (group) => {
  let app: FastifyInstance<any> | null = null;
  let queryStub: sinon.SinonStub;

  group.setup(async () => {
    app = build({ logger: true });
    await app.ready();

    queryStub = sinon.stub(app.pg, "query").resolves(mockUserResponse);
  });
  group.teardown(async () => {
    if (app) {
      await app.close();
    }
    queryStub.restore();
  });

  test("Retrieves list of users correctly", async (t) => {
    const response = await app?.inject({
      method: "GET",
      url: "/users",
    });
    t.assert.equal(
      response?.statusCode,
      200,
      "Expected status code 200 for /users"
    );
    t.assert.deepEqual(
      JSON.parse(response?.payload || "{}"),
      mockUserResponse.rows,
      "Expected mock user data to be returned"
    );
  });
});

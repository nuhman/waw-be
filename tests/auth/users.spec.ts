import { FastifyInstance } from "fastify";
import { test } from "@japa/runner";
import * as sinon from "sinon";
import { build } from "../../app.js";
import { ERROR_CODES } from "../../utilities/consts/error.const.js";
import { mockUsers } from "../fixtures/auth.fixture.js";

test.group("Auth /users", (group) => {
  let app: FastifyInstance<any> | null = null;
  let queryStub: sinon.SinonStub;

  group.setup(async () => {
    app = build({
      logger: {
        level: "error",
      },
    });
    await app.ready();
  });
  group.teardown(async () => {
    if (app) {
      await app.close();
    }
    queryStub.restore();
  });

  group.each.setup(() => {
    if (app) {
      queryStub = sinon.stub(app.pg, "query").resolves(mockUsers.userResponse);
    }
  });

  group.each.teardown(() => {
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
      mockUsers.userResponse.rows,
      "Expected mock user data to be returned"
    );
  });

  test("Retrieves list of empty users correctly", async (t) => {
    // redefine query stub
    queryStub.resolves(mockUsers.emptyUserResponse);
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
      mockUsers.emptyUserResponse.rows,
      "Expected mock user data to be returned"
    );
  });

  test("Handles database errors gracefully", async ({ assert }) => {
    if (!app) {
      throw new Error("Application not initialized");
    }
    queryStub.rejects(new Error("Database error"));
    const response = await app?.inject({
      method: "GET",
      url: "/users",
    });

    assert.equal(
      response.statusCode,
      500,
      "Expected status code 500 for database error"
    );
    assert.deepEqual(
      JSON.parse(response.payload),
      {
        errorCode: ERROR_CODES.AUTH.USER.FETCH_ALL_USERS.CODE,
        errorMessage: ERROR_CODES.AUTH.USER.FETCH_ALL_USERS.MESSAGE,
      },
      "Expected error response for database error"
    );
  });
});

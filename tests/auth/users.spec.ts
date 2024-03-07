import { FastifyInstance } from "fastify";
import { test } from "@japa/runner";
import * as sinon from "sinon";
import { build } from "../../app.js";
import { ERROR_CODES } from "../../utilities/consts/error.const.js";
import { mockUsers, headers } from "../fixtures/auth.fixture.js";

test.group("Auth /users", (group) => {
  let app: FastifyInstance<any> | null = null;
  let queryStub: sinon.SinonStub;
  let authStub: sinon.SinonStub;
  let fastifyStub: sinon.SinonStub;

  group.setup(async () => {
    app = await build({
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
    fastifyStub.restore();
    authStub.restore();
  });

  group.each.setup(() => {
    if (app) {
      queryStub = sinon.stub(app.pg, "query").resolves(mockUsers.userResponse);
      fastifyStub = sinon
        .stub(app.jwt, "verify")
        .resolves(mockUsers.jwtDecodedUser);
      authStub = sinon
        .stub(app, "authenticate")
        .callsFake(async (request, reply) => {
          // Mock the request.user as if authentication succeeded
          request.user = mockUsers.jwtDecodedUser;
        });
    }
  });

  group.each.teardown(() => {
    queryStub.restore();
    fastifyStub.restore();
    authStub.restore();
  });

  test("Correctly Retrieves a Populated List of Users", async (t) => {
    const response = await app?.inject({
      method: "GET",
      url: "/users",
      headers,
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

  test("Correctly Retrieves an Empty List When No Users Are Present", async (t) => {
    // first DB query will be made by auth decorator,
    // so second DB query (which happens inside the route logic) is what we are interested in
    queryStub.onSecondCall().resolves(mockUsers.emptyUserResponse);
    const response = await app?.inject({
      method: "GET",
      url: "/users",
      headers,
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

  test("Handles Database Errors Gracefully", async ({ assert }) => {
    if (!app) {
      throw new Error("Application not initialized");
    }
    // first DB query will be made by auth decorator,
    // so second DB query (which happens inside the route logic) is what we are interested in
    queryStub.onSecondCall().rejects(new Error("Database error"));
    const response = await app?.inject({
      method: "GET",
      url: "/users",
      headers,
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

import { FastifyInstance } from "fastify";
import { test } from "@japa/runner";
import * as sinon from "sinon";
import { build } from "../../app.js";
import { ERROR_CODES } from "../../utilities/consts/error.const.js";
import { mockUsers, headers, mockLogin } from "../fixtures/auth.fixture.js";
import { MESSAGES } from "../../utilities/consts/app.const.js";

test.group("Auth /logout", (group) => {
  let app: FastifyInstance<any> | null = null;
  let queryStub: sinon.SinonStub;
  let fastifyStub: sinon.SinonStub;
  let authStub: sinon.SinonStub;

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

  test("Authenticated user should be able to successfully logout", async (t) => {
    const response = await app?.inject({
      method: "POST",
      url: "/logout",
      payload: mockLogin.loginUserInfo,
      headers,
    });

    t.assert.equal(
      response?.statusCode,
      200,
      "Expected status code 200 for successful /logout"
    );
    t.assert.deepEqual(
      JSON.parse(response?.payload || "{}"),
      MESSAGES.logoutSuccess,
      "Expected correct logout messge to be present in response"
    );
  });

  test("Unauthenticated user attempting to logout should receive an error", async (t) => {
    if (!app) {
      throw new Error("Application not initialized");
    }
    // Setup: Simulate failure of authentication
    fastifyStub.restore(); // Restore the original functionality for this test
    fastifyStub = sinon.stub(app.jwt, "verify").resolves({});

    const response = await app?.inject({
      method: "POST",
      url: "/logout",
      headers,
    });
    t.assert.equal(
      response?.statusCode,
      401,
      "Expected status code 401 for unauthenticated /logout attempt"
    );
    t.assert.deepEqual(
      JSON.parse(response?.payload || "{}"),
      {
        code: ERROR_CODES.AUTH.USER.AUTH_REQUIRED.CODE,
        message: ERROR_CODES.AUTH.USER.AUTH_REQUIRED.MESSAGE,
      },
      "Expected error response for unauthenticated request"
    );
  });

  test("Successful logout should clear the access_token cookie", async ({
    assert,
  }) => {
    const response = await app?.inject({
      method: "POST",
      url: "/logout",
      headers,
    });

    const cookieHeader = response?.headers["set-cookie"];
    assert.ok(
      cookieHeader?.includes("access_token=;"),
      "access_token cookie should be cleared"
    );

    assert.equal(
      response?.statusCode,
      200,
      "Expected status code 200 for successful /logout"
    );
  });
});

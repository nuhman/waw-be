import { FastifyInstance } from "fastify";
import { test } from "@japa/runner";
import * as sinon from "sinon";
import { build } from "../../app.js";
import { ERROR_CODES } from "../../utilities/consts/error.const.js";
import { mockUsers, headers, mockLogin } from "../fixtures/auth.fixture.js";

test.group("Auth /login", (group) => {
  let app: FastifyInstance<any> | null = null;
  let queryStub: sinon.SinonStub;
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
  });

  group.each.setup(() => {
    if (app) {
      queryStub = sinon
        .stub(app.pg, "query")
        .resolves(mockLogin.loginEmailQuerySuccessResponse);
      fastifyStub = sinon
        .stub(app.jwt, "sign")
        .resolves(mockLogin.loginSuccessResponse.accessToken);
    }
  });

  group.each.teardown(() => {
    queryStub.restore();
    fastifyStub.restore();
  });

  test("Valid Credentials Lead to Successful Login and Token Issuance", async (t) => {
    queryStub
      .onSecondCall()
      .resolves(mockLogin.loginEmailVerificationCheckSuccess);
    const response = await app?.inject({
      method: "POST",
      url: "/login",
      payload: mockLogin.loginUserInfo,
    });

    t.assert.equal(
      response?.statusCode,
      200,
      "Expected status code 200 for successful /login"
    );
    t.assert.deepEqual(
      JSON.parse(response?.payload || "{}"),
      mockLogin.loginSuccessResponse,
      "Expected token to be present in successful response"
    );
  });

  test("Login Attempt with Unrecognized Email Returns Unauthorized Status", async (t) => {
    queryStub.resolves(mockLogin.loginEmailQueryFailureResponse);

    const response = await app?.inject({
      method: "POST",
      url: "/login",
      payload: mockLogin.loginUserInfoInvalidEmail,
    });

    const responseBody = JSON.parse(response?.body || "{}");

    t.assert.equal(
      response?.statusCode,
      400,
      "Expected status code 401 for invalid credentials for auth"
    );
    t.assert.deepEqual(
      responseBody,
      {
        errorCode: ERROR_CODES.AUTH.LOGIN.EMAIL_NOT_EXIST.CODE,
        errorMessage: ERROR_CODES.AUTH.LOGIN.EMAIL_NOT_EXIST.MESSAGE,
      },
      "Expected error response for duplicate email"
    );
  });

  test("Incorrect Password for Existing User Results in Unauthorized Status", async (t) => {
    const response = await app?.inject({
      method: "POST",
      url: "/login",
      payload: mockLogin.loginUserInfoInvalidPwd,
    });

    const responseBody = JSON.parse(response?.body || "{}");

    t.assert.equal(
      response?.statusCode,
      401,
      "Expected status code 401 for invalid credentials for auth"
    );
    t.assert.deepEqual(
      responseBody,
      {
        errorCode: ERROR_CODES.AUTH.LOGIN.PASSWORD_NOT_MATCH.CODE,
        errorMessage: ERROR_CODES.AUTH.LOGIN.PASSWORD_NOT_MATCH.MESSAGE,
      },
      "Expected error response for wrong password"
    );
  });

  test("Login Attempt with Unverified Email Returns Unauthorized Status", async (t) => {
    queryStub
      .onSecondCall()
      .resolves(mockLogin.loginEmailVerificationCheckFailure);

    const response = await app?.inject({
      method: "POST",
      url: "/login",
      payload: mockLogin.loginUserInfoInvalidEmail,
    });

    const responseBody = JSON.parse(response?.body || "{}");

    t.assert.equal(
      response?.statusCode,
      401,
      "Expected status code 401 for Unverified Email for auth"
    );
    t.assert.deepEqual(
      responseBody,
      {
        errorCode: ERROR_CODES.AUTH.LOGIN.EMAIL_NOT_VERIFIED.CODE,
        errorMessage: ERROR_CODES.AUTH.LOGIN.EMAIL_NOT_VERIFIED.MESSAGE,
      },
      "Expected error response for Unverified Email"
    );
  });

  test("Handles Database Errors Gracefully", async ({ assert }) => {
    if (!app) {
      throw new Error("Application not initialized");
    }
    queryStub.rejects(new Error("Database error"));
    const response = await app?.inject({
      method: "POST",
      url: "/login",
      payload: mockLogin.loginUserInfo,
    });

    assert.equal(
      response.statusCode,
      500,
      "Expected status code 500 for database error"
    );
    assert.deepEqual(
      JSON.parse(response.payload),
      {
        errorCode: ERROR_CODES.AUTH.LOGIN.SERVER_ERROR.CODE,
        errorMessage: ERROR_CODES.AUTH.LOGIN.SERVER_ERROR.MESSAGE,
      },
      "Expected error response for database error"
    );
  });
});

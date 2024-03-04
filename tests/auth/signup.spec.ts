import { FastifyInstance } from "fastify";
import { test } from "@japa/runner";
import * as sinon from "sinon";
import { build } from "../../app.js";
import { ERROR_CODES } from "../../utilities/consts/error.const.js";
import { mockRegister } from "../fixtures/auth.fixture.js";

test.group("Auth /signup", (group) => {
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
      queryStub = sinon.stub(app.pg, "query");
      queryStub.onFirstCall().resolves(mockRegister.email.notExists); // Simulate that the duplicate user does not exist
      queryStub.onSecondCall().resolves(mockRegister.registerSuccessResponse); // Simulate successful insertion
    }
  });

  group.each.teardown(() => {
    queryStub.restore();
  });

  test("User Registration Succeeds with Valid Payload", async (t) => {
    const response = await app?.inject({
      method: "POST",
      url: "/signup",
      payload: mockRegister.registerUserInfo,
    });
    const responseBody = JSON.parse(response?.payload || "{}");

    t.assert.equal(
      response?.statusCode,
      201,
      "Expected status code 200 for /signup"
    );
    // Check that all expected properties are present and have the correct type
    t.assert.exists(responseBody.userid, "Response body should have a userid");
    t.assert.equal(
      responseBody.name,
      mockRegister.registerSuccessResponse.name,
      "Names should match"
    );
    t.assert.equal(
      responseBody.email,
      mockRegister.registerSuccessResponse.email,
      "Emails should match"
    );
    t.assert.deepEqual(
      responseBody.role,
      mockRegister.registerSuccessResponse.role,
      "Roles should match"
    );
  });

  test("Attempt to Register User with Duplicate Email Properly Returns Error", async (t) => {
    queryStub.onFirstCall().resolves(mockRegister.email.exists);

    const response = await app?.inject({
      method: "POST",
      url: "/signup",
      payload: mockRegister.registerUserInfo,
    });
    const responseBody = JSON.parse(response?.body || "{}");

    t.assert.equal(
      response?.statusCode,
      409,
      "Expected status code 409 for duplicate email error"
    );
    t.assert.deepEqual(
      responseBody,
      {
        errorCode: ERROR_CODES.AUTH.SIGNUP.DUPLICATE_EMAIL.CODE,
        errorMessage: ERROR_CODES.AUTH.SIGNUP.DUPLICATE_EMAIL.MESSAGE,
      },
      "Expected error response for duplicate email"
    );
  });

  test("Registration Fails for Empty Payload with Appropriate Validation Response", async (t) => {
    const response = await app?.inject({
      method: "POST",
      url: "/signup",
      payload: {},
    });
    const responseBody = JSON.parse(response?.payload || "{}");
    t.assert.equal(
      response?.statusCode,
      400,
      "Expected status code 400 for invalid payload"
    );
    t.assert.equal(
      responseBody.code,
      "FST_ERR_VALIDATION",
      "Expected code FST_ERR_VALIDATION for invalid payload"
    );
  });

  test("Invalid Email Format in Registration Payload Triggers Validation Error", async (t) => {
    const response = await app?.inject({
      method: "POST",
      url: "/signup",
      payload: mockRegister.registerUserInfoInvalidEmail,
    });
    const responseBody = JSON.parse(response?.payload || "{}");
    t.assert.equal(
      response?.statusCode,
      400,
      "Expected status code 400 for invalid payload"
    );
    t.assert.match(
      responseBody.message,
      /email/i,
      "Expected validation message to contain the word 'email'"
    );
  });

  test("Password Shorter Than 6 Characters in Registration Payload Returns Validation Error", async (t) => {
    const response = await app?.inject({
      method: "POST",
      url: "/signup",
      payload: mockRegister.registerUserInfoInvalidPwd,
    });
    const responseBody = JSON.parse(response?.payload || "{}");
    t.assert.equal(
      response?.statusCode,
      400,
      "Expected status code 400 for invalid payload"
    );
    t.assert.match(
      responseBody.message,
      /password/i,
      "Expected validation message to contain the word 'password'"
    );
  });

  test("Handles Database Errors Gracefully", async ({ assert }) => {
    if (!app) {
      throw new Error("Application not initialized");
    }
    queryStub.onSecondCall().rejects(new Error("Database error"));
    const response = await app?.inject({
      method: "POST",
      url: "/signup",
      payload: mockRegister.registerUserInfo,
    });

    assert.equal(
      response.statusCode,
      500,
      "Expected status code 500 for database error"
    );
    assert.deepEqual(
      JSON.parse(response.payload),
      {
        errorCode: ERROR_CODES.AUTH.SIGNUP.SERVER_ERROR.CODE,
        errorMessage: ERROR_CODES.AUTH.SIGNUP.SERVER_ERROR.MESSAGE,
      },
      "Expected error response for database error"
    );
  });
});

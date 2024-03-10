import { FastifyInstance } from "fastify";
import { test } from "@japa/runner";
import * as sinon from "sinon";
import { build } from "../../app.js";
import { ERROR_CODES } from "../../utilities/consts/error.const.js";
import { sampleQueryRow, mockVerification } from "../fixtures/auth.fixture.js";
import { MESSAGES } from "../../utilities/consts/app.const.js";

test.group("Auth /verifyemail", (group) => {
  let app: FastifyInstance<any> | null = null;
  let queryStub: sinon.SinonStub;

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
  });

  group.each.setup(() => {
    if (app) {
      queryStub = sinon.stub(app.pg, "query");
      queryStub.onFirstCall().resolves(sampleQueryRow.rowExists);
      queryStub.onSecondCall().resolves(sampleQueryRow.rowExists);
    }
  });

  group.each.teardown(() => {
    queryStub.restore();
  });

  test("Valid token should successfully verify email", async (t) => {
    const response = await app?.inject({
      method: "POST",
      url: "/verifyEmail",
      payload: mockVerification.emailVerificationRequest,
    });

    t.assert.equal(
      response?.statusCode,
      200,
      "Expected status code 200 for successful /verifyEmail"
    );
    t.assert.deepEqual(
      JSON.parse(response?.payload || "{}"),
      MESSAGES.emailVerifySuccess,
      "Expected correct logout messge to be present in response"
    );
  });

  test("Invalid token should not verify email", async (t) => {
    queryStub.onFirstCall().resolves(sampleQueryRow.rowNotExists);

    const response = await app?.inject({
      method: "POST",
      url: "/verifyEmail",
      payload: mockVerification.emailVerificationRequest,
    });

    t.assert.equal(
      response?.statusCode,
      401,
      "Expected status code 401 for /verifyEmail failure"
    );
    t.assert.deepEqual(
      JSON.parse(response?.payload || "{}"),
      {
        errorCode: ERROR_CODES.AUTH.LOGIN.EMAIL_VERIFY_FAILURE.CODE,
        errorMessage: ERROR_CODES.AUTH.LOGIN.EMAIL_VERIFY_FAILURE.MESSAGE,
      },
      "Expected correct logout messge to be present in response"
    );
  });

  test("Should regenerate token if needed for the same email", async (t) => {
    const response = await app?.inject({
      method: "POST",
      url: "/verifyEmailReset",
      payload: mockVerification.emailResetVerificationRequest,
    });

    t.assert.equal(
      response?.statusCode,
      200,
      "Expected status code 200 for successful /verifyEmailReset"
    );
    t.assert.deepEqual(
      JSON.parse(response?.payload || "{}"),
      MESSAGES.emailVerifyCodeReset,
      "Expected correct emailVerifyCodeReset messge to be present in response"
    );
  });
});

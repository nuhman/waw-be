import { FastifyInstance } from "fastify";
import { test } from "@japa/runner";
import * as sinon from "sinon";
import { build } from "../../app.js";
import { ERROR_CODES } from "../../utilities/consts/error.const.js";
import {
  sampleQueryRow,
  mockUpdate,
  mockUsers,
  headers,
  mockLogin,
} from "../fixtures/auth.fixture.js";
import { MESSAGES } from "../../utilities/consts/app.const.js";

test.group("Auth /userupdate", (group) => {
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
      queryStub = sinon.stub(app.pg, "query");
      //.resolves(mockUpdate.userBasicUpdateResponseSuccess);
      queryStub
        .onFirstCall()
        .resolves(mockUpdate.userBasicUpdateResponseSuccess);
      //queryStub.onSecondCall().resolves({});
      //queryStub.onThirdCall().resolves({});
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

  test("User should be able to do basic updates when payload is valid", async (t) => {
    queryStub.resolves(mockUpdate.userBasicUpdateResponseSuccess);
    const response = await app?.inject({
      method: "PATCH",
      url: "/userBasicUpdate",
      payload: mockUpdate.userBasicUpdateRequest,
      headers,
    });

    t.assert.equal(
      response?.statusCode,
      200,
      "Expected status code 200 for successful /userBasicUpdate"
    );

    t.assert.deepEqual(
      JSON.parse(response?.payload || "{}"),
      mockUpdate.userBasicUpdateResponseSuccess.rows[0],
      "Expected correct logout messge to be present in response"
    );
  });

  test("User should be NOT be able to do basic updates when payload is invalid", async (t) => {
    const response = await app?.inject({
      method: "PATCH",
      url: "/userBasicUpdate",
      payload: {},
      headers,
    });

    t.assert.equal(
      response?.statusCode,
      400,
      "Expected status code 400 for unsuccessful /userBasicUpdate due to invalid payload"
    );
  });

  test("Password should be updated successfully", async (t) => {
    queryStub.onSecondCall().resolves(mockLogin.loginEmailQuerySuccessResponse);
    queryStub.onThirdCall().resolves({});

    const response = await app?.inject({
      method: "PATCH",
      url: "/userPasswordUpdate",
      payload: mockUpdate.userPasswordUpdateRequest,
      headers,
    });

    t.assert.equal(
      response?.statusCode,
      200,
      "Expected status code 200 for successful /userPasswordUpdate"
    );

    t.assert.deepEqual(
      JSON.parse(response?.payload || "{}"),
      MESSAGES.logoutSuccess,
      "Expected correct messge to be present in response"
    );
  });

  test("Password should be not be updated when payload is invalid", async (t) => {
    //queryStub.onSecondCall().resolves(mockLogin.loginEmailQuerySuccessResponse);
    //queryStub.onThirdCall().resolves({});

    const response = await app?.inject({
      method: "PATCH",
      url: "/userPasswordUpdate",
      payload: {},
      headers,
    });
    
    t.assert.equal(
      response?.statusCode,
      400,
      "Expected status code 400 for invalid payload /userPasswordUpdate"
    );

    t.assert.deepEqual(
      JSON.parse(response?.payload || "{}"),
      MESSAGES.passwordChangeFieldsRequired,
      "Expected correct messge to be present in response"
    );
  });

  test("Password should be not be updated when payload is invalid", async (t) => {
    //queryStub.onSecondCall().resolves(mockLogin.loginEmailQuerySuccessResponse);
    //queryStub.onThirdCall().resolves({});

    const response = await app?.inject({
      method: "PATCH",
      url: "/userPasswordUpdate",
      payload: {},
      headers,
    });
    
    t.assert.equal(
      response?.statusCode,
      400,
      "Expected status code 400 for invalid payload /userPasswordUpdate"
    );

    t.assert.deepEqual(
      JSON.parse(response?.payload || "{}"),
      MESSAGES.passwordChangeFieldsRequired,
      "Expected correct messge to be present in response"
    );
  });
});

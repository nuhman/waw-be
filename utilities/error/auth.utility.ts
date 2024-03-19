import { FastifyReply } from "fastify";
import logger from "../logger.js";
import { ERROR_CODES } from "../consts/error.const.js";

interface ErrorObj {
  CODE: string;
  MESSAGE: string;
  ERR?: any;
}

const error = (
  reply: FastifyReply,
  requestId: string,
  errorObj: ErrorObj,
  status: number
) => {
  logger.warn(requestId, {
    requestId,
    msg: errorObj.MESSAGE,
    timestamp: new Date().toISOString(),
  });
  return reply.code(status).send({
    errorCode: errorObj.CODE,
    errorMessage: errorObj.MESSAGE,
  });
};

const conflictError = (
  reply: FastifyReply,
  requestId: string,
  errorObj: ErrorObj
) => {
  return error(reply, requestId, errorObj, 409);
};

export const serverError = (
  reply: FastifyReply,
  requestId: string,
  errorObj: ErrorObj
) => {
  return error(reply, requestId, errorObj, 500);
};

export const mailConflictError = (reply: FastifyReply, requestId: string) => {
  return conflictError(
    reply,
    requestId,
    ERROR_CODES.AUTH.SIGNUP.DUPLICATE_EMAIL
  );
};

export const transporterFailureError = (
  reply: FastifyReply,
  requestId: string
) => {
  return serverError(
    reply,
    requestId,
    ERROR_CODES.AUTH.SIGNUP.EMAIL_TRANSPORTER_FAILURE
  );
};

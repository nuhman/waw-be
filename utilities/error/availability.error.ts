import { FastifyReply } from "fastify";
import logger from "../logger.js";

interface ErrorObj {
  CODE: string;
  MESSAGE: string;
  ERR?: any;
}

const error = (
  reply: FastifyReply,
  requestId: string,
  errorObj: ErrorObj,
  status: number,
  stackTrace?: unknown
) => {
  logger.warn(requestId, {
    requestId,
    msg: errorObj.MESSAGE,
    stackTrace,
    timestamp: new Date().toISOString(),
  });
  return reply.code(status).send({
    errorCode: errorObj.CODE,
    errorMessage: errorObj.MESSAGE,
  });
};

export const availabilityError = (
  errorCode: number,
  reply: FastifyReply,
  requestId: string,
  errorObj: ErrorObj,
  stackTrace?: unknown
) => {
  return error(reply, requestId, errorObj, errorCode, stackTrace);
};

import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { FastifyJWT } from "@fastify/jwt";
import { ERROR_CODES } from "../utilities/consts/error.const.js";

export const authDecoratorFactory = (fastify: FastifyInstance<any>) => {
  return {
    authDecorator: async (request: FastifyRequest, reply: FastifyReply) => {
      const errorResponse = {
        code: ERROR_CODES.AUTH.USER.AUTH_REQUIRED.CODE,
        message: ERROR_CODES.AUTH.USER.AUTH_REQUIRED.MESSAGE,
      };
      try {
        const token = request.cookies.access_token;
        if (!token) {
          return reply.status(401).send(errorResponse);
        }

        // Verify the JWT token from the cookie using async/await
        const decoded = await fastify.jwt.verify<FastifyJWT["user"]>(token);
        request.user = decoded;
      } catch (err) {
        reply.send({ errorResponse, err });
      }
    },
  };
};

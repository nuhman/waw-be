import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { FastifyJWT } from "@fastify/jwt";
import { ERROR_CODES } from "../utilities/consts/error.const.js";
import logger from "../utilities/logger.js";

/**
 * Creates authentication decorators for use with Fastify routes.
 *
 * @param {FastifyInstance} fastify - The Fastify instance.
 * @returns {Object} An object containing the authDecorator function.
 */
export const authDecoratorFactory = (fastify: FastifyInstance<any>) => {
  return {
    // Middleware to authenticate requests based on JWT tokens
    authDecorator: async (request: FastifyRequest, reply: FastifyReply) => {
      const decoratorName = "authDecorator";
      const errorResponse = {
        code: ERROR_CODES.AUTH.USER.AUTH_REQUIRED.CODE,
        message: ERROR_CODES.AUTH.USER.AUTH_REQUIRED.MESSAGE,
      };
      const logError = {
        message: errorResponse.message,
        url: request.url,
      };
      try {
        // Extract the JWT access token from the request cookies.
        const token = request.cookies.access_token;
        // If no token is found, return an unauthorized response.
        if (!token) {
          logger.error(decoratorName, { code: "no-token", error: logError });
          return reply.status(401).send(errorResponse);
        }

        // Verify the JWT token. Returns all the previously encoded token payload like user info
        const decoded = await fastify.jwt.verify<FastifyJWT["user"]>(token);

        // check if user have logged out after this token was issued.
        const userQuery = await fastify.pg.query(
          "SELECT last_logout_at FROM users WHERE userid = $1 LIMIT 1",
          [decoded.userid]
        );

        // If no user is found, or the token was issued before the last logout, return unauthorized.
        if (!decoded.iat || userQuery.rowCount === 0) {
          logger.error(decoratorName, {
            code: "no-iat-or-userid-notfound",
            error: logError,
          });
          return reply.status(401).send(errorResponse);
        }
        const user: { last_logout_at: string | null } = userQuery.rows[0];
        if (user.last_logout_at) {
          const lastLogoutAtDate = new Date(user.last_logout_at);
          if (decoded.iat < Math.floor(lastLogoutAtDate.getTime() / 1000)) {
            logger.error(decoratorName, {
              code: "token-expired",
              error: logError,
            });

            return reply.status(401).send(errorResponse);
          }
        }

        // this is an authenticated request
        // Attach the decoded user to the request object for use in subsequent handlers.
        request.user = decoded;
      } catch (err) {
        logger.error(decoratorName, { code: "exception", error: logError });
        reply.status(401).send({
          code: ERROR_CODES.AUTH.USER.TOKEN_EXPIRED.CODE,
          message: ERROR_CODES.AUTH.USER.TOKEN_EXPIRED.MESSAGE,
        });
      }
    },
  };
};

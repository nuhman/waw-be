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

        const userQuery = await fastify.pg.query(
          "SELECT last_logout_at FROM users WHERE userid = $1 LIMIT 1",
          [decoded.userid]
        );

        if (!decoded.iat || userQuery.rowCount === 0) {
          return reply.status(401).send(errorResponse);
        }
        const user: { last_logout_at: string | null } = userQuery.rows[0];

        if (user.last_logout_at) {
          const lastLogoutAtDate = new Date(user.last_logout_at);
          if (decoded.iat < Math.floor(lastLogoutAtDate.getTime() / 1000)) {
            return reply.status(401).send(errorResponse);
          }
        }

        request.user = decoded;
      } catch (err) {
        reply.status(401).send({
          code: ERROR_CODES.AUTH.USER.TOKEN_EXPIRED.CODE,
          message: ERROR_CODES.AUTH.USER.TOKEN_EXPIRED.MESSAGE,
        });
      }
    },
  };
};

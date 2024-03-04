// Type Declaration file to extend application wide globals like "fastify" etc.
import { JWT } from "@fastify/jwt";

declare module "fastify" {
  interface FastifyRequest {
    jwt: JWT;
  }
  export interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

type UserPayload = {
  userid: string;
  email: string;
  name: string;
  role: Array<string>;
};

declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: UserPayload;
  }
}

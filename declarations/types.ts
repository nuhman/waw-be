// Type Declaration file to extend application wide globals like "fastify" etc.
import { JWT } from "@fastify/jwt";
import { Transporter } from "nodemailer";

declare module "fastify" {
  interface FastifyRequest {
    jwt: JWT;
  }
  export interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    emailTransport: Transporter<any> | null;
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
    user: UserPayload & {
      iat?: number;
      exp?: number;
      aud?: string | string[];
      iss?: string;
      sub?: string;
    };
  }
}

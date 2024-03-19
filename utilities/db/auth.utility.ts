import { FastifyInstance, FastifyReply } from "fastify";
import { Transporter } from "nodemailer";
import { nanoid } from "nanoid";

import logger from "../logger.js";
import { RegisterUserInput } from "../../schemas/auth.schema.js";
import { GLOBAL, MESSAGES } from "../consts/app.const.js";
import { hashPassword } from "../auth.utitily.js";
import { generateShortId } from "../app.utility.js";
import { transporterFailureError } from "../error/auth.utility.js";
import { formatEmailOptions, sendEmail } from "../email.utility.js";
import { EmailOptionsInput } from "../../schemas/email.schema.js";

export const checkUserExistsByEmail = async (
  fastify: FastifyInstance,
  email: string
): Promise<boolean> => {
  const res = await fastify.pg.query(
    "SELECT 1 FROM users WHERE email = $1 LIMIT 1",
    [email]
  );
  return !!(res?.rowCount && res.rowCount > 0);
};

const createNewUser = async (body: RegisterUserInput) => {
  const userid = nanoid();
  const createdAt = new Date().toISOString();
  const role = [GLOBAL.userRole];
  const hashedPassword = await hashPassword(body.password);
  return {
    userid,
    name: body.name,
    email: body.email,
    passwordhash: hashedPassword,
    created_at: createdAt,
    updated_at: createdAt,
    role,
    last_logout_at: null,
  };
};

const createOtpToken = (validMinsStr: string | undefined) => {
  const token = generateShortId();
  const tokenValidMinutes = validMinsStr ?? 1;
  const expiryMinutes = Number(tokenValidMinutes) * 60 * 1000;
  const tokenExpiryAt = new Date(
    new Date().getTime() + expiryMinutes
  ).toISOString();

  return {
    token,
    tokenExpiryAt,
  };
};

const deliverEmail = async (
  fastify: FastifyInstance,
  reply: FastifyReply,
  requestId: string,
  options: EmailOptionsInput
) => {
  if (process.env.APP_ENV === GLOBAL.appEnv.test) {
    return;
  }

  const transporter: Transporter<any> | null = await fastify.emailTransport;
  if (!transporter) {
    return transporterFailureError(reply, requestId);
  }
  const emailOptions = formatEmailOptions({
    receipentEmail: options.receipentEmail,
    receipentName: options.receipentName,
    key: options.key,
    additionalInfo: options.additionalInfo,
  });

  await sendEmail(transporter, emailOptions);
  logger.info(requestId, {
    requestId,
    msg: MESSAGES.sendEmailVerificationCode,
  });
};

export const addNewUser = async (
  fastify: FastifyInstance,
  reply: FastifyReply,
  requestId: string,
  body: RegisterUserInput
) => {
  const user = await createNewUser(body);
  const token = createOtpToken(process.env.TOKEN_EXPIRY_MINUTES);

  const userInsertionQuery = {
    text: `INSERT INTO users (userid, name, email, passwordhash, created_at, updated_at, role, last_logout_at)
            VALUES($1, $2, $3, $4, $5, $6, $7, $8)`,
    values: [
      user.userid,
      user.name,
      user.email,
      user.passwordhash,
      user.created_at,
      user.updated_at,
      user.role,
      null,
    ],
  };
  const userVerificationInsertionQuery = {
    text: `INSERT INTO user_verification (userid, email_token, email_token_expires_at, email_verified_status, phonenumber_token, phonenumber_token_expires_at, phonenumber_verified_status)
            VALUES($1, $2, $3, $4, $5, $6, $7)`,
    values: [
      user.userid,
      token.token,
      token.tokenExpiryAt,
      false,
      token.token,
      token.tokenExpiryAt,
      false,
    ],
  };

  await deliverEmail(fastify, reply, requestId, {
    receipentEmail: user.email,
    receipentName: user.name,
    key: "ev",
    additionalInfo: {
      emailToken: token.token,
    },
  });

  await fastify.pg.query(userInsertionQuery);
  logger.info(requestId, {
    requestId,
    msg: MESSAGES.userRecordsAdded,
  });

  await fastify.pg.query(userVerificationInsertionQuery);
  logger.info(requestId, {
    requestId,
    msg: MESSAGES.userVerificationRecordsAdded,
    timestamp: new Date().toISOString(),
  });

  return reply.code(201).send({
    userid: user.userid,
    name: user.name,
    email: user.email,
    role: user.role,
  });
};

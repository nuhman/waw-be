import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Transporter } from "nodemailer";
import { QueryResult } from "pg";
import { nanoid } from "nanoid";

import logger from "../logger.js";
import {
  EmailVerificationInput,
  PasswordChangeSchema,
  PasswordResetInitReqSchema,
  PasswordResetVerifySchema,
  RegisterUserInput,
  UserCompleteSchema,
  UserEmailUpdateInitSchema,
  UserUpdateSchema,
} from "../../schemas/auth.schema.js";
import { GLOBAL, MESSAGES } from "../consts/app.const.js";
import { hashPassword, matchPassword } from "../auth.utitily.js";
import { generateShortId } from "../app.utility.js";
import { authError } from "../error/auth.error.js";
import { formatEmailOptions, sendEmail } from "../email.utility.js";
import { EmailOptionsInput } from "../../schemas/email.schema.js";
import { ERROR_CODES } from "../consts/error.const.js";

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
    return authError(
      500,
      reply,
      requestId,
      ERROR_CODES.AUTH.SIGNUP.EMAIL_TRANSPORTER_FAILURE
    );
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

export const getAllUsers = async (
  fastify: FastifyInstance,
  requestId: string
) => {
  const { rows } = await fastify.pg.query("SELECT * FROM users");
  logger.info(requestId, {
    requestId,
    msg: MESSAGES.executionCompleted,
    timestamp: new Date().toISOString(),
  });
  return rows;
};

export const getUserByEmail = async (
  fastify: FastifyInstance,
  email: string
): Promise<QueryResult<any>> => {
  const userQuery = await fastify.pg.query(
    "SELECT * FROM users WHERE email = $1 LIMIT 1",
    [email]
  );
  return userQuery;
};

export const getEmailByUserId = async (
  fastify: FastifyInstance,
  userid: string
): Promise<QueryResult<any>> => {
  const userQuery = await fastify.pg.query(
    "SELECT email FROM users WHERE userid = $1 LIMIT 1",
    [userid]
  );
  return userQuery;
};

const getUseryUserId = async (
  fastify: FastifyInstance,
  userid: string
): Promise<UserCompleteSchema | null> => {
  const query = await fastify.pg.query(
    "SELECT * FROM users WHERE userid = $1 LIMIT 1",
    [userid]
  );

  if (query.rowCount === 0) {
    return null;
  }
  return query.rows[0];
};

export const getEmailVerificationStatus = async (
  fastify: FastifyInstance,
  userid: string
): Promise<QueryResult<any>> => {
  const userVerificationQuery = await fastify.pg.query(
    "SELECT email_verified_status FROM user_verification WHERE userid = $1 LIMIT 1",
    [userid]
  );
  return userVerificationQuery;
};

export const logoutUser = async (
  fastify: FastifyInstance,
  reply: FastifyReply,
  requestId: string,
  userId: string
) => {
  // update last_logout_at column value for the given user
  await fastify.pg.query(
    "UPDATE users SET last_logout_at = $1 WHERE userid = $2",
    [new Date().toISOString(), userId]
  );

  logger.info(requestId, {
    requestId,
    msg: MESSAGES.lastLogoutUpdated,
  });

  // clear the access token cookie
  const isLocalEnv = process.env.APP_ENV === GLOBAL.appEnv.local;
  reply.clearCookie(GLOBAL.authCookie.name, {
    path: GLOBAL.authCookie.path,
    httpOnly: !isLocalEnv,
    secure: !isLocalEnv,
    sameSite: GLOBAL.authCookie.sameSite as
      | boolean
      | "strict"
      | "lax"
      | "none"
      | undefined,
  });

  // log out was successful
  logger.info(requestId, {
    requestId,
    msg: MESSAGES.executionCompleted,
    timestamp: new Date().toISOString(),
  });

  return reply.code(200).send(MESSAGES.logoutSuccess);
};

export const isUserTokenValid = async (
  fastify: FastifyInstance,
  body: EmailVerificationInput
) => {
  const res = await fastify.pg.query(
    "SELECT 1 FROM user_verification WHERE userid = $1 AND email_token = $2 AND email_token_expires_at > NOW() LIMIT 1",
    [body.userid, body.verificationCode]
  );
  return res;
};

export const setUserTokenValid = async (
  fastify: FastifyInstance,
  userid: string
) => {
  await fastify.pg.query(
    "UPDATE user_verification SET email_verified_status = true WHERE userid = $1",
    [userid]
  );
};

export const verifyUserEmailToken = async (
  fastify: FastifyInstance,
  reply: FastifyReply,
  requestId: string,
  body: EmailVerificationInput
) => {
  const isValidated = await isUserTokenValid(fastify, body);

  // code is valid
  if (isValidated?.rowCount && isValidated.rowCount > 0) {
    // so, update email_verified status to true
    setUserTokenValid(fastify, body.userid);

    logger.info(requestId, {
      requestId,
      msg: MESSAGES.emailVerifySuccess.message,
      timestamp: new Date().toISOString(),
    });

    return reply.code(200).send(MESSAGES.emailVerifySuccess);
  }

  // code is invalid
  return authError(
    401,
    reply,
    requestId,
    ERROR_CODES.AUTH.LOGIN.EMAIL_VERIFY_FAILURE
  );
};

export const resendEmailVerificationCode = async (
  fastify: FastifyInstance,
  reply: FastifyReply,
  requestId: string,
  userid: string
) => {
  const token = createOtpToken(process.env.TOKEN_EXPIRY_MINUTES);
  const emailRes = await getEmailByUserId(fastify, userid);

  if (!emailRes.rowCount || emailRes.rowCount === 0) {
    return authError(
      400,
      reply,
      requestId,
      ERROR_CODES.AUTH.USER.PASSWORD_RESET.EMAIL_NOT_EXIST
    );
  }

  await deliverEmail(fastify, reply, requestId, {
    receipentEmail: (emailRes.rows && emailRes.rows[0].email) || "",
    receipentName: (emailRes.rows && emailRes.rows[0].email) || "",
    key: "ev",
    additionalInfo: {
      emailToken: token.token,
    },
  });

  const emailVerificationQuery = {
    text: `UPDATE user_verification SET email_token = $1, email_token_expires_at = $2, email_verified_status = $3 WHERE userid = $4`,
    values: [token.token, token.tokenExpiryAt, false, userid],
  };

  await fastify.pg.query(emailVerificationQuery);
  logger.info(requestId, {
    requestId,
    msg: MESSAGES.emailtokenRegenerated,
    timestamp: new Date().toISOString(),
  });

  return reply.code(200).send(MESSAGES.emailVerifyCodeReset);
};

const getQueryClausesAndValues = (payload: {
  [key: string]: any;
}): {
  setClauses: string[];
  values: (string | string[] | undefined)[];
} => {
  // Construct the update query dynamically based on provided fields
  const setClauses: Array<string> = [];
  const values: Array<string | string[] | undefined> = [];

  Object.keys(payload).forEach((key: string, index: number) => {
    const value: string | string[] | undefined =
      payload[key as keyof typeof payload];
    if (value !== undefined) {
      setClauses.push(`${key} = $${index + 1}`);
      values.push(value);
    }
  });
  return { setClauses, values };
};

export const updateBasicUserDetails = async (
  fastify: FastifyInstance,
  reply: FastifyReply,
  requestId: string,
  body: UserUpdateSchema,
  userid: string
) => {
  const { setClauses, values } = getQueryClausesAndValues(body);

  // No fields provided to update
  if (setClauses.length === 0) {
    logger.warn(requestId, {
      requestId,
      msg: MESSAGES.noUpdateFields,
      timestamp: new Date().toISOString(),
    });
    return reply.code(400).send(MESSAGES.noUpdateFields);
  }

  const queryText = `UPDATE users SET ${setClauses.join(", ")}, updated_at = $${
    setClauses.length + 1
  } WHERE userid = $${
    setClauses.length + 2
  } RETURNING userid, name, email, role`;
  values.push(new Date().toISOString());
  values.push(userid);

  const res = await fastify.pg.query({
    text: queryText,
    values,
  });

  // log out was successful
  logger.info(requestId, {
    requestId,
    msg: MESSAGES.executionCompleted,
    timestamp: new Date().toISOString(),
  });

  return reply.code(200).send(res.rows[0]);
};

export const updateUserPassword = async (
  fastify: FastifyInstance,
  reply: FastifyReply,
  requestId: string,
  body: UserUpdateSchema,
  userid: string
) => {
  if (!(body.password && body.new_password)) {
    logger.warn(requestId, {
      requestId,
      msg: MESSAGES.passwordChangeFieldsRequired,
      timestamp: new Date().toISOString(),
    });
    return reply.code(400).send(MESSAGES.passwordChangeFieldsRequired);
  }
  const user = await getUseryUserId(fastify, userid);
  if (!user) {
    logger.warn(requestId, {
      requestId,
      msg: MESSAGES.userRecordNotExist,
      timestamp: new Date().toISOString(),
    });
    return reply.code(400).send(MESSAGES.userRecordNotExist);
  }

  const passwordIsValid = await matchPassword(
    body.password || "",
    user.passwordhash
  );

  if (!passwordIsValid) {
    logger.warn(requestId, {
      requestId,
      msg: MESSAGES.currentPwdIncorrect,
      timestamp: new Date().toISOString(),
    });
    return reply.code(400).send(MESSAGES.currentPwdIncorrect);
  }

  // Hash new password
  const hashedNewPassword = await hashPassword(body.new_password || "");

  await fastify.pg.query(
    "UPDATE users SET passwordhash = $1, updated_at = $2 WHERE userid = $3",
    [hashedNewPassword, new Date().toISOString(), user.userid]
  );

  logger.info(requestId, {
    requestId,
    userid: user.userid,
    msg: "User Password Changed",
    timestamp: new Date().toISOString(),
  });

  return await logoutUser(fastify, reply, requestId, userid);
};

export const updateEmailInit = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  requestId: string,
  body: UserEmailUpdateInitSchema
) => {
  const user = request.user;
  // make sure new_email is not already present in the system
  const userQueryRes = await getUserByEmail(fastify, body.new_email);

  if (userQueryRes.rowCount !== 0) {
    logger.warn(requestId, {
      requestId,
      msg: ERROR_CODES.AUTH.SIGNUP.DUPLICATE_EMAIL.MESSAGE,
      timestamp: new Date().toISOString(),
    });
    return reply
      .code(400)
      .send(ERROR_CODES.AUTH.SIGNUP.DUPLICATE_EMAIL.MESSAGE);
  }

  const token = createOtpToken(process.env.TOKEN_EXPIRY_MINUTES);

  await deliverEmail(fastify, reply, requestId, {
    receipentEmail: body.new_email,
    receipentName: user.name,
    key: "ev",
    additionalInfo: {
      emailToken: token.token,
    },
  });

  await fastify.pg.query("DELETE FROM emails WHERE userid = $1", [user.userid]);

  const newEmailQuery = {
    text: `INSERT INTO emails (userid, current_email, new_email, email_token, email_token_expires_at, new_mail_verified)
    VALUES($1, $2, $3, $4, $5, $6)`,
    values: [
      user.userid,
      user.email,
      body.new_email,
      token.token,
      token.tokenExpiryAt,
      false,
    ],
  };

  await fastify.pg.query(newEmailQuery);
  return reply.code(200).send(MESSAGES.emailTempUpdateSuccess);
};

const isEmailUpdateTokenValid = async (
  fastify: FastifyInstance,
  userid: string,
  token: string
) => {
  const res = await fastify.pg.query(
    "SELECT 1 FROM emails WHERE userid = $1 AND email_token = $2 AND email_token_expires_at > NOW() LIMIT 1",
    [userid, token]
  );
  return res;
};

const setEmailUpdateTokenValid = async (
  fastify: FastifyInstance,
  userid: string
) => {
  const newEmailRow = await fastify.pg.query(
    "UPDATE emails SET new_mail_verified = true WHERE userid = $1 RETURNING new_email",
    [userid]
  );

  await fastify.pg.query(
    "UPDATE users SET email = $1, updated_at = $2 WHERE userid = $3",
    [newEmailRow.rows[0].new_email, new Date().toISOString(), userid]
  );

  return newEmailRow;
};

export const updateEmailVerify = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  requestId: string,
  body: EmailVerificationInput
) => {
  const isValidated = await isEmailUpdateTokenValid(
    fastify,
    request.user.userid,
    body.verificationCode
  );

  // code is valid
  if (isValidated?.rowCount && isValidated.rowCount > 0) {
    // so, update email_verified status to true
    setEmailUpdateTokenValid(fastify, request.user.userid);

    logger.info(requestId, {
      requestId,
      msg: MESSAGES.emailVerifySuccess.message,
      timestamp: new Date().toISOString(),
    });

    return reply.code(200).send(MESSAGES.emailVerifySuccess);
  }

  // code is invalid
  return authError(
    401,
    reply,
    requestId,
    ERROR_CODES.AUTH.LOGIN.EMAIL_VERIFY_FAILURE
  );
};

export const forgotPasswordResetInit = async (
  fastify: FastifyInstance,
  reply: FastifyReply,
  requestId: string,
  body: PasswordResetInitReqSchema
) => {
  const userQueryRes = await getUserByEmail(fastify, body.email);
  if (userQueryRes.rowCount === 0) {
    logger.warn(requestId, {
      requestId,
      msg: MESSAGES.emailNotExist.message,
      timestamp: new Date().toISOString(),
    });
    return reply.code(400).send(MESSAGES.emailNotExist);
  }

  const user: UserCompleteSchema = userQueryRes.rows[0];
  const token = createOtpToken(process.env.TOKEN_EXPIRY_MINUTES);
  await deliverEmail(fastify, reply, requestId, {
    receipentEmail: body.email,
    receipentName: user.name,
    key: "ev",
    additionalInfo: {
      emailToken: token.token,
    },
  });

  const passwordResetRequestQuery = {
    text: `INSERT INTO password_reset_requests (userid, reset_code, reset_code_expires_at)
    VALUES($1, $2, $3)`,
    values: [user.userid, token.token, token.tokenExpiryAt],
  };

  await fastify.pg.query(
    "DELETE FROM password_reset_requests WHERE userid = $1",
    [user.userid]
  );

  await fastify.pg.query(passwordResetRequestQuery);

  logger.info(requestId, {
    requestId,
    userid: user.userid,
    msg: MESSAGES.passwordResetInit.message,
    timestamp: new Date().toISOString(),
  });

  return reply.code(200).send(MESSAGES.passwordResetInit);
};

export const forgotPasswordResetVerify = async (
  fastify: FastifyInstance,
  reply: FastifyReply,
  requestId: string,
  body: PasswordResetVerifySchema
) => {
  const userQueryRes = await getUserByEmail(fastify, body.email);
  if (userQueryRes.rowCount === 0) {
    logger.warn(requestId, {
      requestId,
      msg: MESSAGES.emailNotExist.message,
      timestamp: new Date().toISOString(),
    });
    return reply.code(400).send(MESSAGES.emailNotExist);
  }

  const user: UserCompleteSchema = userQueryRes.rows[0];

  // Check if the code matches and is not expired
  const res = await fastify.pg.query(
    "SELECT 1 FROM password_reset_requests WHERE userid = $1 AND reset_code = $2 AND reset_code_expires_at > NOW() AND is_verified = FALSE LIMIT 1",
    [user.userid, body.verificationCode]
  );

  // code is valid
  if (res?.rowCount && res.rowCount > 0) {
    // so, update verified status to true
    await fastify.pg.query(
      "UPDATE password_reset_requests SET status = $1, is_verified = $2 WHERE userid = $3",
      ["completed", true, user.userid]
    );

    logger.info(requestId, {
      requestId,
      msg: MESSAGES.emailVerifySuccess.message,
      timestamp: new Date().toISOString(),
    });

    return reply.code(200).send(MESSAGES.emailVerifySuccess);
  }

  // code is invalid
  return authError(
    401,
    reply,
    requestId,
    ERROR_CODES.AUTH.LOGIN.EMAIL_VERIFY_FAILURE
  );
};

export const forgotPasswordChange = async (
  fastify: FastifyInstance,
  reply: FastifyReply,
  requestId: string,
  body: PasswordChangeSchema
) => {
  const userQueryRes = await getUserByEmail(fastify, body.email);
  if (userQueryRes.rowCount === 0) {
    logger.warn(requestId, {
      requestId,
      msg: MESSAGES.emailNotExist.message,
      timestamp: new Date().toISOString(),
    });
    return reply.code(400).send(MESSAGES.emailNotExist);
  }

  const user: UserCompleteSchema = userQueryRes.rows[0];

  // Check if the password request is verified
  const res = await fastify.pg.query(
    "SELECT 1 FROM password_reset_requests WHERE userid = $1 AND is_verified = TRUE LIMIT 1",
    [user.userid]
  );

  // request is verified
  if (res?.rowCount && res.rowCount > 0) {
    // Hash new password
    const hashedNewPassword = await hashPassword(body.password);

    await fastify.pg.query(
      "UPDATE users SET passwordhash = $1, updated_at = $2 WHERE userid = $3",
      [hashedNewPassword, new Date().toISOString(), user.userid]
    );

    await fastify.pg.query(
      "DELETE FROM password_reset_requests WHERE userid = $1",
      [user.userid]
    );

    logger.info(requestId, {
      requestId,
      userid: user.userid,
      msg: MESSAGES.userUpdateSuccess.message,
      timestamp: new Date().toISOString(),
    });
    return reply.code(200).send(MESSAGES.userUpdateSuccess);
  }

  // not verified
  return authError(
    401,
    reply,
    requestId,
    ERROR_CODES.AUTH.USER.PASSWORD_RESET.NOT_REQUESTED
  );
};

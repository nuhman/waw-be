import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";

// data required from user for registration
const registerUserSchema = z.object({
  name: z.string(),
  email: z
    .string({
      invalid_type_error: "email must be a string",
    })
    .email(),
  password: z.string().min(6),
});

// registration user schema to be used in the route request body
export type RegisterUserInput = z.infer<typeof registerUserSchema>;

const registerUserSuccessSchema = z.object({
  userid: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.array(z.string()),
});

// data required from user for logging in
const loginUserSchema = z.object({
  email: z
    .string({
      required_error: "email is required for logging in!",
      invalid_type_error: "email must be a string",
    })
    .email(),
  password: z.string().min(6),
});

export type LoginUserInput = z.infer<typeof loginUserSchema>;

// data returned upon successful login
const loginUserSuccessSchema = z.object({
  accessToken: z.string(),
});

const authFailureSchema = z.object({
  errorCode: z.string(),
  errorMessage: z.string(),
});

const userSchema = z.array(
  z.object({
    name: z.string(),
    email: z.string(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    role: z.array(z.string()),
    userid: z.string(),
  })
);

const userWithPwdHashSchema = z.object({
  name: z.string(),
  email: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  role: z.array(z.string()),
  userid: z.string(),
  passwordhash: z.string(),
  last_logout_at: z.string().datetime().nullable(),
});

export type UserCompleteSchema = z.infer<typeof userWithPwdHashSchema>;

const emailVerificationRequestSchema = z.object({
  userid: z.string(),
  verificationCode: z.string(),
});

export type EmailVerificationInput = z.infer<
  typeof emailVerificationRequestSchema
>;

const emailVerificationSuccessSchema = z.object({
  message: z.string(),
});

const emailVerificationResetRequestSchema = z.object({
  userid: z.string(),
});

export type EmailVerificationResetInput = z.infer<
  typeof emailVerificationResetRequestSchema
>;

const updateUserBasicSchema = z.object({
  name: z.string().optional(),
  role: z.array(z.string()).optional(),
});

export type UserUpdateBasicSchema = z.infer<typeof updateUserBasicSchema>;

const updateUserPasswordSchema = z.object({
  password: z.string().min(6).optional(),
  new_password: z.string().min(6).optional(),
});

const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z
    .string({
      invalid_type_error: "email must be a string",
    })
    .email()
    .optional(),
  password: z.string().min(6).optional(),
  new_password: z.string().min(6).optional(),
});

export type UserUpdateSchema = z.infer<typeof updateUserSchema>;

const updateUserSuccessSchema = z.object({
  message: z.string(),
});

const updateEmailInitRequestSchema = z.object({
  new_email: z.string().email(),
});

export type UserEmailUpdateInitSchema = z.infer<
  typeof updateEmailInitRequestSchema
>;

const updateEmailInitSuccessSchema = z.object({
  message: z.string(),
});

const updateEmailVerifyRequestSchema = z.object({
  verificationCode: z.string(),
});

export type UserEmailUpdateVerifySchema = z.infer<
  typeof updateEmailInitRequestSchema
>;

const resetPwdInitRequestSchema = z.object({
  email: z.string().email(),
});

export type PasswordResetInitReqSchema = z.infer<
  typeof resetPwdInitRequestSchema
>;

const resetPwdVerifySchema = z.object({
  email: z.string().email(),
  verificationCode: z.string(),
});

export type PasswordResetVerifySchema = z.infer<typeof resetPwdVerifySchema>;

const changePwdSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type PasswordChangeSchema = z.infer<typeof changePwdSchema>;

export const { schemas: authSchemas, $ref } = buildJsonSchemas({
  registerUserSchema,
  registerUserSuccessSchema,
  loginUserSchema,
  loginUserSuccessSchema,
  authFailureSchema,
  userSchema,
  emailVerificationRequestSchema,
  emailVerificationSuccessSchema,
  emailVerificationResetRequestSchema,
  updateUserSchema,
  updateUserSuccessSchema,
  updateUserBasicSchema,
  updateUserPasswordSchema,
  updateEmailInitRequestSchema,
  updateEmailInitSuccessSchema,
  updateEmailVerifyRequestSchema,
  resetPwdInitRequestSchema,
  resetPwdVerifySchema,
  changePwdSchema,
});

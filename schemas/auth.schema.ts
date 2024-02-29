import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";

// data required from user for registration
const registerUserSchema = z.object({
  name: z.string(),
  email: z.string(),
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

export const { schemas: authSchemas, $ref } = buildJsonSchemas({
  registerUserSchema,
  registerUserSuccessSchema,
  loginUserSchema,
  loginUserSuccessSchema,
  authFailureSchema,
  userSchema,
});

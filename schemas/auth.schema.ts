import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";

// data required from user for registration
const registerUserSchema = z.object({
  email: z.string(),
  password: z.string().min(6),
});

// registration user schema to be used in the route request body
export type RegisterUserInput = z.infer<typeof registerUserSchema>;

const registerUserSuccessSchema = z.object({
  _id: z.string(),
  email: z.string(),
  roles: z.array(z.string()),
});

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

const loginUserSuccessSchema = z.object({
  accessToken: z.string(),
});

const authFailureSchema = z.object({
  errorCode: z.string(),
  errorMessage: z.string(),
});

export const { schemas: authSchemas, $ref } = buildJsonSchemas({
  registerUserSchema,
  registerUserSuccessSchema,
  loginUserSchema,
  loginUserSuccessSchema,
  authFailureSchema,
});

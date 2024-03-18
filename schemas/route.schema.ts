import { $ref } from "./auth.schema.js";

export const RouteSchemas = {
  registerSchema: {
    schema: {
      description: "Sign up a new user",
      tags: ["User", "SignUp"],
      summary: "Sign up a new user",
      body: $ref("registerUserSchema"),
      response: {
        200: $ref("registerUserSuccessSchema"),
        409: $ref("authFailureSchema"),
      },
    },
  },
  userSchema: {
    schema: {
      description: "Get all users registered on the application",
      tags: ["User"],
      summary: "Get all users registered on the application",
      response: {
        200: $ref("userSchema"),
        409: $ref("authFailureSchema"),
      },
    },
  },
  loginSchema: {
    schema: {
      description: "Log In a valid user",
      tags: ["User", "Login"],
      summary:
        "Log In a user if valid credentials are provided by setting jwt token cookie",
      body: $ref("loginUserSchema"),
      response: {
        200: $ref("loginUserSuccessSchema"),
        409: $ref("authFailureSchema"),
      },
    },
  },
  verifyEmailSchema: {
    schema: {
      description: "Verify email of a signed up user",
      tags: ["User", "SignUp", "Verification"],
      summary: "Verify email of a signed up user",
      body: $ref("emailVerificationRequestSchema"),
      response: {
        200: $ref("emailVerificationSuccessSchema"),
        409: $ref("authFailureSchema"),
      },
    },
  },
  verifyEmailResetSchema: {
    schema: {
      description: "Reset and send email verification code",
      tags: ["User", "SignUp", "Verification"],
      summary: "Reset and send email verification code",
      body: $ref("emailVerificationResetRequestSchema"),
      response: {
        200: $ref("emailVerificationSuccessSchema"),
        409: $ref("authFailureSchema"),
      },
    },
  },
  updateUserBasicSchema: {
    schema: {
      description: "Update basic profile details of a logged in user",
      tags: ["User", "Update"],
      summary: "Update basic profile details of a logged in user",
      body: $ref("updateUserBasicSchema"),
      response: {
        200: $ref("registerUserSuccessSchema"),
        409: $ref("authFailureSchema"),
      },
    },
  },
  updateUserPasswordSchema: {
    schema: {
      description: "Update password of a logged in user",
      tags: ["User", "Update"],
      summary: "Update password of a logged in user",
      body: $ref("updateUserPasswordSchema"),
      response: {
        200: $ref("updateUserSuccessSchema"),
        409: $ref("authFailureSchema"),
      },
    },
  },
  updateUserEmailSchema: {
    schema: {
      description: "Initiate  email update of a logged in user",
      tags: ["User", "Update"],
      summary: "Initiate  email update of a logged in user",
      body: $ref("updateEmailInitRequestSchema"),
      response: {
        200: $ref("updateEmailInitSuccessSchema"),
        409: $ref("authFailureSchema"),
      },
    },
  },
  updateUserEmailVerifySchema: {
    schema: {
      description: "Initiate  email update of a logged in user",
      tags: ["User", "Update"],
      summary: "Initiate  email update of a logged in user",
      body: $ref("updateEmailVerifyRequestSchema"),
      response: {
        200: $ref("emailVerificationSuccessSchema"),
        409: $ref("authFailureSchema"),
      },
    },
  },
  resetPasswordInitSchema: {
    schema: {
      description:
        "Initiate  'password reset' / 'password forgot' of a user using email",
      tags: ["User", "Update"],
      summary:
        "Initiate  'password reset' / 'password forgot' of a user using email",
      body: $ref("resetPwdInitRequestSchema"),
      response: {
        200: $ref("emailVerificationSuccessSchema"),
        409: $ref("authFailureSchema"),
      },
    },
  },
  resetPasswordVerifySchema: {
    schema: {
      description:
        "Verify  'password reset' / 'password forgot' of a user using secret token",
      tags: ["User", "Update"],
      summary:
        "Initiate  'password reset' / 'password forgot' of a user using secret token",
      body: $ref("resetPwdVerifySchema"),
      response: {
        200: $ref("emailVerificationSuccessSchema"),
        409: $ref("authFailureSchema"),
      },
    },
  },
  changePasswordSchema: {
    schema: {
      description: "Change password if user forgot it",
      tags: ["User", "Update"],
      summary: "Change password if user forgot it",
      body: $ref("changePwdSchema"),
      response: {
        200: $ref("updateUserSuccessSchema"),
        409: $ref("authFailureSchema"),
      },
    },
  },
};

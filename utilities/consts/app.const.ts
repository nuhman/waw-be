export const MESSAGES = {
  logoutSuccess: {
    message: "User successfully logged out!",
  },
  emailVerifySuccess: {
    message: "Email verification using token completed successfullly",
  },
  emailVerifyCodeReset: {
    message: "New verification code have been sent to your registered email!",
  },
  sendEmailVerificationCode: "Send verification code to the email provided",
  userRecordsAdded: "Added record to the users table",
  userVerificationRecordsAdded: "Added record to the user_verification table",
  lastLogoutUpdated: "Last logout timestamp updated for user to current time",
  emailtokenRegenerated:
    "Email verification token regeneration successfully updated in the database",
  executionCompleted: "Method execution completed",
};

export const GLOBAL = {
  appEnv: {
    local: "local",
    prod: "prod",
  },
  userRole: "user",
  adminRole: "admin",
  authCookie: {
    name: "access_token",
    sameSite: "strict",
    path: "/",
    expiry: "24h",
  },
};



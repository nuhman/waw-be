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
  noUpdateFields: {
    message: "No update fields provided",
  },
  userRecordNotExist: {
    message: "User record does not exist!",
  },
  currentPwdIncorrect: {
    message: "Current password is incorrect.",
  },
  passwordChangeFieldsRequired: {
    message:
      "To change password, both 'password' AND 'new_password' must be provided!",
  },
  userUpdateSuccess: {
    message: "Successfully updated user!",
  },
  emailTempUpdateSuccess: {
    message: "Added new email - verification pending",
  },
  emailNotExist: {
    message: "Given email does not exist in our records",
  },
  passwordResetInit: {
    message:
      "If the email exists in our records, you will receive a secret token in your mailbox",
  },
  sendEmailVerificationCode: "Send verification code to the email provided",
  userRecordsAdded: "Added record to the users table",
  userVerificationRecordsAdded: "Added record to the user_verification table",
  lastLogoutUpdated: "Last logout timestamp updated for user to current time",
  emailtokenRegenerated:
    "Email verification token regeneration successfully updated in the database",
  executionCompleted: "Method execution completed",
  availabilityCreated: "Added weekly availability for user",
};

export const GLOBAL = {
  appEnv: {
    local: "local",
    prod: "prod",
    test: "test",
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

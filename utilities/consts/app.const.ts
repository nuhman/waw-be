export const MESSAGES = {
  logoutSuccess: {
    message: "User successfully logged out!",
  },
  emailVerifySuccess: {
    message: "Email Successfully Verified!",
  },
  emailVerifyCodeReset: {
    message: "New verification code have been sent to your registered email!",
  },
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

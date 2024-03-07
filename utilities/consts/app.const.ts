export const MESSAGES = {
  logoutSuccess: {
    message: "User successfully logged out!",
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

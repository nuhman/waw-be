export const ERROR_CODES = {
  AUTH: {
    SIGNUP: {
      SERVER_ERROR: {
        CODE: "AUTH-100.1",
        MESSAGE: "Signup process failed due to a server error.",
      },
      DUPLICATE_EMAIL: {
        CODE: "AUTH-100.2",
        MESSAGE: "Email already exists.",
      },
    },
    LOGIN: {
      SERVER_ERROR: {
        CODE: "AUTH-101.1",
        MESSAGE: "Login process failed due to a server error.",
      },
      EMAIL_NOT_EXIST: {
        CODE: "AUTH-101.2",
        MESSAGE: "Wrong email and/or password provided!",
      },
      PASSWORD_NOT_MATCH: {
        CODE: "AUTH-101.3",
        MESSAGE: "Wrong email and/or password provided!",
      },
      LOGOUT_ERROR: {
        CODE: "AUTH-101.4",
        MESSAGE: "Unexpected error occured - failed to log out."
      },
      EMAIL_VERIFY_FAILURE: {
        CODE: "AUTH-101.5",
        MESSAGE: "Verification code is invalid/missing/expired"
      }
    },
    USER: {
      FETCH_ALL_USERS: {
        CODE: "AUTH-000.1",
        MESSAGE: "Failed to fetch all users.",
      },
      FETCH_USER_BY_EMAIL: {
        CODE: "AUTH-000.2",
        MESSAGE: "User with the specified email does not exist!",
      },
      FETCH_USER_BY_ID: {
        CODE: "AUTH-000.3",
        MESSAGE: "User with the specified userid does not exist!",
      },
      AUTH_REQUIRED: {
        CODE: "AUTH-000.4",
        MESSAGE: "Authentication required to access this route",
      },
      TOKEN_EXPIRED: {
        CODE: "AUTH-000.5",
        MESSAGE:
          "Authentication failed: 'access_token' cookie missing or expired",
      },
    },
  },
};

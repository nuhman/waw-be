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
        MESSAGE: "Signup process failed due to a server error.",
      },
      CREDENTIAL_MISMATCH: {
        CODE: "AUTH-101.2",
        MESSAGE: "Wrong email and/or password provided!",
      },
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
    },
  },
};

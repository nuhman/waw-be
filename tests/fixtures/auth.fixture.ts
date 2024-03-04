const users = [
  {
    name: "Cristiano Ronaldo",
    email: "ronaldo@mail.com",
    created_at: "2024-02-29T15:24:23.425Z",
    updated_at: "2024-02-29T15:24:23.425Z",
    role: ["admin", "user"],
    userid: "hjF7g9k",
  },
];

const userResponse = {
  rows: users,
};

const emptyUserResponse = {
  rows: [],
};

const registerUserInfo = {
  name: "Cristiano Ronaldo",
  email: "ronaldo@mail.com",
  password: "PlainPassword",
};

const registerSuccessResponse = {
  userid: "jtwrj2B-dghrxNW8p18WE",
  name: "Cristiano Ronaldo",
  email: "ronaldo@mail.com",
  role: ["user"],
};

const email = {
  exists: { rowCount: 1 },
  notExists: { rowCount: 0 },
};

const registerUserInfoInvalidEmail = {
  ...registerUserInfo,
  email: "@mail.com",
};

const registerUserInfoInvalidPwd = {
  ...registerUserInfo,
  password: "fail",
};

const loginUserInfo = {
  email: "ronaldo@mail.com",
  password: "PlainPassword",
};

const loginUserInfoInvalidEmail = {
  ...loginUserInfo,
  email: "nonexistent@mail.com",
};

const loginUserInfoInvalidPwd = {
  ...loginUserInfo,
  password: "invalidPass",
};

const loginEmailQuerySuccessResponse = {
  rowCount: 1,
  rows: [
    {
      userid: "jtwrj2B-dghrxNW8p18WE",
      name: "Cristiano Ronaldo",
      email: "ronaldo@mail.com",
      role: ["user"],
      created_at: "2024-02-29T15:24:23.425Z",
      updated_at: "2024-02-29T15:24:23.425Z",
      passwordhash:
        "$2b$10$69zzzDuPznEG.Ur5xInJ3OI9J/h7Kmba6TRJsI8VJ/e3GT8fFhSD2",
    },
  ],
};

const loginEmailQueryFailureResponse = {
  rowCount: 0,
  rows: [],
};

const loginSuccessResponse = {
  accessToken: "eyJhbGciOiJI.UzI1NiIsInR5cCI6.IkpXVCJ9",
};

// group related values together for export
export const mockUsers = {
  users,
  userResponse,
  emptyUserResponse,
  jwtDecodedUser: registerSuccessResponse,
};

export const mockRegister = {
  registerUserInfo,
  registerSuccessResponse,
  email,
  registerUserInfoInvalidEmail,
  registerUserInfoInvalidPwd,
};

export const mockLogin = {
  loginUserInfo,
  loginUserInfoInvalidEmail,
  loginUserInfoInvalidPwd,
  loginEmailQuerySuccessResponse,
  loginEmailQueryFailureResponse,
  loginSuccessResponse,
};

export const headers = {
  cookie: "access_token=jwtdummytoken",
};

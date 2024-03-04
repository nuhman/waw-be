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

const duplicateEmail = {
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
  duplicateEmail,
  registerUserInfoInvalidEmail,
  registerUserInfoInvalidPwd,
};

export const headers = {
  cookie: "access_token=jwtdummytoken",
};

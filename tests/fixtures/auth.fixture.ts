const sample = {
  name: "Cristiano Ronaldo",
  email: "ronaldo@mail.com",
  created_at: "2024-02-29T15:24:23.425Z",
  updated_at: "2024-02-29T15:24:23.425Z",
  adminRole: "admin",
  userRole: "user",
  userids: ["hjF7g9k", "keqwr67n"],
  plainPassword: "PlainPassword",
  plainPassword2: "PlainPassword2",
  hashedPassword:
    "$2b$10$69zzzDuPznEG.Ur5xInJ3OI9J/h7Kmba6TRJsI8VJ/e3GT8fFhSD2",
  invalidEmail: "@mai.c",
  nonExistentEmail: "nonexistent@mail.com",
  wrongPass: "PasswordWrong",
  invalidPass: "fail",
  jwtToken: "eyJhbGciOiJI.UzI1NiIsInR5cCI6.IkpXVCJ9",
  jwtCookie: "access_token=eyJhbGciOiJI.UzI1NiIsInR5cCI6.IkpXVCJ9",
  jwtIssuedTimeStamps: [{ low: 1709798672, high: 1709798972 }],
  verificationCode: "7A9C01",
};

const users = [
  {
    userid: sample.userids[0],
    name: sample.name,
    email: sample.email,
    created_at: sample.created_at,
    updated_at: sample.updated_at,
    role: [sample.adminRole, sample.userRole],
  },
];

const usersWithLogoutInfo = [
  {
    ...users,
    last_logout_at: null,
  },
];

const userResponse = {
  rows: users,
};

const userResponseWithLogoutInfo = {
  rows: usersWithLogoutInfo,
};

const emptyUserResponse = {
  rows: [],
};

const registerUserInfo = {
  name: sample.name,
  email: sample.email,
  password: sample.plainPassword,
};

const registerSuccessResponse = {
  userid: sample.userids[1],
  name: sample.name,
  email: sample.email,
  role: [sample.userRole],
  iat: sample.jwtIssuedTimeStamps[0].low,
};

const email = {
  exists: { rowCount: 1 },
  notExists: { rowCount: 0 },
};

const registerUserInfoInvalidEmail = {
  ...registerUserInfo,
  email: sample.invalidEmail,
};

const registerUserInfoInvalidPwd = {
  ...registerUserInfo,
  password: sample.invalidPass,
};

const loginUserInfo = {
  email: sample.email,
  password: sample.plainPassword,
};

const loginUserInfoInvalidEmail = {
  ...loginUserInfo,
  email: sample.nonExistentEmail,
};

const loginUserInfoInvalidPwd = {
  ...loginUserInfo,
  password: sample.wrongPass,
};

const loginEmailQuerySuccessResponse = {
  rowCount: 1,
  rows: [
    {
      userid: sample.userids[1],
      name: sample.name,
      email: sample.email,
      role: [sample.userRole],
      created_at: sample.created_at,
      updated_at: sample.updated_at,
      passwordhash: sample.hashedPassword,
    },
  ],
};

const loginEmailQueryFailureResponse = {
  rowCount: 0,
  rows: [],
};

const loginSuccessResponse = {
  accessToken: sample.jwtToken,
};

const loginEmailVerificationCheckSuccess = {
  rowCount: 1,
  rows: [{ email_verified_status: true }],
};

const loginEmailVerificationCheckFailure = {
  rowCount: 1,
  rows: [{ email_verified_status: false }],
};

const emailVerificationRequest = {
  userid: sample.userids[1],
  verificationCode: sample.verificationCode,
};

const emailResetVerificationRequest = {
  userid: sample.userids[1],
};

export const sampleQueryRow = {
  rowExists: {
    rowCount: 1,
  },
  rowNotExists: {
    rowCount: 0,
  },
};

const userBasicUpdateRequest = {
  name: sample.name,
};

const userBasicUpdateResponseSuccess = {
  rows: [
    {
      userid: sample.userids[0],
      name: sample.name,
      email: sample.email,
      role: [sample.userRole, sample.adminRole],
    },
  ],
};

const userPasswordUpdateRequest = {
  password: sample.plainPassword,
  new_password: sample.plainPassword2,
};

// group related values together for export
export const mockUsers = {
  users,
  userResponse,
  userResponseWithLogoutInfo,
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
  loginEmailVerificationCheckSuccess,
  loginEmailVerificationCheckFailure,
};

export const headers = {
  cookie: sample.jwtCookie,
};

export const mockVerification = {
  emailVerificationRequest,
  emailResetVerificationRequest,
};

export const mockUpdate = {
  userBasicUpdateRequest,
  userBasicUpdateResponseSuccess,
  userPasswordUpdateRequest,
};

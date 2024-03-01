CREATE TABLE IF NOT EXISTS users (
  userid VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  passwordhash VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  role VARCHAR(255)[]
);

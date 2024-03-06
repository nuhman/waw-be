CREATE TABLE IF NOT EXISTS users (
  userid VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),  
  passwordhash VARCHAR(255),
  role VARCHAR(255)[],
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  last_logout_at TIMESTAMP WITH TIME ZONE
);

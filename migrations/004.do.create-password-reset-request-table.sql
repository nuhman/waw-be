CREATE TABLE IF NOT EXISTS password_reset_requests (
  request_id SERIAL PRIMARY KEY,
  userid VARCHAR(255) REFERENCES users(userid),
  reset_code VARCHAR(255),
  reset_code_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending', -- Values can be 'pending', 'completed', 'expired'
  is_verified BOOLEAN DEFAULT false
);

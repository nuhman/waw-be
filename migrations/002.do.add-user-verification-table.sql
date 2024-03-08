CREATE TABLE IF NOT EXISTS user_verification (
  userid VARCHAR(255) PRIMARY KEY,    
  email_token VARCHAR(100),
  email_token_expires_at TIMESTAMP WITH TIME ZONE,  
  email_verified_status BOOLEAN DEFAULT false,
  phonenumber_token VARCHAR(255),
  phonenumber_token_expires_at TIMESTAMP WITH TIME ZONE,  
  phonenumber_verified_status BOOLEAN DEFAULT false 
);



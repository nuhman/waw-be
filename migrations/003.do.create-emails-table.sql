CREATE TABLE IF NOT EXISTS emails (
  userid VARCHAR(255) PRIMARY KEY,  
  current_email VARCHAR(255),  
  new_email VARCHAR(255),      
  email_token VARCHAR(100),
  email_token_expires_at TIMESTAMP WITH TIME ZONE,  
  new_mail_verified BOOLEAN DEFAULT false
);

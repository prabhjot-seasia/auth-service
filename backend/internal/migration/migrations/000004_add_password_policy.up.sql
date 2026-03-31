-- Add password policy fields to users table
ALTER TABLE users ADD COLUMN password_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN last_password_change TIMESTAMP;
ALTER TABLE users ADD COLUMN force_password_change BOOLEAN DEFAULT FALSE;

-- Create password history table
CREATE TABLE password_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Create index on user_id for password_histories
CREATE INDEX idx_password_histories_user_id ON password_histories(user_id);
CREATE INDEX idx_password_histories_deleted_at ON password_histories(deleted_at);

-- Create password policy configuration table
CREATE TABLE password_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rotation_days INTEGER DEFAULT 30,
    history_count INTEGER DEFAULT 5,
    min_length INTEGER DEFAULT 8,
    require_uppercase BOOLEAN DEFAULT TRUE,
    require_lowercase BOOLEAN DEFAULT TRUE,
    require_numbers BOOLEAN DEFAULT TRUE,
    require_special_characters BOOLEAN DEFAULT TRUE,
    expiry_warning_days INTEGER DEFAULT 7,
    force_first_login_change BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default password policy
INSERT INTO password_policies (
    rotation_days,
    history_count,
    min_length,
    require_uppercase,
    require_lowercase,
    require_numbers,
    require_special_characters,
    expiry_warning_days,
    force_first_login_change
) VALUES (
    30,   -- Monthly rotation
    5,    -- Remember last 5 passwords
    8,    -- Minimum 8 characters
    TRUE, -- Require uppercase
    TRUE, -- Require lowercase
    TRUE, -- Require numbers
    TRUE, -- Require special characters
    7,    -- Warn 7 days before expiry
    TRUE  -- Force change on first login
);

-- Set initial password expiration for existing users (30 days from now)
UPDATE users 
SET password_expires_at = NOW() + INTERVAL '30 days',
    last_password_change = NOW()
WHERE password_expires_at IS NULL;

-- Set force_password_change to FALSE for seeded test users
UPDATE users
SET force_password_change = FALSE
WHERE force_password_change IS NULL OR force_password_change = TRUE;
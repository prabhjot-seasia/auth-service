-- Migration to add password policy fields to users table
-- These fields may already exist, so we use ALTER TABLE IF EXISTS and handle errors gracefully

-- Add ForcePasswordChange field if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='force_password_change'
    ) THEN
        ALTER TABLE users ADD COLUMN force_password_change BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add LastPasswordChange field if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='last_password_change'
    ) THEN
        ALTER TABLE users ADD COLUMN last_password_change TIMESTAMP;
    END IF;
END $$;

-- Add PasswordExpiresAt field if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='password_expires_at'
    ) THEN
        ALTER TABLE users ADD COLUMN password_expires_at TIMESTAMP;
    END IF;
END $$;

-- Create password_histories table if it doesn't exist
CREATE TABLE IF NOT EXISTS password_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT fk_password_histories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index on user_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_password_histories_user_id ON password_histories(user_id);
CREATE INDEX IF NOT EXISTS idx_password_histories_deleted_at ON password_histories(deleted_at);

-- Create password_policies table if it doesn't exist
CREATE TABLE IF NOT EXISTS password_policies (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default password policy if none exists
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
)
SELECT 30, 5, 8, true, true, true, true, 7, true
WHERE NOT EXISTS (SELECT 1 FROM password_policies LIMIT 1);

-- Set force_password_change to true for existing users who haven't changed their password
UPDATE users 
SET force_password_change = TRUE 
WHERE last_password_change IS NULL;

COMMENT ON COLUMN users.force_password_change IS 'Flag to require password change on next login';
COMMENT ON COLUMN users.last_password_change IS 'Timestamp of last password change';
COMMENT ON COLUMN users.password_expires_at IS 'Timestamp when password expires';
COMMENT ON TABLE password_histories IS 'History of user passwords for preventing reuse';
COMMENT ON TABLE password_policies IS 'Password policy configuration';
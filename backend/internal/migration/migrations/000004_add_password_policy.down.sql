-- Remove password policy configuration
DROP TABLE IF EXISTS password_policies;

-- Remove password history
DROP TABLE IF EXISTS password_histories;

-- Remove password policy fields from users
ALTER TABLE users DROP COLUMN IF EXISTS password_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS last_password_change;
ALTER TABLE users DROP COLUMN IF EXISTS force_password_change;
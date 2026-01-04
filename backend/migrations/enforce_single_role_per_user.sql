-- Enforce single role per user restriction
-- This migration changes the user-role relationship from many-to-many to one-to-many

-- Step 1: Add role_id column directly to users table
ALTER TABLE users ADD COLUMN role_id UUID;

-- Step 2: Add foreign key constraint to roles table
ALTER TABLE users ADD CONSTRAINT fk_users_role 
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;

-- Step 3: Migrate existing data from user_roles to users.role_id
-- For users with multiple roles, keep the first one (by role name alphabetically)
UPDATE users 
SET role_id = (
    SELECT ur.role_id 
    FROM user_roles ur 
    JOIN roles r ON ur.role_id = r.id 
    WHERE ur.user_id = users.id 
    ORDER BY r.name ASC 
    LIMIT 1
)
WHERE id IN (SELECT DISTINCT user_id FROM user_roles);

-- Step 4: Show users that had multiple roles (for reference)
SELECT 
    u.username,
    u.email,
    COUNT(ur.role_id) as role_count,
    STRING_AGG(r.name, ', ' ORDER BY r.name) as roles,
    r_kept.name as role_kept
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN roles r_kept ON u.role_id = r_kept.id
WHERE u.id IN (SELECT user_id FROM user_roles GROUP BY user_id HAVING COUNT(*) > 1)
GROUP BY u.id, u.username, u.email, r_kept.name
ORDER BY u.username;

-- Step 5: Create unique constraint to enforce one role per user
CREATE UNIQUE INDEX idx_users_role_id ON users(id) WHERE role_id IS NOT NULL;

-- Step 6: Drop the old user_roles table (it will be replaced by users.role_id)
DROP TABLE IF EXISTS user_roles;

-- Step 7: Show the new structure
SELECT 'Migration completed - users now have single role_id column' as status;

-- Step 8: Show sample data
SELECT 
    u.username,
    u.email,
    r.name as role,
    u.is_active
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
ORDER BY u.username
LIMIT 10;
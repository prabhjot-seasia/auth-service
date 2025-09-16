-- Rollback documents permission migration
-- This removes documents:read permission and its assignments

-- Step 1: Remove role_permissions for documents:read
DELETE FROM role_permissions 
WHERE permission_id IN (
    SELECT id FROM permissions 
    WHERE resource = 'documents' AND action = 'read'
);

-- Step 2: Remove documents permission
DELETE FROM permissions 
WHERE resource = 'documents' AND action = 'read';

-- Step 3: Remove documents:read from auth-service scopes
UPDATE services 
SET scopes = REPLACE(scopes, ' documents:read', '')
WHERE name = 'auth-service';

-- Step 4: Clean up any leading/trailing spaces in scopes
UPDATE services 
SET scopes = TRIM(scopes)
WHERE name = 'auth-service';
-- Add documents permission and assign to administrator role
-- This enables API documentation access for authorized users

-- Step 1: Add documents permission
INSERT INTO permissions (resource, action) VALUES 
('documents', 'read');

-- Step 2: Get the permission ID for documents:read
-- Step 3: Get the role ID for administrator  
-- Step 4: Grant documents:read permission to administrator role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'administrator' 
AND p.resource = 'documents' 
AND p.action = 'read';

-- Step 5: Update auth-service scopes to include documents:read
UPDATE services 
SET scopes = scopes || ' documents:read'
WHERE name = 'auth-service';
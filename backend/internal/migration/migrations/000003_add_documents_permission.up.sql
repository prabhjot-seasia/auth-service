-- Add documents permission and assign to administrator role
-- This enables API documentation access for authorized users
-- Note: documents permissions and role assignments are now created in migration 002.
-- This migration is kept as a no-op for compatibility with existing deployments.

-- Step 1: Add documents permission (skip if already exists)
INSERT INTO permissions (resource, action) VALUES
('documents', 'read')
ON CONFLICT (resource, action) DO NOTHING;

-- Step 2: Grant documents:read permission to administrator role (skip if already exists)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'administrator'
AND p.resource = 'documents'
AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Step 3: Update auth-service scopes to include documents:read (idempotent)
UPDATE services
SET scopes = scopes || ' documents:read'
WHERE name = 'auth-service'
AND scopes NOT LIKE '%documents:read%';
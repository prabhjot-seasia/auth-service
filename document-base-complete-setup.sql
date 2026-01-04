-- ============================================================================
-- DOCUMENT BASE SERVICE COMPLETE SETUP
-- ============================================================================
-- This SQL script provides complete setup for Document Base service integration
-- with the Authentication Service, including service registration, permissions,
-- and role assignments.
-- 
-- Version: 1.0.0
-- Created: 2025-10-29
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SERVICE REGISTRATION
-- ----------------------------------------------------------------------------
-- Clean up any existing Document Base service registrations
DELETE FROM services WHERE name LIKE '%Document%' OR client_id LIKE '%document%' OR client_id = 'c16c88e2c9e137e2517e72155e8ffe81';

-- Register the Document Base service with proper configuration
INSERT INTO services (
    id, 
    name, 
    client_id, 
    client_secret, 
    redirect_uri, 
    scopes,
    is_active, 
    created_at, 
    updated_at
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Document Base Service',
    'document-base-client',
    'document-base-secret-key-2024',
    'http://localhost:3000/auth/callback',
    'openid profile',
    true,
    NOW(),
    NOW()
);

-- ----------------------------------------------------------------------------
-- 2. PERMISSIONS SETUP
-- ----------------------------------------------------------------------------
-- Add document management permissions
INSERT INTO permissions (resource, action) VALUES 
('documents', 'read'),
('documents', 'write'),
('documents', 'delete')
ON CONFLICT (resource, action) DO NOTHING;

-- Add folder management permissions
INSERT INTO permissions (resource, action) VALUES 
('folders', 'read'),
('folders', 'write')
ON CONFLICT (resource, action) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. ROLE PERMISSIONS ASSIGNMENT
-- ----------------------------------------------------------------------------
-- Grant document permissions to administrator role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'administrator' 
AND p.resource IN ('documents', 'folders')
AND p.action IN ('read', 'write', 'delete')
ON CONFLICT DO NOTHING;

-- Grant folder permissions to document_manager role (if exists)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'document_manager' 
AND p.resource IN ('documents', 'folders')
AND p.action IN ('read', 'write')
ON CONFLICT DO NOTHING;

-- Grant read-only permissions to document_viewer role (if exists)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'document_viewer' 
AND p.resource IN ('documents', 'folders')
AND p.action = 'read'
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. SERVICE SCOPES UPDATE
-- ----------------------------------------------------------------------------
-- Update Document Base service scopes to include all document and folder permissions
UPDATE services 
SET scopes = 'openid profile documents:read documents:write documents:delete folders:read folders:write'
WHERE client_id = 'document-base-client';

-- ----------------------------------------------------------------------------
-- 5. VERIFICATION QUERIES
-- ----------------------------------------------------------------------------
-- Verify service registration
SELECT 
    '=== SERVICE REGISTRATION ===' as section,
    id,
    name,
    client_id,
    client_secret,
    redirect_uri,
    scopes,
    is_active,
    created_at
FROM services 
WHERE client_id = 'document-base-client';

-- Verify permissions were created
SELECT 
    '=== PERMISSIONS CREATED ===' as section,
    resource,
    action,
    created_at
FROM permissions 
WHERE resource IN ('documents', 'folders')
ORDER BY resource, action;

-- Verify role permissions assignments
SELECT 
    '=== ROLE PERMISSIONS ===' as section,
    r.name as role_name,
    p.resource,
    p.action,
    rp.created_at
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
WHERE p.resource IN ('documents', 'folders')
ORDER BY r.name, p.resource, p.action;

-- Show complete service overview
SELECT 
    '=== ALL SERVICES ===' as section,
    id,
    name,
    client_id,
    is_active,
    created_at
FROM services 
ORDER BY created_at DESC;

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- The Document Base service has been successfully configured with:
-- ✅ Service registration with proper OAuth2 credentials
-- ✅ Document and folder permissions created
-- ✅ Role-based access control configured
-- ✅ Service scopes properly defined
-- 
-- Next Steps:
-- 1. Verify the Document Base service can authenticate via OAuth2
-- 2. Test document and folder operations with appropriate roles
-- 3. Monitor service integration logs for any issues
-- ============================================================================
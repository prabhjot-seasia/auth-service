-- Clean up duplicate CSV services and create a single Document Base service
-- This migration consolidates all CSV-related services into one Document Base service

-- Step 1: Remove all existing CSV/document related services
DELETE FROM group_services WHERE service_id IN (
    '33333333-3333-3333-3333-333333333333',  -- Old CSV Policy Manager Service
    '22220001-2222-2222-2222-000000000001',  -- csv-frontend
    '22220002-2222-2222-2222-000000000002'   -- csv-backend-api
);

DELETE FROM services WHERE id IN (
    '33333333-3333-3333-3333-333333333333',  -- Old CSV Policy Manager Service
    '22220001-2222-2222-2222-000000000001',  -- csv-frontend
    '22220002-2222-2222-2222-000000000002'   -- csv-backend-api
);

-- Step 2: Create the unified Document Base service
INSERT INTO services (id, name, client_id, client_secret, redirect_uri, scopes, is_active) VALUES 
(
    '11111111-1111-1111-1111-111111111111', 
    'Document Base',
    'document-base-client',
    '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', -- Hashed "DocBase@Secret123"
    'http://localhost:3000/auth/callback',
    'documents:read documents:write users:read users:write',
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    client_id = EXCLUDED.client_id,
    redirect_uri = EXCLUDED.redirect_uri,
    scopes = EXCLUDED.scopes,
    is_active = EXCLUDED.is_active;

-- Step 3: Update document permissions if they don't exist
INSERT INTO permissions (id, action, resource) VALUES 
(
    '11110001-0001-0001-0001-000000000001',
    'read',
    'documents'
),
(
    '22220002-0002-0002-0002-000000000002',
    'write',
    'documents'
)
ON CONFLICT (resource, action) DO NOTHING;

-- Step 4: Update or create document users group
INSERT INTO groups (id, name, description) VALUES 
(
    'bbbb0000-bbbb-0000-bbbb-000000000000',
    'document_users',
    'Group for users who can access Document Base service'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Step 5: Assign Document Base service to the document users group
INSERT INTO group_services (id, group_id, service_id, scopes) VALUES 
(
    'eeee0000-eeee-0000-eeee-000000000001',
    'bbbb0000-bbbb-0000-bbbb-000000000000',  -- document_users group
    '11111111-1111-1111-1111-111111111111',  -- Document Base service
    'documents:read documents:write users:read users:write'
)
ON CONFLICT (id) DO UPDATE SET
    service_id = EXCLUDED.service_id,
    scopes = EXCLUDED.scopes;

-- Step 6: Update test user names to reflect Document Base instead of CSV
UPDATE users SET 
    username = 'doc_manager',
    email = 'docmanager@example.com',
    first_name = 'Document',
    last_name = 'Manager'
WHERE id = 'ffff0000-ffff-0000-ffff-000000000000';

UPDATE users SET 
    username = 'doc_viewer',
    email = 'docviewer@example.com',
    first_name = 'Document',
    last_name = 'Viewer'
WHERE id = 'gggg0000-gggg-0000-gggg-000000000000';

-- Step 7: Output the new service details
SELECT 
    'Document Base Service Created' as status,
    'document-base-client' as client_id,
    'DocBase@Secret123' as client_secret_plain,
    'http://localhost:3000/auth/callback' as redirect_uri,
    'doc_manager/doc_viewer with Admin@123' as test_users;

-- Step 8: Show all active services after cleanup
SELECT 
    name,
    client_id,
    redirect_uri,
    scopes,
    is_active
FROM services
WHERE is_active = true
ORDER BY name;
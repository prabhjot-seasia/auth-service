-- Add document-base-service for SSO integration

-- Step 1: Create the document service
INSERT INTO services (id, name, client_id, client_secret, redirect_uri, scopes, is_active) VALUES 
(
    '22222222-2222-2222-2222-222222222222', 
    'Document Base Service',
    'doc-service-client-id-123456',
    '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', -- Hashed "DocService@Secret123"
    'http://localhost:3002/auth/callback',
    'read:documents write:documents read:users read:profile',
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    redirect_uri = EXCLUDED.redirect_uri,
    scopes = EXCLUDED.scopes,
    is_active = EXCLUDED.is_active;

-- Step 2: Create a document administrators group
INSERT INTO groups (id, name, description) VALUES 
(
    'aaaa0000-aaaa-0000-aaaa-000000000000',
    'document_administrators',
    'Group for users who can access the document base service'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Step 3: Assign document service to the document administrators group
INSERT INTO group_services (id, group_id, service_id, scopes) VALUES 
(
    'dddd0000-dddd-0000-dddd-000000000000',
    'aaaa0000-aaaa-0000-aaaa-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'read:documents write:documents read:users read:profile'
)
ON CONFLICT (id) DO UPDATE SET
    scopes = EXCLUDED.scopes;

-- Step 4: Create a document admin role
INSERT INTO roles (id, name, description) VALUES 
(
    'bbbb0000-bbbb-0000-bbbb-000000000000',
    'document_administrator',
    'Administrator role for document base service'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Step 5: Assign the document administrators group to the document admin role
INSERT INTO role_groups (role_id, group_id) VALUES 
(
    'bbbb0000-bbbb-0000-bbbb-000000000000',
    'aaaa0000-aaaa-0000-aaaa-000000000000'
)
ON CONFLICT DO NOTHING;

-- Step 6: Create a test user for document service
INSERT INTO users (id, username, email, password, first_name, last_name, is_active) VALUES 
(
    'cccc0000-cccc-0000-cccc-000000000000',
    'doc_admin',
    'docadmin@example.com',
    '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', -- Password: Admin@123
    'Document',
    'Admin',
    true
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    is_active = EXCLUDED.is_active;

-- Step 7: Assign the document admin role to the test user
INSERT INTO user_roles (user_id, role_id) VALUES 
(
    'cccc0000-cccc-0000-cccc-000000000000',
    'bbbb0000-bbbb-0000-bbbb-000000000000'
)
ON CONFLICT DO NOTHING;

-- Step 8: Also give service_admin access to document service (for testing)
INSERT INTO user_roles (user_id, role_id) VALUES 
(
    'cccc5555-cccc-5555-cccc-555555555555', -- service_admin user
    'bbbb0000-bbbb-0000-bbbb-000000000000'  -- document_administrator role
)
ON CONFLICT DO NOTHING;

-- Output the service details
SELECT 
    'Document Service Created' as status,
    'doc-service-client-id-123456' as client_id,
    'DocService@Secret123' as client_secret_plain,
    'http://localhost:3002/auth/callback' as redirect_uri,
    'doc_admin / Admin@123' as test_user;
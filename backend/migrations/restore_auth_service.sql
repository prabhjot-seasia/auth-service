-- Restore the auth-service and add Document Base as a separate service
-- This fixes the issue where we accidentally replaced auth-service with Document Base

-- Step 1: Update the existing service back to auth-service with correct scopes
UPDATE services SET 
    name = 'auth-service',
    client_id = 'auth-service-client', 
    scopes = 'permissions:read users:read users:write roles:read roles:write groups:read groups:write services:read services:write',
    redirect_uri = NULL
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Step 2: Update group_services to point to auth-service scopes
UPDATE group_services SET 
    scopes = 'permissions:read users:read users:write roles:read roles:write groups:read groups:write services:read services:write'
WHERE service_id = '11111111-1111-1111-1111-111111111111';

-- Step 3: Add Document Base as a separate service
INSERT INTO services (id, name, client_id, client_secret, redirect_uri, scopes, is_active) VALUES 
(
    '22222222-2222-2222-2222-222222222222', 
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

-- Step 4: Add Document Base service to the document users group
INSERT INTO group_services (id, group_id, service_id, scopes) VALUES 
(
    'eeee0000-eeee-0000-eeee-000000000002',
    'bbbb0000-bbbb-0000-bbbb-000000000000',  -- document_users group
    '22222222-2222-2222-2222-222222222222',  -- Document Base service
    'documents:read documents:write users:read users:write'
)
ON CONFLICT (id) DO UPDATE SET
    service_id = EXCLUDED.service_id,
    scopes = EXCLUDED.scopes;

-- Step 5: Give admin users access to Document Base by assigning them document_manager role
INSERT INTO user_roles (user_id, role_id) VALUES 
(
    'cccc1111-cccc-1111-cccc-111111111111', -- admin user
    'cccc0000-cccc-0000-cccc-000000000000'  -- document_manager role
)
ON CONFLICT DO NOTHING;

-- Step 6: Verify the services
SELECT 
    'Services restored successfully' as status;

-- Show all active services
SELECT 
    name,
    client_id,
    redirect_uri,
    scopes,
    is_active
FROM services
WHERE is_active = true
ORDER BY name;
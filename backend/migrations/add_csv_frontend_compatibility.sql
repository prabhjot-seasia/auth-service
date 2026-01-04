-- Add compatibility service for existing Document Base service that's configured with old client_id
-- This allows the external Document Base service to work without reconfiguration

-- Insert the service that the Document Base service is expecting
INSERT INTO services (id, name, client_id, client_secret, redirect_uri, scopes, is_active) VALUES 
(
    '22220001-2222-2222-2222-000000000001', 
    'Document Base (CSV Frontend)',
    'csv-frontend-spa-client',
    '', -- Empty secret for public client (SPA)
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

-- Add this service to the document users group so users can access it
INSERT INTO group_services (id, group_id, service_id, scopes) VALUES 
(
    'eeee0000-eeee-0000-eeee-000000000003',
    'bbbb0000-bbbb-0000-bbbb-000000000000',  -- document_users group
    '22220001-2222-2222-2222-000000000001',  -- CSV Frontend service
    'documents:read documents:write users:read users:write'
)
ON CONFLICT (id) DO UPDATE SET
    service_id = EXCLUDED.service_id,
    scopes = EXCLUDED.scopes;

-- Show all active services
SELECT 
    'Compatibility service added' as status;

SELECT 
    name,
    client_id,
    redirect_uri,
    scopes,
    is_active
FROM services
WHERE is_active = true
ORDER BY name;
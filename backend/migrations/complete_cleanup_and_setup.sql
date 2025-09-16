-- Complete Cleanup and Setup Script for Auth Service
-- This script will properly clean up existing data and set up the new permission structure

-- Step 1: Clean up all dependent tables first
DELETE FROM group_services;
DELETE FROM role_groups;
DELETE FROM user_roles;
DELETE FROM user_groups;
DELETE FROM role_permissions;

-- Step 2: Clean up main tables (keep admin user)
DELETE FROM groups;
DELETE FROM roles;
-- Keep admin user but clear other users
DELETE FROM users WHERE username NOT IN ('admin');

-- Step 3: Create Groups with proper naming
INSERT INTO groups (id, name, description, created_at, updated_at) VALUES
-- Administrator groups
('11111111-1111-1111-1111-111111111111', 'administrator', 'Full system administrators with all permissions', NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', 'group_administrator', 'Group administrators with full group management permissions', NOW(), NOW()),
('33333333-3333-3333-3333-333333333333', 'role_administrator', 'Role administrators with full role management permissions', NOW(), NOW()),
('44444444-4444-4444-4444-444444444444', 'user_administrator', 'User administrators with full user management permissions', NOW(), NOW()),
('55555555-5555-5555-5555-555555555555', 'service_administrator', 'Service administrators with full service management permissions', NOW(), NOW()),
-- Read-only administrator groups
('66666666-6666-6666-6666-666666666666', 'group_read_administrator', 'Read-only group administrators', NOW(), NOW()),
('77777777-7777-7777-7777-777777777777', 'role_read_administrator', 'Read-only role administrators', NOW(), NOW()),
('88888888-8888-8888-8888-888888888888', 'user_read_administrator', 'Read-only user administrators', NOW(), NOW()),
('99999999-9999-9999-9999-999999999999', 'service_read_administrator', 'Read-only service administrators', NOW(), NOW());

-- Step 4: Create Roles
INSERT INTO roles (id, name, description, created_at, updated_at) VALUES
-- Administrator roles
('aaaa1111-aaaa-1111-aaaa-111111111111', 'administrator', 'Full system administrator role', NOW(), NOW()),
('aaaa2222-aaaa-2222-aaaa-222222222222', 'group_admin', 'Group administrator role', NOW(), NOW()),
('aaaa3333-aaaa-3333-aaaa-333333333333', 'role_admin', 'Role administrator role', NOW(), NOW()),
('aaaa4444-aaaa-4444-aaaa-444444444444', 'user_admin', 'User administrator role', NOW(), NOW()),
('aaaa5555-aaaa-5555-aaaa-555555555555', 'service_admin', 'Service administrator role', NOW(), NOW()),
-- Read-only roles
('aaaa6666-aaaa-6666-aaaa-666666666666', 'group_reader', 'Group read-only role', NOW(), NOW()),
('aaaa7777-aaaa-7777-aaaa-777777777777', 'role_reader', 'Role read-only role', NOW(), NOW()),
('aaaa8888-aaaa-8888-aaaa-888888888888', 'user_reader', 'User read-only role', NOW(), NOW()),
('aaaa9999-aaaa-9999-aaaa-999999999999', 'service_reader', 'Service read-only role', NOW(), NOW());

-- Step 5: Associate Roles with Groups
INSERT INTO role_groups (role_id, group_id) VALUES
-- Administrator role associations
('aaaa1111-aaaa-1111-aaaa-111111111111', '11111111-1111-1111-1111-111111111111'),
('aaaa2222-aaaa-2222-aaaa-222222222222', '22222222-2222-2222-2222-222222222222'),
('aaaa3333-aaaa-3333-aaaa-333333333333', '33333333-3333-3333-3333-333333333333'),
('aaaa4444-aaaa-4444-aaaa-444444444444', '44444444-4444-4444-4444-444444444444'),
('aaaa5555-aaaa-5555-aaaa-555555555555', '55555555-5555-5555-5555-555555555555'),
-- Read-only role associations
('aaaa6666-aaaa-6666-aaaa-666666666666', '66666666-6666-6666-6666-666666666666'),
('aaaa7777-aaaa-7777-aaaa-777777777777', '77777777-7777-7777-7777-777777777777'),
('aaaa8888-aaaa-8888-aaaa-888888888888', '88888888-8888-8888-8888-888888888888'),
('aaaa9999-aaaa-9999-aaaa-999999999999', '99999999-9999-9999-9999-999999999999');

-- Step 6: Get auth-service ID and assign scopes
DO $$
DECLARE
    auth_service_id UUID;
    admin_user_id UUID;
BEGIN
    SELECT id INTO auth_service_id FROM services WHERE name = 'auth-service';
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin';
    
    -- Assign scopes to groups via group_services
    -- Administrator group - all scopes
    INSERT INTO group_services (group_id, service_id, scopes) VALUES
    ('11111111-1111-1111-1111-111111111111', auth_service_id, 'permissions:read'),
    ('11111111-1111-1111-1111-111111111111', auth_service_id, 'users:read'),
    ('11111111-1111-1111-1111-111111111111', auth_service_id, 'users:write'),
    ('11111111-1111-1111-1111-111111111111', auth_service_id, 'roles:read'),
    ('11111111-1111-1111-1111-111111111111', auth_service_id, 'roles:write'),
    ('11111111-1111-1111-1111-111111111111', auth_service_id, 'groups:read'),
    ('11111111-1111-1111-1111-111111111111', auth_service_id, 'groups:write'),
    ('11111111-1111-1111-1111-111111111111', auth_service_id, 'services:read'),
    ('11111111-1111-1111-1111-111111111111', auth_service_id, 'services:write');
    
    -- Group administrator - permissions:read, groups:read, groups:write
    INSERT INTO group_services (group_id, service_id, scopes) VALUES
    ('22222222-2222-2222-2222-222222222222', auth_service_id, 'permissions:read'),
    ('22222222-2222-2222-2222-222222222222', auth_service_id, 'groups:read'),
    ('22222222-2222-2222-2222-222222222222', auth_service_id, 'groups:write');
    
    -- Role administrator - permissions:read, roles:read, roles:write
    INSERT INTO group_services (group_id, service_id, scopes) VALUES
    ('33333333-3333-3333-3333-333333333333', auth_service_id, 'permissions:read'),
    ('33333333-3333-3333-3333-333333333333', auth_service_id, 'roles:read'),
    ('33333333-3333-3333-3333-333333333333', auth_service_id, 'roles:write');
    
    -- User administrator - permissions:read, users:read, users:write
    INSERT INTO group_services (group_id, service_id, scopes) VALUES
    ('44444444-4444-4444-4444-444444444444', auth_service_id, 'permissions:read'),
    ('44444444-4444-4444-4444-444444444444', auth_service_id, 'users:read'),
    ('44444444-4444-4444-4444-444444444444', auth_service_id, 'users:write');
    
    -- Service administrator - permissions:read, services:read, services:write
    INSERT INTO group_services (group_id, service_id, scopes) VALUES
    ('55555555-5555-5555-5555-555555555555', auth_service_id, 'permissions:read'),
    ('55555555-5555-5555-5555-555555555555', auth_service_id, 'services:read'),
    ('55555555-5555-5555-5555-555555555555', auth_service_id, 'services:write');
    
    -- Read-only administrators
    -- Group read administrator - permissions:read, groups:read
    INSERT INTO group_services (group_id, service_id, scopes) VALUES
    ('66666666-6666-6666-6666-666666666666', auth_service_id, 'permissions:read'),
    ('66666666-6666-6666-6666-666666666666', auth_service_id, 'groups:read');
    
    -- Role read administrator - permissions:read, roles:read
    INSERT INTO group_services (group_id, service_id, scopes) VALUES
    ('77777777-7777-7777-7777-777777777777', auth_service_id, 'permissions:read'),
    ('77777777-7777-7777-7777-777777777777', auth_service_id, 'roles:read');
    
    -- User read administrator - permissions:read, users:read
    INSERT INTO group_services (group_id, service_id, scopes) VALUES
    ('88888888-8888-8888-8888-888888888888', auth_service_id, 'permissions:read'),
    ('88888888-8888-8888-8888-888888888888', auth_service_id, 'users:read');
    
    -- Service read administrator - permissions:read, services:read
    INSERT INTO group_services (group_id, service_id, scopes) VALUES
    ('99999999-9999-9999-9999-999999999999', auth_service_id, 'permissions:read'),
    ('99999999-9999-9999-9999-999999999999', auth_service_id, 'services:read');
    
    -- Associate existing admin user with administrator role
    INSERT INTO user_roles (user_id, role_id) VALUES
    (admin_user_id, 'aaaa1111-aaaa-1111-aaaa-111111111111');
END $$;

-- Step 7: Display the created structure
SELECT 'Groups created:' as info;
SELECT name, description FROM groups ORDER BY name;

SELECT 'Roles created:' as info;
SELECT name, description FROM roles ORDER BY name;

SELECT 'Admin user role assignment:' as info;
SELECT u.username, r.name as role_name 
FROM users u 
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id;

SELECT 'Group permissions assigned:' as info;
SELECT g.name as group_name, gs.scopes 
FROM groups g 
JOIN group_services gs ON g.id = gs.group_id
ORDER BY g.name, gs.scopes;
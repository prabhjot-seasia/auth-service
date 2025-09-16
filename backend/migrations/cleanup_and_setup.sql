-- Cleanup and Setup Script for Auth Service
-- This script will clean up existing data and set up the new permission structure

-- Step 1: Clean up existing data
DELETE FROM group_services;
DELETE FROM role_groups;
DELETE FROM user_roles;
DELETE FROM users WHERE username NOT IN ('admin');
DELETE FROM groups;
DELETE FROM roles;

-- Step 2: Create Groups with proper naming
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

-- Step 3: Create Roles
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

-- Step 4: Associate Roles with Groups
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

-- Step 5: Get auth-service ID
DO $$
DECLARE
    auth_service_id UUID;
BEGIN
    SELECT id INTO auth_service_id FROM services WHERE name = 'auth-service';
    
    -- Step 6: Assign scopes to groups via group_services
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
END $$;

-- Step 7: Create Users
-- Note: Passwords will be hashed by the application
-- Default password for all: Admin@123
INSERT INTO users (id, username, email, first_name, last_name, is_active, created_at, updated_at) VALUES
('bbbb1111-bbbb-1111-bbbb-111111111111', 'admin', 'admin@example.com', 'System', 'Administrator', true, NOW(), NOW()),
('bbbb2222-bbbb-2222-bbbb-222222222222', 'group_admin', 'group_admin@example.com', 'Group', 'Administrator', true, NOW(), NOW()),
('bbbb3333-bbbb-3333-bbbb-333333333333', 'role_admin', 'role_admin@example.com', 'Role', 'Administrator', true, NOW(), NOW()),
('bbbb4444-bbbb-4444-bbbb-444444444444', 'user_admin', 'user_admin@example.com', 'User', 'Administrator', true, NOW(), NOW()),
('bbbb5555-bbbb-5555-bbbb-555555555555', 'service_admin', 'service_admin@example.com', 'Service', 'Administrator', true, NOW(), NOW()),
('bbbb6666-bbbb-6666-bbbb-666666666666', 'group_reader', 'group_reader@example.com', 'Group', 'Reader', true, NOW(), NOW()),
('bbbb7777-bbbb-7777-bbbb-777777777777', 'role_reader', 'role_reader@example.com', 'Role', 'Reader', true, NOW(), NOW()),
('bbbb8888-bbbb-8888-bbbb-888888888888', 'user_reader', 'user_reader@example.com', 'User', 'Reader', true, NOW(), NOW()),
('bbbb9999-bbbb-9999-bbbb-999999999999', 'service_reader', 'service_reader@example.com', 'Service', 'Reader', true, NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

-- Step 8: Associate Users with Roles
-- Update admin user to have administrator role
UPDATE users SET id = 'bbbb1111-bbbb-1111-bbbb-111111111111' WHERE username = 'admin';

INSERT INTO user_roles (user_id, role_id) VALUES
('bbbb1111-bbbb-1111-bbbb-111111111111', 'aaaa1111-aaaa-1111-aaaa-111111111111'),
('bbbb2222-bbbb-2222-bbbb-222222222222', 'aaaa2222-aaaa-2222-aaaa-222222222222'),
('bbbb3333-bbbb-3333-bbbb-333333333333', 'aaaa3333-aaaa-3333-aaaa-333333333333'),
('bbbb4444-bbbb-4444-bbbb-444444444444', 'aaaa4444-aaaa-4444-aaaa-444444444444'),
('bbbb5555-bbbb-5555-bbbb-555555555555', 'aaaa5555-aaaa-5555-aaaa-555555555555'),
('bbbb6666-bbbb-6666-bbbb-666666666666', 'aaaa6666-aaaa-6666-aaaa-666666666666'),
('bbbb7777-bbbb-7777-bbbb-777777777777', 'aaaa7777-aaaa-7777-aaaa-777777777777'),
('bbbb8888-bbbb-8888-bbbb-888888888888', 'aaaa8888-aaaa-8888-aaaa-888888888888'),
('bbbb9999-bbbb-9999-bbbb-999999999999', 'aaaa9999-aaaa-9999-aaaa-999999999999')
ON CONFLICT DO NOTHING;
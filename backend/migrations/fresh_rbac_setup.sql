-- Fresh RBAC Setup for Auth Service
-- This script creates a clean, proper RBAC system with the requested structure

-- Step 1: Clean up everything
DROP TABLE IF EXISTS group_services CASCADE;
DROP TABLE IF EXISTS role_groups CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS user_groups CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS tokens CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Step 2: Create core tables with proper RBAC schema
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    client_id VARCHAR(255) UNIQUE NOT NULL,
    client_secret VARCHAR(255) NOT NULL,
    scopes TEXT NOT NULL, -- Space-separated list of available scopes
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(resource, action)
);

-- Step 3: Create association tables for RBAC
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_groups (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, group_id)
);

CREATE TABLE group_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    scopes TEXT NOT NULL, -- Space-separated list of granted scopes
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(group_id, service_id)
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    token_type VARCHAR(20) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Step 4: Create the auth-service with 8 defined scopes
INSERT INTO services (id, name, client_id, client_secret, scopes, is_active) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'auth-service',
    'auth-service-client',
    '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', -- hashed: Admin@123
    'permissions:read users:read users:write roles:read roles:write groups:read groups:write services:read services:write',
    true
);

-- Step 5: Create permissions (for backward compatibility with simple role-permission system)
INSERT INTO permissions (resource, action) VALUES
('permissions', 'read'),
('users', 'read'),
('users', 'write'),
('roles', 'read'),
('roles', 'write'),
('groups', 'read'),
('groups', 'write'),
('services', 'read'),
('services', 'write');

-- Step 6: Create Groups
-- Task 1: Administrator Group (all scopes)
INSERT INTO groups (id, name, description) VALUES (
    'aaaa1111-aaaa-1111-aaaa-111111111111',
    'administrator',
    'Full system administrators with all permissions'
);

-- Task 2: Group Administrator Group
INSERT INTO groups (id, name, description) VALUES (
    'aaaa2222-aaaa-2222-aaaa-222222222222',
    'group_administrator',
    'Group administrators - can manage groups only'
);

-- Task 3: Role Administrator Group  
INSERT INTO groups (id, name, description) VALUES (
    'aaaa3333-aaaa-3333-aaaa-333333333333',
    'role_administrator', 
    'Role administrators - can manage roles only'
);

-- Task 4: User Administrator Group
INSERT INTO groups (id, name, description) VALUES (
    'aaaa4444-aaaa-4444-aaaa-444444444444',
    'user_administrator',
    'User administrators - can manage users only'
);

-- Task 5: Service Administrator Group
INSERT INTO groups (id, name, description) VALUES (
    'aaaa5555-aaaa-5555-aaaa-555555555555',
    'service_administrator',
    'Service administrators - can manage services only'
);

-- Task 5: Read-only administrator groups
INSERT INTO groups (id, name, description) VALUES 
('aaaa6666-aaaa-6666-aaaa-666666666666', 'group_read_administrator', 'Read-only group administrators'),
('aaaa7777-aaaa-7777-aaaa-777777777777', 'role_read_administrator', 'Read-only role administrators'),
('aaaa8888-aaaa-8888-aaaa-888888888888', 'user_read_administrator', 'Read-only user administrators'),
('aaaa9999-aaaa-9999-aaaa-999999999999', 'service_read_administrator', 'Read-only service administrators');

-- Step 7: Create Roles
INSERT INTO roles (id, name, description) VALUES 
-- Main administrator roles
('bbbb1111-bbbb-1111-bbbb-111111111111', 'administrator', 'Full system administrator'),
('bbbb2222-bbbb-2222-bbbb-222222222222', 'group_administrator', 'Group administrator'),
('bbbb3333-bbbb-3333-bbbb-333333333333', 'role_administrator', 'Role administrator'),
('bbbb4444-bbbb-4444-bbbb-444444444444', 'user_administrator', 'User administrator'),
('bbbb5555-bbbb-5555-bbbb-555555555555', 'service_administrator', 'Service administrator'),
-- Read-only roles
('bbbb6666-bbbb-6666-bbbb-666666666666', 'group_read_administrator', 'Read-only group administrator'),
('bbbb7777-bbbb-7777-bbbb-777777777777', 'role_read_administrator', 'Read-only role administrator'),
('bbbb8888-bbbb-8888-bbbb-888888888888', 'user_read_administrator', 'Read-only user administrator'),
('bbbb9999-bbbb-9999-bbbb-999999999999', 'service_read_administrator', 'Read-only service administrator');

-- Step 8: Associate roles with groups
INSERT INTO role_groups (role_id, group_id) VALUES
-- Main administrator role associations
('bbbb1111-bbbb-1111-bbbb-111111111111', 'aaaa1111-aaaa-1111-aaaa-111111111111'),
('bbbb2222-bbbb-2222-bbbb-222222222222', 'aaaa2222-aaaa-2222-aaaa-222222222222'), 
('bbbb3333-bbbb-3333-bbbb-333333333333', 'aaaa3333-aaaa-3333-aaaa-333333333333'),
('bbbb4444-bbbb-4444-bbbb-444444444444', 'aaaa4444-aaaa-4444-aaaa-444444444444'),
('bbbb5555-bbbb-5555-bbbb-555555555555', 'aaaa5555-aaaa-5555-aaaa-555555555555'),
-- Read-only role associations
('bbbb6666-bbbb-6666-bbbb-666666666666', 'aaaa6666-aaaa-6666-aaaa-666666666666'),
('bbbb7777-bbbb-7777-bbbb-777777777777', 'aaaa7777-aaaa-7777-aaaa-777777777777'),
('bbbb8888-bbbb-8888-bbbb-888888888888', 'aaaa8888-aaaa-8888-aaaa-888888888888'),
('bbbb9999-bbbb-9999-bbbb-999999999999', 'aaaa9999-aaaa-9999-aaaa-999999999999');

-- Step 9: Assign scopes to groups via group_services
DO $$
DECLARE
    auth_service_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
    -- Task 1: Administrator group gets all scopes
    INSERT INTO group_services (group_id, service_id, scopes) VALUES 
    ('aaaa1111-aaaa-1111-aaaa-111111111111', auth_service_id, 'permissions:read users:read users:write roles:read roles:write groups:read groups:write services:read services:write');
    
    -- Task 2: Group administrator gets permissions:read, groups:read, groups:write
    INSERT INTO group_services (group_id, service_id, scopes) VALUES
    ('aaaa2222-aaaa-2222-aaaa-222222222222', auth_service_id, 'permissions:read groups:read groups:write');
    
    -- Task 3: Role administrator gets permissions:read, roles:read, roles:write
    INSERT INTO group_services (group_id, service_id, scopes) VALUES
    ('aaaa3333-aaaa-3333-aaaa-333333333333', auth_service_id, 'permissions:read roles:read roles:write');
    
    -- Task 4: User administrator gets permissions:read, users:read, users:write
    INSERT INTO group_services (group_id, service_id, scopes) VALUES
    ('aaaa4444-aaaa-4444-aaaa-444444444444', auth_service_id, 'permissions:read users:read users:write');
    
    -- Task 5: Service administrator gets permissions:read, services:read, services:write
    INSERT INTO group_services (group_id, service_id, scopes) VALUES
    ('aaaa5555-aaaa-5555-aaaa-555555555555', auth_service_id, 'permissions:read services:read services:write');
    
    -- Task 5: Read-only administrators
    INSERT INTO group_services (group_id, service_id, scopes) VALUES
    ('aaaa6666-aaaa-6666-aaaa-666666666666', auth_service_id, 'permissions:read groups:read'),
    ('aaaa7777-aaaa-7777-aaaa-777777777777', auth_service_id, 'permissions:read roles:read'),
    ('aaaa8888-aaaa-8888-aaaa-888888888888', auth_service_id, 'permissions:read users:read'),
    ('aaaa9999-aaaa-9999-aaaa-999999999999', auth_service_id, 'permissions:read services:read');
END $$;

-- Step 10: Create users
INSERT INTO users (id, username, email, password, first_name, last_name, is_active) VALUES 
-- Task 1: Main admin user
('cccc1111-cccc-1111-cccc-111111111111', 'admin', 'admin@example.com', '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', 'Super', 'Admin', true),
-- Task 2: Group administrator user
('cccc2222-cccc-2222-cccc-222222222222', 'group_admin', 'groupadmin@example.com', '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', 'Group', 'Admin', true),
-- Task 3: Role administrator user
('cccc3333-cccc-3333-cccc-333333333333', 'role_admin', 'roleadmin@example.com', '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', 'Role', 'Admin', true),
-- Task 4: User administrator user  
('cccc4444-cccc-4444-cccc-444444444444', 'user_admin', 'useradmin@example.com', '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', 'User', 'Admin', true),
-- Task 5: Service administrator user
('cccc5555-cccc-5555-cccc-555555555555', 'service_admin', 'serviceadmin@example.com', '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', 'Service', 'Admin', true),
-- Task 5: Read-only administrator users
('cccc6666-cccc-6666-cccc-666666666666', 'group_reader', 'groupreader@example.com', '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', 'Group', 'Reader', true),
('cccc7777-cccc-7777-cccc-777777777777', 'role_reader', 'rolereader@example.com', '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', 'Role', 'Reader', true),
('cccc8888-cccc-8888-cccc-888888888888', 'user_reader', 'userreader@example.com', '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', 'User', 'Reader', true),
('cccc9999-cccc-9999-cccc-999999999999', 'service_reader', 'servicereader@example.com', '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', 'Service', 'Reader', true);

-- Step 11: Assign users to roles
INSERT INTO user_roles (user_id, role_id) VALUES
-- Main admin user gets administrator role
('cccc1111-cccc-1111-cccc-111111111111', 'bbbb1111-bbbb-1111-bbbb-111111111111'),
-- Specialized admin users get their respective roles  
('cccc2222-cccc-2222-cccc-222222222222', 'bbbb2222-bbbb-2222-bbbb-222222222222'),
('cccc3333-cccc-3333-cccc-333333333333', 'bbbb3333-bbbb-3333-bbbb-333333333333'),
('cccc4444-cccc-4444-cccc-444444444444', 'bbbb4444-bbbb-4444-bbbb-444444444444'),
('cccc5555-cccc-5555-cccc-555555555555', 'bbbb5555-bbbb-5555-bbbb-555555555555'),
-- Read-only admin users get their respective roles
('cccc6666-cccc-6666-cccc-666666666666', 'bbbb6666-bbbb-6666-bbbb-666666666666'),
('cccc7777-cccc-7777-cccc-777777777777', 'bbbb7777-bbbb-7777-bbbb-777777777777'),
('cccc8888-cccc-8888-cccc-888888888888', 'bbbb8888-bbbb-8888-bbbb-888888888888'),
('cccc9999-cccc-9999-cccc-999999999999', 'bbbb9999-bbbb-9999-bbbb-999999999999');

-- Step 12: Also populate role_permissions for backward compatibility with existing permission checking code
DO $$
DECLARE
    perm_record RECORD;
    role_record RECORD;
BEGIN
    -- Administrator role gets all permissions
    FOR perm_record IN SELECT id FROM permissions LOOP
        INSERT INTO role_permissions (role_id, permission_id) VALUES 
        ('bbbb1111-bbbb-1111-bbbb-111111111111', perm_record.id)
        ON CONFLICT DO NOTHING;
    END LOOP;
    
    -- Group administrator gets group permissions + permissions:read
    INSERT INTO role_permissions (role_id, permission_id) 
    SELECT 'bbbb2222-bbbb-2222-bbbb-222222222222', id FROM permissions 
    WHERE (resource = 'groups') OR (resource = 'permissions' AND action = 'read')
    ON CONFLICT DO NOTHING;
    
    -- Role administrator gets role permissions + permissions:read
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT 'bbbb3333-bbbb-3333-bbbb-333333333333', id FROM permissions 
    WHERE (resource = 'roles') OR (resource = 'permissions' AND action = 'read')
    ON CONFLICT DO NOTHING;
    
    -- User administrator gets user permissions + permissions:read
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT 'bbbb4444-bbbb-4444-bbbb-444444444444', id FROM permissions 
    WHERE (resource = 'users') OR (resource = 'permissions' AND action = 'read')
    ON CONFLICT DO NOTHING;
    
    -- Service administrator gets service permissions + permissions:read
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT 'bbbb5555-bbbb-5555-bbbb-555555555555', id FROM permissions 
    WHERE (resource = 'services') OR (resource = 'permissions' AND action = 'read')
    ON CONFLICT DO NOTHING;
    
    -- Read-only administrators get read permissions only + permissions:read
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT 'bbbb6666-bbbb-6666-bbbb-666666666666', id FROM permissions 
    WHERE (resource = 'groups' AND action = 'read') OR (resource = 'permissions' AND action = 'read')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT 'bbbb7777-bbbb-7777-bbbb-777777777777', id FROM permissions 
    WHERE (resource = 'roles' AND action = 'read') OR (resource = 'permissions' AND action = 'read')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT 'bbbb8888-bbbb-8888-bbbb-888888888888', id FROM permissions 
    WHERE (resource = 'users' AND action = 'read') OR (resource = 'permissions' AND action = 'read')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT 'bbbb9999-bbbb-9999-bbbb-999999999999', id FROM permissions 
    WHERE (resource = 'services' AND action = 'read') OR (resource = 'permissions' AND action = 'read')
    ON CONFLICT DO NOTHING;
END $$;

-- Step 13: Display summary
SELECT 'RBAC Setup Complete!' as status;

SELECT 'Users created:' as info;
SELECT username, email, first_name, last_name FROM users ORDER BY username;

SELECT 'Roles and their groups:' as info;
SELECT r.name as role_name, g.name as group_name 
FROM roles r 
JOIN role_groups rg ON r.id = rg.role_id
JOIN groups g ON rg.group_id = g.id
ORDER BY r.name;

SELECT 'Group scopes:' as info;
SELECT g.name as group_name, gs.scopes
FROM groups g 
JOIN group_services gs ON g.id = gs.group_id
JOIN services s ON gs.service_id = s.id
ORDER BY g.name;
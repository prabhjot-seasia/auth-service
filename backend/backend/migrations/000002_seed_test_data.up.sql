-- Seed test data migration for auth-service
-- This creates all the RBAC test users, roles, groups, and permissions
-- Includes all test data from the fresh_rbac_setup.sql

-- Step 1: Create the auth-service with all defined scopes
INSERT INTO services (id, name, client_id, client_secret, scopes, is_active) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'auth-service',
    'auth-service-client',
    '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', -- hashed: Admin@123
    'permissions:read users:read users:write roles:read roles:write groups:read groups:write services:read services:write',
    true
);

-- Step 2: Create permissions for backward compatibility with simple role-permission system
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

-- Step 3: Create Groups
-- Administrator Group (all scopes)
INSERT INTO groups (id, name, description) VALUES (
    'aaaa1111-aaaa-1111-aaaa-111111111111',
    'administrator',
    'Full system administrators with all permissions'
);

-- Group Administrator Group
INSERT INTO groups (id, name, description) VALUES (
    'aaaa2222-aaaa-2222-aaaa-222222222222',
    'group_administrator',
    'Group administrators - can manage groups only'
);

-- Role Administrator Group  
INSERT INTO groups (id, name, description) VALUES (
    'aaaa3333-aaaa-3333-aaaa-333333333333',
    'role_administrator', 
    'Role administrators - can manage roles only'
);

-- User Administrator Group
INSERT INTO groups (id, name, description) VALUES (
    'aaaa4444-aaaa-4444-aaaa-444444444444',
    'user_administrator',
    'User administrators - can manage users only'
);

-- Service Administrator Group
INSERT INTO groups (id, name, description) VALUES (
    'aaaa5555-aaaa-5555-aaaa-555555555555',
    'service_administrator',
    'Service administrators - can manage services only'
);

-- Read-only administrator groups
INSERT INTO groups (id, name, description) VALUES 
('aaaa6666-aaaa-6666-aaaa-666666666666', 'group_read_administrator', 'Read-only group administrators'),
('aaaa7777-aaaa-7777-aaaa-777777777777', 'role_read_administrator', 'Read-only role administrators'),
('aaaa8888-aaaa-8888-aaaa-888888888888', 'user_read_administrator', 'Read-only user administrators'),
('aaaa9999-aaaa-9999-aaaa-999999999999', 'service_read_administrator', 'Read-only service administrators');

-- Step 4: Create Roles
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

-- Step 5: Associate roles with groups
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

-- Step 6: Assign scopes to groups via group_services
INSERT INTO group_services (group_id, service_id, scopes) VALUES 
-- Administrator group gets all scopes
('aaaa1111-aaaa-1111-aaaa-111111111111', '11111111-1111-1111-1111-111111111111', 'permissions:read users:read users:write roles:read roles:write groups:read groups:write services:read services:write'),
-- Group administrator gets permissions:read, groups:read, groups:write
('aaaa2222-aaaa-2222-aaaa-222222222222', '11111111-1111-1111-1111-111111111111', 'permissions:read groups:read groups:write'),
-- Role administrator gets permissions:read, roles:read, roles:write
('aaaa3333-aaaa-3333-aaaa-333333333333', '11111111-1111-1111-1111-111111111111', 'permissions:read roles:read roles:write'),
-- User administrator gets permissions:read, users:read, users:write
('aaaa4444-aaaa-4444-aaaa-444444444444', '11111111-1111-1111-1111-111111111111', 'permissions:read users:read users:write'),
-- Service administrator gets permissions:read, services:read, services:write
('aaaa5555-aaaa-5555-aaaa-555555555555', '11111111-1111-1111-1111-111111111111', 'permissions:read services:read services:write'),
-- Read-only administrators
('aaaa6666-aaaa-6666-aaaa-666666666666', '11111111-1111-1111-1111-111111111111', 'permissions:read groups:read'),
('aaaa7777-aaaa-7777-aaaa-777777777777', '11111111-1111-1111-1111-111111111111', 'permissions:read roles:read'),
('aaaa8888-aaaa-8888-aaaa-888888888888', '11111111-1111-1111-1111-111111111111', 'permissions:read users:read'),
('aaaa9999-aaaa-9999-aaaa-999999999999', '11111111-1111-1111-1111-111111111111', 'permissions:read services:read');

-- Step 7: Create test users
INSERT INTO users (id, username, email, password, first_name, last_name, is_active) VALUES 
-- Main admin user
('cccc1111-cccc-1111-cccc-111111111111', 'admin', 'admin@example.com', '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', 'Super', 'Admin', true),
-- Group administrator user
('cccc2222-cccc-2222-cccc-222222222222', 'group_admin', 'groupadmin@example.com', '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', 'Group', 'Admin', true),
-- Role administrator user
('cccc3333-cccc-3333-cccc-333333333333', 'role_admin', 'roleadmin@example.com', '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', 'Role', 'Admin', true),
-- User administrator user  
('cccc4444-cccc-4444-cccc-444444444444', 'user_admin', 'useradmin@example.com', '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', 'User', 'Admin', true),
-- Service administrator user
('cccc5555-cccc-5555-cccc-555555555555', 'service_admin', 'serviceadmin@example.com', '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', 'Service', 'Admin', true),
-- Read-only administrator users
('cccc6666-cccc-6666-cccc-666666666666', 'group_reader', 'groupreader@example.com', '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', 'Group', 'Reader', true),
('cccc7777-cccc-7777-cccc-777777777777', 'role_reader', 'rolereader@example.com', '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', 'Role', 'Reader', true),
('cccc8888-cccc-8888-cccc-888888888888', 'user_reader', 'userreader@example.com', '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', 'User', 'Reader', true),
('cccc9999-cccc-9999-cccc-999999999999', 'service_reader', 'servicereader@example.com', '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO', 'Service', 'Reader', true);

-- Step 8: Assign users to roles
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

-- Step 9: Populate role_permissions for backward compatibility with existing permission checking code
-- Administrator role gets all permissions
INSERT INTO role_permissions (role_id, permission_id) 
SELECT 'bbbb1111-bbbb-1111-bbbb-111111111111', id FROM permissions;

-- Group administrator gets group permissions + permissions:read
INSERT INTO role_permissions (role_id, permission_id) 
SELECT 'bbbb2222-bbbb-2222-bbbb-222222222222', id FROM permissions 
WHERE (resource = 'groups') OR (resource = 'permissions' AND action = 'read');

-- Role administrator gets role permissions + permissions:read
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'bbbb3333-bbbb-3333-bbbb-333333333333', id FROM permissions 
WHERE (resource = 'roles') OR (resource = 'permissions' AND action = 'read');

-- User administrator gets user permissions + permissions:read
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'bbbb4444-bbbb-4444-bbbb-444444444444', id FROM permissions 
WHERE (resource = 'users') OR (resource = 'permissions' AND action = 'read');

-- Service administrator gets service permissions + permissions:read
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'bbbb5555-bbbb-5555-bbbb-555555555555', id FROM permissions 
WHERE (resource = 'services') OR (resource = 'permissions' AND action = 'read');

-- Read-only administrators get read permissions only + permissions:read
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'bbbb6666-bbbb-6666-bbbb-666666666666', id FROM permissions 
WHERE (resource = 'groups' AND action = 'read') OR (resource = 'permissions' AND action = 'read');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'bbbb7777-bbbb-7777-bbbb-777777777777', id FROM permissions 
WHERE (resource = 'roles' AND action = 'read') OR (resource = 'permissions' AND action = 'read');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'bbbb8888-bbbb-8888-bbbb-888888888888', id FROM permissions 
WHERE (resource = 'users' AND action = 'read') OR (resource = 'permissions' AND action = 'read');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'bbbb9999-bbbb-9999-bbbb-999999999999', id FROM permissions 
WHERE (resource = 'services' AND action = 'read') OR (resource = 'permissions' AND action = 'read');
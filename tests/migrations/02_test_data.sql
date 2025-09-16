-- Comprehensive Test Data for BDD Testing
-- This file creates all necessary test users, roles, groups, and permissions

-- Insert base permissions
INSERT INTO permissions (resource, action) VALUES
('users', 'read'),
('users', 'write'),
('roles', 'read'),
('roles', 'write'),
('groups', 'read'),
('groups', 'write'),
('services', 'read'),
('services', 'write'),
('permissions', 'read'),
('documents', 'read');

-- Insert base services
INSERT INTO services (name, client_id, client_secret, redirect_uri, scopes, is_active) VALUES
('auth-service', 'auth-service-client', '$2a$10$example.hashed.secret', 'http://localhost:3000/callback', 'users:read users:write roles:read roles:write groups:read groups:write permissions:read', true),
('email-service', 'email-service-client', '$2a$10$example.hashed.secret', 'http://localhost:3000/callback', 'emails:read emails:write emails:send templates:write', true),
('notification-service', 'notification-service-client', '$2a$10$example.hashed.secret', 'http://localhost:3000/callback', 'notifications:read notifications:write push:send sms:send', true),
('api-gateway', 'api-gateway-client', '$2a$10$example.hashed.secret', 'http://localhost:3000/callback', 'api:read api:execute', true),
('audit-service', 'audit-service-client', '$2a$10$example.hashed.secret', 'http://localhost:3000/callback', 'logs:read reports:read', true);

-- Insert base groups
INSERT INTO groups (name, description) VALUES
('administrator', 'Administrator group with core permissions'),
('users', 'Standard users group'),
('managers', 'Management group with elevated permissions'),
('email-administrators', 'Email service administrators'),
('notification-admins', 'Notification service administrators'),
('api-consumers', 'API gateway consumers'),
('audit-viewers', 'Audit log viewers'),
('service-managers', 'Service management group'),
('read-only', 'Read-only access group');

-- Insert base roles
INSERT INTO roles (name, description) VALUES
('administrator', 'System administrator role'),
('user', 'Standard user role'),
('manager', 'Manager role with elevated permissions'),
('user_admin', 'User administration role'),
('role_admin', 'Role administration role'),
('group_admin', 'Group administration role'),
('service_admin', 'Service administration role'),
('read_only_user', 'Read-only user role'),
('api_user', 'API access user role'),
('email_admin', 'Email service admin role'),
('notification_admin', 'Notification service admin role');

-- Create test users with hashed passwords (Test@123 = $2a$10$example.hashed.password)
INSERT INTO users (username, email, password, first_name, last_name, is_active) VALUES
('admin', 'admin@example.com', '$2a$10$u4JHc1aGlwzXuVqVEy5FcO//jVVmV8m6W6WO3yjlz0PBxLE1Q2FGG', 'Admin', 'User', true),
('user1', 'user1@example.com', '$2a$10$u4JHc1aGlwzXuVqVEy5FcO//jVVmV8m6W6WO3yjlz0PBxLE1Q2FGG', 'User', 'One', true),
('user2', 'user2@example.com', '$2a$10$u4JHc1aGlwzXuVqVEy5FcO//jVVmV8m6W6WO3yjlz0PBxLE1Q2FGG', 'User', 'Two', true),
('user3', 'user3@example.com', '$2a$10$u4JHc1aGlwzXuVqVEy5FcO//jVVmV8m6W6WO3yjlz0PBxLE1Q2FGG', 'User', 'Three', true),
('user4', 'user4@example.com', '$2a$10$u4JHc1aGlwzXuVqVEy5FcO//jVVmV8m6W6WO3yjlz0PBxLE1Q2FGG', 'User', 'Four', true),
('user5', 'user5@example.com', '$2a$10$u4JHc1aGlwzXuVqVEy5FcO//jVVmV8m6W6WO3yjlz0PBxLE1Q2FGG', 'User', 'Five', true),
('user6', 'user6@example.com', '$2a$10$u4JHc1aGlwzXuVqVEy5FcO//jVVmV8m6W6WO3yjlz0PBxLE1Q2FGG', 'User', 'Six', true),
('user7', 'user7@example.com', '$2a$10$u4JHc1aGlwzXuVqVEy5FcO//jVVmV8m6W6WO3yjlz0PBxLE1Q2FGG', 'User', 'Seven', true),
('user8', 'user8@example.com', '$2a$10$u4JHc1aGlwzXuVqVEy5FcO//jVVmV8m6W6WO3yjlz0PBxLE1Q2FGG', 'User', 'Eight', true),
('user9', 'user9@example.com', '$2a$10$u4JHc1aGlwzXuVqVEy5FcO//jVVmV8m6W6WO3yjlz0PBxLE1Q2FGG', 'User', 'Nine', true),
('user10', 'user10@example.com', '$2a$10$u4JHc1aGlwzXuVqVEy5FcO//jVVmV8m6W6WO3yjlz0PBxLE1Q2FGG', 'User', 'Ten', true),
('manager1', 'manager1@example.com', '$2a$10$u4JHc1aGlwzXuVqVEy5FcO//jVVmV8m6W6WO3yjlz0PBxLE1Q2FGG', 'Manager', 'One', true),
('group_admin', 'group_admin@example.com', '$2a$10$u4JHc1aGlwzXuVqVEy5FcO//jVVmV8m6W6WO3yjlz0PBxLE1Q2FGG', 'Group', 'Admin', true),
('service_admin', 'service_admin@example.com', '$2a$10$u4JHc1aGlwzXuVqVEy5FcO//jVVmV8m6W6WO3yjlz0PBxLE1Q2FGG', 'Service', 'Admin', true),
('read_only', 'readonly@example.com', '$2a$10$u4JHc1aGlwzXuVqVEy5FcO//jVVmV8m6W6WO3yjlz0PBxLE1Q2FGG', 'Read', 'Only', true),
('api_user', 'api@example.com', '$2a$10$u4JHc1aGlwzXuVqVEy5FcO//jVVmV8m6W6WO3yjlz0PBxLE1Q2FGG', 'API', 'User', true),
('email_admin', 'email@example.com', '$2a$10$u4JHc1aGlwzXuVqVEy5FcO//jVVmV8m6W6WO3yjlz0PBxLE1Q2FGG', 'Email', 'Admin', true),
('notification_admin', 'notify@example.com', '$2a$10$u4JHc1aGlwzXuVqVEy5FcO//jVVmV8m6W6WO3yjlz0PBxLE1Q2FGG', 'Notification', 'Admin', true);

-- Assign users to roles
INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'admin' AND r.name = 'administrator';

INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'user1' AND r.name = 'user';

INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'user2' AND r.name = 'user';

INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'user3' AND r.name = 'user';

INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'user4' AND r.name = 'read_only_user';

INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'user5' AND r.name = 'api_user';

INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'manager1' AND r.name = 'manager';

INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'group_admin' AND r.name = 'group_admin';

INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'service_admin' AND r.name = 'service_admin';

INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'read_only' AND r.name = 'read_only_user';

INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'api_user' AND r.name = 'api_user';

INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'email_admin' AND r.name = 'email_admin';

INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'notification_admin' AND r.name = 'notification_admin';

-- Assign roles to groups
INSERT INTO role_groups (role_id, group_id)
SELECT r.id, g.id FROM roles r, groups g WHERE r.name = 'administrator' AND g.name = 'administrator';

INSERT INTO role_groups (role_id, group_id)
SELECT r.id, g.id FROM roles r, groups g WHERE r.name = 'user' AND g.name = 'users';

INSERT INTO role_groups (role_id, group_id)
SELECT r.id, g.id FROM roles r, groups g WHERE r.name = 'manager' AND g.name = 'managers';

INSERT INTO role_groups (role_id, group_id)
SELECT r.id, g.id FROM roles r, groups g WHERE r.name = 'group_admin' AND g.name = 'managers';

INSERT INTO role_groups (role_id, group_id)
SELECT r.id, g.id FROM roles r, groups g WHERE r.name = 'service_admin' AND g.name = 'service-managers';

INSERT INTO role_groups (role_id, group_id)
SELECT r.id, g.id FROM roles r, groups g WHERE r.name = 'read_only_user' AND g.name = 'read-only';

INSERT INTO role_groups (role_id, group_id)
SELECT r.id, g.id FROM roles r, groups g WHERE r.name = 'api_user' AND g.name = 'api-consumers';

INSERT INTO role_groups (role_id, group_id)
SELECT r.id, g.id FROM roles r, groups g WHERE r.name = 'email_admin' AND g.name = 'email-administrators';

INSERT INTO role_groups (role_id, group_id)
SELECT r.id, g.id FROM roles r, groups g WHERE r.name = 'notification_admin' AND g.name = 'notification-admins';

-- Assign permissions to roles (DIRECT role-permission assignments)
-- Administrator role permissions (7 permissions as currently working)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'administrator' AND p.resource = 'users' AND p.action = 'read';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'administrator' AND p.resource = 'users' AND p.action = 'write';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'administrator' AND p.resource = 'roles' AND p.action = 'read';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'administrator' AND p.resource = 'roles' AND p.action = 'write';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'administrator' AND p.resource = 'groups' AND p.action = 'read';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'administrator' AND p.resource = 'groups' AND p.action = 'write';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'administrator' AND p.resource = 'permissions' AND p.action = 'read';

-- Standard user role permissions (limited access)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'user' AND p.resource = 'users' AND p.action = 'read';

-- Manager role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'manager' AND p.resource IN ('users', 'groups') AND p.action = 'read';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'manager' AND p.resource = 'users' AND p.action = 'write';

-- User admin role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'user_admin' AND p.resource = 'users' AND p.action IN ('read', 'write');

-- Role admin role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'role_admin' AND p.resource = 'roles' AND p.action IN ('read', 'write');

-- Group admin role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'group_admin' AND p.resource = 'groups' AND p.action IN ('read', 'write');

-- Service admin role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'service_admin' AND p.resource = 'services' AND p.action IN ('read', 'write');

-- Read-only user permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'read_only_user' AND p.resource IN ('users', 'roles', 'groups', 'services') AND p.action = 'read';

-- API user permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'api_user' AND p.resource = 'users' AND p.action = 'read';

-- Email admin permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'email_admin' AND p.resource = 'users' AND p.action = 'read';

-- Notification admin permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'notification_admin' AND p.resource = 'users' AND p.action = 'read';

-- Assign services to groups (for group-service permission inheritance - currently disabled in backend)
INSERT INTO group_services (group_id, service_id, scopes)
SELECT g.id, s.id, 'users:read users:write roles:read roles:write groups:read groups:write permissions:read'
FROM groups g, services s WHERE g.name = 'administrator' AND s.name = 'auth-service';

INSERT INTO group_services (group_id, service_id, scopes)
SELECT g.id, s.id, 'users:read'
FROM groups g, services s WHERE g.name = 'users' AND s.name = 'auth-service';

INSERT INTO group_services (group_id, service_id, scopes)
SELECT g.id, s.id, 'users:read users:write groups:read'
FROM groups g, services s WHERE g.name = 'managers' AND s.name = 'auth-service';

INSERT INTO group_services (group_id, service_id, scopes)
SELECT g.id, s.id, 'emails:read emails:write emails:send templates:write'
FROM groups g, services s WHERE g.name = 'email-administrators' AND s.name = 'email-service';

INSERT INTO group_services (group_id, service_id, scopes)
SELECT g.id, s.id, 'notifications:read notifications:write push:send sms:send'
FROM groups g, services s WHERE g.name = 'notification-admins' AND s.name = 'notification-service';

INSERT INTO group_services (group_id, service_id, scopes)
SELECT g.id, s.id, 'api:read api:execute'
FROM groups g, services s WHERE g.name = 'api-consumers' AND s.name = 'api-gateway';

INSERT INTO group_services (group_id, service_id, scopes)
SELECT g.id, s.id, 'logs:read reports:read'
FROM groups g, services s WHERE g.name = 'audit-viewers' AND s.name = 'audit-service';

INSERT INTO group_services (group_id, service_id, scopes)
SELECT g.id, s.id, 'services:read services:write'
FROM groups g, services s WHERE g.name = 'service-managers' AND s.name = 'auth-service';

INSERT INTO group_services (group_id, service_id, scopes)
SELECT g.id, s.id, 'users:read roles:read groups:read services:read'
FROM groups g, services s WHERE g.name = 'read-only' AND s.name = 'auth-service';

-- Insert summary information for verification
INSERT INTO roles (name, description) VALUES 
('test_summary', 'TEST DATA SUMMARY: 18 users, 11 roles, 9 groups, 5 services, 10 permissions created');

-- Print summary (this will show in the PostgreSQL logs)
DO $$
BEGIN
    RAISE NOTICE 'TEST DATA MIGRATION COMPLETED';
    RAISE NOTICE 'Created % users', (SELECT COUNT(*) FROM users WHERE username != 'test_summary');
    RAISE NOTICE 'Created % roles', (SELECT COUNT(*) FROM roles WHERE name != 'test_summary');
    RAISE NOTICE 'Created % groups', (SELECT COUNT(*) FROM groups);
    RAISE NOTICE 'Created % services', (SELECT COUNT(*) FROM services);
    RAISE NOTICE 'Created % permissions', (SELECT COUNT(*) FROM permissions);
    RAISE NOTICE 'All test users have password: Test@123';
END $$;
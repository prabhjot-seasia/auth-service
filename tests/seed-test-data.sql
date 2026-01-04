-- Seed test data after GORM migration
-- This script assumes GORM has already created the schema

-- Insert permissions
INSERT INTO permissions (id, resource, action, created_at, updated_at) VALUES 
('81a06af8-4916-4ca6-a3fd-3d1a74af211e', 'users', 'read', NOW(), NOW()),
('a811afd3-5f7c-4514-ab20-60d72755ac7f', 'users', 'write', NOW(), NOW()),
('5d07d1bd-0431-4129-a113-b9f0aa1bf9fb', 'roles', 'read', NOW(), NOW()),
('994c50cd-3e04-48af-affc-add90938e560', 'roles', 'write', NOW(), NOW()),
('438ef255-40ff-4e08-b822-20d5f98e0f95', 'groups', 'read', NOW(), NOW()),
('56b31421-72c3-45dc-9ad1-01c5ad1f2638', 'groups', 'write', NOW(), NOW()),
('6713aa42-08f1-4cdd-9667-5a231305ba0e', 'documents', 'read', NOW(), NOW()),
('7a5f8c12-1234-5678-9abc-def123456789', 'services', 'read', NOW(), NOW()),
('8b6e9d23-2345-6789-abcd-ef1234567890', 'services', 'write', NOW(), NOW()),
('9c7f0e34-3456-789a-bcde-f12345678901', 'api', 'access', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert roles
INSERT INTO roles (id, name, description, created_at, updated_at) VALUES 
('3db855d9-8736-4390-b358-8ed376463a86', 'administrator', 'System administrator role', NOW(), NOW()),
('4ec966ea-9847-5401-c469-9fe487574b97', 'user', 'Standard user role', NOW(), NOW()),
('5fd077fb-a958-6512-d57a-a0f598685ca8', 'group_admin', 'Group admin role', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test users with Admin@123 password for admin and user1, Test@123 for others
INSERT INTO users (id, username, email, password, first_name, last_name, is_active, created_at, updated_at) VALUES 
('0b56d83b-a560-4639-92f5-20cd040c1bcc', 'admin', 'admin@example.com', '$2a$10$paveO9EskWCqbBteiDSwReeTptmWLSqsDgmPktEin0GKUHTUf2ViG', 'Admin', 'User', true, NOW(), NOW()),
('1c67e94c-b671-5740-a3a6-21de151c2cdd', 'user1', 'user1@example.com', '$2a$10$paveO9EskWCqbBteiDSwReeTptmWLSqsDgmPktEin0GKUHTUf2ViG', 'User', 'One', true, NOW(), NOW()),
('2d78fa5d-c782-6851-b4b7-32ef262d3dee', 'user2', 'user2@example.com', '$2a$10$u4JHc1aGlwzXuVqVEy5FcO//jVVmV8m6W6WO3yjlz0PBxLE1Q2FGG', 'User', 'Two', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Assign admin user to administrator role (reduced permissions - only 7 permissions)
INSERT INTO user_roles (user_id, role_id) VALUES 
('0b56d83b-a560-4639-92f5-20cd040c1bcc', '3db855d9-8736-4390-b358-8ed376463a86')
ON CONFLICT DO NOTHING;

-- Assign standard permissions to administrator role (7 permissions, excluding services and api)
INSERT INTO role_permissions (role_id, permission_id) VALUES 
('3db855d9-8736-4390-b358-8ed376463a86', '81a06af8-4916-4ca6-a3fd-3d1a74af211e'), -- users:read
('3db855d9-8736-4390-b358-8ed376463a86', 'a811afd3-5f7c-4514-ab20-60d72755ac7f'), -- users:write
('3db855d9-8736-4390-b358-8ed376463a86', '5d07d1bd-0431-4129-a113-b9f0aa1bf9fb'), -- roles:read
('3db855d9-8736-4390-b358-8ed376463a86', '994c50cd-3e04-48af-affc-add90938e560'), -- roles:write
('3db855d9-8736-4390-b358-8ed376463a86', '438ef255-40ff-4e08-b822-20d5f98e0f95'), -- groups:read
('3db855d9-8736-4390-b358-8ed376463a86', '56b31421-72c3-45dc-9ad1-01c5ad1f2638'), -- groups:write
('3db855d9-8736-4390-b358-8ed376463a86', '6713aa42-08f1-4cdd-9667-5a231305ba0e')  -- documents:read
-- NOTE: services:read, services:write, and api:access are deliberately excluded (7 permissions total)
ON CONFLICT DO NOTHING;

-- Assign user roles
INSERT INTO user_roles (user_id, role_id) VALUES 
('1c67e94c-b671-5740-a3a6-21de151c2cdd', '4ec966ea-9847-5401-c469-9fe487574b97'),
('2d78fa5d-c782-6851-b4b7-32ef262d3dee', '4ec966ea-9847-5401-c469-9fe487574b97')
ON CONFLICT DO NOTHING;

-- Create basic permissions for user role
INSERT INTO role_permissions (role_id, permission_id) VALUES 
('4ec966ea-9847-5401-c469-9fe487574b97', '81a06af8-4916-4ca6-a3fd-3d1a74af211e'), -- users:read
('4ec966ea-9847-5401-c469-9fe487574b97', '5d07d1bd-0431-4129-a113-b9f0aa1bf9fb')  -- roles:read
ON CONFLICT DO NOTHING;
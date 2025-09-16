-- Rollback seed test data migration for auth-service
-- This removes all the RBAC test users, roles, groups, and permissions

-- Remove all test data in reverse dependency order

-- Step 1: Remove role_permissions associations
DELETE FROM role_permissions;

-- Step 2: Remove user_roles associations  
DELETE FROM user_roles;

-- Step 3: Remove all test users
DELETE FROM users WHERE id IN (
    'cccc1111-cccc-1111-cccc-111111111111',
    'cccc2222-cccc-2222-cccc-222222222222',
    'cccc3333-cccc-3333-cccc-333333333333',
    'cccc4444-cccc-4444-cccc-444444444444',
    'cccc5555-cccc-5555-cccc-555555555555',
    'cccc6666-cccc-6666-cccc-666666666666',
    'cccc7777-cccc-7777-cccc-777777777777',
    'cccc8888-cccc-8888-cccc-888888888888',
    'cccc9999-cccc-9999-cccc-999999999999'
);

-- Step 4: Remove group_services assignments
DELETE FROM group_services;

-- Step 5: Remove role_groups associations
DELETE FROM role_groups;

-- Step 6: Remove all test roles
DELETE FROM roles WHERE id IN (
    'bbbb1111-bbbb-1111-bbbb-111111111111',
    'bbbb2222-bbbb-2222-bbbb-222222222222',
    'bbbb3333-bbbb-3333-bbbb-333333333333',
    'bbbb4444-bbbb-4444-bbbb-444444444444',
    'bbbb5555-bbbb-5555-bbbb-555555555555',
    'bbbb6666-bbbb-6666-bbbb-666666666666',
    'bbbb7777-bbbb-7777-bbbb-777777777777',
    'bbbb8888-bbbb-8888-bbbb-888888888888',
    'bbbb9999-bbbb-9999-bbbb-999999999999'
);

-- Step 7: Remove all test groups
DELETE FROM groups WHERE id IN (
    'aaaa1111-aaaa-1111-aaaa-111111111111',
    'aaaa2222-aaaa-2222-aaaa-222222222222',
    'aaaa3333-aaaa-3333-aaaa-333333333333',
    'aaaa4444-aaaa-4444-aaaa-444444444444',
    'aaaa5555-aaaa-5555-aaaa-555555555555',
    'aaaa6666-aaaa-6666-aaaa-666666666666',
    'aaaa7777-aaaa-7777-aaaa-777777777777',
    'aaaa8888-aaaa-8888-aaaa-888888888888',
    'aaaa9999-aaaa-9999-aaaa-999999999999'
);

-- Step 8: Remove all permissions
DELETE FROM permissions WHERE (resource, action) IN (
    ('permissions', 'read'),
    ('users', 'read'),
    ('users', 'write'),
    ('roles', 'read'),
    ('roles', 'write'),
    ('groups', 'read'),
    ('groups', 'write'),
    ('services', 'read'),
    ('services', 'write')
);

-- Step 9: Remove the auth-service
DELETE FROM services WHERE id = '11111111-1111-1111-1111-111111111111';
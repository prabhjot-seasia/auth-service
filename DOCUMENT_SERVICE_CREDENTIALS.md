# Document Service Credentials

## Frontend Service
- **Name**: Document Frontend Service
- **Service ID**: fe829f1e-6e78-443c-9901-1b8329d75f6a
- **Client ID**: d2b815601752ea3457a11fa8896f4d0c
- **Client Secret**: b77d4ba723593b4d7a3ef3074445904f9b90151e583a5379f39bfd0bf0ce70eb
- **Redirect URI**: http://localhost:3002/auth/callback
- **Scopes**: read:documents write:documents read:profile read:users

## Backend Service
- **Name**: Document Backend Service
- **Service ID**: dcf2db4c-edb7-4ef2-9a8d-6286b12018e1
- **Client ID**: 0f20c83d9a862d6a18e336ba1ccb78b4
- **Client Secret**: 7ae230533012fd467d3ee2391dc603c6688b72bd46ebe8bc7989401f81026923
- **Redirect URI**: http://localhost:8081/auth/callback
- **Scopes**: read:documents write:documents delete:documents read:users write:users read:admin

## Setup Instructions

1. Create Groups:
   - document_administrators (full access to document services)
   - document_users (read-only access to document services)

2. Create Roles:
   - document_administrator (with document admin permissions)
   - document_user (with basic document permissions)

3. Assign Services to Groups:
   - Both frontend and backend services should be assigned to both groups

4. Assign Groups to Roles:
   - document_administrator role should have document_administrators group
   - document_user role should have document_users group

5. Create Test Users:
   - doc_admin (with document_administrator role)
   - doc_user (with document_user role)

## Complete Infrastructure Setup

### Groups Created
- **document_administrators**: Full access to document management system
- **document_users**: Read-only access to document management system

### Roles Created
- **document_administrator**: Full administrative access with permissions:
  - documents:read, documents:write, documents:delete
  - users:read, profile:read
- **document_user**: Basic access with permissions:
  - documents:read, profile:read

### Users Created
- **doc_admin** (ID: aaaa1111-aaaa-1111-aaaa-111111111111)
  - Username: doc_admin
  - Password: Admin@123
  - Role: document_administrator
  - Email: docadmin@example.com

- **doc_user** (ID: bbbb2222-bbbb-2222-bbbb-222222222222)
  - Username: doc_user
  - Password: User@123
  - Role: document_user
  - Email: docuser@example.com

### Service Assignments
- Both frontend and backend services are assigned to both user groups
- Access control enforced through group membership and role permissions

## Enhanced Security Note

All SSO endpoints now require dual authentication:
- User JWT token (from login)
- Service credentials (Client ID + Client Secret)

This prevents unauthorized services from accepting valid user tokens.
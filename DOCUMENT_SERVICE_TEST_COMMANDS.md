# Document Service Test Commands

## Complete Configured Infrastructure Verification

This guide shows how to test the complete Document Service setup with enhanced dual authentication.

## Step 1: Get User Token

Login as document administrator:
```bash
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "password",
    "username": "doc_admin",
    "password": "Admin@123"
  }'
```

Expected response:
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "..."
}
```

## Step 2: Validate Token with Frontend Service

Using the token with Document Frontend Service credentials:
```bash
curl -X POST http://localhost:8080/sso/validate \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_ACCESS_TOKEN",
    "client_id": "d2b815601752ea3457a11fa8896f4d0c",
    "client_secret": "b77d4ba723593b4d7a3ef3074445904f9b90151e583a5379f39bfd0bf0ce70eb"
  }'
```

Expected response for doc_admin user:
```json
{
  "valid": true,
  "user_id": "aaaa1111-aaaa-1111-aaaa-111111111111",
  "username": "doc_admin",
  "email": "docadmin@example.com",
  "roles": ["document_administrator"],
  "groups": ["document_administrators"],
  "permissions": [
    {"resource": "documents", "action": "read"},
    {"resource": "documents", "action": "write"},
    {"resource": "documents", "action": "delete"},
    {"resource": "users", "action": "read"},
    {"resource": "profile", "action": "read"}
  ],
  "service_id": "fe829f1e-6e78-443c-9901-1b8329d75f6a",
  "service_name": "Document Frontend Service",
  "expires_at": 1699123456
}
```

## Step 3: Validate Token with Backend Service

Using the same token with Document Backend Service credentials:
```bash
curl -X POST http://localhost:8080/sso/validate \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_ACCESS_TOKEN",
    "client_id": "0f20c83d9a862d6a18e336ba1ccb78b4",
    "client_secret": "7ae230533012fd467d3ee2391dc603c6688b72bd46ebe8bc7989401f81026923"
  }'
```

## Step 4: Test Permission Checking

Check if user has document write permission with backend service:
```bash
curl -X POST http://localhost:8080/sso/check-permission \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_ACCESS_TOKEN",
    "resource": "documents",
    "action": "write",
    "client_id": "0f20c83d9a862d6a18e336ba1ccb78b4",
    "client_secret": "7ae230533012fd467d3ee2391dc603c6688b72bd46ebe8bc7989401f81026923"
  }'
```

Expected response for doc_admin:
```json
{
  "allowed": true
}
```

## Step 5: Test with Document User

Login as regular document user:
```bash
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "password",
    "username": "doc_user",
    "password": "User@123"
  }'
```

Check document write permission (should be denied):
```bash
curl -X POST http://localhost:8080/sso/check-permission \
  -H "Content-Type: application/json" \
  -d '{
    "token": "DOC_USER_TOKEN",
    "resource": "documents",
    "action": "write",
    "client_id": "0f20c83d9a862d6a18e336ba1ccb78b4",
    "client_secret": "7ae230533012fd467d3ee2391dc603c6688b72bd46ebe8bc7989401f81026923"
  }'
```

Expected response:
```json
{
  "allowed": false
}
```

## Step 6: Test Security Enhancement

Try using a valid token with invalid service credentials:
```bash
curl -X POST http://localhost:8080/sso/validate \
  -H "Content-Type: application/json" \
  -d '{
    "token": "VALID_TOKEN",
    "client_id": "invalid-client-id",
    "client_secret": "invalid-secret"
  }'
```

Expected response (security working):
```json
{
  "valid": false,
  "error": "service authentication failed: record not found"
}
```

## Infrastructure Summary

### Services Created
- **Document Frontend Service**: fe829f1e-6e78-443c-9901-1b8329d75f6a
- **Document Backend Service**: dcf2db4c-edb7-4ef2-9a8d-6286b12018e1

### Access Matrix
| User | Role | Groups | Documents Read | Documents Write | Documents Delete | Users Read |
|------|------|--------|---------------|----------------|----------------|-----------|
| doc_admin | document_administrator | document_administrators | ✅ | ✅ | ✅ | ✅ |
| doc_user | document_user | document_users | ✅ | ❌ | ❌ | ❌ |

### Security Enforcement
1. **Dual Authentication**: Both user token AND service credentials required
2. **Role-Based Permissions**: Actions restricted by user's role permissions
3. **Service Validation**: Only registered, active services can validate tokens
4. **Group-Based Access**: Users must belong to groups assigned to services

## Complete Setup Verification

To verify the complete infrastructure is working:
1. Both users can authenticate and get tokens
2. Both services can validate tokens with proper credentials
3. Permissions are correctly enforced (admin has write, user only read)
4. Invalid service credentials are rejected
5. Group-to-service assignments are functional
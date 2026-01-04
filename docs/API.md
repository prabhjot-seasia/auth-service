# Auth Service API Documentation

## Overview

The Auth Service provides comprehensive authentication and authorization capabilities with support for:
- JWT-based authentication
- OAuth2 client credentials flow
- Single Sign-On (SSO) integration
- Role-Based Access Control (RBAC)
- Cross-service token validation and logout

## Base URL
- Development: `http://localhost:8080`
- Production: Configure based on your deployment

## Authentication Types

⚠️ **Security Note**: This service supports secure OAuth2 flows only. Password grant is deprecated due to security concerns. Use Authorization Code + PKCE for frontend applications and Client Credentials for service-to-service communication.

### 1. Client Credentials Grant (Service-to-Service) - **Recommended**
```bash
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "auth-service-client",
    "client_secret": "your-service-secret"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

### 2. Refresh Token Grant
```bash
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### 3. Authorization Code Flow (Frontend Applications)
For frontend applications, use the SSO login endpoint to initiate the Authorization Code flow:

```bash
# Step 1: Redirect user to authorization endpoint
GET /sso/login?client_id=your-client-id&redirect_uri=your-callback&response_type=code&state=random-state

# Step 2: Handle callback and exchange code for tokens
# (This is typically handled by your frontend application)
```

**Note**: See the [Frontend Integration Guide](./FRONTEND_INTEGRATION.md) for complete implementation examples.

## Core API Endpoints

### User Information and Permissions

#### GET /me/permissions
Get current user's details and effective permissions.

```bash
curl -X GET http://localhost:8080/me/permissions \
  -H "Authorization: Bearer <access_token>"
```

**Response:**
```json
{
  "username": "admin",
  "email": "admin@example.com",
  "roles": ["administrator"],
  "groups": ["administrator", "document_users"],
  "effective_permissions": [
    {"resource": "users", "action": "read"},
    {"resource": "users", "action": "write"},
    {"resource": "roles", "action": "read"},
    {"resource": "roles", "action": "write"},
    {"resource": "groups", "action": "read"},
    {"resource": "groups", "action": "write"},
    {"resource": "services", "action": "read"},
    {"resource": "services", "action": "write"}
  ]
}
```

#### GET /me/services
Get services that the current user has access to.

```bash
curl -X GET http://localhost:8080/me/services \
  -H "Authorization: Bearer <access_token>"
```

**Response:**
```json
{
  "user_id": "cccc1111-cccc-1111-cccc-111111111111",
  "username": "admin",
  "services": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "name": "auth-service",
      "client_id": "auth-service-client",
      "redirect_uri": "",
      "scopes": "permissions:read users:read users:write roles:read roles:write",
      "is_active": true
    },
    {
      "id": "22222222-2222-2222-2222-222222222222",
      "name": "Document Base",
      "client_id": "document-base-client",
      "redirect_uri": "http://localhost:3000/auth/callback",
      "scopes": "documents:read documents:write users:read",
      "is_active": true
    }
  ]
}
```

#### GET /me/check-permission
Check if current user has a specific permission.

```bash
curl -X GET "http://localhost:8080/me/check-permission?action=read&resource=users" \
  -H "Authorization: Bearer <access_token>"
```

**Response:**
```json
{
  "permission": "read:users",
  "allowed": true
}
```

### Password Management

#### POST /auth/change-password
Change user password with policy validation.

```bash
curl -X POST http://localhost:8080/auth/change-password \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "OldPassword@123",
    "new_password": "NewPassword@456"
  }'
```

#### GET /me/password-policy
Get current user's password policy status.

```bash
curl -X GET http://localhost:8080/me/password-policy \
  -H "Authorization: Bearer <access_token>"
```

## SSO Integration Endpoints

### OAuth2 Authorization Flow

#### GET /sso/login
OAuth2 authorization endpoint for external services.

```bash
# Redirect user to this URL for SSO login
GET http://localhost:8080/sso/login?client_id=document-base-client&redirect_uri=http://localhost:3000/auth/callback&response_type=code&state=abc123
```

#### POST /sso/validate
Validate JWT token with service credentials (dual authentication).

```bash
curl -X POST http://localhost:8080/sso/validate \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "client_id": "document-base-client",
    "client_secret": "DocBase@Secret123"
  }'
```

**Response:**
```json
{
  "valid": true,
  "user_id": "cccc1111-cccc-1111-cccc-111111111111",
  "username": "admin",
  "email": "admin@example.com",
  "roles": ["administrator"],
  "groups": ["administrator", "document_users"],
  "permissions": [
    {"resource": "users", "action": "read"},
    {"resource": "users", "action": "write"}
  ],
  "service_id": "22222222-2222-2222-2222-222222222222",
  "service_name": "Document Base",
  "expires_at": 1759131240
}
```

#### GET /sso/validate
Validate token from Authorization header with service credentials from headers.

```bash
curl -X GET http://localhost:8080/sso/validate \
  -H "Authorization: Bearer <access_token>" \
  -H "X-Client-ID: document-base-client" \
  -H "X-Client-Secret: DocBase@Secret123"
```

#### POST /sso/check-permission
Check user permission with dual authentication.

```bash
curl -X POST http://localhost:8080/sso/check-permission \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "client_id": "document-base-client",
    "client_secret": "DocBase@Secret123",
    "resource": "documents",
    "action": "read"
  }'
```

#### POST /sso/logout
Logout user across all services (blacklists token).

```bash
curl -X POST http://localhost:8080/sso/logout \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response:**
```json
{
  "success": true
}
```

## Health Check

#### GET /health
Check service health status.

```bash
curl -X GET http://localhost:8080/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Error Responses

All endpoints return structured error responses:

```json
{
  "error": "invalid credentials"
}
```

### Common HTTP Status Codes
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Security Considerations

1. **Dual Authentication**: SSO endpoints require both valid JWT token AND service credentials
2. **Token Blacklisting**: Logout invalidates tokens across all services
3. **Password Policy**: Enforced complexity, history, and expiration
4. **RBAC Chain**: User → Role → Groups → Services → Permissions
5. **Cross-Service Communication**: All service integrations require client credentials

## Rate Limiting

- Authentication endpoints: 100 requests per minute per IP
- SSO validation: 1000 requests per minute per service
- Other endpoints: 500 requests per minute per user

## JWT Token Format

```json
{
  "user_id": "cccc1111-cccc-1111-cccc-111111111111",
  "username": "admin",
  "email": "admin@example.com",
  "roles": ["administrator"],
  "groups": ["administrator", "document_users"],
  "iss": "auth-service",
  "sub": "cccc1111-cccc-1111-cccc-111111111111",
  "exp": 1759131240,
  "nbf": 1759130340,
  "iat": 1759130340
}
```

## Next Steps

- [SSO Integration Guide](./SSO_INTEGRATION.md)
- [Client Credentials Guide](./CLIENT_CREDENTIALS.md) 
- [Frontend Integration Guide](./FRONTEND_INTEGRATION.md)
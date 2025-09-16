# SSO Integration Guide

This guide explains how to integrate external services with the authentication service for Single Sign-On (SSO).

## Overview

The authentication service provides SSO capabilities that allow users to log in once and access multiple services seamlessly. External services can integrate with the auth service using the provided client library and middleware.

## SSO Endpoints

The authentication service exposes the following SSO endpoints:

### Public SSO Endpoints

- `POST /sso/validate` - Validate a JWT token and get user info
- `GET /sso/validate` - Validate token from Authorization header
- `POST /sso/check-permission` - Check if user has specific permission
- `POST /sso/login` - Perform SSO login for a service
- `POST /sso/logout` - Logout user from SSO

## Client Library Usage

### Go Services

For Go services, use the provided SSO client library:

```go
import "github.com/seasia/auth-service/pkg/sso"

// Create SSO client
client := sso.NewClient("http://auth-service:8080")

// Validate a token
userInfo, err := client.ValidateToken(token)
if err != nil {
    // Handle error
}

if userInfo.Valid {
    // User is authenticated
    fmt.Printf("User: %s, Roles: %v\n", userInfo.Username, userInfo.Roles)
}
```

### Middleware Integration

#### Standard HTTP Middleware

```go
import "github.com/seasia/auth-service/pkg/sso"

func main() {
    ssoMiddleware := sso.NewMiddleware("http://auth-service:8080")
    
    mux := http.NewServeMux()
    
    // Protected endpoint requiring authentication
    mux.Handle("/protected", ssoMiddleware.Authenticate(http.HandlerFunc(protectedHandler)))
    
    // Protected endpoint requiring specific permission
    mux.Handle("/admin", ssoMiddleware.RequirePermission("admin", "read")(http.HandlerFunc(adminHandler)))
    
    http.ListenAndServe(":8081", mux)
}

func protectedHandler(w http.ResponseWriter, r *http.Request) {
    userInfo, ok := sso.GetUserInfo(r)
    if !ok {
        http.Error(w, "No user info", http.StatusInternalServerError)
        return
    }
    
    fmt.Fprintf(w, "Hello %s! Roles: %v", userInfo.Username, userInfo.Roles)
}
```

#### Gin Middleware

```go
import "github.com/seasia/auth-service/pkg/sso"

func main() {
    ssoMiddleware := sso.NewGinMiddleware("http://auth-service:8080")
    
    r := gin.Default()
    
    // Protected endpoint requiring authentication
    r.GET("/protected", ssoMiddleware.Authenticate(), protectedHandler)
    
    // Protected endpoint requiring specific permission
    r.GET("/admin", ssoMiddleware.RequirePermission("admin", "read"), adminHandler)
    
    r.Run(":8081")
}

func protectedHandler(c *gin.Context) {
    userInfo, ok := sso.GetUserInfoFromGin(c)
    if !ok {
        c.JSON(500, gin.H{"error": "No user info"})
        return
    }
    
    c.JSON(200, gin.H{
        "message": "Hello " + userInfo.Username,
        "roles":   userInfo.Roles,
    })
}
```

## Non-Go Services Integration

For services not written in Go, you can integrate directly with the SSO REST API:

### Token Validation

```bash
# Validate token via POST
curl -X POST http://auth-service:8080/sso/validate \
  -H "Content-Type: application/json" \
  -d '{"token": "your-jwt-token"}'

# Validate token via GET with Authorization header
curl -X GET http://auth-service:8080/sso/validate \
  -H "Authorization: Bearer your-jwt-token"
```

Response:
```json
{
  "valid": true,
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "username": "john.doe",
  "email": "john.doe@example.com",
  "roles": ["user", "admin"],
  "groups": ["developers", "admins"],
  "permissions": [
    {"resource": "users", "action": "read"},
    {"resource": "admin", "action": "write"}
  ],
  "expires_at": 1703721600
}
```

### Permission Check

```bash
curl -X POST http://auth-service:8080/sso/check-permission \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your-jwt-token",
    "resource": "users",
    "action": "read"
  }'
```

Response:
```json
{
  "allowed": true
}
```

### Service Login

```bash
curl -X POST http://auth-service:8080/sso/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john.doe",
    "password": "password123",
    "service_id": "service-uuid",
    "redirect_uri": "https://your-service.com/auth/callback"
  }'
```

Response:
```json
{
  "success": true,
  "access_token": "jwt-token",
  "redirect_uri": "https://your-service.com/auth/callback"
}
```

## Service Registration

Before users can access your service through SSO, you need to register your service with the authentication system:

1. **Create a Service** via the admin interface or API:
   - Name: Your service name
   - Client ID: Unique identifier for your service
   - Client Secret: Secret for service authentication
   - Redirect URI: Where to redirect after SSO login
   - Scopes: Permissions your service requires

2. **Assign Service to Groups** so users can access it:
   - Create or use existing groups
   - Assign your service to relevant groups
   - Users get access to services through their role's groups

## Frontend Integration

For frontend applications, you can implement SSO by:

1. **Redirect to Auth Service** for login:
   ```
   http://auth-service:8080/login?service_id=your-service-id&redirect_uri=your-callback-url
   ```

2. **Handle the callback** with the JWT token:
   ```javascript
   // Extract token from URL or response
   const token = getTokenFromCallback();
   
   // Store token for API calls
   localStorage.setItem('auth_token', token);
   
   // Use token in API requests
   fetch('/api/protected', {
     headers: {
       'Authorization': `Bearer ${token}`
     }
   });
   ```

3. **Validate token periodically** to check if still valid:
   ```javascript
   async function validateToken(token) {
     const response = await fetch('http://auth-service:8080/sso/validate', {
       method: 'GET',
       headers: {
         'Authorization': `Bearer ${token}`
       }
     });
     
     const result = await response.json();
     return result.valid;
   }
   ```

## Security Considerations

1. **HTTPS Only**: Always use HTTPS in production
2. **Token Storage**: Store tokens securely (httpOnly cookies for web apps)
3. **Token Validation**: Always validate tokens on each request
4. **Permission Checks**: Implement fine-grained permission checks
5. **Logout Propagation**: Implement proper logout across all services

## Example Service Setup

Here's a complete example of setting up a new service with SSO:

1. **Register the service** in the auth system
2. **Create groups** with appropriate permissions
3. **Assign users to roles** that have access to the groups
4. **Implement SSO middleware** in your service
5. **Test the integration** with different user roles

For more detailed examples, see the `examples/` directory in the repository.
# Document Base Service - SSO Integration Curl Commands (Enhanced Security)

## ⚠️ ENHANCED SECURITY UPDATE

**All SSO endpoints now require DUAL AUTHENTICATION:**
- **User Token**: JWT token from login
- **Service Credentials**: Client ID + Client Secret

This prevents unauthorized services from accepting valid user tokens.

## Service Details

**Document Service Credentials:**
- Service ID: `22222222-2222-2222-2222-222222222222`
- Client ID: `doc-service-client-id-123456`
- Client Secret: `DocService@Secret123`
- Redirect URI: `http://localhost:3002/auth/callback`

**Test User Credentials:**
- Username: `doc_admin`
- Password: `Admin@123`
- Email: `docadmin@example.com`
- Role: `document_administrator`
- Permissions: `read:documents`, `write:documents`, `read:users`, `read:profile`

## 1. Authentication - Get JWT Token

### Login with Document Admin User
```bash
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "password",
    "username": "doc_admin",
    "password": "Admin@123"
  }'
```

**Expected Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

### Store Token in Variable (for easier testing)
```bash
# After getting the token, store it in a variable
TOKEN="eyJhbGciOiJIUzI1NiIs..." # Replace with your actual token

# Or extract it directly
TOKEN=$(curl -s -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type": "password", "username": "doc_admin", "password": "Admin@123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
```

## 2. SSO Token Validation

### Validate Token via POST (DUAL AUTH REQUIRED)
```bash
curl -X POST http://localhost:8080/sso/validate \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$TOKEN\",
    \"client_id\": \"doc-service-client-id-123456\",
    \"client_secret\": \"DocService@Secret123\"
  }"
```

### Validate Token via GET with Headers (DUAL AUTH REQUIRED)
```bash
curl -X GET http://localhost:8080/sso/validate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Client-ID: doc-service-client-id-123456" \
  -H "X-Client-Secret: DocService@Secret123"
```

**Expected Response:**
```json
{
  "valid": true,
  "user_id": "cccc0000-cccc-0000-cccc-000000000000",
  "username": "doc_admin",
  "email": "docadmin@example.com",
  "roles": ["document_administrator"],
  "groups": ["document_administrators"],
  "permissions": [
    {"resource": "documents", "action": "read"},
    {"resource": "documents", "action": "write"},
    {"resource": "users", "action": "read"},
    {"resource": "profile", "action": "read"}
  ],
  "service_id": "22222222-2222-2222-2222-222222222222",
  "service_name": "Document Service",
  "expires_at": 1757938941
}
```

## 3. SSO Permission Checking

### Check if User Can Read Documents (DUAL AUTH REQUIRED)
```bash
curl -X POST http://localhost:8080/sso/check-permission \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$TOKEN\",
    \"resource\": \"documents\",
    \"action\": \"read\",
    \"client_id\": \"doc-service-client-id-123456\",
    \"client_secret\": \"DocService@Secret123\"
  }"
```

**Expected Response:**
```json
{
  "allowed": true
}
```

### Check if User Can Write Documents (DUAL AUTH REQUIRED)
```bash
curl -X POST http://localhost:8080/sso/check-permission \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$TOKEN\",
    \"resource\": \"documents\",
    \"action\": \"write\",
    \"client_id\": \"doc-service-client-id-123456\",
    \"client_secret\": \"DocService@Secret123\"
  }"
```

### Check Permission User Doesn't Have (DUAL AUTH REQUIRED)
```bash
curl -X POST http://localhost:8080/sso/check-permission \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$TOKEN\",
    \"resource\": \"admin\",
    \"action\": \"write\",
    \"client_id\": \"doc-service-client-id-123456\",
    \"client_secret\": \"DocService@Secret123\"
  }"
```

**Expected Response:**
```json
{
  "allowed": false
}
```

## 4. SSO Service Login

### Login for Document Service
```bash
curl -X POST http://localhost:8080/sso/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "doc_admin",
    "password": "Admin@123",
    "service_id": "22222222-2222-2222-2222-222222222222",
    "redirect_uri": "http://localhost:3002/auth/callback"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "redirect_uri": "http://localhost:3002/auth/callback"
}
```

### Login with Service Admin (who also has document access)
```bash
curl -X POST http://localhost:8080/sso/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "service_admin",
    "password": "Admin@123",
    "service_id": "22222222-2222-2222-2222-222222222222"
  }'
```

## 5. SSO Logout

### Logout User
```bash
curl -X POST http://localhost:8080/sso/logout \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}"
```

**Expected Response:**
```json
{
  "success": true
}
```

## 6. Client Credentials Grant (For Service-to-Service Auth)

### Authenticate as Document Service
```bash
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "doc-service-client-id-123456",
    "client_secret": "DocService@Secret123"
  }'
```

## 7. Testing with Your Document Service API

### Example: Call Your Document Service API with SSO Token
```bash
# Assuming your document service runs on port 8081
curl -X GET http://localhost:8081/api/documents \
  -H "Authorization: Bearer $TOKEN"
```

### Example: Create Document
```bash
curl -X POST http://localhost:8081/api/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Document",
    "content": "This is a test document created via SSO"
  }'
```

## 8. Complete Test Flow

```bash
# Step 1: Login and get token
TOKEN=$(curl -s -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type": "password", "username": "doc_admin", "password": "Admin@123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

echo "Got token: ${TOKEN:0:50}..."

# Step 2: Validate token (DUAL AUTH)
echo "Validating token..."
curl -X GET http://localhost:8080/sso/validate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Client-ID: doc-service-client-id-123456" \
  -H "X-Client-Secret: DocService@Secret123"

# Step 3: Check permissions (DUAL AUTH)
echo -e "\n\nChecking document read permission..."
curl -X POST http://localhost:8080/sso/check-permission \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\", \"resource\": \"documents\", \"action\": \"read\", \"client_id\": \"doc-service-client-id-123456\", \"client_secret\": \"DocService@Secret123\"}"

# Step 4: Use token with your service
echo -e "\n\nCalling document service..."
curl -X GET http://localhost:8081/api/documents \
  -H "Authorization: Bearer $TOKEN"

# Step 5: Logout
echo -e "\n\nLogging out..."
curl -X POST http://localhost:8080/sso/logout \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}"
```

## 9. Error Testing

### Invalid Token
```bash
curl -X POST http://localhost:8080/sso/validate \
  -H "Content-Type: application/json" \
  -d '{
    "token": "invalid-token",
    "client_id": "doc-service-client-id-123456",
    "client_secret": "DocService@Secret123"
  }'
```

### Invalid Service Credentials
```bash
curl -X POST http://localhost:8080/sso/validate \
  -H "Content-Type: application/json" \
  -d '{
    "token": "'$TOKEN'",
    "client_id": "invalid-client-id",
    "client_secret": "invalid-secret"
  }'
```

### Missing Service Credentials
```bash
curl -X GET http://localhost:8080/sso/validate \
  -H "Authorization: Bearer $TOKEN"
```

### Wrong Credentials
```bash
curl -X POST http://localhost:8080/sso/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "doc_admin",
    "password": "wrong-password",
    "service_id": "22222222-2222-2222-2222-222222222222"
  }'
```

## 10. Service Management (Requires service_admin)

### Get Service Admin Token
```bash
SERVICE_TOKEN=$(curl -s -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type": "password", "username": "service_admin", "password": "Admin@123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
```

### List All Services
```bash
curl -X GET http://localhost:8080/services \
  -H "Authorization: Bearer $SERVICE_TOKEN"
```

### Get Document Service Details
```bash
curl -X GET http://localhost:8080/services/22222222-2222-2222-2222-222222222222 \
  -H "Authorization: Bearer $SERVICE_TOKEN"
```

## Notes

1. **Token Expiry**: Tokens expire after 15 minutes (900 seconds)
2. **Service Access**: Users must be in a group that has access to the document service
3. **Permissions**: The document service has permissions for documents and user profile
4. **CORS**: If calling from browser, ensure CORS is configured on auth service

## Troubleshooting

### Token Expired
If you get a "token expired" error, simply login again to get a new token.

### Service Not Found
Ensure the document service has been created in the database by running the migration script.

### Permission Denied
Check that the user has the `document_administrator` role and is in the `document_administrators` group.

### Service Authentication Errors
If you get "service authentication failed" errors:
- Verify your client ID and secret are correct
- Ensure the service is active in the service management UI
- Check that the service credentials haven't been regenerated

## Security Benefits of Dual Authentication

The enhanced security model prevents several attack vectors:

1. **Malicious Service Protection**: A rogue service can't use valid user tokens
2. **Token Theft Mitigation**: Stolen user tokens are useless without service credentials  
3. **Service Accountability**: All token validations are tied to specific registered services
4. **Audit Trail**: Full traceability of which services are validating which users

This dual authentication ensures both user identity AND service legitimacy.
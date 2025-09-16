# Authentication & Authorization Service

A comprehensive authentication and authorization service built with Go backend and React frontend. Features OAuth2/JWT authentication, Role-Based Access Control (RBAC), complete user management UI, BDD testing, and Docker containerization.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Local Development Setup](#local-development-setup)
  - [With Docker (Recommended)](#with-docker-recommended)
  - [Without Docker](#without-docker)
- [Production Setup](#production-setup)
- [API Documentation](#api-documentation)
- [OAuth2 & JWT Authentication](#oauth2--jwt-authentication)
- [SSO Integration](#sso-integration)
- [Service-to-Service Authentication](#service-to-service-authentication)
- [Testing](#testing)
- [Environment Variables](#environment-variables)
- [Default Users](#default-users)
- [Contributing](#contributing)

## Features

- 🔐 **OAuth2 & JWT Authentication** - Support for multiple grant types
- 👥 **Role-Based Access Control (RBAC)** - Fine-grained permission system
- 🎛️ **User Management UI** - Complete CRUD operations for users and roles
- 🔗 **SSO Integration** - Single Sign-On support for external services
- 🐳 **Docker Support** - Fully containerized development and production
- 📱 **Responsive Design** - Mobile-friendly React frontend
- 🧪 **BDD Testing** - Cucumber.js with Playwright for cross-browser testing
- 🚀 **Production Ready** - Nginx reverse proxy, SSL support

## Architecture

Multi-service architecture with:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│    │   Go Backend    │    │   PostgreSQL    │
│   (Port 3001)   │◄──►│   (Port 8080)   │◄──►│   (Port 5433)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
┌─────────────────────────────────────────────────────────────────┐
│                    Nginx Reverse Proxy                         │
│                     (Port 80/443)                              │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**
- **Backend**: Go (Gin) API server with JWT auth and PostgreSQL
- **Frontend**: React (TypeScript) with user management features
- **Database**: PostgreSQL with GORM migrations
- **Proxy**: Nginx reverse proxy for production
- **Testing**: BDD with Cucumber.js and Playwright

## Project Structure

```
auth-service/
├── backend/                    # Go backend service
│   ├── cmd/server/            # Application entry point
│   │   └── main.go
│   ├── internal/              # Private application code
│   │   ├── handlers/          # HTTP request handlers
│   │   ├── services/          # Business logic layer
│   │   ├── repository/        # Data access layer
│   │   ├── middleware/        # HTTP middleware (auth, CORS)
│   │   ├── auth/              # JWT token management
│   │   └── models/            # Database models (GORM)
│   ├── config/                # Configuration management
│   ├── migrations/            # Database migrations
│   └── .env.example          # Environment template
├── frontend/react-app/        # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── provider/          # Context providers
│   │   ├── routes/            # Route configuration
│   │   └── utils/             # Utility functions
│   └── public/               # Static assets
├── tests/bdd/                # BDD test suites
│   ├── features/             # Cucumber feature files
│   ├── steps/                # Step definitions
│   └── support/              # Test helpers
├── nginx/                    # Nginx configuration
├── docker-compose.yml        # Docker services
└── CLAUDE.md                # Development guidelines
```

## Quick Start

Get the service running in under 5 minutes:

```bash
# Clone the repository
git clone <repository-url>
cd auth-service

# Start all services with Docker
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

Access the services:
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:8080
- **API Health**: http://localhost:8080/health

Default admin login: `admin` / `Admin@123`

## Local Development Setup

### With Docker (Recommended)

**Prerequisites:**
- Docker & Docker Compose
- Git

**Setup:**

```bash
# Clone repository
git clone <repository-url>
cd auth-service

# Start all services
docker-compose up -d

# View service logs
docker-compose logs -f [service-name]

# Stop services
docker-compose down

# Rebuild services after code changes
docker-compose up --build -d
```

**Development Workflow:**
```bash
# Watch backend logs
docker-compose logs -f backend

# Watch frontend logs
docker-compose logs -f frontend

# Execute commands in containers
docker-compose exec backend go test ./...
docker-compose exec frontend npm test

# Reset database (removes all data)
docker-compose down -v
docker-compose up -d
```

### Without Docker

**Prerequisites:**
- Go 1.23+
- Node.js 18+
- PostgreSQL 15+
- Git

**Database Setup:**
```bash
# Install and start PostgreSQL
# Ubuntu/Debian:
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# macOS with Homebrew:
brew install postgresql
brew services start postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE auth_service;
CREATE USER auth_user WITH PASSWORD 'auth_password';
GRANT ALL PRIVILEGES ON DATABASE auth_service TO auth_user;
\q
```

**Backend Setup:**
```bash
cd backend

# Copy environment configuration
cp .env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_USER=auth_user
# DB_PASSWORD=auth_password
# DB_NAME=auth_service

# Install dependencies
go mod download

# Run database migrations
go run cmd/server/main.go migrate

# Start development server
go run cmd/server/main.go

# Or build and run
go build -o bin/server cmd/server/main.go
./bin/server
```

**Frontend Setup:**
```bash
cd frontend/react-app

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

**Verify Setup:**
```bash
# Test backend API
curl http://localhost:8080/health

# Test frontend
open http://localhost:3000
```

## Production Setup

### Docker Production Deployment

**Prerequisites:**
- Docker & Docker Compose
- Domain name (optional)
- SSL certificates (for HTTPS)

**Production Configuration:**

1. **Environment Setup:**
```bash
# Copy production environment template
cp backend/.env.example backend/.env.prod

# Edit production environment variables
vim backend/.env.prod
```

Key production variables:
```env
# Security
JWT_SECRET_KEY=your-super-secure-production-secret-key-change-this
SERVER_MODE=release

# Database (use strong credentials)
DB_PASSWORD=strong-production-password

# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
```

2. **SSL Certificate Setup (Optional):**
```bash
# Place your SSL certificates in nginx/ssl/
mkdir -p nginx/ssl
cp your-domain.crt nginx/ssl/
cp your-domain.key nginx/ssl/

# Update nginx configuration
vim nginx/nginx.conf
```

3. **Deploy:**
```bash
# Production deployment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check deployment
docker-compose ps
docker-compose logs -f
```

### Manual Production Setup

**System Requirements:**
- Ubuntu 20.04+ / CentOS 8+ / Similar Linux distribution
- 2GB+ RAM
- 10GB+ disk space
- PostgreSQL 15+
- Nginx
- Go 1.23+
- Node.js 18+

**Setup Steps:**

1. **Install Dependencies:**
```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Install Nginx
sudo apt-get install -y nginx

# Install Go 1.23
wget https://golang.org/dl/go1.23.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.23.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Database Configuration:**
```bash
sudo -u postgres createdb auth_service
sudo -u postgres createuser auth_user
sudo -u postgres psql -c "ALTER USER auth_user WITH PASSWORD 'secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE auth_service TO auth_user;"
```

3. **Application Deployment:**
```bash
# Clone application
git clone <repository-url> /opt/auth-service
cd /opt/auth-service

# Build backend
cd backend
cp .env.example .env
# Edit .env with production values
go build -o bin/server cmd/server/main.go

# Build frontend
cd ../frontend/react-app
npm install
npm run build

# Create system service
sudo cp deployment/systemd/auth-service.service /etc/systemd/system/
sudo systemctl enable auth-service
sudo systemctl start auth-service
```

4. **Nginx Configuration:**
```bash
# Copy nginx configuration
sudo cp nginx/nginx.conf /etc/nginx/sites-available/auth-service
sudo ln -s /etc/nginx/sites-available/auth-service /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## API Documentation

### Base URL
- Development: `http://localhost:8080`
- Production: `https://your-domain.com/api`

### Authentication Endpoints

#### POST `/auth/token`
Generate JWT tokens using various OAuth2 grant types.

**Grant Type: Password**
```bash
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "password",
    "username": "admin",
    "password": "Admin@123"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

**Grant Type: Refresh Token**
```bash
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
  }'
```

**Grant Type: Client Credentials**
```bash
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "your-client-id",
    "client_secret": "your-client-secret"
  }'
```

#### GET `/me/permissions`
Get current user's permissions.

```bash
curl -X GET http://localhost:8080/me/permissions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Response:**
```json
{
  "permissions": [
    {
      "service": "auth-service",
      "action": "read",
      "resource": "users"
    },
    {
      "service": "auth-service", 
      "action": "write",
      "resource": "users"
    }
  ]
}
```

#### GET `/me/check-permission`
Check if user has specific permission.

```bash
curl -X GET "http://localhost:8080/me/check-permission?service=auth-service&action=read&resource=users" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Response:**
```json
{
  "has_permission": true
}
```

### User Management Endpoints

#### GET `/users`
List all users with their roles.

```bash
curl -X GET http://localhost:8080/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "active": true,
      "roles": [
        {
          "id": 1,
          "name": "super_admin"
        }
      ]
    }
  ]
}
```

#### POST `/users`
Create a new user.

```bash
curl -X POST http://localhost:8080/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "NewUser@123",
    "role_ids": [2]
  }'
```

#### PUT `/users/{id}`
Update user information.

```bash
curl -X PUT http://localhost:8080/users/2 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "username": "updateduser",
    "email": "updated@example.com",
    "active": true
  }'
```

#### DELETE `/users/{id}`
Delete a user.

```bash
curl -X DELETE http://localhost:8080/users/2 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Role Management Endpoints

#### GET `/roles`
List all roles with permissions.

```bash
curl -X GET http://localhost:8080/roles \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

#### POST `/roles`
Create a new role.

```bash
curl -X POST http://localhost:8080/roles \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "editor",
    "description": "Editor role with limited permissions",
    "group_ids": [1]
  }'
```

### Import/Export Endpoints

#### GET `/users/export/csv`
Export users to CSV format.

```bash
curl -X GET http://localhost:8080/users/export/csv \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -o users.csv
```

#### POST `/users/import/csv`
Import users from CSV file.

```bash
curl -X POST http://localhost:8080/users/import/csv \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -F "file=@users.csv"
```

## OAuth2 & JWT Authentication

### Supported Grant Types

#### 1. Password Grant Type
Used for first-party applications where the client can securely store credentials.

**Use Case:** React frontend login
```javascript
const response = await fetch('/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'password',
    username: 'user@example.com',
    password: 'userpassword'
  })
});
```

#### 2. Refresh Token Grant Type
Used to obtain new access tokens when they expire.

**Use Case:** Automatic token refresh
```javascript
const response = await fetch('/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'refresh_token',
    refresh_token: storedRefreshToken
  })
});
```

#### 3. Client Credentials Grant Type
Used for service-to-service authentication.

**Use Case:** Microservice authentication
```bash
# Service authentication
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "service-client-id",
    "client_secret": "service-client-secret"
  }'
```

### Token Structure

**Access Token (15 minutes TTL):**
```json
{
  "sub": "1",
  "username": "admin",
  "email": "admin@example.com",
  "roles": ["super_admin"],
  "permissions": [
    {
      "service": "auth-service",
      "action": "read", 
      "resource": "users"
    }
  ],
  "exp": 1640995200,
  "iat": 1640994300
}
```

**Refresh Token (7 days TTL):**
```json
{
  "sub": "1",
  "type": "refresh",
  "exp": 1641599100,
  "iat": 1640994300
}
```

## SSO Integration

### Enhanced Security Model - Dual Authentication

⚠️ **IMPORTANT**: All SSO endpoints use enhanced security requiring **DUAL AUTHENTICATION**:
- **User Token**: JWT token from login
- **Service Credentials**: Client ID + Client Secret

This prevents unauthorized services from accepting valid user tokens and ensures both user identity AND service legitimacy.

### SSO Endpoints

The authentication service provides the following SSO endpoints:

#### Core SSO Endpoints
- `POST /sso/validate` - Validate JWT token with service credentials
- `GET /sso/validate` - Validate token from Authorization header with service credentials
- `POST /sso/check-permission` - Check user permissions with service credentials
- `POST /sso/login` - Perform SSO login for a specific service
- `POST /sso/logout` - Logout user from SSO

### Integrating External Services

#### 1. Service Registration

Register your service to receive tokens:

```bash
curl -X POST http://localhost:8080/services \
  -H "Authorization: Bearer admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-service",
    "description": "My external service",
    "client_id": "my-service-client-id", 
    "client_secret": "secure-client-secret",
    "redirect_uris": ["https://myservice.com/callback"],
    "allowed_origins": ["https://myservice.com"],
    "scopes": ["read:documents", "write:documents", "read:profile"]
  }'
```

**Response includes:**
- Service ID (UUID)
- Client credentials for dual authentication
- Redirect URIs for SSO flows

#### 2. Enhanced Token Validation (Dual Authentication)

**POST Method with Service Credentials:**
```bash
curl -X POST http://localhost:8080/sso/validate \
  -H "Content-Type: application/json" \
  -d '{
    "token": "user-jwt-token",
    "client_id": "my-service-client-id",
    "client_secret": "secure-client-secret"
  }'
```

**GET Method with Headers:**
```bash
curl -X GET http://localhost:8080/sso/validate \
  -H "Authorization: Bearer user-jwt-token" \
  -H "X-Client-ID: my-service-client-id" \
  -H "X-Client-Secret: secure-client-secret"
```

**Enhanced Response:**
```json
{
  "valid": true,
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "username": "john.doe",
  "email": "john.doe@example.com",
  "roles": ["document_administrator"],
  "groups": ["document_administrators"],
  "permissions": [
    {"resource": "documents", "action": "read"},
    {"resource": "documents", "action": "write"},
    {"resource": "users", "action": "read"}
  ],
  "service_id": "22222222-2222-2222-2222-222222222222",
  "service_name": "My Service",
  "expires_at": 1640995200
}
```

#### 3. Permission Checking with Service Authentication

```bash
curl -X POST http://localhost:8080/sso/check-permission \
  -H "Content-Type: application/json" \
  -d '{
    "token": "user-jwt-token",
    "resource": "documents",
    "action": "write",
    "client_id": "my-service-client-id",
    "client_secret": "secure-client-secret"
  }'
```

**Go Service Integration Example:**
```go
import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

type SSOClient struct {
    AuthURL      string
    ClientID     string
    ClientSecret string
}

type ValidationRequest struct {
    Token        string `json:"token"`
    ClientID     string `json:"client_id"`
    ClientSecret string `json:"client_secret"`
}

type UserInfo struct {
    Valid       bool                   `json:"valid"`
    UserID      string                 `json:"user_id"`
    Username    string                 `json:"username"`
    Email       string                 `json:"email"`
    Roles       []string               `json:"roles"`
    Groups      []string               `json:"groups"`
    Permissions []PermissionInfo       `json:"permissions"`
    ServiceID   string                 `json:"service_id"`
    ServiceName string                 `json:"service_name"`
    ExpiresAt   int64                  `json:"expires_at"`
}

type PermissionInfo struct {
    Resource string `json:"resource"`
    Action   string `json:"action"`
}

func (c *SSOClient) ValidateToken(token string) (*UserInfo, error) {
    reqBody := ValidationRequest{
        Token:        token,
        ClientID:     c.ClientID,
        ClientSecret: c.ClientSecret,
    }
    
    jsonBody, _ := json.Marshal(reqBody)
    
    resp, err := http.Post(
        c.AuthURL+"/sso/validate",
        "application/json",
        bytes.NewBuffer(jsonBody),
    )
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    var userInfo UserInfo
    if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
        return nil, err
    }
    
    return &userInfo, nil
}

func (c *SSOClient) CheckPermission(token, resource, action string) (bool, error) {
    reqBody := map[string]string{
        "token":         token,
        "resource":      resource,
        "action":        action,
        "client_id":     c.ClientID,
        "client_secret": c.ClientSecret,
    }
    
    jsonBody, _ := json.Marshal(reqBody)
    
    resp, err := http.Post(
        c.AuthURL+"/sso/check-permission",
        "application/json",
        bytes.NewBuffer(jsonBody),
    )
    if err != nil {
        return false, err
    }
    defer resp.Body.Close()
    
    var result struct {
        Allowed bool `json:"allowed"`
    }
    
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return false, err
    }
    
    return result.Allowed, nil
}
```

#### 4. Middleware Implementation

**Express.js Middleware with Dual Authentication:**
```javascript
const axios = require('axios');

class SSOMiddleware {
  constructor(authServiceUrl, clientId, clientSecret) {
    this.authServiceUrl = authServiceUrl;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  authenticate(requiredPermission = null) {
    return async (req, res, next) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.split(' ')[1];
      
      try {
        // Validate token with dual authentication
        const response = await axios.post(`${this.authServiceUrl}/sso/validate`, {
          token: token,
          client_id: this.clientId,
          client_secret: this.clientSecret
        });

        const userInfo = response.data;
        
        if (!userInfo.valid) {
          return res.status(401).json({ error: 'Invalid token' });
        }

        // Check specific permission if required
        if (requiredPermission) {
          const hasPermission = userInfo.permissions.some(p => 
            p.resource === requiredPermission.resource &&
            p.action === requiredPermission.action
          );
          
          if (!hasPermission) {
            return res.status(403).json({ error: 'Insufficient permissions' });
          }
        }
        
        req.user = userInfo;
        next();
      } catch (error) {
        return res.status(401).json({ error: 'Token validation failed' });
      }
    };
  }

  requirePermission(resource, action) {
    return this.authenticate({ resource, action });
  }
}

// Usage
const ssoMiddleware = new SSOMiddleware(
  'http://localhost:8080',
  'my-service-client-id',
  'secure-client-secret'
);

// Protected route requiring authentication
app.get('/protected', ssoMiddleware.authenticate(), (req, res) => {
  res.json({ 
    message: `Hello ${req.user.username}`,
    roles: req.user.roles,
    permissions: req.user.permissions
  });
});

// Protected route requiring specific permission
app.get('/documents', ssoMiddleware.requirePermission('documents', 'read'), (req, res) => {
  // Handle documents request
  res.json({ documents: [] });
});
```

#### 5. Security Benefits of Dual Authentication

The enhanced security model prevents several attack vectors:

1. **Malicious Service Protection**: A rogue service can't use valid user tokens without proper service credentials
2. **Token Theft Mitigation**: Stolen user tokens are useless without service credentials  
3. **Service Accountability**: All token validations are tied to specific registered services
4. **Audit Trail**: Full traceability of which services are validating which users
5. **Granular Access Control**: Services can only validate tokens for users who have access to their service groups

#### 6. Complete Integration Example

Here's a complete example of integrating a document service:

```bash
# Step 1: Register the service
curl -X POST http://localhost:8080/services \
  -H "Authorization: Bearer admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Document Management Service",
    "description": "Document storage and management",
    "client_id": "doc-service-client-123",
    "client_secret": "DocService@Secret123",
    "redirect_uris": ["http://localhost:3002/auth/callback"],
    "scopes": ["read:documents", "write:documents", "read:profile"]
  }'

# Step 2: Get user token
TOKEN=$(curl -s -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type": "password", "username": "doc_admin", "password": "Admin@123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

# Step 3: Validate token with service credentials
curl -X POST http://localhost:8080/sso/validate \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$TOKEN\",
    \"client_id\": \"doc-service-client-123\",
    \"client_secret\": \"DocService@Secret123\"
  }"

# Step 4: Check specific permissions
curl -X POST http://localhost:8080/sso/check-permission \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$TOKEN\",
    \"resource\": \"documents\",
    \"action\": \"write\",
    \"client_id\": \"doc-service-client-123\",
    \"client_secret\": \"DocService@Secret123\"
  }"

# Step 5: Use token with your service API
curl -X GET http://localhost:8081/api/documents \
  -H "Authorization: Bearer $TOKEN"
```

### Frontend SSO Integration

#### React Integration Example

```javascript
// AuthProvider.js
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      validateToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const response = await fetch('/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'password',
        username,
        password
      })
    });

    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    
    await fetchUserInfo();
  };

  const validateToken = async (token) => {
    try {
      const response = await fetch('/me/permissions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        await fetchUserInfo();
      } else {
        logout();
      }
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInfo = async () => {
    const token = localStorage.getItem('access_token');
    const response = await fetch('/me/permissions', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = await response.json();
    setUser(data);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## Service-to-Service Authentication

### Enhanced Service Authentication Model

The authentication service supports multiple patterns for service-to-service communication:

1. **Client Credentials Flow**: Direct service-to-service authentication
2. **Dual Authentication SSO**: User context with service verification
3. **Service Proxy Pattern**: Services validating user tokens on behalf of other services

### Client Credentials Flow

For direct service-to-service communication without user context:

#### 1. Register Service Client

```bash
curl -X POST http://localhost:8080/services \
  -H "Authorization: Bearer admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "payment-service",
    "description": "Payment processing service",
    "client_id": "payment-service-client",
    "client_secret": "secure-client-secret",
    "service_type": "backend",
    "scopes": ["read:payments", "write:payments", "read:users"]
  }'
```

#### 2. Service Authentication

**Python Example:**
```python
import requests
import jwt
import time

class AuthServiceClient:
    def __init__(self, auth_url, client_id, client_secret):
        self.auth_url = auth_url
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = None
        self.token_expires = 0

    def get_access_token(self):
        if self.access_token and time.time() < self.token_expires:
            return self.access_token

        response = requests.post(f"{self.auth_url}/auth/token", json={
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret
        })

        if response.status_code == 200:
            data = response.json()
            self.access_token = data["access_token"]
            self.token_expires = time.time() + data["expires_in"] - 60
            return self.access_token
        
        raise Exception("Failed to get access token")

    def make_authenticated_request(self, method, url, **kwargs):
        token = self.get_access_token()
        headers = kwargs.get('headers', {})
        headers['Authorization'] = f'Bearer {token}'
        kwargs['headers'] = headers
        
        return requests.request(method, url, **kwargs)

# Usage
auth_client = AuthServiceClient(
    auth_url="http://localhost:8080",
    client_id="payment-service-client", 
    client_secret="secure-client-secret"
)

# Make authenticated request to another service
response = auth_client.make_authenticated_request(
    'GET',
    'http://user-service/api/users/123'
)
```

**Go Example:**
```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "time"
)

type AuthClient struct {
    AuthURL      string
    ClientID     string
    ClientSecret string
    AccessToken  string
    TokenExpires time.Time
}

type TokenResponse struct {
    AccessToken  string `json:"access_token"`
    TokenType    string `json:"token_type"`
    ExpiresIn    int    `json:"expires_in"`
}

func (c *AuthClient) GetAccessToken() (string, error) {
    if c.AccessToken != "" && time.Now().Before(c.TokenExpires) {
        return c.AccessToken, nil
    }

    payload := map[string]string{
        "grant_type":    "client_credentials",
        "client_id":     c.ClientID,
        "client_secret": c.ClientSecret,
    }

    jsonPayload, _ := json.Marshal(payload)
    
    resp, err := http.Post(
        c.AuthURL+"/auth/token",
        "application/json",
        bytes.NewBuffer(jsonPayload),
    )
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()

    var tokenResp TokenResponse
    if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
        return "", err
    }

    c.AccessToken = tokenResp.AccessToken
    c.TokenExpires = time.Now().Add(time.Duration(tokenResp.ExpiresIn-60) * time.Second)
    
    return c.AccessToken, nil
}

func (c *AuthClient) MakeAuthenticatedRequest(method, url string) (*http.Response, error) {
    token, err := c.GetAccessToken()
    if err != nil {
        return nil, err
    }

    req, err := http.NewRequest(method, url, nil)
    if err != nil {
        return nil, err
    }

    req.Header.Set("Authorization", "Bearer "+token)
    
    client := &http.Client{}
    return client.Do(req)
}
```

### Microservices Integration Pattern

For microservices architecture, implement a shared authentication middleware:

**Express.js Middleware:**
```javascript
const jwt = require('jsonwebtoken');
const axios = require('axios');

const authMiddleware = (requiredPermission) => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      // Verify token locally (faster)
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check permission if required
      if (requiredPermission) {
        const hasPermission = decoded.permissions.some(p => 
          p.service === requiredPermission.service &&
          p.action === requiredPermission.action &&
          p.resource === requiredPermission.resource
        );
        
        if (!hasPermission) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }
      }
      
      req.user = decoded;
      next();
    } catch (error) {
      // Token invalid, verify with auth service
      try {
        const response = await axios.get('http://auth-service:8080/me/permissions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        req.user = response.data;
        next();
      } catch (authError) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }
  };
};

// Usage in routes
app.get('/users', authMiddleware({
  service: 'user-service',
  action: 'read', 
  resource: 'users'
}), (req, res) => {
  // Handle request
});
```

## Testing

### BDD Testing with Cucumber

The project includes comprehensive BDD tests using Cucumber.js and Playwright.

**Run All Tests:**
```bash
cd tests/bdd
npm install
npm run test
```

**Run Specific Test Suites:**
```bash
# Authentication tests
npm run test:auth

# Responsive design tests  
npm run test:responsive

# Cross-browser compatibility tests
npm run test:browser
```

**Test Configuration:**
```bash
# Chrome only (fastest)
npm run test -- --profile=chrome

# All browsers
npm run test -- --profile=all-browsers

# Mobile devices
npm run test -- --profile=mobile
```

### Backend Testing

```bash
cd backend

# Run all tests
go test ./...

# Run specific package tests
go test ./internal/handlers/...

# Run tests with coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Run tests with verbose output
go test -v ./...
```

### Frontend Testing

```bash
cd frontend/react-app

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test files
npm test -- --testPathPattern=Login.test.js
```

## Environment Variables

### Backend Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
# Database Configuration
DB_HOST=postgres                    # Database host
DB_PORT=5432                       # Database port
DB_USER=postgres                   # Database username
DB_PASSWORD=postgres               # Database password
DB_NAME=auth_service              # Database name
DB_SSL_MODE=disable               # SSL mode (disable/require/verify-full)

# Server Configuration
SERVER_PORT=8080                  # Server port
SERVER_HOST=0.0.0.0              # Server host (0.0.0.0 for all interfaces)
SERVER_MODE=debug                 # Server mode (debug/release)

# JWT Configuration
JWT_SECRET_KEY=your-secret-key-change-this-in-production
JWT_ACCESS_TOKEN_TTL=15           # Access token TTL in minutes
JWT_REFRESH_TOKEN_TTL=10080       # Refresh token TTL in minutes (7 days)

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization

# Logging
LOG_LEVEL=info                    # Log level (debug/info/warn/error)
LOG_FORMAT=json                   # Log format (json/text)
```

### Frontend Environment Variables

Create `frontend/react-app/.env`:

```env
# API Configuration
REACT_APP_API_BASE_URL=http://localhost:8080

# App Configuration
REACT_APP_APP_NAME=Auth Service
REACT_APP_VERSION=1.0.0

# Development
GENERATE_SOURCEMAP=true
```

### Docker Environment Variables

For Docker deployment, create `.env` in project root:

```env
# Service Ports
FRONTEND_PORT=3001
BACKEND_PORT=8080
DB_PORT=5433
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443

# Database
POSTGRES_PASSWORD=postgres
POSTGRES_DB=auth_service

# JWT Secret (change in production)
JWT_SECRET_KEY=your-production-secret-key-change-this
```

## Default Users

The system comes with pre-configured users for testing:

### Super Admin
- **Username:** `admin`
- **Password:** `Admin@123`
- **Permissions:** Full system access
- **Use Case:** System administration, user management

### Standard Users
- **Usernames:** `user1` through `user10`
- **Password:** `User@123` (for all)
- **Permissions:** Basic user permissions
- **Use Case:** Testing different user roles and permissions

### Service-Specific Test Users

#### Document Service Users
- **Document Administrator:**
  - Username: `doc_admin`
  - Password: `Admin@123`
  - Email: `docadmin@example.com`
  - Role: `document_administrator`
  - Permissions: read/write/delete documents, read users and profiles
  - Use Case: Testing document service administrative functions

- **Document User:**
  - Username: `doc_user`
  - Password: `User@123`
  - Email: `docuser@example.com`
  - Role: `document_user`
  - Permissions: read documents and profiles only
  - Use Case: Testing document service with limited permissions

#### Service Administrator
- **Username:** `service_admin`
- **Password:** `Admin@123`
- **Permissions:** Service management, user administration
- **Use Case:** Managing services, groups, and service assignments

### Creating Custom Users

**Via API:**
```bash
curl -X POST http://localhost:8080/users \
  -H "Authorization: Bearer admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "customuser",
    "email": "custom@example.com", 
    "password": "CustomUser@123",
    "role_ids": [2]
  }'
```

**Via Frontend:**
1. Login as admin
2. Navigate to User Management tab
3. Click "Add User"
4. Fill in user details and assign roles
5. Click "Create User"

## Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make changes following the coding standards**
4. **Run tests**
   ```bash
   # Backend tests
   cd backend && go test ./...
   
   # Frontend tests
   cd frontend/react-app && npm test
   
   # BDD tests
   cd tests/bdd && npm run test
   ```

5. **Commit changes**
   ```bash
   git commit -m "Add: your feature description"
   ```

6. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Coding Standards

**Go Backend:**
- Follow Go conventions and `gofmt` formatting
- Use meaningful variable and function names
- Add comments for exported functions
- Handle errors appropriately
- Write unit tests for new functionality

**React Frontend:**
- Use TypeScript for type safety
- Follow React hooks patterns
- Use functional components
- Add PropTypes for components
- Follow CSS-in-JS or CSS modules patterns

**Testing:**
- Write BDD scenarios for new features
- Maintain test coverage above 80%
- Test both success and error cases
- Use descriptive test names

### Project Structure Guidelines

When adding new features:

**Backend:**
```
internal/
├── handlers/          # Add new HTTP handlers
├── services/          # Add business logic
├── repository/        # Add data access methods
├── models/            # Add new database models
└── middleware/        # Add new middleware
```

**Frontend:**
```
src/
├── components/        # Add new React components
├── hooks/             # Add custom hooks
├── utils/             # Add utility functions
├── types/             # Add TypeScript types
└── services/          # Add API service calls
```

### Security Guidelines

- Never commit secrets or API keys
- Use environment variables for configuration
- Validate all inputs on both client and server
- Use parameterized queries to prevent SQL injection
- Implement proper CORS configuration
- Use HTTPS in production
- Regularly update dependencies

---

## Support

For issues, questions, or contributions:

1. **Check existing issues** in the GitHub repository
2. **Create detailed bug reports** with reproduction steps
3. **Submit feature requests** with clear use cases
4. **Contribute code** following the contributing guidelines

## License

[Add your license information here]

---

**Built with ❤️ using Go, React, and modern web technologies.**
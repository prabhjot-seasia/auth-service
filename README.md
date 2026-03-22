# Enterprise Authentication & Authorization Service

A comprehensive, production-ready authentication and authorization service designed for modern enterprise applications. Built with Go backend and React frontend, featuring OAuth2/JWT authentication, Role-Based Access Control (RBAC), Single Sign-On (SSO), and complete user management capabilities.

## Service Intent & Purpose

This service serves as a **centralized authentication and authorization hub** for enterprise applications, providing:

- **Enterprise SSO**: Single Sign-On across multiple applications and services
- **Centralized Security**: One place to manage users, roles, permissions, and access policies
- **Service Integration**: Easy integration for any application requiring authentication
- **User Management**: Complete administrative interface for user lifecycle management
- **Security Compliance**: Industry-standard security practices with audit capabilities
- **Developer Friendly**: Simple APIs and comprehensive documentation for quick integration

### Who Should Use This Service?

- **Enterprises** needing centralized authentication across multiple applications
- **Development Teams** building microservices requiring consistent authentication
- **Organizations** requiring RBAC with fine-grained permissions
- **Companies** implementing SSO for improved user experience and security
- **Teams** needing a ready-to-deploy auth service with management UI

## Features

### Authentication & Authorization
- **OAuth2 & JWT Authentication** - Complete OAuth2 implementation with JWT tokens
- **Role-Based Access Control (RBAC)** - Fine-grained permission system
- **Single Sign-On (SSO)** - Cross-application authentication
- **Service-to-Service Auth** - Client credentials flow for microservices
- **Password Policies** - Configurable password strength and expiration
- **Token Blacklisting** - Secure logout with token invalidation

### User Management
- **Complete User CRUD** - Create, read, update, delete users
- **Role Assignment** - Flexible role-based permissions
- **Group Management** - Organize users into groups
- **Service Registration** - Register applications for SSO
- **User Import/Export** - CSV support for bulk operations
- **Responsive UI** - Mobile-friendly React interface

### Developer Experience
- **Interactive API Documentation** - Built-in API testing interface
- **Setup Script** - One-command deployment with multiple configurations
- **Docker Support** - Fully containerized with Docker Compose
- **External Database** - Support for existing PostgreSQL instances
- **BDD Testing** - Comprehensive test suite with Cucumber.js

### Production Ready
- **Nginx Reverse Proxy** - Production-grade load balancing
- **SSL/TLS Support** - HTTPS configuration ready
- **Health Checks** - Built-in monitoring endpoints
- **Graceful Shutdown** - Proper resource cleanup
- **Advanced Logging** - Configurable levels, formats, and rotation

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  React Frontend │    │   Go Backend    │    │   PostgreSQL    │
│   (Port 3001)   │◄──►│   (Port 8080)   │◄──►│   (Port 5432)   │
│                 │    │                 │    │                 │
│ • User Mgmt     │    │ • JWT Auth      │    │ • User Data     │
│ • SSO Dashboard │    │ • RBAC Engine   │    │ • Permissions   │
│ • API Testing   │    │ • OAuth2        │    │ • Audit Logs    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### RBAC Model

```
Users ──► Roles ──► Groups ──► Services (with Scopes)
```

All authorization checks go through `User → Role → Groups → Services` permission chain.

## Quick Start

### Prerequisites
- **Docker & Docker Compose** (for containerized setup)
- **Go 1.23+** (for local development)
- **Node.js 20+** (for frontend development)
- **PostgreSQL 12+** (for external database)

### 30-Second Setup
```bash
git clone <repository-url>
cd auth-service

# Build and start all services
./setup.sh --start

# Access the application
open http://localhost:3001
```

**Default Login**: `admin` / `Admin@123`

## Setup Methods

### Method 1: Using Setup Script (Recommended)

#### Basic Setup (Docker Database)
```bash
./setup.sh --start
```

#### External Database Setup
```bash
# Initialize and start with external database
./setup.sh --use-external-db --db-host=localhost --db-password=mypass --init-db --start
```

If the external database doesn't exist, `--init-db` runs automatically on `--start`.

#### Production Setup
```bash
./setup.sh --environment=production --jwt-secret=my-secure-key --start
```

#### Custom Configuration
```bash
./setup.sh \
  --server-port=9090 \
  --frontend-port=3002 \
  --jwt-secret=my-secret-key \
  --start
```

### Method 2: Docker Compose Directly

```bash
# Start all services with Docker database
docker compose --profile docker-db up -d --build

# Check service status
docker compose --profile docker-db ps

# View logs
docker compose --profile docker-db logs -f

# Stop services
docker compose --profile docker-db down
```

### Method 3: Local Development (No Docker)

#### Database Setup
```bash
# Create database
sudo -u postgres psql -c "CREATE DATABASE auth_service;"

# Migrations run automatically on backend startup
```

#### Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your database settings
go run cmd/server/main.go
```

#### Frontend
```bash
cd frontend
npm install
npm start
```

#### Access
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080

## Setup Script Reference

### Command Syntax
```bash
./setup.sh [OPTIONS] [ACTIONS]
```

### Database Options
| Option | Default | Description |
|--------|---------|-------------|
| `--db-host HOST` | host.docker.internal | Database host |
| `--db-port PORT` | 5432 | Database port |
| `--db-user USER` | postgres | Database username |
| `--db-password PASSWORD` | postgres | Database password |
| `--db-name NAME` | auth_service | Database name |
| `--db-ssl-mode MODE` | disable | SSL mode (disable/require/verify-full) |
| `--use-external-db` | false | Use external database instead of Docker |

### Server Options
| Option | Default | Description |
|--------|---------|-------------|
| `--server-port PORT` | 8080 | Backend API port |
| `--frontend-port PORT` | 3001 | Frontend port |
| `--environment ENV` | development | Environment (development/production) |

### JWT Options
| Option | Default | Description |
|--------|---------|-------------|
| `--jwt-secret SECRET` | (auto-generated) | JWT secret key (regenerated each time if not provided) |
| `--jwt-access-ttl MIN` | 15 | Access token TTL in minutes |
| `--jwt-refresh-ttl MIN` | 10080 | Refresh token TTL in minutes |

### Logging Options
| Option | Default | Description |
|--------|---------|-------------|
| `--log-level` | info | Log level (debug/info/warn/error) |
| `--log-file` | stdout | Log file path |
| `--log-format` | json | Format (json/text) |
| `--log-max-size` | 100 | Max file size in MB before rotation |
| `--log-max-backups` | 5 | Number of backup files to keep |
| `--log-max-age` | 30 | Max age of log files in days |

### Actions
| Action | Description |
|--------|-------------|
| `--build` | Build Docker images only |
| `--start` | Build and start services |
| `--stop` | Stop services |
| `--restart` | Restart services |
| `--init-db` | Initialize external database (create DB + seed data) |
| `--status` | Check service status and health |
| `--logs` | View service logs |
| `--clean` | Remove all containers, images, and volumes (with confirmation) |

### Examples

```bash
# Development
./setup.sh --start
./setup.sh --log-level debug --log-format text --start

# External database
./setup.sh --use-external-db --db-host=localhost --init-db --start

# Custom ports
./setup.sh --server-port=9090 --frontend-port=3002 --start

# Production with file logging
./setup.sh \
  --environment=production \
  --jwt-secret=super-secure-key \
  --log-level info \
  --log-file /var/log/auth-service/auth-service.log \
  --start

# Management
./setup.sh --status
./setup.sh --logs
./setup.sh --restart
./setup.sh --stop
./setup.sh --clean
```

## Database Setup

### Docker Database (Default)
```bash
./setup.sh --start
```
PostgreSQL runs in Docker automatically. Data persists in a Docker volume.

### External Database

#### Using setup.sh (Recommended)
```bash
# Auto-creates DB if it doesn't exist
./setup.sh --use-external-db --db-host=localhost --db-password=mypass --start

# Or explicitly initialize first
./setup.sh --use-external-db --db-host=localhost --db-password=mypass --init-db --start
```

#### Manual Setup
```sql
CREATE DATABASE auth_service;
-- Migrations and seed data run automatically on backend startup
```

## SSO API Reference

These are the APIs used by external services (like document-base) to integrate with auth-service for SSO.

### SSO Flow Overview

```
1. Frontend redirects to  →  GET /sso/login (with token)
2. Auth-service validates  →  Redirects to redirect_uri?code=<JWT>
3. Frontend exchanges code →  POST /auth/token (authorization_code grant)
4. Backend validates token →  GET /sso/validate (on every request)
5. User logs out           →  POST /sso/logout (blacklists token)
```

---

### `GET /sso/login` — SSO Authorization Endpoint

Initiates SSO login. If the user has a valid token, redirects directly to the service. Otherwise redirects to the auth-service login page.

**Query Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| client_id | Yes | Service client ID (e.g. `document-base-clientid`) |
| redirect_uri | Yes | Where to redirect after auth (e.g. `http://localhost:3001/auth/callback`) |
| response_type | Yes | Must be `code` |
| scope | No | Requested scopes (e.g. `documents:read documents:write`) |
| state | No | CSRF protection string |
| token | No | Existing JWT token (passed as query param, cookie, or Authorization header) |

**Success Response:** `302 Redirect` to `{redirect_uri}?code={JWT}&state={state}`

**Document-base example** (frontend initiates login):
```typescript
const loginUrl = `${AUTH_SERVICE_URL}/sso/login?` + new URLSearchParams({
  client_id: 'document-base-clientid',
  redirect_uri: `${window.location.origin}/auth/callback`,
  response_type: 'code',
  scope: 'documents:read documents:write',
  state: crypto.randomUUID(),
  token: localStorage.getItem('jwt'),
});
window.location.href = loginUrl;
```

---

### `POST /auth/token` — Token Exchange

Exchanges an authorization code for an access token. Also supports refresh_token and password grants.

**Request Body (authorization_code grant):**
```json
{
  "grant_type": "authorization_code",
  "code": "<JWT from callback>",
  "client_id": "document-base-clientid",
  "redirect_uri": "http://localhost:3001/auth/callback"
}
```

**Response:**
```json
{
  "access_token": "<JWT>",
  "refresh_token": "",
  "token_type": "Bearer",
  "expires_in": 900
}
```

**Request Body (refresh_token grant):**
```json
{
  "grant_type": "refresh_token",
  "refresh_token": "<refresh_token>"
}
```

**Document-base example** (AuthCallback.tsx exchanges code):
```typescript
const response = await axios.post(`${AUTH_SERVICE_URL}/auth/token`, {
  grant_type: 'authorization_code',
  code: new URLSearchParams(window.location.search).get('code'),
  client_id: 'document-base-clientid',
  redirect_uri: `${window.location.origin}/auth/callback`,
});
localStorage.setItem('jwt', response.data.access_token);
```

---

### `GET /sso/validate` — Validate Token (Header-based)

Validates a JWT token and returns user info with permissions. Used by service backends on every authenticated request.

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | `Bearer <JWT>` |
| X-Client-ID | Yes | Service client ID |
| X-Client-Secret | Yes | Service client secret (plaintext) |

**Response (valid token):**
```json
{
  "valid": true,
  "user_id": "cccc1111-cccc-1111-cccc-111111111111",
  "username": "doc_admin",
  "email": "docadmin@example.com",
  "roles": ["document_administrator"],
  "groups": ["document_administrator"],
  "permissions": [
    { "resource": "documents", "action": "read" },
    { "resource": "documents", "action": "write" },
    { "resource": "permissions", "action": "read" }
  ],
  "service_id": "22222222-2222-2222-2222-222222222222",
  "service_name": "document-base-service",
  "expires_at": 1774157808
}
```

**Response (invalid token):**
```json
{
  "valid": false,
  "error": "invalid token"
}
```

**Document-base example** (backend ssoClient.ts validates every request):
```typescript
// backend/src/services/ssoClient.ts
const response = await axios.get(`${AUTH_SERVICE_URL}/sso/validate`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Client-ID': 'document-base-clientid',
    'X-Client-Secret': 'document-base-clientsecret',
  },
  timeout: 10000,
});

if (response.data.valid) {
  // User authenticated — check permissions locally
  const canWrite = response.data.permissions.some(
    p => p.resource === 'documents' && p.action === 'write'
  );
}
```

---

### `POST /sso/validate` — Validate Token (Body-based)

Same as the GET variant but accepts credentials in the request body instead of headers.

**Request Body:**
```json
{
  "token": "<JWT>",
  "client_id": "document-base-clientid",
  "client_secret": "document-base-clientsecret"
}
```

**Response:** Same as `GET /sso/validate`.

---

### `POST /sso/logout` — Logout (Blacklist Token)

Blacklists a JWT token so it can no longer be used.

**Request Body:**
```json
{
  "token": "<JWT>"
}
```

**Response:**
```json
{
  "success": true
}
```

**Document-base example** (frontend logout):
```typescript
await axios.post(`${AUTH_SERVICE_URL}/sso/logout`, {
  token: localStorage.getItem('jwt'),
});
localStorage.removeItem('jwt');
localStorage.removeItem('refresh_token');
```

---

### `POST /sso/check-permission` — Check User Permission

Checks if a user has a specific permission. Alternative to checking permissions locally from the validate response.

**Request Body:**
```json
{
  "token": "<JWT>",
  "resource": "documents",
  "action": "write",
  "client_id": "document-base-clientid",
  "client_secret": "document-base-clientsecret"
}
```

**Response:**
```json
{
  "allowed": true
}
```

---

### Document-Base Integration Summary

Document-base (http://localhost:3001) integrates with auth-service using these APIs:

| Where | API | Purpose |
|-------|-----|---------|
| Frontend login | `GET /sso/login` | Redirect user to auth-service for login |
| Frontend callback | `POST /auth/token` | Exchange authorization code for JWT |
| Frontend refresh | `POST /auth/token` | Refresh expired access token |
| Frontend logout | `POST /sso/logout` | Blacklist token on logout |
| Backend middleware | `GET /sso/validate` | Validate token + get permissions on every request |

**Configuration** (document-base backend `.env`):
```
AUTH_SERVICE_URL=http://localhost:8080
CLIENT_ID=document-base-clientid
CLIENT_SECRET=document-base-clientsecret
```

**Configuration** (document-base frontend):
```
REACT_APP_AUTH_SERVICE_URL=http://localhost:8080
REACT_APP_CLIENT_ID=document-base-clientid
```

## Testing

### BDD Test Suite
```bash
cd tests/bdd
npm install
npm run test              # All tests
npm run test:auth         # Authentication tests
npm run test:responsive   # Responsive design tests
npm run test:browser      # Cross-browser tests
```

### Manual Testing
```bash
# Health check
curl http://localhost:8080/health

# Login
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}'

# Validate SSO token
curl http://localhost:8080/sso/validate \
  -H "Authorization: Bearer <token>"
```

## Security

### Security Features
- **bcrypt Password Hashing** - Industry-standard password protection
- **JWT Token Security** - Signed tokens with configurable expiration
- **Token Blacklisting** - Secure logout implementation
- **RBAC Authorization** - Fine-grained access control
- **Password Policies** - Strength requirements and history enforcement
- **SQL Injection Protection** - Parameterized queries via GORM
- **Input Validation** - Server-side validation on all endpoints
- **JWT Secret Rotation** - New secret generated on each deployment

### Production Security Checklist
- [ ] Strong JWT secret configured (via `--jwt-secret`)
- [ ] Default passwords changed
- [ ] HTTPS enabled
- [ ] Database SSL enabled (`--db-ssl-mode=require`)
- [ ] Network access restricted
- [ ] Monitoring and logging configured
- [ ] Backup strategy implemented

## Default Users

After setup, the following test users are available:

| Username | Password | Role | Access |
|----------|----------|------|--------|
| admin | Admin@123 | administrator | Full system access |
| group_admin | Admin@123 | group_administrator | Group management |
| role_admin | Admin@123 | role_administrator | Role management |
| user_admin | Admin@123 | user_administrator | User management |
| service_admin | Admin@123 | service_administrator | Service management |
| doc_admin | Admin@123 | document_administrator | Document read + write |
| doc_reader | Admin@123 | document_read_administrator | Document read only |
| group_reader | Admin@123 | group_read_administrator | Groups read only |
| role_reader | Admin@123 | role_read_administrator | Roles read only |
| user_reader | Admin@123 | user_read_administrator | Users read only |
| service_reader | Admin@123 | service_read_administrator | Services read only |

**Warning**: Change all default passwords in production!

## Troubleshooting

### Port Already in Use
```bash
lsof -i :8080
./setup.sh --server-port=9090 --frontend-port=3002 --start
```

### Database Connection Failed
```bash
./setup.sh --status
# For external DB, initialize it:
./setup.sh --use-external-db --db-host=localhost --init-db
```

### Docker Issues
```bash
./setup.sh --clean
./setup.sh --start
```

### Permission Denied
```bash
chmod +x setup.sh
```

### Service Status
```bash
./setup.sh --status
./setup.sh --logs
```

## Service Ports

| Service | Port |
|---------|------|
| Backend API | 8080 |
| Frontend | 3001 (Docker), 3000 (local dev) |
| PostgreSQL | 5433 (external), 5432 (internal) |
| Redis | 6379 (optional) |
| Nginx | 80/443 (optional profile) |

---

**Quick Start**: `./setup.sh --start`
**Need Help?** Run `./setup.sh --help` or check the API Documentation tab in the web interface.

# 🔐 Enterprise Authentication & Authorization Service

A comprehensive, production-ready authentication and authorization service designed for modern enterprise applications. Built with Go backend and React frontend, featuring OAuth2/JWT authentication, Role-Based Access Control (RBAC), Single Sign-On (SSO), and complete user management capabilities.

## 🎯 Service Intent & Purpose

This service serves as a **centralized authentication and authorization hub** for enterprise applications, providing:

- **🏢 Enterprise SSO**: Single Sign-On across multiple applications and services
- **🔒 Centralized Security**: One place to manage users, roles, permissions, and access policies
- **🔗 Service Integration**: Easy integration for any application requiring authentication
- **📊 User Management**: Complete administrative interface for user lifecycle management
- **🛡️ Security Compliance**: Industry-standard security practices with audit capabilities
- **⚡ Developer Friendly**: Simple APIs and comprehensive documentation for quick integration

### Who Should Use This Service?

- **Enterprises** needing centralized authentication across multiple applications
- **Development Teams** building microservices requiring consistent authentication
- **Organizations** requiring RBAC with fine-grained permissions
- **Companies** implementing SSO for improved user experience and security
- **Teams** needing a ready-to-deploy auth service with management UI

## 🔥 **100% COMPLIANCE STATUS** 

✅ **RBAC Chain Enforced**: User → 1 Role → Many Groups → Many Services  
✅ **First-Time Login**: Password change required with policy enforcement  
✅ **Client Credentials**: Service-to-service authentication working  
✅ **SSO Integration**: Cross-service logout with token blacklisting  
✅ **API Endpoints**: `/me/permissions`, `/me/services`, all endpoints functional  
✅ **Security**: Token blacklisting, bcrypt hashing, dual authentication

## 📋 Table of Contents

- [🎯 Service Intent & Purpose](#-service-intent--purpose)
- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🚀 Quick Start](#-quick-start)
- [🛠️ Setup Methods](#️-setup-methods)
  - [Method 1: Using Setup Script (Recommended)](#method-1-using-setup-script-recommended)
  - [Method 2: Docker Development](#method-2-docker-development)
  - [Method 3: Local Development (No Docker)](#method-3-local-development-no-docker)
- [🔧 Setup Script Usage](#-setup-script-usage)
- [🗄️ Database Setup](#-database-setup)
- [📊 Logging Configuration](#-logging-configuration)
- [🌐 Production Deployment](#-production-deployment)
- [📖 API Documentation](#-api-documentation)
- [🔗 SSO Integration Guide](#-sso-integration-guide)
- [🧪 Testing](#-testing)
- [⚙️ Configuration](#️-configuration)
- [🔒 Security](#-security)
- [👥 Default Users](#-default-users)
- [🆘 Troubleshooting](#-troubleshooting)

## ✨ Features

### 🔐 Authentication & Authorization
- **OAuth2 & JWT Authentication** - Complete OAuth2 implementation with JWT tokens
- **Role-Based Access Control (RBAC)** - Fine-grained permission system
- **Single Sign-On (SSO)** - Cross-application authentication
- **Service-to-Service Auth** - Client credentials flow for microservices
- **Password Policies** - Configurable password strength and expiration
- **Token Blacklisting** - Secure logout with token invalidation

### 👥 User Management
- **Complete User CRUD** - Create, read, update, delete users
- **Role Assignment** - Flexible role-based permissions
- **Group Management** - Organize users into groups
- **Service Registration** - Register applications for SSO
- **User Import/Export** - CSV support for bulk operations
- **Responsive UI** - Mobile-friendly React interface

### 🔧 Developer Experience
- **Interactive API Documentation** - Built-in API testing interface
- **Setup Script** - One-command deployment with multiple configurations
- **Docker Support** - Fully containerized with Docker Compose
- **External Database** - Support for existing PostgreSQL instances
- **Configuration Templates** - Pre-built configs for different environments
- **BDD Testing** - Comprehensive test suite with Cucumber.js

### 🚀 Production Ready
- **Nginx Reverse Proxy** - Production-grade load balancing
- **SSL/TLS Support** - HTTPS configuration ready
- **Health Checks** - Built-in monitoring endpoints
- **Graceful Shutdown** - Proper resource cleanup
- **Advanced Logging** - Configurable levels, formats, and rotation
- **Log Management** - File-based logging with automatic rotation
- **Scalability** - Horizontal scaling support

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│    │   Go Backend    │    │   PostgreSQL    │
│   (Port 3001)  │◄──►│   (Port 8080)   │◄──►│   (Port 5433)   │
│                 │    │                 │    │                 │
│ • User Management    │ • JWT Auth      │    │ • User Data     │
│ • SSO Dashboard      │ • RBAC Engine   │    │ • Permissions   │
│ • API Testing       │ • OAuth2        │    │ • Audit Logs    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components

- **🎨 React Frontend**: Complete administrative interface with user management
- **⚡ Go Backend**: High-performance API server with JWT authentication
- **🗄️ PostgreSQL**: Reliable data storage with ACID compliance
- **🌐 Nginx**: Production reverse proxy (optional)

### RBAC Model

```
Users ──► Roles ──► Groups ──► Services
  │         │         │         │
  └─────────┴─────────┴─────────┘
           Permissions Flow
```

## 🚀 Quick Start

### Prerequisites
- **Docker & Docker Compose** (for containerized setup)
- **Go 1.23+** (for local development)
- **Node.js 20+** (for frontend development)
- **PostgreSQL 12+** (for external database)

### 30-Second Setup
```bash
# Clone the repository
git clone <repository-url>
cd auth-service

# Quick start with setup script
./setup.sh --build --start

# Access the application
open http://localhost:3001
```

**Default Login**: admin / Admin@123

## 🛠️ Setup Methods

### Method 1: Using Setup Script (Recommended)

The setup script provides the easiest way to deploy with various configurations:

#### Basic Setup (Docker Database)
```bash
./setup.sh --build --start
```

#### External Database Setup
```bash
# Initialize external database
./scripts/init-external-db.sh --db-password=mypass

# Start with external database
./setup.sh --use-external-db --db-host=localhost --db-password=mypass --build --start
```

#### Production Setup
```bash
# Use production configuration
./setup.sh --config-file config/production.env --environment=production --build --start
```

#### Custom Configuration
```bash
./setup.sh \
  --server-port=9090 \
  --frontend-port=3002 \
  --jwt-secret=my-secret-key \
  --build --start
```

### Method 2: Docker Development

#### Using Docker Compose Directly
```bash
# Start all services with Docker database
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Using External Database
```bash
# Set environment variables
export USE_EXTERNAL_DB=true
export DB_HOST=localhost
export DB_PASSWORD=mypass

# Start with external database configuration
docker-compose -f docker-compose.yml -f docker-compose.external-db.yml up -d
```

### Method 3: Local Development (No Docker)

#### Prerequisites Setup
```bash
# Install Go dependencies
cd backend
go mod download

# Install frontend dependencies
cd ../frontend
npm install

# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Install PostgreSQL (Ubuntu)
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### Database Setup
```bash
# Create database and user
sudo -u postgres psql -c "CREATE DATABASE auth_service;"
sudo -u postgres psql -c "CREATE USER auth_user WITH PASSWORD 'auth_pass';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE auth_service TO auth_user;"

# Load seed data
psql -h localhost -U auth_user -d auth_service -f tests/seed-test-data.sql
```

#### Backend Setup
```bash
cd backend

# Copy environment configuration
cp .env.example .env

# Edit .env file with your database settings
cat > .env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_USER=auth_user
DB_PASSWORD=auth_pass
DB_NAME=auth_service
DB_SSL_MODE=disable
SERVER_PORT=8080
SERVER_HOST=0.0.0.0
JWT_SECRET_KEY=your-local-development-secret-key
JWT_ACCESS_TOKEN_TTL=15
JWT_REFRESH_TOKEN_TTL=10080
EOF

# Run the backend server
go run cmd/server/main.go
```

#### Frontend Setup
```bash
cd frontend

# Set API URL for local backend
echo "REACT_APP_API_URL=http://localhost:8080" > .env.local

# Start development server
npm start
```

#### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **API Health**: http://localhost:8080/health

## 🔧 Setup Script Usage

The `./setup.sh` script provides a unified interface for all deployment scenarios:

### Command Syntax
```bash
./setup.sh [OPTIONS] [ACTIONS]
```

### Database Options
```bash
--db-host HOST              # Database host (default: postgres)
--db-port PORT              # Database port (default: 5432)
--db-user USER              # Database username (default: postgres)
--db-password PASSWORD      # Database password (default: postgres)
--db-name NAME              # Database name (default: auth_service)
--db-ssl-mode MODE          # SSL mode: disable/require/verify-full
--use-external-db           # Use external database instead of Docker
```

### Server Options
```bash
--server-port PORT          # API server port (default: 8080)
--server-host HOST          # Server bind address (default: 0.0.0.0)
--frontend-port PORT        # Frontend port (default: 3001)
--environment ENV           # development/production (default: development)
```

### JWT Options
```bash
--jwt-secret SECRET         # JWT secret key (auto-generated if not provided)
--jwt-access-ttl MINUTES    # Access token TTL (default: 15)
--jwt-refresh-ttl MINUTES   # Refresh token TTL (default: 10080)
```

### Logging Options
```bash
--log-level LEVEL           # Log level: debug/info/warn/error (default: info)
--log-file PATH             # Log file path or stdout (default: stdout)
--log-format FORMAT         # Log format: json/text (default: json)
--log-max-size MB           # Log file max size in MB (default: 100)
--log-max-backups COUNT     # Number of log backups to keep (default: 5)
--log-max-age DAYS          # Max age of log files in days (default: 30)
```

### Configuration Options
```bash
--config-file FILE          # Load settings from configuration file
--skip-db-init              # Skip database initialization
--dry-run                   # Show what would be done without executing
--verbose                   # Show detailed output
```

### Actions
```bash
--build                     # Build Docker images
--start                     # Start services
--stop                      # Stop services
--restart                   # Restart services
--status                    # Show service status
--logs                      # View service logs
--clean                     # Clean Docker resources
```

### Examples

#### Development Setup
```bash
# Quick development setup
./setup.sh --build --start

# With custom ports
./setup.sh --server-port=9090 --frontend-port=3002 --build --start

# With debug logging
./setup.sh --log-level debug --log-format text --build --start

# With verbose output
./setup.sh --verbose --build --start
```

#### External Database
```bash
# Basic external database
./setup.sh --use-external-db --db-host=localhost --db-password=mypass --build --start

# Secure external database
./setup.sh \
  --use-external-db \
  --db-host=prod-db.company.com \
  --db-port=5432 \
  --db-user=auth_service \
  --db-password=secure_password \
  --db-name=auth_production \
  --db-ssl-mode=require \
  --build --start
```

#### Production Deployment
```bash
# Using configuration file
./setup.sh --config-file config/production.env --environment=production --build --start

# Custom production setup
./setup.sh \
  --environment=production \
  --jwt-secret=super-secure-production-key \
  --log-level info \
  --log-file /var/log/auth-service/auth-service.log \
  --log-format json \
  --server-port=8080 \
  --frontend-port=3001 \
  --build --start
```

#### Management Commands
```bash
# Check service status
./setup.sh --status

# View logs
./setup.sh --logs

# Restart services
./setup.sh --restart

# Stop all services
./setup.sh --stop

# Clean up Docker resources
./setup.sh --clean
```

#### Configuration Testing
```bash
# Test configuration without running
./setup.sh --dry-run --use-external-db --db-host=localhost --build --start

# Load from file and test
./setup.sh --dry-run --config-file config/production.env --build --start
```

## 📊 Logging Configuration

The auth service supports comprehensive logging configuration for different environments and use cases.

### Quick Logging Examples

#### Console Logging (Development)
```bash
./setup.sh --log-level debug --log-format text --build --start
```

#### File Logging (Production)
```bash
./setup.sh \
  --log-level info \
  --log-file /var/log/auth-service/auth-service.log \
  --log-format json \
  --log-max-size 200 \
  --log-max-backups 10 \
  --log-max-age 90 \
  --build --start
```

#### Custom Log Location
```bash
./setup.sh \
  --log-file /opt/logs/auth/service.log \
  --log-level warn \
  --build --start
```

### Logging Options

| Option | Default | Description |
|--------|---------|-------------|
| `--log-level` | info | Log level (debug/info/warn/error) |
| `--log-file` | stdout | Log file path or stdout for console |
| `--log-format` | json | Format (json/text) |
| `--log-max-size` | 100 | Max file size in MB before rotation |
| `--log-max-backups` | 5 | Number of backup files to keep |
| `--log-max-age` | 30 | Max age of log files in days |

### Configuration Files with Logging

All environment templates include logging settings:

```bash
# Development - debug to console
./setup.sh --config-file config/development.env --build --start

# Production - structured logging to file
./setup.sh --config-file config/production.env --build --start

# See logging examples
cat config/logging-examples.env
```

### Docker Log Integration

Logs are automatically mounted to host directories:

```bash
# Logs will be available in ./logs/ directory
./setup.sh --log-file /var/log/auth-service/auth.log --build --start

# View logs
tail -f ./logs/auth-service.log

# Or use Docker logs
docker logs -f auth-backend
```

For complete logging documentation, see [`docs/LOGGING.md`](docs/LOGGING.md).

## 🗄️ Database Setup

### Docker Database (Default)
The setup script automatically configures PostgreSQL in Docker:
```bash
./setup.sh --build --start
```

### External Database
For production or existing PostgreSQL instances:

#### Step 1: Initialize Database
```bash
./scripts/init-external-db.sh \
  --db-host=your-db-host \
  --db-user=postgres \
  --db-password=your-password \
  --db-name=auth_service
```

#### Step 2: Connect Service
```bash
./setup.sh \
  --use-external-db \
  --db-host=your-db-host \
  --db-user=auth_user \
  --db-password=your-password \
  --db-name=auth_service \
  --build --start
```

### Manual Database Setup
```sql
-- Create database
CREATE DATABASE auth_service;

-- Create user
CREATE USER auth_user WITH PASSWORD 'secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE auth_service TO auth_user;

-- Connect to database and load schema
\c auth_service
\i tests/seed-test-data.sql
```

## 🌐 Production Deployment

### Production Checklist
- [ ] Use external PostgreSQL database
- [ ] Set strong JWT secret (64+ characters)
- [ ] Enable SSL/TLS for database connections
- [ ] Configure HTTPS with SSL certificates
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Set strong passwords for default users
- [ ] Configure firewall and network security

### Production Configuration
```bash
# Copy and customize production config
cp config/production.env config/my-production.env

# Edit configuration
vim config/my-production.env

# Deploy
./setup.sh --config-file config/my-production.env --environment=production --build --start
```

### Environment Variables for Production
```bash
# Database (External)
DB_HOST=prod-db.company.com
DB_PORT=5432
DB_USER=auth_service
DB_PASSWORD=super_secure_password
DB_NAME=auth_service_prod
DB_SSL_MODE=require
USE_EXTERNAL_DB=true

# Server
SERVER_PORT=8080
SERVER_HOST=0.0.0.0
SERVER_MODE=release

# JWT (CRITICAL: Change in production)
JWT_SECRET_KEY=your-super-secure-64-character-minimum-jwt-secret-key
JWT_ACCESS_TOKEN_TTL=15
JWT_REFRESH_TOKEN_TTL=10080

# Ports
FRONTEND_PORT=3001

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/auth-service/auth-service.log
LOG_FORMAT=json
LOG_MAX_SIZE=200
LOG_MAX_BACKUPS=10
LOG_MAX_AGE=90
```

### Docker Production Deployment
```bash
# Production with Nginx and logging
COMPOSE_PROFILES=docker-db,nginx ./setup.sh \
  --environment=production \
  --log-level info \
  --log-file /var/log/auth-service/auth-service.log \
  --build --start

# External database with SSL and structured logging
./setup.sh \
  --use-external-db \
  --db-host=prod-db.company.com \
  --db-ssl-mode=require \
  --environment=production \
  --log-level info \
  --log-format json \
  --log-file /var/log/auth-service/auth-service.log \
  --build --start
```

## 📖 API Documentation

### Built-in Documentation
Access comprehensive API documentation at:
**http://localhost:3001** → **API Documentation** tab

Features:
- **Interactive Testing**: Test any endpoint directly from the browser
- **Complete Reference**: All 40+ endpoints documented
- **SSO Integration Guide**: Step-by-step setup for services
- **Code Examples**: Multiple programming languages
- **Request/Response**: Live examples and testing

### Key Endpoints

#### Authentication
```bash
POST /auth/login           # User login
POST /auth/token           # JWT token generation
GET  /me/permissions       # User permissions
GET  /me/check-permission  # Check specific permission
GET  /health               # Service health
```

#### SSO Integration
```bash
POST /sso/validate         # Validate JWT token
GET  /sso/validate         # Validate from header
POST /sso/check-permission # Check user permission
POST /sso/login            # SSO login
POST /sso/logout           # SSO logout
```

#### User Management
```bash
GET    /users              # List users
POST   /users              # Create user
GET    /users/{id}         # Get user
PUT    /users/{id}         # Update user
DELETE /users/{id}         # Delete user
GET    /users/export/csv   # Export users
POST   /users/import/csv   # Import users
```

#### Role & Group Management
```bash
GET /roles                 # List roles
GET /groups                # List groups
GET /services              # List services
```

## 🔗 SSO Integration Guide

### Quick Integration Steps

#### Step 1: Register Your Service
1. Login to auth service admin panel
2. Go to **Service Management** tab
3. Click **Add Service**
4. Save the **Client ID** and **Client Secret**

#### Step 2: Integrate Your Application
```javascript
// Example: Node.js/Express integration
const ssoAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  const response = await axios.get('http://localhost:8080/sso/validate', {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'X-Client-ID': process.env.SSO_CLIENT_ID,
      'X-Client-Secret': process.env.SSO_CLIENT_SECRET
    }
  });
  
  if (response.data.valid) {
    req.user = response.data;
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
```

#### Step 3: Assign Users
1. Go to **Group Management** → Create groups
2. Assign your service to groups
3. Assign users to roles that have access to groups

### Platform Examples
The built-in API documentation provides complete integration examples for:
- **Node.js/Express**
- **React/TypeScript**
- **Java/Spring Boot**
- **Go/Gin**
- **Python/Django**

## 🧪 Testing

### BDD Test Suite
```bash
cd tests/bdd

# Install dependencies
npm install

# Run all tests
npm run test

# Run specific test suites
npm run test:auth          # Authentication tests
npm run test:responsive    # Responsive design tests
npm run test:browser       # Cross-browser tests
```

### Manual Testing
```bash
# Test API endpoints
curl -X GET http://localhost:8080/health

# Test authentication
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}'
```

### Integration Testing
```bash
# Test SSO validation
TOKEN="your-jwt-token"
curl -X GET http://localhost:8080/sso/validate \
  -H "Authorization: Bearer $TOKEN"
```

## ⚙️ Configuration

### Environment Files
- `config/development.env` - Development settings with debug logging
- `config/production.env` - Production template with file logging
- `config/external-db.env` - External database example
- `config/logging-examples.env` - Comprehensive logging examples
- `.env.example` - Base template with all options

### Configuration Loading Priority
1. Command line arguments
2. Configuration file (--config-file)
3. Environment variables
4. Default values

### Custom Configuration
```bash
# Create custom config
cp config/development.env config/my-custom.env

# Edit settings
vim config/my-custom.env

# Use custom config
./setup.sh --config-file config/my-custom.env --build --start
```

## 🔒 Security

### Security Features
- **bcrypt Password Hashing** - Industry-standard password protection
- **JWT Token Security** - Signed tokens with expiration
- **Token Blacklisting** - Secure logout implementation
- **RBAC Authorization** - Fine-grained access control
- **SQL Injection Protection** - Parameterized queries
- **CORS Protection** - Cross-origin request filtering
- **Input Validation** - Server-side validation
- **SSL/TLS Support** - Encrypted communications

### Security Best Practices
1. **Change Default Passwords** - Update admin password immediately
2. **Strong JWT Secret** - Use 64+ character random secret
3. **Enable HTTPS** - Always use SSL/TLS in production
4. **Database Security** - Use SSL connections and strong passwords
5. **Network Security** - Restrict database access to application only
6. **Regular Updates** - Keep dependencies updated
7. **Audit Logging** - Monitor authentication events
8. **Backup Strategy** - Regular encrypted backups

### Production Security Checklist
- [ ] Strong JWT secret configured
- [ ] Default passwords changed
- [ ] HTTPS enabled
- [ ] Database SSL enabled
- [ ] Network access restricted
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Security headers configured

## 👥 Default Users

After setup, the following test users are available:

### Administrator
- **Username**: admin
- **Password**: Admin@123
- **Role**: Super Admin
- **Permissions**: Full system access

### Test Users
- **Usernames**: user1, user2, ..., user10
- **Password**: User@123
- **Role**: Standard User
- **Permissions**: Limited access

### Service Accounts
- **Document Service**: Pre-configured for SSO testing
- **Client ID**: Available in Service Management tab

⚠️ **Security Warning**: Change all default passwords in production!

## 🆘 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
lsof -i :8080

# Use different ports
./setup.sh --server-port=9090 --frontend-port=3002 --build --start
```

#### Database Connection Failed
```bash
# Check database status
./setup.sh --status

# Test external database connection
./scripts/init-external-db.sh --db-host=localhost --db-password=test
```

#### Docker Issues
```bash
# Clean Docker resources
./setup.sh --clean

# Rebuild from scratch
docker system prune -af
./setup.sh --build --start
```

#### Permission Denied
```bash
# Make scripts executable
chmod +x setup.sh
chmod +x scripts/init-external-db.sh
```

### Debug Commands
```bash
# Detailed configuration check
./setup.sh --dry-run --verbose --build --start

# Service status
./setup.sh --status

# View logs
./setup.sh --logs

# Test configuration with logging
./setup.sh --config-file config/development.env --dry-run --build

# Debug with custom logging
./setup.sh --log-level debug --log-file /tmp/debug.log --restart
```

### Getting Help
1. Check the built-in API documentation
2. Review the setup script help: `./setup.sh --help`
3. Check service logs: `./setup.sh --logs`
4. Verify configuration: `./setup.sh --status`

---

## 🚀 Ready to Deploy?

Choose your deployment method:

1. **Quick Start**: `./setup.sh --build --start`
2. **External DB**: Follow the [Database Setup](#-database-setup) guide
3. **Production**: Use the [Production Deployment](#-production-deployment) guide

**Need Help?** Check the [API Documentation](#-api-documentation) tab in the web interface for complete integration guides and examples.

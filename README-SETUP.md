# Auth Service Setup Guide

This guide explains how to set up the Auth Service using the provided setup scripts and configuration options.

## Quick Start

### 1. Default Setup (Docker Database)
```bash
# Clone and navigate to the project
git clone <repository-url>
cd auth-service

# Run with default Docker database
./setup.sh --build --start
```

### 2. External Database Setup
```bash
# Initialize external database (optional)
./scripts/init-external-db.sh --db-password=mypass

# Start with external database
./setup.sh --use-external-db --db-host=localhost --db-password=mypass --build --start
```

### 3. Production Setup
```bash
# Use production configuration
./setup.sh --config-file config/production.env --environment=production --build --start
```

## Setup Script Options

### Database Configuration
- `--db-host HOST` - Database host (default: postgres)
- `--db-port PORT` - Database port (default: 5432) 
- `--db-user USER` - Database username (default: postgres)
- `--db-password PASSWORD` - Database password (default: postgres)
- `--db-name NAME` - Database name (default: auth_service)
- `--db-ssl-mode MODE` - SSL mode (default: disable)
- `--use-external-db` - Use external database instead of Docker

### Server Configuration
- `--server-port PORT` - API server port (default: 8080)
- `--server-host HOST` - Server bind address (default: 0.0.0.0)
- `--frontend-port PORT` - Frontend port (default: 3001)

### JWT Configuration
- `--jwt-secret SECRET` - JWT secret key (auto-generated if not provided)
- `--jwt-access-ttl MINUTES` - Access token TTL (default: 15)
- `--jwt-refresh-ttl MINUTES` - Refresh token TTL (default: 10080)

### Actions
- `--build` - Build Docker images
- `--start` - Start services
- `--stop` - Stop services
- `--restart` - Restart services
- `--status` - Show service status
- `--logs` - View service logs
- `--clean` - Clean Docker resources

### Other Options
- `--environment ENV` - Environment (development/production)
- `--config-file FILE` - Load configuration from file
- `--dry-run` - Show what would be done without executing
- `--verbose` - Verbose output
- `--help` - Show help

## Configuration Files

### Environment Templates
- `config/development.env` - Development environment settings
- `config/production.env` - Production environment settings  
- `config/external-db.env` - External database configuration
- `.env.example` - Base environment template

### Docker Compose Files
- `docker-compose.yml` - Main configuration with environment variables
- `docker-compose.external-db.yml` - External database override
- `docker-compose.override.yml` - Auto-generated for external DB

## Usage Examples

### Development with Docker Database
```bash
./setup.sh --build --start
```

### Development with External Database
```bash
# First, initialize the external database
./scripts/init-external-db.sh --db-host=localhost --db-password=mypass

# Then start the services
./setup.sh --use-external-db --db-host=localhost --db-password=mypass --build --start
```

### Production Deployment
```bash
# Copy and customize production config
cp config/production.env config/my-production.env
# Edit config/my-production.env with your settings

# Deploy
./setup.sh --config-file config/my-production.env --environment=production --build --start
```

### Custom Ports
```bash
./setup.sh --server-port=9090 --frontend-port=3002 --build --start
```

### Load from Configuration File
```bash
./setup.sh --config-file=./config/development.env --build --start
```

### Check Service Status
```bash
./setup.sh --status
```

### View Logs
```bash
./setup.sh --logs
```

### Restart Services
```bash
./setup.sh --restart
```

### Clean Everything
```bash
./setup.sh --clean
```

## External Database Setup

### Prerequisites
- PostgreSQL 12+ server running
- `psql` client installed
- Network access to database server

### Initialize External Database
```bash
# Basic initialization
./scripts/init-external-db.sh --db-password=mypass

# Custom host and database name
./scripts/init-external-db.sh \
  --db-host=db.example.com \
  --db-name=my_auth_service \
  --db-password=mypass

# Force recreate database
./scripts/init-external-db.sh --db-password=mypass --force-recreate

# Skip seed data
./scripts/init-external-db.sh --db-password=mypass --skip-seeds
```

### Connect to External Database
```bash
./setup.sh \
  --use-external-db \
  --db-host=db.example.com \
  --db-port=5432 \
  --db-user=auth_user \
  --db-password=secure_password \
  --db-name=auth_service_prod \
  --db-ssl-mode=require \
  --build --start
```

## Environment Variables

All configuration can be set via environment variables:

```bash
# Database
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=mypass
export DB_NAME=auth_service
export DB_SSL_MODE=disable
export USE_EXTERNAL_DB=true

# Server
export SERVER_PORT=8080
export SERVER_HOST=0.0.0.0
export SERVER_MODE=development
export FRONTEND_PORT=3001

# JWT
export JWT_SECRET_KEY=your-secret-key
export JWT_ACCESS_TOKEN_TTL=15
export JWT_REFRESH_TOKEN_TTL=10080

# Then run
./setup.sh --build --start
```

## Docker Profiles

The Docker Compose setup uses profiles to control which services run:

- `docker-db` - PostgreSQL database (default when not using external DB)
- `nginx` - Nginx reverse proxy (optional)

### Start without Nginx
```bash
./setup.sh --build --start
# or
docker-compose --profile docker-db up -d
```

### Start with Nginx
```bash
COMPOSE_PROFILES=docker-db,nginx ./setup.sh --build --start
# or  
docker-compose --profile docker-db --profile nginx up -d
```

## Troubleshooting

### Common Issues

**Cannot connect to external database**
- Verify host, port, and credentials
- Check firewall settings
- Ensure PostgreSQL accepts connections

**Port already in use**
- Change ports using `--server-port` or `--frontend-port`
- Check what's using the port: `lsof -i :8080`

**Permission denied on setup script**
- Make script executable: `chmod +x setup.sh`

**Docker build fails**
- Clean Docker cache: `./setup.sh --clean`
- Check Docker daemon is running

### Debug Commands
```bash
# Check service status
./setup.sh --status

# View logs
./setup.sh --logs

# Test configuration without running
./setup.sh --dry-run --build --start

# Verbose output
./setup.sh --verbose --status
```

## Default Credentials

After setup, you can access the application with:
- **URL**: http://localhost:3001 (or your custom frontend port)
- **Username**: admin
- **Password**: Admin@123

## Security Notes

### Production Deployment
1. **Change default passwords** in production
2. **Set strong JWT secret** (minimum 64 characters)
3. **Use HTTPS** for all communications
4. **Enable SSL** for database connections
5. **Restrict network access** to database
6. **Use environment variables** for secrets
7. **Regular backups** of database
8. **Monitor logs** for security events

### Environment Variables in Production
Never commit secrets to version control. Use:
- Environment variables
- Docker secrets
- Kubernetes secrets
- External secret management systems

## Next Steps

1. Access the application at the configured URL
2. Login with default credentials
3. Check the **API Documentation** tab for SSO integration guide
4. Register your first service for SSO integration
5. Configure users, roles, and groups as needed
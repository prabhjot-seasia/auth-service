# Auth Service Setup Guide

Quick reference for setting up the Auth Service. For full documentation, see [README.md](README.md).

## Quick Start

### 1. Default Setup (Docker Database)
```bash
cd auth-service
./setup.sh --start
```

### 2. External Database Setup
```bash
./setup.sh --use-external-db --db-host=localhost --db-password=mypass --init-db --start
```

If the database doesn't exist, `--init-db` runs automatically on `--start`.

### 3. Production Setup
```bash
./setup.sh --environment=production --jwt-secret=my-secure-key --start
```

## Setup Script Options

### Database Configuration
| Option | Default | Description |
|--------|---------|-------------|
| `--db-host HOST` | host.docker.internal | Database host |
| `--db-port PORT` | 5432 | Database port |
| `--db-user USER` | postgres | Database username |
| `--db-password PASSWORD` | postgres | Database password |
| `--db-name NAME` | auth_service | Database name |
| `--db-ssl-mode MODE` | disable | SSL mode |
| `--use-external-db` | - | Use external database instead of Docker |

### Server Configuration
| Option | Default | Description |
|--------|---------|-------------|
| `--server-port PORT` | 8080 | Backend API port |
| `--frontend-port PORT` | 3001 | Frontend port |
| `--environment ENV` | development | Environment (development/production) |

### JWT Configuration
| Option | Default | Description |
|--------|---------|-------------|
| `--jwt-secret SECRET` | (auto-generated) | JWT secret key (regenerated each time) |
| `--jwt-access-ttl MIN` | 15 | Access token TTL in minutes |
| `--jwt-refresh-ttl MIN` | 10080 | Refresh token TTL in minutes |

### Logging Configuration
| Option | Default | Description |
|--------|---------|-------------|
| `--log-level LEVEL` | info | debug/info/warn/error |
| `--log-file PATH` | stdout | Log file path |
| `--log-format FORMAT` | json | json/text |
| `--log-max-size MB` | 100 | Max file size before rotation |
| `--log-max-backups N` | 5 | Backup files to keep |
| `--log-max-age DAYS` | 30 | Max age of log files |

### Actions
| Action | Description |
|--------|-------------|
| `--build` | Build Docker images only |
| `--start` | Build and start services |
| `--stop` | Stop services |
| `--restart` | Restart services |
| `--init-db` | Initialize external database (create DB + seed data) |
| `--status` | Check service status |
| `--logs` | View service logs |
| `--clean` | Remove all containers, images, and volumes |
| `--help` | Show help |

## Usage Examples

### Development
```bash
./setup.sh --start
./setup.sh --log-level debug --start
./setup.sh --server-port=9090 --frontend-port=3002 --start
```

### External Database
```bash
# Initialize and start
./setup.sh --use-external-db --db-host=localhost --db-password=mypass --init-db --start

# DB auto-created if missing
./setup.sh --use-external-db --db-host=localhost --db-password=mypass --start
```

### Production
```bash
./setup.sh \
  --environment=production \
  --jwt-secret=super-secure-key \
  --log-level info \
  --log-file /var/log/auth-service/auth-service.log \
  --start
```

### Management
```bash
./setup.sh --status      # Check service health
./setup.sh --logs        # View logs
./setup.sh --restart     # Restart services
./setup.sh --stop        # Stop services
./setup.sh --clean       # Remove everything
```

## Docker Profiles

| Profile | Service | When Used |
|---------|---------|-----------|
| `docker-db` | PostgreSQL | Default (when not using external DB) |
| `nginx` | Nginx reverse proxy | Optional |

```bash
# With Nginx
COMPOSE_PROFILES=docker-db,nginx ./setup.sh --start
```

## Default Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | Admin@123 | Super Admin (full access) |
| group_admin | Admin@123 | Group administrator |
| role_admin | Admin@123 | Role administrator |
| user_admin | Admin@123 | User administrator |
| service_admin | Admin@123 | Service administrator |
| doc_admin | Admin@123 | Document admin (read + write) |
| doc_reader | Admin@123 | Document reader (read only) |

**Warning**: Change all default passwords in production!

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port in use | `./setup.sh --server-port=9090 --start` |
| DB connection failed | `./setup.sh --use-external-db --init-db` |
| Docker issues | `./setup.sh --clean` then `./setup.sh --start` |
| Permission denied | `chmod +x setup.sh` |
| Check status | `./setup.sh --status` |
| View logs | `./setup.sh --logs` |

## Security Notes

1. JWT secret is **regenerated on every deployment** unless explicitly provided via `--jwt-secret`
2. Change default passwords in production
3. Use `--db-ssl-mode=require` for production database connections
4. Use HTTPS in production
5. Never commit secrets to version control

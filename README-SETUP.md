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

### Auth Service Ports
| Option | Default | Description |
|--------|---------|-------------|
| `--auth-backend-port PORT` | 8080 | Auth backend API port |
| `--auth-frontend-port PORT` | 3000 | Auth frontend UI port |

### Database Configuration
| Option | Default | Description |
|--------|---------|-------------|
| `--db-host HOST` | host.docker.internal | Database host |
| `--db-port PORT` | 5432 | Database connection port |
| `--db-user USER` | postgres | Database username |
| `--db-password PASSWORD` | postgres | Database password |
| `--db-name NAME` | auth_service | Database name |
| `--db-ssl-mode MODE` | disable | SSL mode |
| `--use-external-db` | - | Use external database instead of Docker |

### Docker Configuration
| Option | Default | Description |
|--------|---------|-------------|
| `--docker-db-port PORT` | 5433 | PostgreSQL host-side port in Docker mode |

### JWT Configuration
| Option | Default | Description |
|--------|---------|-------------|
| `--jwt-secret SECRET` | (auto-generated) | JWT secret key (regenerated each time) |
| `--jwt-access-ttl MIN` | 15 | Access token TTL in minutes |
| `--jwt-refresh-ttl MIN` | 10080 | Refresh token TTL in minutes |

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
./setup.sh --start                                              # Start with defaults
./setup.sh --auth-backend-port 9090 --start                     # Backend on 9090
./setup.sh --auth-frontend-port 3005 --start                    # Frontend on 3005
./setup.sh --docker-db-port 5435 --start                        # Docker PostgreSQL on 5435
./setup.sh --auth-backend-port 9090 --auth-frontend-port 3005 \
           --docker-db-port 5435 --start                        # All custom ports
```

### External Database
```bash
./setup.sh --use-external-db --db-host=localhost --db-password=mypass --init-db --start
./setup.sh --use-external-db --db-port 5433 --start             # Custom DB connection port
```

### Production
```bash
./setup.sh \
  --environment=production \
  --jwt-secret=super-secure-key \
  --start
```

### Management
```bash
./setup.sh --status
./setup.sh --logs
./setup.sh --restart
./setup.sh --stop
./setup.sh --clean
```

## Default Ports

| Service | Port | Flag |
|---------|------|------|
| Auth Backend | 8080 | `--auth-backend-port` |
| Auth Frontend | 3000 | `--auth-frontend-port` |
| PostgreSQL (Docker) | 5433 | `--docker-db-port` |
| PostgreSQL (connection) | 5432 | `--db-port` |

## Docker Profiles

| Profile | Service | When Used |
|---------|---------|-----------|
| `docker-db` | PostgreSQL | Default (when not using external DB) |
| `nginx` | Nginx reverse proxy | Optional |

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
| Port in use | `./setup.sh --auth-backend-port 9090 --start` |
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

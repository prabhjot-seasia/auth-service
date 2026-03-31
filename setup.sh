#!/bin/bash

set -e

DEFAULT_DB_HOST="host.docker.internal"
DEFAULT_DB_PORT="5432"
DEFAULT_DB_USER="postgres"
DEFAULT_DB_PASSWORD="postgres"
DEFAULT_DB_NAME="auth_service"
DEFAULT_DB_SSL_MODE="disable"
DEFAULT_DB_PORT_EXTERNAL="5433"
DEFAULT_SERVER_PORT="8080"
DEFAULT_SERVER_HOST="0.0.0.0"
DEFAULT_FRONTEND_PORT="3000"
DEFAULT_JWT_ACCESS_TTL="15"
DEFAULT_JWT_REFRESH_TTL="10080"
DEFAULT_ENVIRONMENT="development"
DEFAULT_USE_EXTERNAL_DB="false"

DB_HOST="$DEFAULT_DB_HOST"
DB_PORT="$DEFAULT_DB_PORT"
DB_USER="$DEFAULT_DB_USER"
DB_PASSWORD="$DEFAULT_DB_PASSWORD"
DB_NAME="$DEFAULT_DB_NAME"
DB_SSL_MODE="$DEFAULT_DB_SSL_MODE"
DB_PORT_EXTERNAL="$DEFAULT_DB_PORT_EXTERNAL"
SERVER_PORT="$DEFAULT_SERVER_PORT"
SERVER_HOST="$DEFAULT_SERVER_HOST"
FRONTEND_PORT="$DEFAULT_FRONTEND_PORT"
JWT_SECRET=""
JWT_ACCESS_TTL="$DEFAULT_JWT_ACCESS_TTL"
JWT_REFRESH_TTL="$DEFAULT_JWT_REFRESH_TTL"
ENVIRONMENT="$DEFAULT_ENVIRONMENT"
USE_EXTERNAL_DB="$DEFAULT_USE_EXTERNAL_DB"

DO_BUILD=false
DO_START=false
DO_STOP=false
DO_RESTART=false
DO_LOGS=false
DO_STATUS=false
DO_CLEAN=false
DO_INIT_DB=false

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]  $1${NC}"
}

print_success() {
    echo -e "${GREEN}[OK]    $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[WARN]  $1${NC}"
}

print_error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

print_header() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "   Auth Service Setup Script"
    echo "=========================================="
    echo -e "${NC}"
}

show_help() {
    cat << EOF
Auth Service Setup Script

USAGE:
    ./setup.sh [OPTIONS]

OPTIONS:
    Database Configuration:
    --db-host HOST              Database host (default: host.docker.internal)
    --db-port PORT              Database port (default: 5432)
    --db-user USER              Database username (default: postgres)
    --db-password PASSWORD      Database password (default: postgres)
    --db-name NAME              Database name (default: auth_service)
    --db-ssl-mode MODE          Database SSL mode (default: disable)
    --db-port-external PORT     PostgreSQL host-side port for Docker DB (default: 5433)
    --use-external-db           Use external database instead of Docker

    Server Configuration:
    --server-port PORT          Backend server port (default: 8080)
    --frontend-port PORT        Frontend port (default: 3000)

    JWT Configuration:
    --jwt-secret SECRET         JWT secret key (auto-generated each time if not provided)
    --jwt-access-ttl MINUTES    JWT access token TTL in minutes (default: 15)
    --jwt-refresh-ttl MINUTES   JWT refresh token TTL in minutes (default: 10080)

    Environment:
    --environment ENV           Environment: development/production (default: development)

    Actions:
    --build                     Build Docker images
    --start                     Build and start services
    --stop                      Stop services
    --restart                   Restart services
    --init-db                   Initialize external database (create DB + seed data)
    --logs                      View logs
    --status                    Check service status
    --clean                     Remove all containers and volumes

    --help                      Show this help message

EXAMPLES:
    ./setup.sh --start
    ./setup.sh --build --start
    ./setup.sh --status
    ./setup.sh --use-external-db --db-host localhost --init-db --start
    ./setup.sh --jwt-secret=mysecret --start

DEFAULT TEST CREDENTIALS:
    admin / Admin@123           (super_admin role)
    user1-user10 / User@123    (standard users)
EOF
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --db-host) DB_HOST="$2"; shift 2 ;;
        --db-port) DB_PORT="$2"; shift 2 ;;
        --db-user) DB_USER="$2"; shift 2 ;;
        --db-password) DB_PASSWORD="$2"; shift 2 ;;
        --db-name) DB_NAME="$2"; shift 2 ;;
        --db-ssl-mode) DB_SSL_MODE="$2"; shift 2 ;;
        --db-port-external) DB_PORT_EXTERNAL="$2"; shift 2 ;;
        --use-external-db) USE_EXTERNAL_DB="true"; shift ;;
        --server-port) SERVER_PORT="$2"; shift 2 ;;
        --frontend-port) FRONTEND_PORT="$2"; shift 2 ;;
        --jwt-secret) JWT_SECRET="$2"; shift 2 ;;
        --jwt-access-ttl) JWT_ACCESS_TTL="$2"; shift 2 ;;
        --jwt-refresh-ttl) JWT_REFRESH_TTL="$2"; shift 2 ;;
        --environment) ENVIRONMENT="$2"; shift 2 ;;
        --build) DO_BUILD=true; shift ;;
        --start) DO_START=true; shift ;;
        --stop) DO_STOP=true; shift ;;
        --restart) DO_RESTART=true; shift ;;
        --init-db) DO_INIT_DB=true; shift ;;
        --logs) DO_LOGS=true; shift ;;
        --status) DO_STATUS=true; shift ;;
        --clean) DO_CLEAN=true; shift ;;
        --help) show_help; exit 0 ;;
        *) print_error "Unknown option: $1. Use --help for usage." ;;
    esac
done

generate_env() {
    print_info "Generating backend/.env configuration..."

    if [[ -z "$JWT_SECRET" ]]; then
        JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
        print_info "Generated new JWT secret"
    fi

    cat > backend/.env << EOF
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
DB_SSL_MODE=${DB_SSL_MODE}
SERVER_PORT=${SERVER_PORT}
SERVER_HOST=${SERVER_HOST}
SERVER_MODE=${ENVIRONMENT}
JWT_SECRET_KEY=${JWT_SECRET}
JWT_ACCESS_TOKEN_TTL=${JWT_ACCESS_TTL}
JWT_REFRESH_TOKEN_TTL=${JWT_REFRESH_TTL}
FRONTEND_PORT=${FRONTEND_PORT}
USE_EXTERNAL_DB=${USE_EXTERNAL_DB}
EOF

    print_success "Generated backend/.env"
}

export_docker_vars() {
    export DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME DB_SSL_MODE DB_PORT_EXTERNAL
    export SERVER_PORT SERVER_HOST SERVER_MODE="$ENVIRONMENT"
    export FRONTEND_PORT
    export JWT_SECRET_KEY="$JWT_SECRET"
    export JWT_ACCESS_TOKEN_TTL="$JWT_ACCESS_TTL"
    export JWT_REFRESH_TOKEN_TTL="$JWT_REFRESH_TTL"
    export FRONTEND_URL="http://localhost:${FRONTEND_PORT}"
}

dc() {
    export_docker_vars
    if [[ "$USE_EXTERNAL_DB" == "true" ]]; then
        docker compose "$@"
    else
        docker compose --profile docker-db "$@"
    fi
}

validate_config() {
    print_info "Validating configuration..."

    if ! [[ "$SERVER_PORT" =~ ^[0-9]+$ ]] || [ "$SERVER_PORT" -lt 1 ] || [ "$SERVER_PORT" -gt 65535 ]; then
        print_error "Invalid server port: $SERVER_PORT"
    fi

    if ! [[ "$FRONTEND_PORT" =~ ^[0-9]+$ ]] || [ "$FRONTEND_PORT" -lt 1 ] || [ "$FRONTEND_PORT" -gt 65535 ]; then
        print_error "Invalid frontend port: $FRONTEND_PORT"
    fi

    if ! [[ "$DB_PORT" =~ ^[0-9]+$ ]] || [ "$DB_PORT" -lt 1 ] || [ "$DB_PORT" -gt 65535 ]; then
        print_error "Invalid database port: $DB_PORT"
    fi

    if ! [[ "$JWT_ACCESS_TTL" =~ ^[0-9]+$ ]] || [ "$JWT_ACCESS_TTL" -lt 1 ]; then
        print_error "Invalid JWT access TTL: $JWT_ACCESS_TTL"
    fi

    if ! [[ "$JWT_REFRESH_TTL" =~ ^[0-9]+$ ]] || [ "$JWT_REFRESH_TTL" -lt 1 ]; then
        print_error "Invalid JWT refresh TTL: $JWT_REFRESH_TTL"
    fi

    print_success "Configuration validated"
}

do_init_db() {
    print_info "Initializing external database..."

    if ! command -v psql >/dev/null 2>&1; then
        print_error "psql not found. Install PostgreSQL client to use --init-db"
    fi

    local psql_host="$DB_HOST"
    if [[ "$psql_host" == "host.docker.internal" ]]; then
        psql_host="localhost"
    fi

    print_info "Testing database connection to ${psql_host}:${DB_PORT}..."
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$psql_host" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
        print_error "Cannot connect to database at ${psql_host}:${DB_PORT} with user ${DB_USER}"
    fi
    print_success "Database connection verified"

    print_info "Creating database ${DB_NAME} if it doesn't exist..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$psql_host" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null || true
    print_success "Database ${DB_NAME} ready"

    if [[ -f "tests/seed-test-data.sql" ]]; then
        print_info "Running seed data script..."
        PGPASSWORD="$DB_PASSWORD" psql -h "$psql_host" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "tests/seed-test-data.sql"
        print_success "Database seeded with test data"
    else
        print_warning "No seed data script found at tests/seed-test-data.sql"
    fi
}

do_build() {
    print_info "Building Docker images..."
    generate_env

    dc build

    print_success "Docker images built successfully"
}

do_start() {
    print_info "Building and starting services..."
    generate_env

    dc up -d --build

    print_success "Services started"
    print_info "Backend API:  http://localhost:${SERVER_PORT}"
    print_info "Frontend:     http://localhost:${FRONTEND_PORT}"
    echo ""
    print_info "Test credentials:"
    echo "  admin        / Admin@123  (super_admin)"
    echo "  user1-user10 / User@123   (standard users)"
}

do_stop() {
    print_info "Stopping services..."
    dc down
    print_success "Services stopped"
}

do_restart() {
    do_stop
    do_start
}

do_logs() {
    dc logs -f
}

do_status() {
    print_info "Checking service status..."
    echo ""

    dc ps 2>/dev/null || true
    echo ""

    if curl -sf "http://localhost:${SERVER_PORT}/health" > /dev/null 2>&1; then
        print_success "Backend is running at http://localhost:${SERVER_PORT}"
    else
        print_warning "Backend is not responding at http://localhost:${SERVER_PORT}"
    fi

    if curl -sf "http://localhost:${FRONTEND_PORT}" > /dev/null 2>&1; then
        print_success "Frontend is running at http://localhost:${FRONTEND_PORT}"
    else
        print_warning "Frontend is not responding at http://localhost:${FRONTEND_PORT}"
    fi
}

do_clean() {
    print_warning "This will remove all containers, images, and volumes for auth-service."
    read -p "Are you sure? (y/N): " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        print_info "Cancelled."
        exit 0
    fi

    dc down -v --rmi all 2>/dev/null || true
    print_success "Cleaned up all auth-service resources"
}

if [[ "$DO_BUILD" == "false" && "$DO_START" == "false" && "$DO_STOP" == "false" && \
      "$DO_RESTART" == "false" && "$DO_INIT_DB" == "false" && "$DO_LOGS" == "false" && \
      "$DO_STATUS" == "false" && "$DO_CLEAN" == "false" ]]; then
    show_help
    exit 0
fi

print_header
validate_config

[[ "$DO_CLEAN" == "true" ]] && do_clean
[[ "$DO_STOP" == "true" ]] && do_stop
[[ "$DO_INIT_DB" == "true" ]] && do_init_db

if [[ "$USE_EXTERNAL_DB" == "true" && "$DO_INIT_DB" == "false" && \
      ("$DO_START" == "true" || "$DO_BUILD" == "true" || "$DO_RESTART" == "true") ]]; then
    if command -v psql >/dev/null 2>&1; then
        local_host="$DB_HOST"
        [[ "$local_host" == "host.docker.internal" ]] && local_host="localhost"
        if ! PGPASSWORD="$DB_PASSWORD" psql -h "$local_host" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
            print_warning "Database ${DB_NAME} not found on ${local_host}:${DB_PORT}, running init-db automatically..."
            do_init_db
        fi
    fi
fi

[[ "$DO_BUILD" == "true" ]] && do_build
[[ "$DO_START" == "true" ]] && do_start
[[ "$DO_RESTART" == "true" ]] && do_restart
[[ "$DO_LOGS" == "true" ]] && do_logs
[[ "$DO_STATUS" == "true" ]] && do_status

exit 0

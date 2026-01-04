#!/bin/bash

# Auth Service Setup Script
# This script sets up the authentication service with configurable parameters

set -e

# Default values
DEFAULT_DB_HOST="postgres"
DEFAULT_DB_PORT="5432"
DEFAULT_DB_USER="postgres"
DEFAULT_DB_PASSWORD="postgres"
DEFAULT_DB_NAME="auth_service"
DEFAULT_DB_SSL_MODE="disable"
DEFAULT_SERVER_PORT="8080"
DEFAULT_SERVER_HOST="0.0.0.0"
DEFAULT_JWT_SECRET=""
DEFAULT_JWT_ACCESS_TTL="15"
DEFAULT_JWT_REFRESH_TTL="10080"
DEFAULT_FRONTEND_PORT="3001"
DEFAULT_USE_EXTERNAL_DB="false"
DEFAULT_ENVIRONMENT="development"
DEFAULT_LOG_LEVEL="info"
DEFAULT_LOG_FILE=""
DEFAULT_LOG_FORMAT="json"
DEFAULT_LOG_MAX_SIZE="100"
DEFAULT_LOG_MAX_BACKUPS="5"
DEFAULT_LOG_MAX_AGE="30"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

print_header() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "   🔐 Auth Service Setup Script"
    echo "=========================================="
    echo -e "${NC}"
}

# Help function
show_help() {
    cat << EOF
Auth Service Setup Script

USAGE:
    ./setup.sh [OPTIONS]

OPTIONS:
    Database Configuration:
    --db-host HOST              Database host (default: postgres)
    --db-port PORT              Database port (default: 5432)
    --db-user USER              Database username (default: postgres)
    --db-password PASSWORD      Database password (default: postgres)
    --db-name NAME              Database name (default: auth_service)
    --db-ssl-mode MODE          Database SSL mode (default: disable)
    --use-external-db           Use external database instead of Docker
    --skip-db-init              Skip database initialization

    Server Configuration:
    --server-port PORT          Server port (default: 8080)
    --server-host HOST          Server host (default: 0.0.0.0)
    --frontend-port PORT        Frontend port (default: 3001)

    JWT Configuration:
    --jwt-secret SECRET         JWT secret key (auto-generated if not provided)
    --jwt-access-ttl MINUTES    JWT access token TTL in minutes (default: 15)
    --jwt-refresh-ttl MINUTES   JWT refresh token TTL in minutes (default: 10080)

    Logging Configuration:
    --log-level LEVEL           Log level: debug/info/warn/error (default: info)
    --log-file PATH             Log file path (default: stdout)
    --log-format FORMAT         Log format: json/text (default: json)
    --log-max-size MB           Log file max size in MB (default: 100)
    --log-max-backups COUNT     Number of log backups to keep (default: 5)
    --log-max-age DAYS          Max age of log files in days (default: 30)

    Environment:
    --environment ENV           Environment (development/production) (default: development)
    --config-file FILE          Load configuration from file

    Actions:
    --build                     Build Docker images
    --start                     Start services
    --stop                      Stop services
    --restart                   Restart services
    --logs                      Show logs
    --status                    Show service status
    --clean                     Clean Docker resources

    Other:
    --help                      Show this help
    --verbose                   Verbose output
    --dry-run                   Show what would be done without executing

EXAMPLES:
    # Basic setup with default Docker database
    ./setup.sh --build --start

    # Setup with external database
    ./setup.sh --use-external-db --db-host=localhost --db-password=mypass --build --start

    # Production setup
    ./setup.sh --environment=production --jwt-secret=mysecret --build --start

    # Custom ports
    ./setup.sh --server-port=9090 --frontend-port=3002 --build --start

    # Load from config file
    ./setup.sh --config-file=./config/production.env --build --start

EOF
}

# Initialize variables
DB_HOST=""
DB_PORT=""
DB_USER=""
DB_PASSWORD=""
DB_NAME=""
DB_SSL_MODE=""
SERVER_PORT=""
SERVER_HOST=""
JWT_SECRET=""
JWT_ACCESS_TTL=""
JWT_REFRESH_TTL=""
FRONTEND_PORT=""
USE_EXTERNAL_DB=""
ENVIRONMENT=""
CONFIG_FILE=""
LOG_LEVEL=""
LOG_FILE=""
LOG_FORMAT=""
LOG_MAX_SIZE=""
LOG_MAX_BACKUPS=""
LOG_MAX_AGE=""

# Action flags
BUILD=false
START=false
STOP=false
RESTART=false
LOGS=false
STATUS=false
CLEAN=false
SKIP_DB_INIT=false
VERBOSE=false
DRY_RUN=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --db-host)
            DB_HOST="$2"
            shift 2
            ;;
        --db-port)
            DB_PORT="$2"
            shift 2
            ;;
        --db-user)
            DB_USER="$2"
            shift 2
            ;;
        --db-password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        --db-name)
            DB_NAME="$2"
            shift 2
            ;;
        --db-ssl-mode)
            DB_SSL_MODE="$2"
            shift 2
            ;;
        --use-external-db)
            USE_EXTERNAL_DB="true"
            shift
            ;;
        --skip-db-init)
            SKIP_DB_INIT=true
            shift
            ;;
        --server-port)
            SERVER_PORT="$2"
            shift 2
            ;;
        --server-host)
            SERVER_HOST="$2"
            shift 2
            ;;
        --frontend-port)
            FRONTEND_PORT="$2"
            shift 2
            ;;
        --jwt-secret)
            JWT_SECRET="$2"
            shift 2
            ;;
        --jwt-access-ttl)
            JWT_ACCESS_TTL="$2"
            shift 2
            ;;
        --jwt-refresh-ttl)
            JWT_REFRESH_TTL="$2"
            shift 2
            ;;
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --config-file)
            CONFIG_FILE="$2"
            shift 2
            ;;
        --log-level)
            LOG_LEVEL="$2"
            shift 2
            ;;
        --log-file)
            LOG_FILE="$2"
            shift 2
            ;;
        --log-format)
            LOG_FORMAT="$2"
            shift 2
            ;;
        --log-max-size)
            LOG_MAX_SIZE="$2"
            shift 2
            ;;
        --log-max-backups)
            LOG_MAX_BACKUPS="$2"
            shift 2
            ;;
        --log-max-age)
            LOG_MAX_AGE="$2"
            shift 2
            ;;
        --build)
            BUILD=true
            shift
            ;;
        --start)
            START=true
            shift
            ;;
        --stop)
            STOP=true
            shift
            ;;
        --restart)
            RESTART=true
            shift
            ;;
        --logs)
            LOGS=true
            shift
            ;;
        --status)
            STATUS=true
            shift
            ;;
        --clean)
            CLEAN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            ;;
    esac
done

# Load configuration from file if specified
load_config_file() {
    if [[ -n "$CONFIG_FILE" && -f "$CONFIG_FILE" ]]; then
        print_info "Loading configuration from $CONFIG_FILE"
        source "$CONFIG_FILE"
    fi
}

# Set default values for unset variables
set_defaults() {
    DB_HOST=${DB_HOST:-$DEFAULT_DB_HOST}
    DB_PORT=${DB_PORT:-$DEFAULT_DB_PORT}
    DB_USER=${DB_USER:-$DEFAULT_DB_USER}
    DB_PASSWORD=${DB_PASSWORD:-$DEFAULT_DB_PASSWORD}
    DB_NAME=${DB_NAME:-$DEFAULT_DB_NAME}
    DB_SSL_MODE=${DB_SSL_MODE:-$DEFAULT_DB_SSL_MODE}
    SERVER_PORT=${SERVER_PORT:-$DEFAULT_SERVER_PORT}
    SERVER_HOST=${SERVER_HOST:-$DEFAULT_SERVER_HOST}
    JWT_ACCESS_TTL=${JWT_ACCESS_TTL:-$DEFAULT_JWT_ACCESS_TTL}
    JWT_REFRESH_TTL=${JWT_REFRESH_TTL:-$DEFAULT_JWT_REFRESH_TTL}
    FRONTEND_PORT=${FRONTEND_PORT:-$DEFAULT_FRONTEND_PORT}
    USE_EXTERNAL_DB=${USE_EXTERNAL_DB:-$DEFAULT_USE_EXTERNAL_DB}
    ENVIRONMENT=${ENVIRONMENT:-$DEFAULT_ENVIRONMENT}
    LOG_LEVEL=${LOG_LEVEL:-$DEFAULT_LOG_LEVEL}
    LOG_FILE=${LOG_FILE:-$DEFAULT_LOG_FILE}
    LOG_FORMAT=${LOG_FORMAT:-$DEFAULT_LOG_FORMAT}
    LOG_MAX_SIZE=${LOG_MAX_SIZE:-$DEFAULT_LOG_MAX_SIZE}
    LOG_MAX_BACKUPS=${LOG_MAX_BACKUPS:-$DEFAULT_LOG_MAX_BACKUPS}
    LOG_MAX_AGE=${LOG_MAX_AGE:-$DEFAULT_LOG_MAX_AGE}

    # Generate JWT secret if not provided
    if [[ -z "$JWT_SECRET" ]]; then
        JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
        print_warning "Generated JWT secret. Save this for production use: $JWT_SECRET"
    fi

    # Adjust DB host for external database
    if [[ "$USE_EXTERNAL_DB" == "true" && "$DB_HOST" == "postgres" ]]; then
        DB_HOST="localhost"
        print_warning "Using external database, changed DB_HOST to localhost"
    fi
}

# Validate configuration
validate_config() {
    print_info "Validating configuration..."

    # Validate ports
    if ! [[ "$SERVER_PORT" =~ ^[0-9]+$ ]] || [ "$SERVER_PORT" -lt 1 ] || [ "$SERVER_PORT" -gt 65535 ]; then
        print_error "Invalid server port: $SERVER_PORT"
    fi

    if ! [[ "$FRONTEND_PORT" =~ ^[0-9]+$ ]] || [ "$FRONTEND_PORT" -lt 1 ] || [ "$FRONTEND_PORT" -gt 65535 ]; then
        print_error "Invalid frontend port: $FRONTEND_PORT"
    fi

    if ! [[ "$DB_PORT" =~ ^[0-9]+$ ]] || [ "$DB_PORT" -lt 1 ] || [ "$DB_PORT" -gt 65535 ]; then
        print_error "Invalid database port: $DB_PORT"
    fi

    # Validate TTL values
    if ! [[ "$JWT_ACCESS_TTL" =~ ^[0-9]+$ ]] || [ "$JWT_ACCESS_TTL" -lt 1 ]; then
        print_error "Invalid JWT access TTL: $JWT_ACCESS_TTL"
    fi

    if ! [[ "$JWT_REFRESH_TTL" =~ ^[0-9]+$ ]] || [ "$JWT_REFRESH_TTL" -lt 1 ]; then
        print_error "Invalid JWT refresh TTL: $JWT_REFRESH_TTL"
    fi

    # Validate log level
    if ! [[ "$LOG_LEVEL" =~ ^(debug|info|warn|error)$ ]]; then
        print_error "Invalid log level: $LOG_LEVEL. Must be debug, info, warn, or error"
    fi

    # Validate log format
    if ! [[ "$LOG_FORMAT" =~ ^(json|text)$ ]]; then
        print_error "Invalid log format: $LOG_FORMAT. Must be json or text"
    fi

    # Validate log rotation settings
    if ! [[ "$LOG_MAX_SIZE" =~ ^[0-9]+$ ]] || [ "$LOG_MAX_SIZE" -lt 1 ]; then
        print_error "Invalid log max size: $LOG_MAX_SIZE"
    fi

    if ! [[ "$LOG_MAX_BACKUPS" =~ ^[0-9]+$ ]] || [ "$LOG_MAX_BACKUPS" -lt 1 ]; then
        print_error "Invalid log max backups: $LOG_MAX_BACKUPS"
    fi

    if ! [[ "$LOG_MAX_AGE" =~ ^[0-9]+$ ]] || [ "$LOG_MAX_AGE" -lt 1 ]; then
        print_error "Invalid log max age: $LOG_MAX_AGE"
    fi

    # Create log directory if log file is specified
    if [[ -n "$LOG_FILE" && "$LOG_FILE" != "stdout" ]]; then
        LOG_DIR=$(dirname "$LOG_FILE")
        if [[ ! -d "$LOG_DIR" ]]; then
            print_info "Creating log directory: $LOG_DIR"
            if [[ "$DRY_RUN" != "true" ]]; then
                mkdir -p "$LOG_DIR"
            fi
        fi
        # Set host log directory for Docker volume mounting
        if [[ "$LOG_FILE" == /var/log/auth-service/* ]]; then
            export LOG_FILE_HOST_DIR="./logs"
            mkdir -p "./logs"
        else
            export LOG_FILE_HOST_DIR="$LOG_DIR"
        fi
    else
        export LOG_FILE_HOST_DIR="./logs"
        mkdir -p "./logs"
    fi

    # Check if external database is accessible
    if [[ "$USE_EXTERNAL_DB" == "true" ]]; then
        print_info "Testing external database connection..."
        if command -v psql >/dev/null 2>&1; then
            if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
                print_error "Cannot connect to external database at $DB_HOST:$DB_PORT with user $DB_USER"
            fi
            print_success "External database connection verified"
        else
            print_warning "psql not found, skipping database connection test"
        fi
    fi

    print_success "Configuration validated"
}

# Create environment file
create_env_file() {
    local env_file="backend/.env"
    
    print_info "Creating environment file: $env_file"

    if [[ "$DRY_RUN" == "true" ]]; then
        print_info "[DRY RUN] Would create $env_file with the following content:"
    else
        cat > "$env_file" << EOF
# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
DB_SSL_MODE=$DB_SSL_MODE

# Server Configuration
SERVER_PORT=$SERVER_PORT
SERVER_HOST=$SERVER_HOST
SERVER_MODE=${ENVIRONMENT}

# JWT Configuration
JWT_SECRET_KEY=$JWT_SECRET
JWT_ACCESS_TOKEN_TTL=$JWT_ACCESS_TTL
JWT_REFRESH_TOKEN_TTL=$JWT_REFRESH_TTL

# Frontend Configuration
FRONTEND_PORT=$FRONTEND_PORT

# External Database Flag
USE_EXTERNAL_DB=$USE_EXTERNAL_DB

# Logging Configuration
LOG_LEVEL=$LOG_LEVEL
LOG_FILE=$LOG_FILE
LOG_FORMAT=$LOG_FORMAT
LOG_MAX_SIZE=$LOG_MAX_SIZE
LOG_MAX_BACKUPS=$LOG_MAX_BACKUPS
LOG_MAX_AGE=$LOG_MAX_AGE
EOF
    fi

    if [[ "$VERBOSE" == "true" || "$DRY_RUN" == "true" ]]; then
        echo "--- Environment Configuration ---"
        echo "DB_HOST=$DB_HOST"
        echo "DB_PORT=$DB_PORT"
        echo "DB_USER=$DB_USER"
        echo "DB_PASSWORD=***"
        echo "DB_NAME=$DB_NAME"
        echo "DB_SSL_MODE=$DB_SSL_MODE"
        echo "SERVER_PORT=$SERVER_PORT"
        echo "SERVER_HOST=$SERVER_HOST"
        echo "JWT_ACCESS_TOKEN_TTL=$JWT_ACCESS_TTL"
        echo "JWT_REFRESH_TOKEN_TTL=$JWT_REFRESH_TTL"
        echo "FRONTEND_PORT=$FRONTEND_PORT"
        echo "USE_EXTERNAL_DB=$USE_EXTERNAL_DB"
        echo "ENVIRONMENT=$ENVIRONMENT"
        echo "LOG_LEVEL=$LOG_LEVEL"
        echo "LOG_FILE=$LOG_FILE"
        echo "LOG_FORMAT=$LOG_FORMAT"
        echo "LOG_MAX_SIZE=${LOG_MAX_SIZE}MB"
        echo "LOG_MAX_BACKUPS=$LOG_MAX_BACKUPS"
        echo "LOG_MAX_AGE=${LOG_MAX_AGE} days"
        echo "--------------------------------"
    fi

    if [[ "$DRY_RUN" != "true" ]]; then
        print_success "Environment file created"
    fi
}

# Create Docker Compose override for external database
create_docker_override() {
    if [[ "$USE_EXTERNAL_DB" == "true" ]]; then
        local override_file="docker-compose.override.yml"
        
        print_info "Creating Docker Compose override for external database"
        
        if [[ "$DRY_RUN" == "true" ]]; then
            print_info "[DRY RUN] Would create $override_file"
            return
        fi

        cat > "$override_file" << EOF
version: '3.8'

services:
  auth-backend:
    environment:
      - DB_HOST=$DB_HOST
      - DB_PORT=$DB_PORT
      - DB_USER=$DB_USER
      - DB_PASSWORD=$DB_PASSWORD
      - DB_NAME=$DB_NAME
      - DB_SSL_MODE=$DB_SSL_MODE
    depends_on: []
    networks:
      - auth-network
      - default

  react-frontend:
    ports:
      - "$FRONTEND_PORT:80"

networks:
  auth-network:
    driver: bridge
  default:
    external: true
    name: bridge

# Remove postgres service when using external database
EOF

        print_success "Docker Compose override created for external database"
    else
        # Remove override file if using Docker database
        if [[ -f "docker-compose.override.yml" ]]; then
            if [[ "$DRY_RUN" == "true" ]]; then
                print_info "[DRY RUN] Would remove docker-compose.override.yml"
            else
                rm -f docker-compose.override.yml
                print_info "Removed Docker Compose override (using Docker database)"
            fi
        fi
    fi
}

# Initialize database
init_database() {
    if [[ "$SKIP_DB_INIT" == "true" ]]; then
        print_info "Skipping database initialization"
        return
    fi

    print_info "Initializing database..."

    if [[ "$USE_EXTERNAL_DB" == "true" ]]; then
        # Initialize external database
        if command -v psql >/dev/null 2>&1; then
            print_info "Creating database $DB_NAME if it doesn't exist..."
            
            if [[ "$DRY_RUN" == "true" ]]; then
                print_info "[DRY RUN] Would create database and run initialization"
                return
            fi

            # Create database if it doesn't exist
            PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true

            # Run initialization SQL if available
            if [[ -f "tests/seed-test-data.sql" ]]; then
                print_info "Running database initialization script..."
                PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "tests/seed-test-data.sql"
                print_success "Database initialized with test data"
            fi
        else
            print_warning "psql not found, skipping external database initialization"
        fi
    else
        print_info "Database will be initialized by Docker container"
    fi
}

# Docker operations
docker_build() {
    print_info "Building Docker images..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_info "[DRY RUN] Would run: docker-compose build"
        return
    fi

    if [[ "$USE_EXTERNAL_DB" == "true" ]]; then
        docker-compose build auth-backend react-frontend
    else
        docker-compose --profile docker-db build
    fi
    
    print_success "Docker images built"
}

docker_start() {
    print_info "Starting services..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_info "[DRY RUN] Would run: docker-compose up -d"
        return
    fi

    if [[ "$USE_EXTERNAL_DB" == "true" ]]; then
        docker-compose up -d auth-backend react-frontend
    else
        docker-compose --profile docker-db up -d
    fi
    
    # Wait for services to be healthy
    sleep 5
    
    print_success "Services started"
    docker_status
}

docker_stop() {
    print_info "Stopping services..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_info "[DRY RUN] Would run: docker-compose down"
        return
    fi

    docker-compose --profile docker-db down
    print_success "Services stopped"
}

docker_restart() {
    docker_stop
    sleep 2
    docker_start
}

docker_logs() {
    print_info "Showing service logs..."
    docker-compose --profile docker-db logs -f
}

docker_status() {
    print_info "Service Status:"
    docker-compose --profile docker-db ps

    # Test endpoints
    echo ""
    print_info "Testing endpoints..."
    
    # Test backend
    if curl -s "http://localhost:$SERVER_PORT/health" >/dev/null 2>&1; then
        print_success "Backend API: http://localhost:$SERVER_PORT ✅"
    else
        print_warning "Backend API: http://localhost:$SERVER_PORT ❌"
    fi

    # Test frontend
    if curl -s "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
        print_success "Frontend: http://localhost:$FRONTEND_PORT ✅"
    else
        print_warning "Frontend: http://localhost:$FRONTEND_PORT ❌"
    fi

    echo ""
    print_info "Default Login Credentials:"
    echo "  Username: admin"
    echo "  Password: Admin@123"
}

docker_clean() {
    print_info "Cleaning Docker resources..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_info "[DRY RUN] Would clean Docker resources"
        return
    fi

    docker-compose --profile docker-db down -v --remove-orphans
    docker system prune -f
    print_success "Docker resources cleaned"
}

# Main execution
main() {
    print_header

    # If no actions specified, show help
    if [[ "$BUILD" == "false" && "$START" == "false" && "$STOP" == "false" && "$RESTART" == "false" && "$LOGS" == "false" && "$STATUS" == "false" && "$CLEAN" == "false" ]]; then
        print_warning "No action specified. Use --help for usage information."
        exit 1
    fi

    # Load configuration
    load_config_file
    set_defaults
    validate_config

    # Create configuration files
    create_env_file
    create_docker_override

    # Initialize database if needed
    if [[ "$START" == "true" || "$RESTART" == "true" ]]; then
        init_database
    fi

    # Execute actions
    if [[ "$CLEAN" == "true" ]]; then
        docker_clean
    fi

    if [[ "$STOP" == "true" ]]; then
        docker_stop
    fi

    if [[ "$BUILD" == "true" ]]; then
        docker_build
    fi

    if [[ "$START" == "true" ]]; then
        docker_start
    fi

    if [[ "$RESTART" == "true" ]]; then
        docker_restart
    fi

    if [[ "$LOGS" == "true" ]]; then
        docker_logs
    fi

    if [[ "$STATUS" == "true" ]]; then
        docker_status
    fi

    if [[ "$DRY_RUN" != "true" ]]; then
        print_success "Setup completed successfully!"
        echo ""
        print_info "Next steps:"
        echo "  1. Access the application at http://localhost:$FRONTEND_PORT"
        echo "  2. Login with admin/Admin@123"
        echo "  3. Check the API Documentation tab for SSO integration guide"
        echo ""
        print_info "Useful commands:"
        echo "  ./setup.sh --status    # Check service status"
        echo "  ./setup.sh --logs      # View logs"
        echo "  ./setup.sh --restart   # Restart services"
        echo "  ./setup.sh --stop      # Stop services"
    fi
}

# Run main function
main "$@"
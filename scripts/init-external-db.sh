#!/bin/bash

# External Database Initialization Script
# This script initializes an external PostgreSQL database for the auth service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Default values
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_PASSWORD=""
DB_NAME="auth_service"
ADMIN_DB="postgres"
FORCE_RECREATE=false
RUN_SEEDS=true

show_help() {
    cat << EOF
External Database Initialization Script

USAGE:
    ./scripts/init-external-db.sh [OPTIONS]

OPTIONS:
    --db-host HOST          Database host (default: localhost)
    --db-port PORT          Database port (default: 5432)
    --db-user USER          Database admin username (default: postgres)
    --db-password PASS      Database admin password (required)
    --db-name NAME          Database name to create (default: auth_service)
    --admin-db NAME         Admin database for connection (default: postgres)
    --force-recreate        Drop and recreate database if exists
    --skip-seeds            Skip running seed data
    --help                  Show this help

EXAMPLES:
    # Basic initialization
    ./scripts/init-external-db.sh --db-password=mypass

    # Custom database name and host
    ./scripts/init-external-db.sh --db-host=db.example.com --db-name=my_auth --db-password=mypass

    # Force recreate database
    ./scripts/init-external-db.sh --db-password=mypass --force-recreate

EOF
}

# Parse arguments
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
        --admin-db)
            ADMIN_DB="$2"
            shift 2
            ;;
        --force-recreate)
            FORCE_RECREATE=true
            shift
            ;;
        --skip-seeds)
            RUN_SEEDS=false
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

# Validate required parameters
if [[ -z "$DB_PASSWORD" ]]; then
    print_error "Database password is required. Use --db-password option."
fi

# Check if psql is available
if ! command -v psql >/dev/null 2>&1; then
    print_error "psql command not found. Please install PostgreSQL client tools."
fi

print_info "Initializing external database..."
print_info "Host: $DB_HOST:$DB_PORT"
print_info "Database: $DB_NAME"
print_info "User: $DB_USER"

# Test connection
print_info "Testing database connection..."
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$ADMIN_DB" -c "SELECT 1;" >/dev/null 2>&1; then
    print_error "Cannot connect to database server at $DB_HOST:$DB_PORT with user $DB_USER"
fi
print_success "Database connection successful"

# Check if database exists
print_info "Checking if database '$DB_NAME' exists..."
DB_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$ADMIN_DB" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

if [[ "$DB_EXISTS" == "1" ]]; then
    if [[ "$FORCE_RECREATE" == "true" ]]; then
        print_warning "Database '$DB_NAME' exists. Dropping and recreating..."
        
        # Terminate connections to the database
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$ADMIN_DB" -c \
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME';" >/dev/null 2>&1
        
        # Drop database
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$ADMIN_DB" -c \
            "DROP DATABASE IF EXISTS \"$DB_NAME\";"
        
        print_success "Database '$DB_NAME' dropped"
    else
        print_warning "Database '$DB_NAME' already exists. Use --force-recreate to recreate it."
        if [[ "$RUN_SEEDS" == "true" ]]; then
            print_info "Will run seed data on existing database..."
        else
            print_info "Exiting without changes."
            exit 0
        fi
    fi
fi

# Create database if it doesn't exist
if [[ "$DB_EXISTS" != "1" || "$FORCE_RECREATE" == "true" ]]; then
    print_info "Creating database '$DB_NAME'..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$ADMIN_DB" -c \
        "CREATE DATABASE \"$DB_NAME\" WITH ENCODING='UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8';"
    print_success "Database '$DB_NAME' created"
fi

# Run seed data
if [[ "$RUN_SEEDS" == "true" ]]; then
    print_info "Running database initialization and seed data..."
    
    # Check if seed file exists
    if [[ -f "tests/seed-test-data.sql" ]]; then
        print_info "Loading seed data from tests/seed-test-data.sql..."
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "tests/seed-test-data.sql"
        print_success "Seed data loaded successfully"
    else
        print_warning "Seed file tests/seed-test-data.sql not found, skipping seed data"
    fi

    # Check if complete setup file exists
    if [[ -f "document-base-complete-setup.sql" ]]; then
        print_info "Loading complete setup from document-base-complete-setup.sql..."
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "document-base-complete-setup.sql"
        print_success "Complete setup loaded successfully"
    else
        print_warning "Complete setup file document-base-complete-setup.sql not found"
    fi
fi

# Verify initialization
print_info "Verifying database initialization..."
USER_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
SERVICE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM services;" 2>/dev/null || echo "0")

print_success "Database initialization completed!"
print_info "Statistics:"
echo "  - Users: $USER_COUNT"
echo "  - Services: $SERVICE_COUNT"
echo ""
print_info "Database connection details:"
echo "  - Host: $DB_HOST:$DB_PORT"
echo "  - Database: $DB_NAME"
echo "  - User: $DB_USER"
echo ""
print_info "You can now start the auth service with:"
echo "  ./setup.sh --use-external-db --db-host=$DB_HOST --db-port=$DB_PORT --db-user=$DB_USER --db-password=*** --db-name=$DB_NAME --build --start"
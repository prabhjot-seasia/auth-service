#!/bin/bash

# Comprehensive Integration Test Runner
# This script runs the complete BDD test suite with isolated test containers
# and generates comprehensive reports

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_COMPOSE_FILE="docker-compose.test.yml"
REPORTS_DIR="bdd/reports"
TEST_DIR="/Users/prabhjot/seasia/auth-service/tests"
BDD_DIR="$TEST_DIR/bdd"
BACKEND_API="http://localhost:8081"
FRONTEND_URL="http://localhost:3002"

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to cleanup test containers
cleanup_test_containers() {
    log "Cleaning up test containers..."
    cd "$TEST_DIR"
    
    if [ -f "$TEST_COMPOSE_FILE" ]; then
        docker-compose -f "$TEST_COMPOSE_FILE" down -v --remove-orphans 2>/dev/null || true
        docker volume prune -f 2>/dev/null || true
        success "Test containers cleaned up"
    fi
}

# Function to start test containers
start_test_containers() {
    log "Starting test containers..."
    cd "$TEST_DIR"
    
    # Build and start test containers
    docker-compose -f "$TEST_COMPOSE_FILE" build --no-cache
    docker-compose -f "$TEST_COMPOSE_FILE" up -d
    
    # Wait for services to be healthy
    log "Waiting for test services to be ready..."
    
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf "$BACKEND_API/health" >/dev/null 2>&1; then
            success "Backend test service is ready"
            break
        fi
        
        attempt=$((attempt + 1))
        if [ $attempt -eq $max_attempts ]; then
            error "Backend test service failed to start within timeout"
            return 1
        fi
        
        echo -n "."
        sleep 2
    done
    
    # Verify frontend is accessible
    if curl -sf -o /dev/null "$FRONTEND_URL" 2>/dev/null; then
        success "Frontend test service is ready"
    else
        warning "Frontend test service may not be fully ready"
    fi
    
    # Verify database migration
    log "Verifying test data migration..."
    sleep 5
    
    local user_count=$(docker-compose -f "$TEST_COMPOSE_FILE" exec -T postgres-test psql -U postgres -d auth_service_test -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' \n' || echo "0")
    
    if [ "$user_count" -gt "5" ]; then
        success "Test data migration successful ($user_count users created)"
    else
        error "Test data migration may have failed (only $user_count users found)"
        return 1
    fi
}

# Function to run BDD tests
run_bdd_tests() {
    log "Running comprehensive BDD test suite..."
    cd "$BDD_DIR"
    
    # Create reports directory
    mkdir -p "$REPORTS_DIR"
    
    local total_scenarios=0
    local passed_scenarios=0
    local failed_scenarios=0
    local test_results=()
    
    # Define test suites to run
    test_suite_names="authentication user-management role-management group-management service-management api-tests rbac-comprehensive admin-core"
    
    # Update configuration for test environment
    export API_BASE_URL="$BACKEND_API"
    export FRONTEND_BASE_URL="$FRONTEND_URL"
    
    log "Running test suites against test containers..."
    
    # Function to get test command for each suite
    get_test_command() {
        case $1 in
            "authentication") echo "features/authentication.feature --tags \"@auth\"" ;;
            "user-management") echo "features/user-management.feature --tags \"@users\"" ;;
            "role-management") echo "features/role-management.feature --tags \"@roles\"" ;;
            "group-management") echo "features/group-management.feature --tags \"@groups\"" ;;
            "service-management") echo "features/service-management.feature --tags \"@services\"" ;;
            "api-tests") echo "features/api-tests.feature --tags \"@api\"" ;;
            "rbac-comprehensive") echo "features/rbac-comprehensive.feature --tags \"@rbac\"" ;;
            "admin-core") echo "features/authentication.feature --name \"Admin user can access permitted management sections\"" ;;
            *) echo "" ;;
        esac
    }

    # Run each test suite
    for suite_name in $test_suite_names; do
        local suite_command=$(get_test_command "$suite_name")
        log "Running $suite_name test suite..."
        
        local json_report="$REPORTS_DIR/${suite_name}-results.json"
        local stdout_report="$REPORTS_DIR/${suite_name}-output.txt"
        
        # Run the test suite (use gtimeout on macOS, timeout on Linux)
        local timeout_cmd="timeout"
        if command -v gtimeout >/dev/null 2>&1; then
            timeout_cmd="gtimeout"
        elif ! command -v timeout >/dev/null 2>&1; then
            timeout_cmd=""  # No timeout available, run without it
        fi
        
        if [ -n "$timeout_cmd" ]; then
            cmd_success="$timeout_cmd 300 npx cucumber-js $suite_command"
        else
            cmd_success="npx cucumber-js $suite_command"
        fi
        
        if $cmd_success --format json:"$json_report" --format progress 2>&1 | tee "$stdout_report"; then
            
            # Parse results from JSON report
            if [ -f "$json_report" ]; then
                local suite_total=$(jq '[.[] | .elements[] | select(.type == "scenario")] | length' "$json_report" 2>/dev/null || echo "0")
                local suite_passed=$(jq '[.[] | .elements[] | select(.type == "scenario") | select(.steps[] | .result.status == "passed")] | length' "$json_report" 2>/dev/null || echo "0")
                local suite_failed=$((suite_total - suite_passed))
                
                total_scenarios=$((total_scenarios + suite_total))
                passed_scenarios=$((passed_scenarios + suite_passed))
                failed_scenarios=$((failed_scenarios + suite_failed))
                
                test_results+=("$suite_name: $suite_passed/$suite_total passed")
                success "$suite_name: $suite_passed/$suite_total scenarios passed"
            else
                test_results+=("$suite_name: results parsing failed")
                warning "$suite_name: Could not parse test results"
            fi
        else
            error "$suite_name: Test suite execution failed"
            test_results+=("$suite_name: execution failed")
            failed_scenarios=$((failed_scenarios + 1))
        fi
        
        log "Completed $suite_name test suite"
    done
    
    # Generate final test report
    generate_final_report "$total_scenarios" "$passed_scenarios" "$failed_scenarios" test_results[@]
    
    # Return success if all tests passed
    if [ "$failed_scenarios" -eq 0 ] && [ "$passed_scenarios" -gt 0 ]; then
        return 0
    else
        return 1
    fi
}

# Function to generate final report
generate_final_report() {
    local total=$1
    local passed=$2
    local failed=$3
    local results_ref=$4[@]
    local results=("${!results_ref}")
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local pass_rate=0
    
    if [ "$total" -gt 0 ]; then
        pass_rate=$(echo "scale=1; $passed * 100 / $total" | bc -l 2>/dev/null || echo "0")
    fi
    
    # Generate markdown report
    cat > "$REPORTS_DIR/integration-test-report.md" << EOF
# 🧪 Integration Test Report

**Generated**: $timestamp  
**Test Environment**: Docker Test Containers  
**Backend**: $BACKEND_API  
**Frontend**: $FRONTEND_URL  

## 📊 Test Results Summary

| Metric | Value |
|--------|-------|
| **Total Scenarios** | $total |
| **Passed** | $passed |
| **Failed** | $failed |
| **Pass Rate** | ${pass_rate}% |

## 📈 Test Suite Results

EOF

    for result in "${results[@]}"; do
        echo "- $result" >> "$REPORTS_DIR/integration-test-report.md"
    done
    
    cat >> "$REPORTS_DIR/integration-test-report.md" << EOF

## 🎯 Test Status

EOF

    if [ "$failed" -eq 0 ] && [ "$passed" -gt 0 ]; then
        echo "✅ **ALL TESTS PASSED** - Ready for Docker image build" >> "$REPORTS_DIR/integration-test-report.md"
    else
        echo "❌ **TESTS FAILED** - Docker image build will be skipped" >> "$REPORTS_DIR/integration-test-report.md"
    fi
    
    cat >> "$REPORTS_DIR/integration-test-report.md" << EOF

## 🔧 Test Infrastructure

- **Test Database**: PostgreSQL test container with complete migration
- **Test Users**: 18 comprehensive test users with all roles
- **Test Data**: Complete RBAC hierarchy with permissions
- **Isolation**: Dedicated test containers separate from development environment
- **Cleanup**: Automatic test container cleanup after execution

---
*Report generated by Integration Test Runner v1.0*
EOF

    # Generate JSON report
    cat > "$REPORTS_DIR/integration-test-summary.json" << EOF
{
  "timestamp": "$timestamp",
  "testEnvironment": {
    "backend": "$BACKEND_API",
    "frontend": "$FRONTEND_URL",
    "database": "PostgreSQL test container"
  },
  "results": {
    "totalScenarios": $total,
    "passedScenarios": $passed,
    "failedScenarios": $failed,
    "passRate": $pass_rate
  },
  "testSuites": [
EOF

    local first=true
    for result in "${results[@]}"; do
        if [ "$first" = true ]; then
            first=false
        else
            echo "," >> "$REPORTS_DIR/integration-test-summary.json"
        fi
        local suite_name=$(echo "$result" | cut -d':' -f1)
        local suite_result=$(echo "$result" | cut -d':' -f2-)
        echo "    {\"name\": \"$suite_name\", \"result\": \"$suite_result\"}" >> "$REPORTS_DIR/integration-test-summary.json"
    done
    
    cat >> "$REPORTS_DIR/integration-test-summary.json" << EOF
  ],
  "readyForBuild": $([ "$failed" -eq 0 ] && [ "$passed" -gt 0 ] && echo "true" || echo "false")
}
EOF

    log "Generated final test report: $REPORTS_DIR/integration-test-report.md"
    log "Generated JSON summary: $REPORTS_DIR/integration-test-summary.json"
}

# Function to build production Docker image on success
build_production_image() {
    log "Building production Docker images after successful tests..."
    cd "/Users/prabhjot/seasia/auth-service"
    
    local timestamp=$(date '+%Y%m%d-%H%M%S')
    local backend_tag="auth-service-backend:tested-$timestamp"
    local frontend_tag="auth-service-frontend:tested-$timestamp"
    
    # Build backend
    if docker build -t "$backend_tag" -f backend/Dockerfile backend/; then
        success "Built backend image: $backend_tag"
        
        # Tag as latest tested version
        docker tag "$backend_tag" "auth-service-backend:latest-tested"
        success "Tagged as: auth-service-backend:latest-tested"
    else
        error "Failed to build backend image"
        return 1
    fi
    
    # Build frontend
    if docker build -t "$frontend_tag" -f frontend/react-app/Dockerfile frontend/react-app/; then
        success "Built frontend image: $frontend_tag"
        
        # Tag as latest tested version
        docker tag "$frontend_tag" "auth-service-frontend:latest-tested"
        success "Tagged as: auth-service-frontend:latest-tested"
    else
        error "Failed to build frontend image"
        return 1
    fi
    
    # Save build information
    cat > "$BDD_DIR/$REPORTS_DIR/docker-build-info.json" << EOF
{
  "buildTimestamp": "$timestamp",
  "backendImage": "$backend_tag",
  "frontendImage": "$frontend_tag",
  "testsPassed": true,
  "buildStatus": "success"
}
EOF

    success "Production Docker images built successfully!"
    return 0
}

# Main execution function
main() {
    log "Starting comprehensive integration testing..."
    
    # Ensure we're in the right directory
    if [ ! -f "$TEST_DIR/$TEST_COMPOSE_FILE" ]; then
        error "Test compose file not found: $TEST_DIR/$TEST_COMPOSE_FILE"
        exit 1
    fi
    
    # Cleanup any existing test containers
    cleanup_test_containers
    
    # Trap to ensure cleanup on exit
    trap cleanup_test_containers EXIT
    
    # Start test infrastructure
    if ! start_test_containers; then
        error "Failed to start test containers"
        exit 1
    fi
    
    # Run BDD tests
    if run_bdd_tests; then
        success "All tests passed! Ready for production build."
        
        # Build production Docker images
        if build_production_image; then
            success "🎉 Integration testing and Docker build completed successfully!"
            log "✅ Production images tagged as 'latest-tested'"
            log "📊 Test reports available in: $BDD_DIR/$REPORTS_DIR/"
        else
            warning "Tests passed but Docker build failed"
            exit 1
        fi
    else
        error "Some tests failed. Skipping Docker image build."
        log "📊 Test reports available in: $BDD_DIR/$REPORTS_DIR/"
        exit 1
    fi
    
    log "Integration testing completed. Cleaning up test containers..."
}

# Run main function
main "$@"
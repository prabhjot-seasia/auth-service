#!/bin/bash

# BDD Test Runner for SSO Integration
echo "🚀 Running extensive BDD tests for Document Base SSO integration"

# Function to run test with timeout on macOS
run_with_timeout() {
    local timeout_duration=$1
    local test_command=$2
    
    echo "Running: $test_command with ${timeout_duration}s timeout"
    
    # Start the command in the background
    $test_command &
    local cmd_pid=$!
    
    # Wait for the specified timeout
    local count=0
    while [ $count -lt $timeout_duration ]; do
        if ! kill -0 $cmd_pid 2>/dev/null; then
            wait $cmd_pid
            return $?
        fi
        sleep 1
        ((count++))
    done
    
    # If we get here, the command timed out
    echo "⏰ Command timed out after ${timeout_duration} seconds"
    kill -9 $cmd_pid 2>/dev/null
    return 124
}

cd /Users/prabhjot/seasia/auth-service/tests/bdd

echo "📋 Test Summary:"
echo "  1. Document Base SSO Login (core scenarios)"
echo "  2. Cross-Service SSO Authentication" 
echo "  3. End-to-End SSO Navigation"
echo ""

echo "🔬 1. Testing Document Base SSO Login scenarios..."
run_with_timeout 45 "./node_modules/.bin/cucumber-js features/document-base-sso-login.feature --tags '@document-base and @sso and @critical'"

echo ""
echo "🔗 2. Testing Cross-Service SSO Authentication..."
run_with_timeout 45 "./node_modules/.bin/cucumber-js features/cross-service-sso.feature --tags '@auth and @sso and @cross-service'"

echo ""
echo "🌐 3. Testing End-to-End SSO Navigation..."
run_with_timeout 45 "./node_modules/.bin/cucumber-js features/end-to-end-sso-test.feature --tags '@e2e and @sso'"

echo ""
echo "✅ BDD Testing Complete!"
echo "📊 Check above output for detailed results and any failures"
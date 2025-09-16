const { Given, When, Then, BeforeAll } = require('@cucumber/cucumber');
const { expect } = require('chai');
const axios = require('axios');

// Test environment configuration
const TEST_API_BASE = process.env.API_BASE_URL || 'http://localhost:8081';
const TEST_FRONTEND_BASE = process.env.FRONTEND_BASE_URL || 'http://localhost:3002';

// Override API base URL for test environment
const originalApiBase = 'http://localhost:8080';

// Helper function to get correct API URL
function getApiUrl(endpoint) {
  if (process.env.API_BASE_URL) {
    return `${TEST_API_BASE}${endpoint}`;
  }
  return `${originalApiBase}${endpoint}`;
}

// Helper function to get correct frontend URL  
function getFrontendUrl(path = '') {
  if (process.env.FRONTEND_BASE_URL) {
    return `${TEST_FRONTEND_BASE}${path}`;
  }
  return `http://localhost:3001${path}`;
}

// Test environment verification steps (using unique names to avoid conflicts)

// Test environment verification steps
Given('I am using the test environment', async function () {
  console.log(`🧪 Test Environment Configuration:`);
  console.log(`   Backend: ${TEST_API_BASE}`);
  console.log(`   Frontend: ${TEST_FRONTEND_BASE}`);
  console.log(`   Database: localhost:5434 (auth_service_test)`);
});

Then('the test environment should be properly configured', async function () {
  // Verify backend is accessible
  const healthResponse = await axios.get(getApiUrl('/health'));
  expect(healthResponse.status).to.equal(200);
  
  // Verify frontend is accessible
  const frontendResponse = await axios.get(getFrontendUrl('/')); 
  expect(frontendResponse.status).to.equal(200);
  
  console.log('✅ Test environment is properly configured');
});

// Database verification step (using unique name to avoid conflicts)
Given('the test database has been seeded with comprehensive test data', async function () {
  // This step verifies that our test migration scripts have run successfully
  // by checking that test users exist via the API
  
  try {
    // Try to authenticate with a test user to verify data exists
    const tokenResponse = await axios.post(getApiUrl('/auth/token'), {
      grant_type: 'password',
      username: 'admin',
      password: 'Test@123'  // Updated to match our test data
    });
    
    expect(tokenResponse.status).to.equal(200);
    expect(tokenResponse.data.access_token).to.be.a('string');
    console.log('✅ Test database is properly seeded (admin user verified)');
  } catch (error) {
    console.error('❌ Test database seeding verification failed:', error.message);
    throw new Error('Test database is not properly seeded');
  }
});

// Export for use in other step files
module.exports = {
  getApiUrl,
  getFrontendUrl,
  TEST_API_BASE,
  TEST_FRONTEND_BASE
};
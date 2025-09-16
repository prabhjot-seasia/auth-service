// Test Environment Configuration for BDD Tests
// This configuration file sets up the test environment for integration testing

const { setDefaultTimeout, Before, After, BeforeAll, AfterAll } = require('@cucumber/cucumber');
const { chromium } = require('playwright');

// Set longer timeout for test environment
setDefaultTimeout(30000);

// Test environment configuration
const TEST_CONFIG = {
  backend: process.env.API_BASE_URL || 'http://localhost:8081',
  frontend: process.env.FRONTEND_BASE_URL || 'http://localhost:3002',
  database: {
    host: 'localhost',
    port: 5434,
    name: 'auth_service_test'
  }
};

// Global browser instance for tests
let browser;

BeforeAll(async function () {
  console.log('🚀 Starting BDD Test Suite with Test Environment');
  console.log(`📡 Backend: ${TEST_CONFIG.backend}`);
  console.log(`🌐 Frontend: ${TEST_CONFIG.frontend}`);
  console.log(`🗄️ Database: ${TEST_CONFIG.database.host}:${TEST_CONFIG.database.port}`);
  
  // Launch browser for tests
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  
  console.log('🎭 Browser launched for testing');
});

Before(async function () {
  // Create new browser context for each scenario
  this.context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    baseURL: TEST_CONFIG.frontend
  });
  
  // Create new page
  this.page = await this.context.newPage();
  
  // Set test configuration on the page context
  this.testConfig = TEST_CONFIG;
  
  // Override console.log to capture test output
  this.page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`🚨 Browser Error: ${msg.text()}`);
    }
  });
});

After(async function () {
  // Close browser context after each scenario
  if (this.context) {
    await this.context.close();
  }
});

AfterAll(async function () {
  // Close browser after all tests
  if (browser) {
    await browser.close();
    console.log('🎭 Browser closed');
  }
  
  console.log('✅ BDD Test Suite completed');
});

module.exports = {
  TEST_CONFIG
};
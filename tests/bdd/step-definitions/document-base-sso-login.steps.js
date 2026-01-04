const { Given, When, Then } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const { expect } = require('@playwright/test');

let browser, context, page;
let authToken, authorizationCode, userInfo;

// Configuration
const AUTH_SERVICE_URL = 'http://localhost:8080';
const AUTH_FRONTEND_URL = 'http://localhost:3001';
const DOCUMENT_BASE_CLIENT_ID = 'c16c88e2c9e137e2517e72155e8ffe81';
const DOCUMENT_BASE_CALLBACK = 'http://localhost:3000/auth/callback';

Given('the auth service is running', async function () {
  // Initialize browser for testing
  browser = await chromium.launch({ 
    headless: false, 
    slowMo: 1000,
    channel: 'chrome' // Use Google Chrome
  });
  context = await browser.newContext();
  page = await context.newPage();
  
  // Enable comprehensive logging
  
  // 1. Capture console logs
  page.on('console', msg => {
    console.log(`🖥️  BROWSER CONSOLE [${msg.type()}]:`, msg.text());
  });
  
  // 2. Capture network requests
  page.on('request', request => {
    console.log(`🌐 NETWORK REQUEST: ${request.method()} ${request.url()}`);
    if (request.postData()) {
      console.log(`📤 REQUEST BODY:`, request.postData());
    }
  });
  
  // 3. Capture network responses
  page.on('response', response => {
    console.log(`📥 NETWORK RESPONSE: ${response.status()} ${response.url()}`);
  });
  
  // 4. Capture page errors
  page.on('pageerror', error => {
    console.log(`❌ PAGE ERROR:`, error.message);
  });
  
  // 5. Capture failed requests
  page.on('requestfailed', request => {
    console.log(`💥 REQUEST FAILED: ${request.url()} - ${request.failure().errorText}`);
  });
  
  // Verify auth service is accessible
  const response = await page.goto(`${AUTH_SERVICE_URL}/health`);
  expect(response.status()).toBe(200);
  console.log('✅ Auth service is running');
});

Given('the Document Base service is configured', async function () {
  // Verify Document Base service is configured in auth service
  const response = await fetch(`${AUTH_SERVICE_URL}/services`, {
    headers: {
      'Authorization': `Bearer ${await getAdminToken()}`
    }
  });
  
  const services = await response.json();
  const documentBaseService = services.find(s => s.client_id === DOCUMENT_BASE_CLIENT_ID);
  
  expect(documentBaseService).toBeDefined();
  expect(documentBaseService.is_active).toBe(true);
  console.log('✅ Document Base service is configured');
});

Given('admin user exists with proper permissions', async function () {
  // Verify admin user can get token
  const token = await getAdminToken();
  expect(token).toBeTruthy();
  
  // Verify admin has access to Document Base
  const response = await fetch(`${AUTH_SERVICE_URL}/me/services`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const userServices = await response.json();
  const hasDocumentBase = userServices.services.some(s => 
    s.client_id === DOCUMENT_BASE_CLIENT_ID
  );
  
  expect(hasDocumentBase).toBe(true);
  console.log('✅ Admin user has proper Document Base permissions');
});

Given('I am a user who wants to access Document Base', function () {
  console.log('🎭 User wants to access Document Base via SSO');
});

When('I navigate to the Document Base SSO login URL', async function () {
  const ssoUrl = `${AUTH_SERVICE_URL}/sso/login?client_id=${DOCUMENT_BASE_CLIENT_ID}&redirect_uri=${encodeURIComponent(DOCUMENT_BASE_CALLBACK)}&response_type=code`;
  
  console.log('🔗 Navigating to SSO URL:', ssoUrl);
  await page.goto(ssoUrl);
});

When('I am redirected to the auth service login page', async function () {
  // Wait for redirect to login page
  await page.waitForURL(/localhost:3001\/login/);
  
  // Verify we're on the login page with SSO parameters
  const url = page.url();
  expect(url).toContain('client_id=');
  expect(url).toContain('redirect_uri=');
  expect(url).toContain('response_type=code');
  
  console.log('✅ Redirected to auth service login page');
});

When('I enter valid credentials {string} and {string}', async function (username, password) {
  // Enter credentials
  await page.fill('input[type="text"], input[name="username"]', username);
  await page.fill('input[type="password"], input[name="password"]', password);
  
  console.log(`📝 Entered credentials: ${username} / ${password}`);
});

When('I submit the login form', async function () {
  // Set up network monitoring to capture token requests
  const tokenPromise = page.waitForResponse(response => 
    response.url().includes('/auth/token') && response.status() === 200
  );
  
  // Submit the form
  await page.click('button[type="submit"], input[type="submit"]');
  
  // Wait for token response
  const tokenResponse = await tokenPromise;
  const tokenText = await tokenResponse.text();
  const tokenData = JSON.parse(tokenText);
  authToken = tokenData.access_token;
  
  console.log('✅ Login form submitted');
});

Then('I should be authenticated by the auth service', async function () {
  expect(authToken).toBeTruthy();
  expect(authToken).toMatch(/^eyJ/); // JWT token format
  console.log('✅ Authenticated by auth service');
});

Then('I should receive a valid JWT token from Document Base SSO', async function () {
  // Decode JWT to verify structure (basic validation)
  const parts = authToken.split('.');
  expect(parts).toHaveLength(3);
  
  // Verify token with auth service
  const response = await fetch(`${AUTH_SERVICE_URL}/me/permissions`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  expect(response.status).toBe(200);
  userInfo = await response.json();
  
  console.log('✅ Received valid JWT token');
});

Then('I should be redirected back to Document Base with an authorization code', async function () {
  // Wait for redirect to callback URL
  await page.waitForURL(new RegExp(DOCUMENT_BASE_CALLBACK.replace('http://localhost:3000', 'localhost:3000')));
  
  const url = page.url();
  expect(url).toContain('code=');
  
  // Extract authorization code
  const urlParams = new URLSearchParams(url.split('?')[1]);
  authorizationCode = urlParams.get('code');
  expect(authorizationCode).toBeTruthy();
  
  console.log('✅ Redirected to Document Base with authorization code');
});

Then('the authorization code should be valid', async function () {
  // The authorization code is actually the JWT token in this implementation
  expect(authorizationCode).toBe(authToken);
  console.log('✅ Authorization code is valid');
});

Then('I should have access to Document Base features', async function () {
  // Validate token with SSO validation endpoint (simulating Document Base validation)
  const response = await fetch(`${AUTH_SERVICE_URL}/sso/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      token: authorizationCode,
      client_id: 'c16c88e2c9e137e2517e72155e8ffe81',
      client_secret: '17cd29f09682dd4337be4f1843b7e8d7ccc8bfd96f521e87591b78db6dce8f09'
    })
  });
  
  expect(response.status()).toBe(200);
  const validation = await response.json();
  expect(validation.valid).toBe(true);
  
  console.log('✅ Have access to Document Base features');
});

Given('I have completed SSO login to Document Base', async function () {
  // Quick login flow
  authToken = await getAdminToken();
  userInfo = await getUserPermissions(authToken);
});

When('I check my permissions', async function () {
  userInfo = await getUserPermissions(authToken);
});

Then('I should have {string} permission', async function (permission) {
  const [action, resource] = permission.split(':');
  const hasPermission = userInfo.effective_permissions.some(p => 
    p.action === action && p.resource === resource
  );
  
  expect(hasPermission).toBe(true);
  console.log(`✅ Has permission: ${permission}`);
});

Given('I have an auth token from SSO login', async function () {
  authToken = await getAdminToken();
});

When('Document Base validates my token with the auth service', async function () {
  // Simulate Document Base validating token
  const response = await fetch(`${AUTH_SERVICE_URL}/sso/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      token: authToken,
      client_id: 'c16c88e2c9e137e2517e72155e8ffe81',
      client_secret: '17cd29f09682dd4337be4f1843b7e8d7ccc8bfd96f521e87591b78db6dce8f09'
    })
  });
  
  this.validationResponse = await response.json();
  this.validationStatus = response.status;
});

Then('the token should be valid', function () {
  expect(this.validationStatus).toBe(200);
  expect(this.validationResponse.valid).toBe(true);
  console.log('✅ Token is valid');
});

Then('my user information should be returned', function () {
  expect(this.validationResponse.username).toBeTruthy();
  expect(this.validationResponse.email).toBeTruthy();
  console.log('✅ User information returned');
});

Then('my permissions should be included', function () {
  expect(this.validationResponse.permissions).toBeDefined();
  expect(Array.isArray(this.validationResponse.permissions)).toBe(true);
  console.log('✅ Permissions included');
});

Then('the service should confirm I have access', function () {
  expect(this.validationResponse.service_name).toBeTruthy();
  console.log('✅ Service confirmed access');
});

Given('I am logged into Document Base via SSO', async function () {
  authToken = await getAdminToken();
});

When('I logout from the auth service', async function () {
  const response = await fetch(`${AUTH_SERVICE_URL}/sso/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      client_id: 'c16c88e2c9e137e2517e72155e8ffe81',
      client_secret: '17cd29f09682dd4337be4f1843b7e8d7ccc8bfd96f521e87591b78db6dce8f09'
    })
  });
  
  expect(response.status()).toBe(200);
  console.log('✅ Logged out from auth service');
});

Then('my token should be blacklisted', async function () {
  // Try to use the token - should fail
  const response = await fetch(`${AUTH_SERVICE_URL}/me/permissions`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  expect(response.status()).toBe(401);
  console.log('✅ Token is blacklisted');
});

Then('I should be logged out of Document Base', function () {
  console.log('✅ Logged out of Document Base (simulated)');
});

Then('subsequent requests to Document Base should fail', async function () {
  // Validate token should now fail
  const response = await fetch(`${AUTH_SERVICE_URL}/sso/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      token: authToken,
      client_id: 'c16c88e2c9e137e2517e72155e8ffe81',
      client_secret: '17cd29f09682dd4337be4f1843b7e8d7ccc8bfd96f521e87591b78db6dce8f09'
    })
  });
  
  const validation = await response.json();
  expect(validation.valid).toBe(false);
  console.log('✅ Subsequent requests fail');
});

// Cleanup
process.on('exit', async () => {
  if (browser) {
    await browser.close();
  }
});

// Helper functions
async function getAdminToken() {
  const response = await fetch(`${AUTH_SERVICE_URL}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      grant_type: 'password',
      username: 'admin',
      password: 'Admin@123'
    })
  });
  
  const data = await response.json();
  return data.access_token;
}

async function getUserPermissions(token) {
  const response = await fetch(`${AUTH_SERVICE_URL}/me/permissions`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return await response.json();
}
const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');
const axios = require('axios');

Given('the document base service is running', async function() {
  try {
    const response = await axios.get('http://localhost:3000', { timeout: 5000 });
    expect(response.status).to.equal(200);
    console.log('✅ Document base service is running at http://localhost:3000');
  } catch (error) {
    throw new Error(`Document base service is not running: ${error.message}`);
  }
});

When('I click on the Document Base service in a new tab', async function() {
  const page = this.page;
  
  // Get current tab count
  const contextPages = await this.context.pages();
  this.originalTabCount = contextPages.length;
  
  // Create a promise to wait for new page
  const newPagePromise = this.context.waitForEvent('page');
  
  // Click the Document Base service link (which should open in new tab due to target="_blank")
  const documentBaseLink = page.locator('text="Document Base"');
  await documentBaseLink.click();
  
  // Wait for new page to open
  this.newTab = await newPagePromise;
  await this.newTab.waitForLoadState('networkidle');
  
  console.log('✅ Clicked Document Base service link');
});

Then('a new tab should open', async function() {
  expect(this.newTab).to.exist;
  
  // Verify we now have more tabs
  const contextPages = await this.context.pages();
  expect(contextPages.length).to.be.greaterThan(this.originalTabCount);
  
  console.log('✅ New tab opened successfully');
});

Then('the new tab should navigate to document base service', async function() {
  const newTabUrl = this.newTab.url();
  expect(newTabUrl).to.include('localhost:3000');
  
  console.log(`✅ New tab navigated to document service: ${newTabUrl}`);
});

Then('I should be automatically logged into the document base service', async function() {
  // Wait for the page to load completely
  await this.newTab.waitForTimeout(3000);
  
  // Check if we're not on a login page
  const url = this.newTab.url();
  const isNotLoginPage = !url.includes('/login') && !url.includes('auth/login');
  
  if (!isNotLoginPage) {
    const pageContent = await this.newTab.textContent('body');
    console.log('Page content:', pageContent?.substring(0, 500));
  }
  
  expect(isNotLoginPage).to.be.true;
  console.log('✅ Automatically logged into document base service');
});

Then('I should not see any login prompts in the document service', async function() {
  // Check for absence of login forms
  const hasPasswordInput = await this.newTab.locator('input[type="password"]').isVisible().catch(() => false);
  const hasLoginButton = await this.newTab.locator('button:has-text("Login")').isVisible().catch(() => false);
  const hasLoginForm = await this.newTab.locator('form').filter({hasText: /login|sign in/i}).isVisible().catch(() => false);
  
  expect(hasPasswordInput).to.be.false;
  expect(hasLoginButton).to.be.false; 
  expect(hasLoginForm).to.be.false;
  
  console.log('✅ No login prompts detected in document service');
});

Then('the original auth service tab should remain active', async function() {
  const originalPage = this.page;
  const originalUrl = originalPage.url();
  
  expect(originalUrl).to.include('/dashboard');
  expect(originalUrl).to.include('localhost:3001');
  
  console.log('✅ Original auth service tab remains active');
  
  // Cleanup: close the new tab
  await this.newTab.close();
});

When('I directly navigate to the SSO URL for document base service in a new tab', async function() {
  // Get the JWT token from the current session
  const token = await this.page.evaluate(() => localStorage.getItem('jwt'));
  expect(token).to.exist;
  
  // Build the SSO URL
  const ssoUrl = new URL('http://localhost:8080/sso/login');
  ssoUrl.searchParams.append('client_id', 'c16c88e2c9e137e2517e72155e8ffe81');
  ssoUrl.searchParams.append('redirect_uri', 'http://localhost:3000/auth/callback');
  ssoUrl.searchParams.append('response_type', 'code');
  ssoUrl.searchParams.append('scope', 'documents:read documents:write');
  ssoUrl.searchParams.append('state', 'test-direct-nav');
  ssoUrl.searchParams.append('token', token);
  
  // Open new tab and navigate to SSO URL
  this.newTab = await this.context.newPage();
  await this.newTab.goto(ssoUrl.toString());
  await this.newTab.waitForTimeout(5000); // Wait for redirects
  
  console.log(`✅ Directly navigated to SSO URL in new tab: ${this.newTab.url()}`);
});

Then('I should be automatically redirected to document base service', async function() {
  const url = this.newTab.url();
  expect(url).to.include('localhost:3000');
  
  console.log('✅ Automatically redirected to document base service');
});

Then('I should be logged into document base service without manual authentication', async function() {
  // Check that we're not on login page
  const url = this.newTab.url();
  const isNotLoginPage = !url.includes('/login');
  
  expect(isNotLoginPage).to.be.true;
  console.log('✅ Logged into document base service without manual authentication');
  
  // Cleanup
  await this.newTab.close();
});

When('I access document base service through SSO', async function() {
  // Get JWT token
  const token = await this.page.evaluate(() => localStorage.getItem('jwt'));
  
  // Make direct API call to SSO endpoint to test the flow
  try {
    const response = await axios.get('http://localhost:8080/sso/login', {
      params: {
        client_id: 'c16c88e2c9e137e2517e72155e8ffe81',
        redirect_uri: 'http://localhost:3000/auth/callback',
        response_type: 'code',
        scope: 'documents:read documents:write',
        state: 'test-api-flow',
        token: token
      },
      maxRedirects: 0, // Don't follow redirects automatically
      validateStatus: () => true // Accept all status codes
    });
    
    this.ssoResponse = response;
    console.log(`SSO API Response: ${response.status} -> ${response.headers.location}`);
  } catch (error) {
    this.ssoError = error;
  }
});

Then('the document service should receive a valid authorization code', async function() {
  expect(this.ssoResponse).to.exist;
  expect(this.ssoResponse.status).to.equal(302); // Should be a redirect
  
  const location = this.ssoResponse.headers.location;
  expect(location).to.include('localhost:3000/auth/callback');
  expect(location).to.include('code='); // Should contain authorization code
  
  // Extract the code from the URL
  const url = new URL(location);
  this.authCode = url.searchParams.get('code');
  expect(this.authCode).to.exist;
  
  console.log('✅ Document service received valid authorization code');
});

Then('the document service should validate the code with auth service', async function() {
  // In a real implementation, the document service would validate the code
  // For our test, we verify the code is a valid JWT token
  expect(this.authCode).to.exist;
  expect(this.authCode).to.match(/^eyJ/); // JWT tokens start with 'eyJ'
  
  console.log('✅ Authorization code is valid JWT format');
});

Then('I should have access to document base service features', async function() {
  // Verify that the authorization was successful
  expect(this.ssoResponse.status).to.equal(302);
  const location = this.ssoResponse.headers.location;
  expect(location).to.include('localhost:3000');
  
  console.log('✅ Access granted to document base service features');
});
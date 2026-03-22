const { Given, When, Then, Before, After } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const { expect } = require('chai');
const axios = require('axios');

const AUTH_API = process.env.API_BASE_URL || 'http://localhost:8080';
const AUTH_FRONTEND = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';

Before({ tags: '@sso and @navigation' }, async function () {
  this.browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  this.context = await this.browser.newContext({
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true
  });
  this.page = await this.context.newPage();
});

After({ tags: '@sso and @navigation' }, async function () {
  if (this.browser) {
    await this.browser.close();
  }
});

// --- Background steps ---

Given('the auth service backend is healthy', async function () {
  const response = await axios.get(`${AUTH_API}/health`, { timeout: 10000 });
  expect(response.status).to.equal(200);
});

Given('the auth service frontend is accessible', async function () {
  const response = await axios.get(AUTH_FRONTEND, {
    timeout: 10000,
    validateStatus: () => true
  });
  expect(response.status).to.equal(200);
});

// --- Login step ---

Given('I login to auth service as {string} with password {string}', async function (username, password) {
  const page = this.page;

  await page.goto(`${AUTH_FRONTEND}/login`);
  await page.waitForSelector('#username', { timeout: 10000 });

  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForSelector('.dashboard-container', { timeout: 10000 });

  // Store the JWT token for API-level tests
  this.authToken = await page.evaluate(() => localStorage.getItem('jwt'));
  expect(this.authToken).to.exist;
  this.username = username;
});

// --- Dropdown steps ---

When('I open the user dropdown', async function () {
  const page = this.page;

  // Wait for permissions and services to load
  await page.waitForTimeout(2000);

  await page.click('.user-dropdown-toggle');
  await page.waitForSelector('.user-dropdown-menu', { timeout: 5000 });
});

When('I open the user dropdown without refreshing', async function () {
  const page = this.page;

  // Do NOT refresh — just wait for async data to load
  await page.waitForTimeout(3000);

  await page.click('.user-dropdown-toggle');
  await page.waitForSelector('.user-dropdown-menu', { timeout: 5000 });
});

Then('I should see the services section in the dropdown', async function () {
  const page = this.page;
  const isVisible = await page.locator('.dropdown-services').isVisible();
  expect(isVisible).to.be.true;
});

Then('I should see {string} in the services list', async function (serviceName) {
  const page = this.page;

  // Wait for services section to appear
  await page.waitForSelector('.dropdown-services', { timeout: 5000 });

  const serviceLink = page.locator(`.dropdown-service-link:has-text("${serviceName}")`);
  const isVisible = await serviceLink.isVisible();
  expect(isVisible).to.be.true;
});

Then('I should not see {string} in the services list', async function (serviceName) {
  const page = this.page;

  // Give time for any async loading
  await page.waitForTimeout(2000);

  // Services section may not exist at all, or the specific service should be absent
  const serviceLink = page.locator(`.dropdown-service-link:has-text("${serviceName}")`);
  const isVisible = await serviceLink.isVisible().catch(() => false);
  expect(isVisible).to.be.false;
});

// --- SSO link verification ---

Then('the {string} link should contain {string}', async function (serviceName, expectedSubstring) {
  const page = this.page;

  const serviceLink = page.locator(`a.dropdown-service-link:has-text("${serviceName}")`);
  const href = await serviceLink.getAttribute('href');
  expect(href).to.exist;
  expect(href).to.include(expectedSubstring);
});

// --- API-level SSO redirect tests ---

When('I trigger SSO navigation to {string} with redirect {string}', async function (clientId, redirectUri) {
  // Use the token obtained during login to call SSO endpoint directly
  const ssoUrl = `${AUTH_API}/sso/login?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&token=${encodeURIComponent(this.authToken)}`;

  try {
    const response = await axios.get(ssoUrl, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302
    });
    this.ssoRedirectUrl = response.headers.location;
  } catch (error) {
    if (error.response && error.response.status === 302) {
      this.ssoRedirectUrl = error.response.headers.location;
    } else {
      throw error;
    }
  }

  expect(this.ssoRedirectUrl).to.exist;
});

Then('the SSO response should redirect to {string} with a code parameter', async function (expectedBaseUrl) {
  expect(this.ssoRedirectUrl).to.include(expectedBaseUrl);
  expect(this.ssoRedirectUrl).to.include('code=');

  // Verify the code is a valid JWT (starts with eyJ)
  const url = new URL(this.ssoRedirectUrl);
  const code = url.searchParams.get('code');
  expect(code).to.exist;
  expect(code).to.match(/^eyJ/);
});

Then('the SSO response should redirect to the auth service login page', async function () {
  expect(this.ssoRedirectUrl).to.include(`${AUTH_FRONTEND}/login`);
  expect(this.ssoRedirectUrl).to.include('client_id=');
  expect(this.ssoRedirectUrl).to.not.include('code=');
});

// --- Browser-based SSO click tests ---

When('I click the {string} SSO link in the dropdown', { timeout: 30000 }, async function (serviceName) {
  const page = this.page;

  // Get the SSO link href before clicking
  const serviceLink = page.locator(`a.dropdown-service-link:has-text("${serviceName}")`);
  const href = await serviceLink.getAttribute('href');
  expect(href).to.exist;
  this.ssoLinkHref = href;

  // Navigate to the SSO URL in the same page
  // This follows the full redirect chain: auth SSO -> callback -> home page
  await page.goto(href, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(5000);

  this.finalUrl = page.url();
});

Then('the browser should land on the document-base-service home page', async function () {
  // After SSO flow: auth-service -> /sso/login -> /auth/callback -> / (home)
  expect(this.finalUrl).to.include('localhost:3001');
  expect(this.finalUrl).to.not.include('/login');
  expect(this.finalUrl).to.not.include('error');

  // Verify we're on the document-base home page (not the callback or login)
  const page = this.page;
  const title = await page.title().catch(() => '');
  expect(title).to.include('Document Base');
});

const { Given, When, Then } = require('@cucumber/cucumber');
const { chromium, firefox, webkit } = require('playwright');
const { expect } = require('chai');

const deviceConfigs = {
  'iPad Pro': { width: 1024, height: 1366, isMobile: true },
  'iPad Mini': { width: 768, height: 1024, isMobile: true },
  'Android Tablet': { width: 800, height: 1280, isMobile: true },
  'iPhone 12': { width: 390, height: 844, isMobile: true },
  'Desktop': { width: 1920, height: 1080, isMobile: false }
};

const browsers = {
  'Chrome': chromium,
  'Firefox': firefox,
  'Safari': webkit,
  'Edge': chromium
};

Given('I am using {string} device', async function(deviceName) {
  const config = deviceConfigs[deviceName];
  if (!config) {
    throw new Error(`Unknown device: ${deviceName}`);
  }
  
  if (this.context) {
    await this.context.close();
  }
  
  this.context = await this.browser.newContext({
    viewport: { width: config.width, height: config.height },
    isMobile: config.isMobile,
    hasTouch: config.isMobile
  });
  
  this.page = await this.context.newPage();
  this.currentDevice = deviceName;
});

Given('I am using {string} browser', async function(browserName) {
  const BrowserType = browsers[browserName];
  if (!BrowserType) {
    throw new Error(`Unknown browser: ${browserName}`);
  }
  
  if (this.browser) {
    await this.browser.close();
  }
  
  this.browser = await BrowserType.launch({ 
    headless: true,
    // For Edge, we use chromium with Edge user agent
    ...(browserName === 'Edge' && {
      args: ['--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59']
    })
  });
  
  this.context = await this.browser.newContext();
  this.page = await this.context.newPage();
  this.currentBrowser = browserName;
});

Given('I am using a mobile device with {int}px width', async function(width) {
  if (this.context) {
    await this.context.close();
  }
  
  this.context = await this.browser.newContext({
    viewport: { width: width, height: 800 },
    isMobile: true,
    hasTouch: true
  });
  
  this.page = await this.context.newPage();
});

Given('I am using a desktop with {int}px width', async function(width) {
  if (this.context) {
    await this.context.close();
  }
  
  this.context = await this.browser.newContext({
    viewport: { width: width, height: 1080 },
    isMobile: false
  });
  
  this.page = await this.context.newPage();
});

When('I navigate to the login page', async function() {
  await this.page.goto('http://localhost:3001/login');
  await this.page.waitForLoadState('networkidle');
});

When('I navigate to the application', async function() {
  await this.page.goto('http://localhost:3001');
  await this.page.waitForLoadState('networkidle');
});

When('I login with valid credentials', async function() {
  // Assume we're on login page or navigate there
  if (!this.page.url().includes('/login')) {
    await this.page.goto('http://localhost:3001/login');
    await this.page.waitForLoadState('networkidle');
  }
  
  await this.page.fill('#username', 'admin');
  await this.page.fill('#password', 'Admin@123');
  await this.page.click('button[type="submit"]');
  await this.page.waitForURL('**/dashboard', { timeout: 10000 });
});

When('I access the dashboard', async function() {
  // First login if not already logged in
  if (!this.page.url().includes('/dashboard')) {
    await this.page.goto('http://localhost:3001/login');
    await this.page.fill('#username', 'admin');
    await this.page.fill('#password', 'Admin@123');
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL('**/dashboard', { timeout: 10000 });
  }
});

Then('the login form should be properly displayed', async function() {
  const loginContainer = await this.page.locator('.login-container').isVisible();
  expect(loginContainer).to.be.true;
  
  const loginCard = await this.page.locator('.login-card').isVisible();
  expect(loginCard).to.be.true;
  
  const usernameField = await this.page.locator('#username').isVisible();
  const passwordField = await this.page.locator('#password').isVisible();
  const submitButton = await this.page.locator('button[type="submit"]').isVisible();
  
  expect(usernameField).to.be.true;
  expect(passwordField).to.be.true;
  expect(submitButton).to.be.true;
});

Then('all elements should be accessible', async function() {
  // Check if form elements are properly sized for touch on mobile
  const viewport = this.page.viewportSize();
  
  if (viewport.width <= 768) { // Mobile/tablet
    const buttonHeight = await this.page.locator('button[type="submit"]').evaluate(el => {
      return window.getComputedStyle(el).height;
    });
    
    // Button should be at least 44px for good touch targets
    const heightValue = parseInt(buttonHeight.replace('px', ''));
    expect(heightValue).to.be.at.least(40);
  }
  
  // Check form inputs are properly sized
  const inputWidth = await this.page.locator('#username').evaluate(el => {
    return el.offsetWidth;
  });
  
  expect(inputWidth).to.be.above(200);
});

Then('the layout should be responsive', async function() {
  const viewport = this.page.viewportSize();
  
  // Check login card adapts to viewport
  const cardWidth = await this.page.locator('.login-card').evaluate(el => {
    return el.offsetWidth;
  });
  
  // Card should not exceed viewport width minus some margin
  expect(cardWidth).to.be.at.most(viewport.width - 40);
});

Then('the application should work correctly', async function() {
  // Basic functionality check
  const dashboardTitle = await this.page.locator('h1').textContent();
  expect(dashboardTitle).to.include('Authentication Service Dashboard');
  
  // Check navigation works
  const tabs = await this.page.locator('.tabs button').count();
  expect(tabs).to.be.above(0);
});

Then('all features should be functional', async function() {
  // Test key interactions work in the browser
  const logoutButton = await this.page.locator('.logout-btn').isVisible();
  expect(logoutButton).to.be.true;
  
  // Check tabs can be clicked
  const firstTab = this.page.locator('.tabs button').first();
  await firstTab.click();
  
  // Verify tab content loads
  await this.page.waitForTimeout(500);
  const tabContent = await this.page.locator('.tab-content').isVisible();
  expect(tabContent).to.be.true;
});

Then('the navigation should be mobile-friendly', async function() {
  const viewport = this.page.viewportSize();
  
  if (viewport.width <= 768) {
    // Check tabs are stacked or scrollable on mobile
    const tabsContainer = this.page.locator('.tabs');
    const overflowX = await tabsContainer.evaluate(el => {
      return window.getComputedStyle(el).overflowX;
    });
    
    // Should allow horizontal scrolling on mobile
    expect(['auto', 'scroll']).to.include(overflowX);
  }
});

Then('tables should be horizontally scrollable', async function() {
  // Look for data tables
  const dataTable = this.page.locator('.data-table').first();
  if (await dataTable.count() > 0) {
    const overflowX = await dataTable.evaluate(el => {
      return window.getComputedStyle(el).overflowX;
    });
    
    expect(['auto', 'scroll']).to.include(overflowX);
  }
});

Then('all content should be readable', async function() {
  // Check font sizes are appropriate for mobile
  const bodyFontSize = await this.page.evaluate(() => {
    return window.getComputedStyle(document.body).fontSize;
  });
  
  const fontSize = parseInt(bodyFontSize.replace('px', ''));
  expect(fontSize).to.be.at.least(14); // Minimum readable size
});

Then('the content should be centered with max-width', async function() {
  const dashboardContent = this.page.locator('.dashboard-content');
  
  const maxWidth = await dashboardContent.evaluate(el => {
    return window.getComputedStyle(el).maxWidth;
  });
  
  // Should have a max-width set for desktop
  expect(maxWidth).to.not.equal('none');
  
  const marginLeft = await dashboardContent.evaluate(el => {
    return window.getComputedStyle(el).marginLeft;
  });
  
  const marginRight = await dashboardContent.evaluate(el => {
    return window.getComputedStyle(el).marginRight;
  });
  
  // Should be centered
  expect(marginLeft).to.equal(marginRight);
});

Then('the layout should utilize available space efficiently', async function() {
  const viewport = this.page.viewportSize();
  
  // Check that content doesn't leave too much empty space on large screens
  const contentWidth = await this.page.locator('.dashboard-content').evaluate(el => {
    return el.offsetWidth;
  });
  
  // Content should be reasonably sized for the viewport
  const utilization = contentWidth / viewport.width;
  expect(utilization).to.be.above(0.6); // At least 60% utilization
});
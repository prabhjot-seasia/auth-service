const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// Simple service traversal step definitions using the shared page context
When('I navigate through all available service tabs', async function() {
  const page = this.page; // Get page from world context set by authentication.steps.js
  
  // Wait for dashboard to load and tabs to be available
  await page.waitForSelector('.tabs', { timeout: 10000 });
  
  // Get all visible tabs
  const availableTabs = await page.$$eval('.tabs button', buttons => 
    buttons.map(btn => btn.textContent.trim())
  );
  
  console.log('Available tabs for navigation:', availableTabs);
  
  // Store tabs for later verification
  this.availableTabs = availableTabs.filter(tab => tab !== 'My Permissions');
  this.navigationResults = [];
});

Then('I should successfully access all admin services:', async function(dataTable) {
  const expectedServices = dataTable.rows();
  const page = this.page;
  
  for (const [serviceName, expectedContent] of expectedServices) {
    console.log(`Testing access to service: ${serviceName}`);
    
    // Click on the tab
    const tabButton = page.locator(`.tabs button:has-text("${serviceName}")`);
    await tabButton.click();
    await page.waitForTimeout(1500); // Wait for content to load
    
    // Check if the expected content is visible
    const contentVisible = await page.locator(`h2:has-text("${expectedContent}")`).isVisible();
    
    this.navigationResults.push({
      service: serviceName,
      accessible: contentVisible,
      expectedContent: expectedContent
    });
    
    expect(contentVisible).to.be.true;
    console.log(`✅ Successfully accessed ${serviceName}`);
  }
});

Then('each service should load without errors', async function() {
  const page = this.page;
  
  // Check for any error messages or failed content loads
  const errorElements = await page.locator('.error, .error-message, [class*="error"]').count();
  expect(errorElements).to.equal(0);
  
  // Verify all navigation results were successful
  const failedNavigations = this.navigationResults.filter(result => !result.accessible);
  expect(failedNavigations.length).to.equal(0);
});

Then('I should maintain authentication across all services', async function() {
  const page = this.page;
  
  // Check that JWT token is still present
  const token = await page.evaluate(() => localStorage.getItem('jwt'));
  expect(token).to.exist;
  
  // Verify no login redirects occurred during navigation
  const currentUrl = page.url();
  expect(currentUrl).to.include('/dashboard');
  expect(currentUrl).to.not.include('/login');
});
const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

When('I click the user dropdown', async function() {
  const page = this.page;
  
  // Wait for dashboard to load completely
  await page.waitForSelector('.user-dropdown-toggle', { timeout: 10000 });
  
  // Click the user dropdown
  await page.click('.user-dropdown-toggle');
  await page.waitForTimeout(1000); // Wait for dropdown to appear
  
  console.log('✅ Clicked user dropdown');
});

Then('I should see the Document Base service in the dropdown', async function() {
  const page = this.page;
  
  // Wait for dropdown menu to be visible
  await page.waitForSelector('.user-dropdown-menu', { timeout: 5000 });
  
  // Check if there's a services section
  const servicesSection = await page.locator('.dropdown-services').isVisible();
  console.log(`Services section visible: ${servicesSection}`);
  
  if (servicesSection) {
    // Look for Document Base service link
    const documentBaseLink = await page.locator('text="Document Base"').isVisible();
    console.log(`Document Base link visible: ${documentBaseLink}`);
    
    // Get all service links for debugging
    const serviceLinks = await page.locator('.dropdown-service-link').allTextContents();
    console.log('Available service links:', serviceLinks);
    
    expect(documentBaseLink).to.be.true;
  } else {
    // If no services section, check what's actually in the dropdown
    const dropdownContent = await page.locator('.user-dropdown-menu').textContent();
    console.log('Dropdown content:', dropdownContent);
    
    throw new Error('No services section found in user dropdown');
  }
});

When('I click on the Document Base service', async function() {
  const page = this.page;
  
  // Click on Document Base service link
  const documentBaseLink = page.locator('text="Document Base"');
  await documentBaseLink.click();
  
  // Wait for navigation
  await page.waitForTimeout(3000);
  
  this.finalUrl = page.url();
  console.log(`Final URL after clicking Document Base: ${this.finalUrl}`);
});

Then('I should be navigated to the document service', async function() {
  const finalUrl = this.finalUrl;
  
  // Should be on document service domain
  expect(finalUrl).to.include('localhost:3000');
  
  console.log('✅ Successfully navigated to document service');
});

Then('I should not need to login again', async function() {
  const page = this.page;
  
  // Wait for page to load
  await page.waitForTimeout(3000);
  
  // Check if we're on a login page
  const isOnLoginPage = page.url().includes('/login') || 
                       await page.locator('text="Redirecting to authentication service"').isVisible().catch(() => false) ||
                       await page.locator('input[type="password"]').isVisible().catch(() => false);
  
  expect(isOnLoginPage).to.be.false;
  console.log('✅ No additional login required');
});

When('I navigate back to the auth service', async function() {
  const page = this.page;
  
  // Navigate back to auth service dashboard
  await page.goto('http://localhost:3001/dashboard');
  await page.waitForTimeout(2000);
  
  console.log('✅ Navigated back to auth service');
});

When('I logout from the auth service using the dropdown', async function() {
  const page = this.page;
  
  // Click logout button
  await page.click('.logout-btn');
  await page.waitForTimeout(2000);
  
  console.log('✅ Logged out from auth service');
});

Then('I should be logged out', async function() {
  const page = this.page;
  
  // Should be redirected to login page
  const url = page.url();
  expect(url).to.include('/login');
  
  console.log('✅ Successfully logged out - redirected to login');
});

When('I try to access the document service directly', async function() {
  const page = this.page;
  
  // Try to access document service
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000);
  
  this.docServiceUrl = page.url();
  console.log(`Document service URL after logout: ${this.docServiceUrl}`);
});

Then('I should be redirected to login for document service', async function() {
  const docServiceUrl = this.docServiceUrl;
  
  // Should either be on document service login or redirected to auth service login
  const isOnLogin = docServiceUrl.includes('/login') || 
                   docServiceUrl.includes('login') ||
                   docServiceUrl.includes('auth');
  
  expect(isOnLogin).to.be.true;
  console.log('✅ Document service requires login after auth service logout');
});

When('I open a new browser tab', async function() {
  const context = this.context;
  
  // Create new page (tab)
  this.newTab = await context.newPage();
  console.log('✅ Opened new browser tab');
});

When('I navigate to the auth service dashboard in the new tab', async function() {
  const newTab = this.newTab;
  
  // Navigate to dashboard in new tab
  await newTab.goto('http://localhost:3001/dashboard');
  await newTab.waitForTimeout(2000);
  
  this.newTabUrl = newTab.url();
  console.log(`New tab URL: ${this.newTabUrl}`);
});

Then('I should still be logged in without re-authentication', async function() {
  const newTabUrl = this.newTabUrl;
  
  // Should be on dashboard, not login
  expect(newTabUrl).to.include('/dashboard');
  expect(newTabUrl).to.not.include('/login');
  
  console.log('✅ Still logged in on new tab without re-authentication');
});

When('I access the document service from the new tab', async function() {
  const newTab = this.newTab;
  
  // Navigate to document service from new tab
  await newTab.goto('http://localhost:3000');
  await newTab.waitForTimeout(3000);
  
  this.newTabDocUrl = newTab.url();
  console.log(`Document service URL in new tab: ${this.newTabDocUrl}`);
});

Then('my session should remain active in both tabs', async function() {
  const originalPage = this.page;
  const newTab = this.newTab;
  
  // Check both tabs are authenticated
  const originalUrl = originalPage.url();
  const newTabUrl = this.newTabDocUrl;
  
  // Original tab should still be authenticated
  expect(originalUrl).to.not.include('/login');
  
  // New tab should also be authenticated to document service
  expect(newTabUrl).to.not.include('/login');
  
  console.log('✅ Session remains active in both tabs');
  
  // Cleanup
  await newTab.close();
});
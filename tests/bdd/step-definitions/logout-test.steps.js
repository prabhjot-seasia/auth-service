const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

When('I click the logout button in dropdown', async function() {
  const page = this.page;
  
  // Click the logout button in dropdown
  await page.click('.dropdown-logout');
  await page.waitForTimeout(2000);
  
  console.log('✅ Clicked logout button in dropdown');
});

Then('I should see logout option in the dropdown', async function() {
  const page = this.page;
  
  // Check if logout button is visible in dropdown
  const logoutButton = await page.locator('.dropdown-logout').isVisible();
  expect(logoutButton).to.be.true;
  
  console.log('✅ Logout option is visible in dropdown');
});

Then('I should not be able to access the dashboard without logging in again', async function() {
  const page = this.page;
  
  // Try to navigate to dashboard directly
  await page.goto('http://localhost:3001/dashboard');
  await page.waitForTimeout(2000);
  
  // Should be redirected to login
  const url = page.url();
  expect(url).to.include('/login');
  
  console.log('✅ Cannot access dashboard without authentication');
});

When('I logout from the original tab', async function() {
  const page = this.page; // original tab
  
  // Click user dropdown
  await page.click('.user-dropdown-toggle');
  await page.waitForTimeout(1000);
  
  // Click logout
  await page.click('.dropdown-logout');
  await page.waitForTimeout(2000);
  
  console.log('✅ Logged out from original tab');
});

When('I refresh the new tab', async function() {
  const newTab = this.newTab;
  
  // Refresh the new tab
  await newTab.reload();
  await newTab.waitForTimeout(2000);
  
  console.log('✅ Refreshed new tab');
});

Then('the new tab should also redirect to login page', async function() {
  const newTab = this.newTab;
  
  // Check if new tab is redirected to login
  const url = newTab.url();
  expect(url).to.include('/login');
  
  console.log('✅ New tab redirected to login page');
  
  // Cleanup
  await newTab.close();
});
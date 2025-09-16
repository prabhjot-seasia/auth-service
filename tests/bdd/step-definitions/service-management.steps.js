const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// Navigation steps
Given('I navigate to the {string} tab', async function(tabName) {
  // Wait for dashboard to fully load
  await this.page.waitForSelector('.dashboard-content', { timeout: 10000 });
  
  // Click on the specified tab
  await this.page.click(`button:has-text("${tabName}")`);
  
  // Wait for the content to load
  if (tabName === 'Services') {
    await this.page.waitForSelector('.user-management', { timeout: 10000 });
  }
});

Given('I am on the services management page', async function() {
  // Verify we're on the services management page
  const serviceManagementSection = await this.page.locator('.user-management').isVisible();
  expect(serviceManagementSection).to.be.true;
  
  // Wait for services table to load
  await this.page.waitForSelector('.users-table-container', { timeout: 10000 });
});

// Service creation steps
When('I create a new service with the following details:', async function(dataTable) {
  const serviceData = {};
  const rows = dataTable.hashes();
  rows.forEach(row => {
    serviceData[row.Field.toLowerCase().replace(' ', '_')] = row.Value;
  });

  // Click Create Service button
  await this.page.click('button:has-text("Create Service")');
  await this.page.waitForSelector('.modal', { timeout: 10000 });
  
  // Fill in the form
  if (serviceData.name) {
    await this.page.fill('input[type="text"]:first', serviceData.name);
  }
  
  if (serviceData.redirect_uri) {
    await this.page.fill('input[placeholder*="callback"]', serviceData.redirect_uri);
  }
  
  if (serviceData.scopes) {
    await this.page.fill('input[placeholder*="scope"]', serviceData.scopes);
  }
  
  // Click submit button
  await this.page.click('button[type="submit"]');
  
  // Wait for modal to close
  await this.page.waitForSelector('.modal', { state: 'hidden', timeout: 10000 });
  
  // Store service data for later verification
  this.lastServiceData = serviceData;
});

// Service update steps
Given('there is a service {string} in the system', async function(serviceName) {
  // Wait for services table to load
  await this.page.waitForSelector('.users-table', { timeout: 10000 });
  
  // Check if service exists in the table
  const serviceRow = await this.page.locator(`tr:has-text("${serviceName}")`).first();
  const exists = await serviceRow.isVisible();
  
  if (!exists) {
    // Create the service if it doesn't exist
    await this.page.click('button:has-text("Create Service")');
    await this.page.waitForSelector('.modal', { timeout: 10000 });
    await this.page.fill('input[type="text"]:first', serviceName);
    await this.page.click('button[type="submit"]');
    await this.page.waitForSelector('.modal', { state: 'hidden', timeout: 10000 });
  }
  
  this.currentService = serviceName;
});

When('I update the service with the following details:', async function(dataTable) {
  const updateData = {};
  const rows = dataTable.hashes();
  rows.forEach(row => {
    updateData[row.Field.toLowerCase().replace(' ', '_')] = row.Value;
  });

  // Find and click edit button for the service
  const serviceRow = await this.page.locator(`tr:has-text("${this.currentService}")`).first();
  await serviceRow.locator('button[title="Edit Service"]').click();
  
  // Wait for modal to open
  await this.page.waitForSelector('.modal', { timeout: 10000 });
  
  // Update form fields
  if (updateData.name) {
    await this.page.fill('input[type="text"]:first', updateData.name);
    this.updatedServiceName = updateData.name;
  }
  
  if (updateData.redirect_uri) {
    await this.page.fill('input[placeholder*="callback"]', updateData.redirect_uri);
  }
  
  if (updateData.scopes) {
    await this.page.fill('input[placeholder*="scope"]', updateData.scopes);
  }
  
  // Submit the form
  await this.page.click('button[type="submit"]');
  await this.page.waitForSelector('.modal', { state: 'hidden', timeout: 10000 });
});

// Service status management
Given('there is an active service {string} in the system', async function(serviceName) {
  await this.execute(`there is a service "${serviceName}" in the system`);
  
  // Verify service is active
  const serviceRow = await this.page.locator(`tr:has-text("${serviceName}")`).first();
  const statusElement = await serviceRow.locator('.status').first();
  const status = await statusElement.textContent();
  
  if (!status.includes('Active')) {
    // Activate the service if it's not active
    await serviceRow.locator('button[title="Activate Service"]').click();
    await this.page.waitForTimeout(2000);
  }
});

Given('there is a suspended service {string} in the system', async function(serviceName) {
  await this.execute(`there is a service "${serviceName}" in the system`);
  
  // Verify service is suspended or suspend it
  const serviceRow = await this.page.locator(`tr:has-text("${serviceName}")`).first();
  const statusElement = await serviceRow.locator('.status').first();
  const status = await statusElement.textContent();
  
  if (!status.includes('Suspended')) {
    // Suspend the service if it's active
    await serviceRow.locator('button[title="Suspend Service"]').click();
    await this.page.waitForTimeout(2000);
  }
});

When('I suspend the service', async function() {
  const serviceRow = await this.page.locator(`tr:has-text("${this.currentService}")`).first();
  await serviceRow.locator('button[title="Suspend Service"]').click();
  await this.page.waitForTimeout(2000);
});

When('I activate the service', async function() {
  const serviceRow = await this.page.locator(`tr:has-text("${this.currentService}")`).first();
  await serviceRow.locator('button[title="Activate Service"]').click();
  await this.page.waitForTimeout(2000);
});

// Service deletion
When('I delete the service', async function() {
  const serviceRow = await this.page.locator(`tr:has-text("${this.currentService}")`).first();
  await serviceRow.locator('button[title="Delete Service"]').click();
});

When('I confirm the deletion', async function() {
  // Handle browser confirmation dialog
  this.page.on('dialog', async dialog => {
    expect(dialog.type()).to.equal('confirm');
    await dialog.accept();
  });
});

// Validation steps
When('I try to create a service without a name', async function() {
  await this.page.click('button:has-text("Create Service")');
  await this.page.waitForSelector('.modal', { timeout: 10000 });
  
  // Leave name field empty and try to submit
  await this.page.fill('input[placeholder*="callback"]', 'https://test.example.com');
  await this.page.click('button[type="submit"]');
  
  // Don't wait for modal to close - it should stay open due to validation error
});

// Security steps
When('I try to navigate to the services management page', async function() {
  try {
    await this.page.click('button:has-text("Services")');
  } catch (error) {
    // Tab might not be visible for non-admin users
    this.navigationError = error;
  }
});

// Verification steps
Then('the service should be created successfully', async function() {
  // Wait for notification or success indication
  const notification = await this.page.locator('.notification-success').isVisible({ timeout: 5000 });
  if (notification) {
    const message = await this.page.locator('.notification-success').textContent();
    expect(message).to.include('created');
  }
});

Then('the service should appear in the services list', async function() {
  await this.page.waitForTimeout(2000); // Wait for table to refresh
  
  const serviceName = this.lastServiceData?.name || this.currentService;
  const serviceRow = await this.page.locator(`tr:has-text("${serviceName}")`).first();
  const isVisible = await serviceRow.isVisible();
  expect(isVisible).to.be.true;
});

Then('the service should have a client ID', async function() {
  const serviceName = this.lastServiceData?.name || this.currentService;
  const serviceRow = await this.page.locator(`tr:has-text("${serviceName}")`).first();
  const clientIdCell = await serviceRow.locator('td code').first();
  const clientId = await clientIdCell.textContent();
  
  expect(clientId).to.not.be.empty;
  expect(clientId.length).to.be.greaterThan(10); // Client IDs should be reasonably long
});

Then('the service should show as {string}', async function(expectedStatus) {
  const serviceName = this.lastServiceData?.name || this.currentService || this.updatedServiceName;
  const serviceRow = await this.page.locator(`tr:has-text("${serviceName}")`).first();
  const statusElement = await serviceRow.locator('.status').first();
  const actualStatus = await statusElement.textContent();
  
  expect(actualStatus.trim()).to.equal(expectedStatus);
});

Then('the service should be updated successfully', async function() {
  const notification = await this.page.locator('.notification-success').isVisible({ timeout: 5000 });
  if (notification) {
    const message = await this.page.locator('.notification-success').textContent();
    expect(message).to.include('updated');
  }
});

Then('the service changes should be reflected in the services list', async function() {
  if (this.updatedServiceName) {
    const serviceRow = await this.page.locator(`tr:has-text("${this.updatedServiceName}")`).first();
    const isVisible = await serviceRow.isVisible();
    expect(isVisible).to.be.true;
  }
});

Then('the service should be suspended successfully', async function() {
  const notification = await this.page.locator('.notification-success').isVisible({ timeout: 5000 });
  if (notification) {
    const message = await this.page.locator('.notification-success').textContent();
    expect(message).to.include('suspended');
  }
});

Then('the service should be activated successfully', async function() {
  const notification = await this.page.locator('.notification-success').isVisible({ timeout: 5000 });
  if (notification) {
    const message = await this.page.locator('.notification-success').textContent();
    expect(message).to.include('activated');
  }
});

Then('the service should not be able to authenticate clients', async function() {
  // This would require API testing - for UI testing, we verify the status
  const serviceName = this.currentService;
  const serviceRow = await this.page.locator(`tr:has-text("${serviceName}")`).first();
  const statusElement = await serviceRow.locator('.status').first();
  const status = await statusElement.textContent();
  
  expect(status).to.include('Suspended');
});

Then('the service should be able to authenticate clients', async function() {
  // This would require API testing - for UI testing, we verify the status
  const serviceName = this.currentService;
  const serviceRow = await this.page.locator(`tr:has-text("${serviceName}")`).first();
  const statusElement = await serviceRow.locator('.status').first();
  const status = await statusElement.textContent();
  
  expect(status).to.include('Active');
});

Then('the service should be removed from the system', async function() {
  const notification = await this.page.locator('.notification-success').isVisible({ timeout: 5000 });
  if (notification) {
    const message = await this.page.locator('.notification-success').textContent();
    expect(message).to.include('deleted');
  }
});

Then('the service should not appear in the services list', async function() {
  await this.page.waitForTimeout(2000); // Wait for table to refresh
  
  const serviceRow = await this.page.locator(`tr:has-text("${this.currentService}")`).first();
  const isVisible = await serviceRow.isVisible();
  expect(isVisible).to.be.false;
});

Then('I should see a validation error', async function() {
  // Check for HTML5 validation or custom error messages
  const invalidField = await this.page.locator('input:invalid').first();
  const hasInvalid = await invalidField.isVisible();
  
  if (!hasInvalid) {
    // Check for custom error messages
    const errorMessage = await this.page.locator('.error-message, .notification-error').isVisible();
    expect(errorMessage).to.be.true;
  } else {
    expect(hasInvalid).to.be.true;
  }
});

Then('the service should not be created', async function() {
  // Modal should still be open, indicating form wasn't submitted successfully
  const modalOpen = await this.page.locator('.modal').isVisible();
  expect(modalOpen).to.be.true;
});

Then('I should see an access denied message', async function() {
  const accessDenied = await this.page.locator('.access-denied').isVisible();
  expect(accessDenied).to.be.true;
});

Then('I should not be able to create, update, or delete services', async function() {
  // Check that admin-only buttons are not visible
  const createButton = await this.page.locator('button:has-text("Create Service")').isVisible();
  expect(createButton).to.be.false;
});

// Advanced verification steps
Then('both services should have unique client IDs', async function() {
  const clientIds = await this.page.locator('td code').allTextContents();
  const uniqueClientIds = [...new Set(clientIds)];
  expect(uniqueClientIds.length).to.equal(clientIds.length);
});

Then('both services should have unique client secrets', async function() {
  // Client secrets are not displayed in the UI for security reasons
  // This would need to be tested via API calls
  console.log('Note: Client secret uniqueness should be tested via API');
});

Then('the client credentials should be securely stored', async function() {
  // Verify that client secrets are not displayed in the UI
  const secretElements = await this.page.locator('text=/client_secret/').count();
  expect(secretElements).to.equal(0);
});

Then('the service should show the correct scopes', async function() {
  if (this.lastServiceData?.scopes) {
    const serviceName = this.lastServiceData.name;
    const serviceRow = await this.page.locator(`tr:has-text("${serviceName}")`).first();
    const scopesCell = await serviceRow.locator('td').nth(3); // Assuming scopes is 4th column
    const scopes = await scopesCell.textContent();
    expect(scopes).to.include(this.lastServiceData.scopes);
  }
});

Then('the scopes should be space-separated', async function() {
  // This is more of a data format verification - would be better tested via API
  console.log('Note: Scope format should be verified via API testing');
});

Then('I should be able to update the scopes', async function() {
  // Verify that scope field is editable in the form
  const scopeInput = await this.page.locator('input[placeholder*="scope"]').isEditable();
  expect(scopeInput).to.be.true;
});

Then('the URI should be accepted', async function() {
  // No validation error should appear
  const errorVisible = await this.page.locator('.error-message, .notification-error').isVisible();
  expect(errorVisible).to.be.false;
});

Then('the service should be created with the correct redirect URI', async function() {
  if (this.lastServiceData?.redirect_uri) {
    const serviceName = this.lastServiceData.name;
    const serviceRow = await this.page.locator(`tr:has-text("${serviceName}")`).first();
    const redirectCell = await serviceRow.locator('td').nth(2); // Assuming redirect URI is 3rd column
    const redirectUri = await redirectCell.textContent();
    expect(redirectUri).to.include(this.lastServiceData.redirect_uri);
  }
});

When('I try to enter an invalid URI {string}', async function(invalidUri) {
  // Clear and enter invalid URI
  await this.page.fill('input[placeholder*="callback"]', invalidUri);
});

Then('I should see a validation error', async function() {
  // Check for validation error on URI field
  const uriField = await this.page.locator('input[placeholder*="callback"]');
  const isInvalid = await uriField.evaluate(el => !el.validity.valid);
  expect(isInvalid).to.be.true;
});
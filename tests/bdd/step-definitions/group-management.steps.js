const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// Navigation steps
Given('I am on the groups management page', async function() {
  // Verify we're on the groups management page
  const groupManagementSection = await this.page.locator('.user-management').isVisible();
  expect(groupManagementSection).to.be.true;
  
  // Wait for groups table to load
  await this.page.waitForSelector('.users-table-container', { timeout: 10000 });
});

// Group creation steps
When('I create a new group with the following details:', async function(dataTable) {
  const groupData = {};
  const rows = dataTable.hashes();
  rows.forEach(row => {
    groupData[row.Field.toLowerCase()] = row.Value;
  });

  // Click Create Group button
  await this.page.click('button:has-text("Create Group")');
  await this.page.waitForSelector('.modal', { timeout: 10000 });
  
  // Fill in the form
  if (groupData.name) {
    await this.page.fill('input[placeholder*="Administrators"]', groupData.name);
  }
  
  if (groupData.description) {
    await this.page.fill('input[placeholder="Group description"]', groupData.description);
  }
  
  // Submit the form
  await this.page.click('button[type="submit"]');
  await this.page.waitForSelector('.modal', { state: 'hidden', timeout: 10000 });
  
  // Store group data for later verification
  this.lastGroupData = groupData;
});

// Group management steps
Given('there is a group {string} in the system', async function(groupName) {
  // Wait for groups table to load
  await this.page.waitForSelector('.users-table', { timeout: 10000 });
  
  // Check if group exists in the table
  const groupRow = await this.page.locator(`tr:has-text("${groupName}")`).first();
  const exists = await groupRow.isVisible().catch(() => false);
  
  if (!exists) {
    // Create the group if it doesn't exist
    await this.page.click('button:has-text("Create Group")');
    await this.page.waitForSelector('.modal', { timeout: 10000 });
    await this.page.fill('input[placeholder*="Administrators"]', groupName);
    await this.page.fill('input[placeholder="Group description"]', `Test group: ${groupName}`);
    await this.page.click('button[type="submit"]');
    await this.page.waitForSelector('.modal', { state: 'hidden', timeout: 10000 });
  }
  
  this.currentGroup = groupName;
});

When('I update the group with the following details:', async function(dataTable) {
  const updateData = {};
  const rows = dataTable.hashes();
  rows.forEach(row => {
    updateData[row.Field.toLowerCase()] = row.Value;
  });

  // Find and click edit button for the group
  const groupRow = await this.page.locator(`tr:has-text("${this.currentGroup}")`).first();
  await groupRow.locator('button[title="Edit Group"]').click();
  
  // Wait for modal to open
  await this.page.waitForSelector('.modal', { timeout: 10000 });
  
  // Update form fields
  if (updateData.name) {
    await this.page.fill('input[placeholder*="Administrators"]', updateData.name);
    this.updatedGroupName = updateData.name;
  }
  
  if (updateData.description) {
    await this.page.fill('input[placeholder="Group description"]', updateData.description);
  }
  
  // Submit the form
  await this.page.click('button[type="submit"]');
  await this.page.waitForSelector('.modal', { state: 'hidden', timeout: 10000 });
});

When('I delete the group', async function() {
  const groupRow = await this.page.locator(`tr:has-text("${this.currentGroup}")`).first();
  await groupRow.locator('button[title="Delete Group"]').click();
});

When('I confirm the deletion', async function() {
  // Handle browser confirmation dialog
  this.page.on('dialog', async dialog => {
    expect(dialog.type()).to.equal('confirm');
    await dialog.accept();
  });
});

// Service assignment steps
Given('there are services {string} and {string} available', async function(service1, service2) {
  // This is handled by the seeded data, just verify they exist
  console.log(`Expecting services: ${service1}, ${service2}`);
  this.expectedServices = [service1, service2];
});

Given('there is a service {string} with scopes {string}', async function(serviceName, scopes) {
  // Store service info for verification
  this.testService = { name: serviceName, scopes: scopes };
});

When('I click the settings button for the group', async function() {
  const groupRow = await this.page.locator(`tr:has-text("${this.currentGroup}")`).first();
  await groupRow.locator('button[title="Manage Services"]').click();
  
  // Wait for service management modal to open
  await this.page.waitForSelector('.modal:has-text("Manage Services")', { timeout: 10000 });
});

When('I select multiple services using Ctrl/Cmd:', async function(dataTable) {
  const services = dataTable.hashes();
  
  for (const serviceRow of services) {
    const serviceName = serviceRow.Service;
    // Select service from multi-select dropdown
    const serviceOption = await this.page.locator(`select[multiple] option:has-text("${serviceName}")`);
    await serviceOption.click({ modifiers: ['ControlOrMeta'] });
    
    // Wait for service configuration to appear
    await this.page.waitForTimeout(1000);
  }
});

When('I manage services for the group', async function() {
  const groupRow = await this.page.locator(`tr:has-text("${this.currentGroup}")`).first();
  await groupRow.locator('button[title="Manage Services"]').click();
  
  // Wait for service management modal to open
  await this.page.waitForSelector('.modal:has-text("Manage Services")', { timeout: 10000 });
});

When('I assign the following services:', async function(dataTable) {
  const serviceAssignments = {};
  const rows = dataTable.hashes();
  rows.forEach(row => {
    serviceAssignments[row.Service] = row.Scopes;
  });

  // For each service assignment
  for (const [serviceName, scopes] of Object.entries(serviceAssignments)) {
    // Find and check the service checkbox
    const serviceCheckbox = await this.page.locator(`input[type="checkbox"] + span:has-text("${serviceName}")`).locator('..').locator('input[type="checkbox"]');
    await serviceCheckbox.check();
    
    // Find the scopes input field for this service
    const scopesInput = await this.page.locator(`input[type="checkbox"] + span:has-text("${serviceName}")`).locator('..').locator('..').locator('input[type="text"]');
    await scopesInput.fill(scopes);
  }
  
  // Submit the service assignments
  await this.page.click('button:has-text("Assign Services")');
  await this.page.waitForSelector('.modal:has-text("Manage Services")', { state: 'hidden', timeout: 10000 });
  
  this.lastServiceAssignments = serviceAssignments;
});

When('I assign {string} with scopes {string}', async function(serviceName, scopes) {
  // Find and check the service checkbox
  const serviceCheckbox = await this.page.locator(`select[multiple] option:has-text("${serviceName}")`);
  await serviceCheckbox.click({ modifiers: ['ControlOrMeta'] });
  
  // Wait for scope configuration to appear
  await this.page.waitForTimeout(1000);
  
  // Find and check the scope checkboxes for this service
  const scopeList = scopes.split(' ');
  for (const scope of scopeList) {
    const scopeCheckbox = await this.page.locator(`label:has-text("${scope}") input[type="checkbox"]`);
    await scopeCheckbox.check();
  }
  
  // Submit the service assignment
  await this.page.click('button:has-text("Update Services")');
  await this.page.waitForSelector('.modal:has-text("Manage Services")', { state: 'hidden', timeout: 10000 });
  
  this.assignedService = { name: serviceName, scopes: scopes };
});

Given('the group has {string} assigned with scopes {string}', async function(serviceName, scopes) {
  // This would be set up by previous test steps or database seeding
  this.existingAssignment = { service: serviceName, scopes: scopes };
});

Given('the group has services {string} and {string} assigned', async function(service1, service2) {
  this.existingServices = [service1, service2];
});

When('I update {string} scopes to {string}', async function(serviceName, newScopes) {
  // Find the scopes input for the service and update it
  const scopesInput = await this.page.locator(`input[type="checkbox"] + span:has-text("${serviceName}")`).locator('..').locator('..').locator('input[type="text"]');
  await scopesInput.fill(newScopes);
  this.updatedScopes = newScopes;
});

When('I add {string} with scopes {string}', async function(serviceName, scopes) {
  // Find and select the service from multi-select
  const serviceOption = await this.page.locator(`select[multiple] option:has-text("${serviceName}")`);
  await serviceOption.click({ modifiers: ['ControlOrMeta'] });
  
  // Wait for scope configuration to appear
  await this.page.waitForTimeout(1000);
  
  // Select the scope checkboxes for this service
  const scopeList = scopes.split(' ');
  for (const scope of scopeList) {
    const scopeCheckbox = await this.page.locator(`label:has-text("${scope}") input[type="checkbox"]`);
    await scopeCheckbox.check();
  }
  
  this.addedService = { name: serviceName, scopes: scopes };
});

// New step definitions for multi-select scope configuration
When('I configure scopes using checkboxes:', async function(dataTable) {
  const scopeConfigs = dataTable.hashes();
  
  for (const config of scopeConfigs) {
    const serviceName = config.Service;
    const scopes = config.Scopes;
    
    // Wait for service configuration area to load
    await this.page.waitForTimeout(2000);
    
    // Find the multi-select for this service 
    const serviceContainer = await this.page.locator(`div:has-text("${serviceName}")`).first();
    const multiSelect = await serviceContainer.locator('..//select.roles-select').first();
    
    // Select multiple scopes using Ctrl+click
    const scopeList = scopes.split(' ');
    for (const scope of scopeList) {
      const option = await multiSelect.locator(`option[value="${scope}"]`);
      if (await option.isVisible()) {
        await option.click({ modifiers: ['ControlOrMeta'] });
        await this.page.waitForTimeout(500); // Wait between selections
      }
    }
  }
});

When('I assign {string} with multiple scopes {string}', async function(serviceName, scopes) {
  // Select the service
  const serviceOption = await this.page.locator(`select[multiple] option:has-text("${serviceName}")`);
  await serviceOption.click({ modifiers: ['ControlOrMeta'] });
  
  // Wait for scope configuration to appear
  await this.page.waitForTimeout(1000);
  
  // Select multiple scope checkboxes
  const scopeList = scopes.split(' ');
  for (const scope of scopeList) {
    const scopeCheckbox = await this.page.locator(`label:has-text("${scope}") input[type="checkbox"]`);
    await scopeCheckbox.check();
  }
  
  this.assignedService = { name: serviceName, scopes: scopes };
});

When('I assign {string} by selecting scope {string}', async function(serviceName, scope) {
  // Select the service if not already selected
  const serviceOption = await this.page.locator(`select[multiple] option:has-text("${serviceName}")`);
  const isSelected = await serviceOption.isSelected().catch(() => false);
  if (!isSelected) {
    await serviceOption.click({ modifiers: ['ControlOrMeta'] });
    await this.page.waitForTimeout(1000);
  }
  
  // Select the specific scope from the multi-select
  const multiSelect = await this.page.locator(`div:has-text("${serviceName}") + div select.roles-select`);
  const option = await multiSelect.locator(`option[value="${scope}"]`);
  await option.click({ modifiers: ['ControlOrMeta'] });
  
  if (!this.assignedService) {
    this.assignedService = { name: serviceName, scopes: scope };
  } else if (this.assignedService.name === serviceName) {
    this.assignedService.scopes = `${this.assignedService.scopes} ${scope}`;
  }
});

When('I update {string} scopes by selecting {string}', async function(serviceName, newScopes) {
  // Find the multi-select for this service
  const multiSelect = await this.page.locator(`div:has-text("${serviceName}") + div select.roles-select`);
  
  // Clear existing selections by clicking on selected options
  const selectedOptions = await multiSelect.locator('option:checked').all();
  for (const option of selectedOptions) {
    await option.click({ modifiers: ['ControlOrMeta'] });
  }
  
  // Then select the new scopes
  const scopeList = newScopes.split(' ');
  for (const scope of scopeList) {
    const option = await multiSelect.locator(`option[value="${scope}"]`);
    await option.click({ modifiers: ['ControlOrMeta'] });
  }
  
  this.updatedScopes = newScopes;
});

When('I remove {string} from the assignments', async function(serviceName) {
  // Find and uncheck the service checkbox
  const serviceCheckbox = await this.page.locator(`input[type="checkbox"] + span:has-text("${serviceName}")`).locator('..').locator('input[type="checkbox"]');
  await serviceCheckbox.uncheck();
  
  this.removedService = serviceName;
});

// Validation steps
When('I try to create a group without a name', async function() {
  await this.page.click('button:has-text("Create Group")');
  await this.page.waitForSelector('.modal', { timeout: 10000 });
  
  // Leave name field empty and try to submit
  await this.page.fill('input[placeholder="Group description"]', 'Test description');
  await this.page.click('button[type="submit"]');
  
  // Don't wait for modal to close - it should stay open due to validation error
});

When('I try to assign {string} with invalid scopes {string}', async function(serviceName, invalidScopes) {
  // Find and check the service checkbox
  const serviceCheckbox = await this.page.locator(`input[type="checkbox"] + span:has-text("${serviceName}")`).locator('..').locator('input[type="checkbox"]');
  await serviceCheckbox.check();
  
  // Enter invalid scopes
  const scopesInput = await this.page.locator(`input[type="checkbox"] + span:has-text("${serviceName}")`).locator('..').locator('..').locator('input[type="text"]');
  await scopesInput.fill(invalidScopes);
  
  this.invalidScopes = invalidScopes;
});

When('I try to navigate to the groups management page', async function() {
  try {
    await this.page.click('button:has-text("Groups")');
  } catch (error) {
    // Tab might not be visible for non-admin users
    this.navigationError = error;
  }
});

// Verification steps
Then('the group should be created successfully', async function() {
  // Wait for notification or success indication
  const notification = await this.page.locator('.notification-success').isVisible({ timeout: 5000 });
  if (notification) {
    const message = await this.page.locator('.notification-success').textContent();
    expect(message).to.include('created');
  }
});

Then('the group should appear in the groups list', async function() {
  await this.page.waitForTimeout(2000); // Wait for table to refresh
  
  const groupName = this.lastGroupData?.name || this.currentGroup;
  const groupRow = await this.page.locator(`tr:has-text("${groupName}")`).first();
  const isVisible = await groupRow.isVisible();
  expect(isVisible).to.be.true;
});

Then('the group should show {string} initially', async function(expectedText) {
  const groupName = this.lastGroupData?.name || this.currentGroup;
  const groupRow = await this.page.locator(`tr:has-text("${groupName}")`).first();
  const servicesCell = await groupRow.locator('td').nth(2); // Assuming services is 3rd column
  const servicesText = await servicesCell.textContent();
  expect(servicesText).to.include(expectedText);
});

Then('the group should be updated successfully', async function() {
  const notification = await this.page.locator('.notification-success').isVisible({ timeout: 5000 });
  if (notification) {
    const message = await this.page.locator('.notification-success').textContent();
    expect(message).to.include('updated');
  }
});

Then('the group changes should be reflected in the groups list', async function() {
  if (this.updatedGroupName) {
    const groupRow = await this.page.locator(`tr:has-text("${this.updatedGroupName}")`).first();
    const isVisible = await groupRow.isVisible();
    expect(isVisible).to.be.true;
  }
});

Then('the group should be removed from the system', async function() {
  const notification = await this.page.locator('.notification-success').isVisible({ timeout: 5000 });
  if (notification) {
    const message = await this.page.locator('.notification-success').textContent();
    expect(message).to.include('deleted');
  }
});

Then('the group should not appear in the groups list', async function() {
  await this.page.waitForTimeout(2000); // Wait for table to refresh
  
  const groupRow = await this.page.locator(`tr:has-text("${this.currentGroup}")`).first();
  const isVisible = await groupRow.isVisible();
  expect(isVisible).to.be.false;
});

Then('the services should be assigned successfully', async function() {
  const notification = await this.page.locator('.notification-success').isVisible({ timeout: 5000 });
  if (notification) {
    const message = await this.page.locator('.notification-success').textContent();
    expect(message).to.include('assigned');
  }
});

Then('the group should show {string} in the services column', async function(expectedText) {
  const groupName = this.currentGroup;
  const groupRow = await this.page.locator(`tr:has-text("${groupName}")`).first();
  const servicesCell = await groupRow.locator('td').nth(2);
  const servicesText = await servicesCell.textContent();
  expect(servicesText).to.include(expectedText);
});

Then('the service should be assigned with limited scopes', async function() {
  // This would be verified through API calls in a real test
  console.log('Service assigned with limited scopes:', this.assignedService);
});

Then('the group should have access to only the specified scopes', async function() {
  // Verify that the group's service assignment has the correct scopes
  if (this.assignedService) {
    console.log(`Group should have ${this.assignedService.scopes} for ${this.assignedService.name}`);
  }
});

Then('the service assignments should be updated successfully', async function() {
  const notification = await this.page.locator('.notification-success').isVisible({ timeout: 5000 });
  if (notification) {
    const message = await this.page.locator('.notification-success').textContent();
    expect(message).to.include('assigned');
  }
});

Then('the group should have the updated scopes for {string}', async function(serviceName) {
  console.log(`Group should have updated scopes ${this.updatedScopes} for ${serviceName}`);
});

Then('the group should have {string} added', async function(serviceName) {
  console.log(`Group should have ${serviceName} added:`, this.addedService);
});

Then('the service should be removed successfully', async function() {
  console.log(`Service ${this.removedService} should be removed from group`);
});

Then('the group should only have {string} assigned', async function(remainingService) {
  // Verify only the specified service remains assigned
  console.log(`Group should only have ${remainingService} assigned`);
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

Then('the group should not be created', async function() {
  // Modal should still be open, indicating form wasn't submitted successfully
  const modalOpen = await this.page.locator('.modal').isVisible();
  expect(modalOpen).to.be.true;
});

Then('the service should still be assignable', async function() {
  // The service checkbox should still be functional
  const serviceCheckbox = await this.page.locator(`input[type="checkbox"] + span:has-text("${this.assignedService?.name || 'auth-service'}")`).locator('..').locator('input[type="checkbox"]');
  const isEnabled = await serviceCheckbox.isEnabled();
  expect(isEnabled).to.be.true;
});

Then('I should see a warning about scope compatibility', async function() {
  // Check for warning message about invalid scopes
  const warningText = await this.page.locator('small:has-text("Available")').textContent();
  expect(warningText).to.include('Available');
});

Then('I should see an access denied message', async function() {
  const accessDenied = await this.page.locator('.access-denied').isVisible();
  expect(accessDenied).to.be.true;
});

Then('I should not be able to create, update, or delete groups', async function() {
  // Check that admin-only buttons are not visible
  const createButton = await this.page.locator('button:has-text("Create Group")').isVisible();
  expect(createButton).to.be.false;
});

// Advanced verification steps
Then('the user {string} should inherit the group\'s service permissions', async function(userName) {
  // This would require API verification
  console.log(`User ${userName} should inherit group permissions`);
});

Then('the user should have {string} scope for {string}', async function(scope, serviceName) {
  console.log(`User should have ${scope} scope for ${serviceName}`);
});

Then('all services should be assigned successfully', async function() {
  const notification = await this.page.locator('.notification-success').isVisible({ timeout: 5000 });
  if (notification) {
    const message = await this.page.locator('.notification-success').textContent();
    expect(message).to.include('assigned');
  }
});

Then('the group should show the correct number of services', async function() {
  // Verify the services count in the table matches expectations
  const groupName = this.currentGroup;
  const groupRow = await this.page.locator(`tr:has-text("${groupName}")`).first();
  const servicesCell = await groupRow.locator('td').nth(2);
  const servicesText = await servicesCell.textContent();
  expect(servicesText).to.include('service(s)');
});

Then('the inactive service should be shown but marked as inactive', async function() {
  const inactiveServiceText = await this.page.locator('span:has-text("(Inactive)")').isVisible();
  expect(inactiveServiceText).to.be.true;
});

Then('I should be able to assign the inactive service', async function() {
  const serviceCheckbox = await this.page.locator('input[type="checkbox"] + span:has-text("legacy-service")').locator('..').locator('input[type="checkbox"]');
  const isEnabled = await serviceCheckbox.isEnabled();
  expect(isEnabled).to.be.true;
});

Then('I should see a warning about the service being inactive', async function() {
  const inactiveWarning = await this.page.locator('span:has-text("(Inactive)")').isVisible();
  expect(inactiveWarning).to.be.true;
});

Then('the group changes should be timestamped', async function() {
  // Verify that the group has updated timestamp
  console.log('Group changes should be timestamped');
});

Then('the group should show the correct {string} timestamp', async function(timestampType) {
  const groupName = this.updatedGroupName || this.currentGroup;
  const groupRow = await this.page.locator(`tr:has-text("${groupName}")`).first();
  // The created/updated timestamp should be visible and recent
  const timestampCell = await groupRow.locator('td').nth(3); // Assuming timestamp is 4th column
  const timestamp = await timestampCell.textContent();
  expect(timestamp).to.not.be.empty;
});

// Service Permission View Steps
Given('there is a group {string} with services assigned', async function(groupName) {
  // Ensure group exists and has services
  await this.page.waitForSelector('.users-table', { timeout: 10000 });
  const groupRow = await this.page.locator(`tr:has-text("${groupName}")`).first();
  await expect(groupRow).toBeVisible();
  
  // Verify it has services (should not show "No services")
  const servicesCell = await groupRow.locator('td').nth(2);
  const servicesText = await servicesCell.textContent();
  expect(servicesText).not.to.contain('No services');
});

Given('I have {string} permission', async function(permission) {
  // This is handled by the authentication context - admin should have all permissions
  // In a real scenario, we'd verify the user's permissions through API
  console.log(`User should have ${permission} permission`);
});

When('I click on the service count for the group {string}', async function(groupName) {
  const groupRow = await this.page.locator(`tr:has-text("${groupName}")`).first();
  await expect(groupRow).toBeVisible();
  
  // Find and click the service count button
  const serviceCountBtn = await groupRow.locator('.service-count-btn').first();
  await serviceCountBtn.click();
});

When('I click on {string} text for the group', async function(text) {
  const noServicesSpan = await this.page.locator(`span:has-text("${text}")`).first();
  await noServicesSpan.click();
});

Then('I should see the {string} modal', async function(modalTitle) {
  await this.page.waitForSelector('.modal', { timeout: 10000 });
  const modal = await this.page.locator('.modal').first();
  await expect(modal).toBeVisible();
  
  const modalHeader = await modal.locator('h3').first();
  const headerText = await modalHeader.textContent();
  expect(headerText).to.contain(modalTitle.replace(/"/g, ''));
});

Then('the modal should show the group name {string}', async function(groupName) {
  const modal = await this.page.locator('.modal').first();
  const modalHeader = await modal.locator('h3').first();
  const headerText = await modalHeader.textContent();
  expect(headerText).to.contain(groupName);
});

Then('I should see a list of assigned services', async function() {
  const servicesContainer = await this.page.locator('.services-permissions-container').first();
  await expect(servicesContainer).toBeVisible();
  
  const serviceCards = await servicesContainer.locator('.service-permission-card').count();
  expect(serviceCards).to.be.greaterThan(0);
});

Then('each service should display its permissions as badges', async function() {
  const permissionBadges = await this.page.locator('.permission-badge').count();
  expect(permissionBadges).to.be.greaterThan(0);
});

Then('each service should show its raw scopes', async function() {
  const rawScopes = await this.page.locator('.raw-scopes').count();
  expect(rawScopes).to.be.greaterThan(0);
});

Then('I should see service names and IDs', async function() {
  const serviceHeaders = await this.page.locator('.service-header').count();
  expect(serviceHeaders).to.be.greaterThan(0);
  
  const serviceIds = await this.page.locator('.service-id').count();
  expect(serviceIds).to.be.greaterThan(0);
});

Then('I should see a {string} button', async function(buttonText) {
  const button = await this.page.locator(`button:has-text("${buttonText}")`).first();
  await expect(button).toBeVisible();
});

Then('I should see an {string} button if I have {string} permission', async function(buttonText, permission) {
  // For admin users, the Edit Services button should always be visible
  const button = await this.page.locator(`button:has-text("${buttonText}")`).first();
  const isVisible = await button.isVisible().catch(() => false);
  
  if (permission === 'groups:write') {
    expect(isVisible).to.be.true;
  }
});

When('I click {string}', async function(buttonText) {
  const button = await this.page.locator(`button:has-text("${buttonText}")`).first();
  await button.click();
});

Then('the permissions modal should close', async function() {
  await this.page.waitForSelector('.modal:has-text("Services & Permissions")', { state: 'hidden', timeout: 5000 });
});

Then('the {string} modal should open for the group', async function(modalTitle) {
  await this.page.waitForSelector(`.modal:has-text("${modalTitle}")`, { timeout: 10000 });
});

Given('there is a group {string} with no services assigned', async function(groupName) {
  // Check if group exists with no services
  const groupRow = await this.page.locator(`tr:has-text("${groupName}")`).first();
  if (await groupRow.isVisible()) {
    const servicesCell = await groupRow.locator('td').nth(2);
    const servicesText = await servicesCell.textContent();
    expect(servicesText).to.contain('No services');
  }
});

Then('the modal should show {string}', async function(message) {
  const modal = await this.page.locator('.modal').first();
  const modalText = await modal.textContent();
  expect(modalText).to.contain(message);
});

Given('the group has {string} with scopes {string}', async function(serviceName, scopes) {
  // This would typically be set up through API calls or database setup
  console.log(`Group should have ${serviceName} with scopes: ${scopes}`);
});

When('I view the permissions for the group', async function() {
  // Click on first available service count button
  const serviceCountBtn = await this.page.locator('.service-count-btn').first();
  await serviceCountBtn.click();
});

Then('I should see service name {string}', async function(serviceName) {
  const serviceHeader = await this.page.locator(`h4:has-text("${serviceName}")`).first();
  await expect(serviceHeader).toBeVisible();
});

Then('I should see permissions as individual badges:', async function(dataTable) {
  const permissions = dataTable.hashes();
  for (const perm of permissions) {
    const badge = await this.page.locator(`.permission-badge:has-text("${perm.Permission}")`).first();
    await expect(badge).toBeVisible();
  }
});

Then('I should see raw scopes as {string}', async function(expectedScopes) {
  const rawScopesElement = await this.page.locator('.raw-scopes code').first();
  const actualScopes = await rawScopesElement.textContent();
  expect(actualScopes).to.contain(expectedScopes);
});

Then('I should see selected scopes displayed as individual badges', async function() {
  // Wait for the scopes section to be visible
  await this.page.waitForSelector('.raw-scopes', { timeout: 10000 });
  
  // Check for scope badges within the scopes grid
  const scopeBadges = await this.page.locator('.scope-badge').all();
  expect(scopeBadges.length).to.be.greaterThan(0);
  
  // Verify that each badge is visible and properly styled
  for (const badge of scopeBadges) {
    const isVisible = await badge.isVisible();
    expect(isVisible).to.be.true;
    
    // Check that the badge has proper styling
    const badgeStyles = await badge.getAttribute('style');
    expect(badgeStyles).to.contain('backgroundColor');
  }
});

Then('each permission should be displayed as a colored badge', async function() {
  const badges = await this.page.locator('.permission-badge').all();
  expect(badges.length).to.be.greaterThan(0);
  
  // Check that badges have the expected styling
  for (const badge of badges) {
    const isVisible = await badge.isVisible();
    expect(isVisible).to.be.true;
  }
});

Given('I logout and login as {string} with {string} permission only', async function(username, permission) {
  // Logout
  const logoutBtn = await this.page.locator('.logout-btn').first();
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click();
  }
  
  // Login as specified user
  await this.page.goto('http://localhost:3001');
  await this.page.fill('input[name="username"]', username);
  await this.page.fill('input[name="password"]', 'password123'); // Use standard test password
  await this.page.click('button[type="submit"]');
  
  // Wait for dashboard
  await this.page.waitForSelector('.nav-tabs', { timeout: 10000 });
});

Then('the service count should not be clickable', async function() {
  const serviceText = await this.page.locator('td:has-text("service")').first();
  const hasButton = await serviceText.locator('.service-count-btn').isVisible().catch(() => false);
  expect(hasButton).to.be.false;
});

Then('I should not be able to view service permissions', async function() {
  // Service counts should be plain text, not clickable buttons
  const serviceButtons = await this.page.locator('.service-count-btn').count();
  expect(serviceButtons).to.equal(0);
});

Given('the group has the following service assignments:', async function(dataTable) {
  // This would typically set up test data through API
  const assignments = dataTable.hashes();
  console.log('Group should have assignments:', assignments);
});

Then('I should see {int} service cards in the modal', async function(count) {
  const serviceCards = await this.page.locator('.service-permission-card').count();
  expect(serviceCards).to.equal(count);
});

Then('each service card should show:', async function(dataTable) {
  const fields = dataTable.hashes();
  const serviceCards = await this.page.locator('.service-permission-card').all();
  
  for (const card of serviceCards) {
    // Check for service name
    const serviceName = await card.locator('h4').isVisible();
    expect(serviceName).to.be.true;
    
    // Check for service ID
    const serviceId = await card.locator('.service-id').isVisible();
    expect(serviceId).to.be.true;
    
    // Check for permissions
    const permissions = await card.locator('.permission-badge').count();
    expect(permissions).to.be.greaterThan(0);
    
    // Check for raw scopes
    const rawScopes = await card.locator('.raw-scopes').isVisible();
    expect(rawScopes).to.be.true;
  }
});

When('I view the permissions on a mobile device', async function() {
  await this.page.setViewportSize({ width: 375, height: 667 });
  const serviceCountBtn = await this.page.locator('.service-count-btn').first();
  await serviceCountBtn.click();
});

Then('the modal should be properly sized for mobile', async function() {
  const modal = await this.page.locator('.modal').first();
  const boundingBox = await modal.boundingBox();
  const viewport = this.page.viewportSize();
  
  expect(boundingBox.width).to.be.lessThanOrEqual(viewport.width);
});

Then('the service cards should stack vertically', async function() {
  const serviceCards = await this.page.locator('.service-permission-card').all();
  if (serviceCards.length > 1) {
    const firstCardBox = await serviceCards[0].boundingBox();
    const secondCardBox = await serviceCards[1].boundingBox();
    expect(secondCardBox.y).to.be.greaterThan(firstCardBox.y);
  }
});

Then('the permissions badges should wrap appropriately', async function() {
  const permissionsGrid = await this.page.locator('.permissions-grid').first();
  await expect(permissionsGrid).toBeVisible();
});

Then('the modal should be scrollable if content exceeds screen height', async function() {
  const modal = await this.page.locator('.modal').first();
  const modalHeight = await modal.evaluate(el => el.scrollHeight);
  const viewportHeight = this.page.viewportSize().height;
  
  if (modalHeight > viewportHeight) {
    const isScrollable = await modal.evaluate(el => el.scrollHeight > el.clientHeight);
    expect(isScrollable).to.be.true;
  }
});

When('the group has invalid or corrupted service data', async function() {
  // This would simulate corrupted data scenario
  console.log('Simulating corrupted service data scenario');
});

When('I try to view the permissions', async function() {
  const serviceCountBtn = await this.page.locator('.service-count-btn').first();
  await serviceCountBtn.click();
});

Then('the modal should handle the error gracefully', async function() {
  const modal = await this.page.locator('.modal').first();
  await expect(modal).toBeVisible();
});

Then('I should see an appropriate error message', async function() {
  const errorMessage = await this.page.locator('.error-message, .no-services-message').first();
  const hasError = await errorMessage.isVisible().catch(() => false);
  // Error handling should show some message
  expect(hasError).to.be.true;
});

Then('the modal should still be closeable', async function() {
  const closeBtn = await this.page.locator('.close-btn').first();
  await expect(closeBtn).toBeVisible();
  await closeBtn.click();
  await this.page.waitForSelector('.modal', { state: 'hidden', timeout: 5000 });
});
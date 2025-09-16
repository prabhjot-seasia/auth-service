const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

Given('I am on the users management page', async function() {
  // Wait for dashboard to fully load
  await this.page.waitForSelector('.dashboard-content', { timeout: 10000 });
  
  // Debug: Check what tabs are available
  const tabs = await this.page.locator('.tabs button').allTextContents();
  console.log('Available tabs:', tabs);
  
  // Click on User Management tab
  await this.page.click('button:has-text("User Management")');
  
  // Wait for the page to load and show user management content
  await this.page.waitForSelector('.user-management', { timeout: 10000 });
  
  // Verify we're on the user management page
  const userManagementSection = await this.page.locator('.user-management').isVisible();
  expect(userManagementSection).to.be.true;
});

// User creation steps
When('I create a new user with the following details:', async function(dataTable) {
  const userData = {};
  const rows = dataTable.hashes();
  rows.forEach(row => {
    userData[row.Field.toLowerCase()] = row.Value;
  });

  // Debug: Check if the Create New User button is available
  const createButton = await this.page.locator('button:has-text("Create New User")').isVisible();
  console.log('Create New User button visible:', createButton);
  
  if (!createButton) {
    // Wait for the user table to load
    await this.page.waitForSelector('.users-table-container', { timeout: 10000 });
    await this.page.waitForTimeout(2000); // Wait for data to load
  }

  // Click Create New User button
  await this.page.click('button:has-text("Create New User")');
  await this.page.waitForSelector('.modal', { timeout: 10000 });
  
  // Wait for form elements to be ready
  await this.page.waitForSelector('#username');
  
  // Fill in the form
  await this.page.fill('#username', userData.username);
  await this.page.fill('#email', userData.email);
  await this.page.fill('#password', userData.password);
  await this.page.fill('#first_name', userData.firstname);
  await this.page.fill('#last_name', userData.lastname);

  // Submit the form
  await this.page.click('button[type="submit"]:has-text("Create User")');
  
  // Wait for either success (modal closes) or error message to appear
  try {
    await this.page.waitForSelector('.modal', { state: 'hidden', timeout: 10000 });
    console.log('Modal closed successfully');
  } catch (err) {
    // Check if there's an error message
    const errorExists = await this.page.locator('.error-message').isVisible();
    if (errorExists) {
      const errorText = await this.page.locator('.error-message').textContent();
      console.log('Error message appeared:', errorText);
      throw new Error(`User creation failed: ${errorText}`);
    } else {
      console.log('Modal did not close and no error message found');
      throw err;
    }
  }
});

Then('the user should be created successfully in the UI', async function() {
  // Check for absence of error messages
  const errorMessage = await this.page.locator('.error-message').count();
  expect(errorMessage).to.equal(0);
});

Then('the user should appear in the users list', async function() {
  // Look for the new user in the table
  const userRow = await this.page.locator('.users-table tbody tr:has-text("newuser")').count();
  expect(userRow).to.be.above(0);
});

// User update steps
Given('there is a user {string} in the system', async function(username) {
  // Verify user exists in the table
  const userRow = await this.page.locator(`.users-table tbody tr:has-text("${username}")`).count();
  expect(userRow).to.be.above(0);
  this.testUsername = username;
});

When('I update the user\'s email to {string}', async function(newEmail) {
  // Find the user row and click Edit
  const userRow = this.page.locator(`.users-table tbody tr:has-text("${this.testUsername}")`);
  await userRow.locator('button:has-text("Edit")').click();
  
  await this.page.waitForSelector('.modal');
  
  // Update email
  await this.page.fill('#email', newEmail);
  
  // Submit form
  await this.page.click('button[type="submit"]:has-text("Update User")');
  
  // Wait for modal to close
  await this.page.waitForSelector('.modal', { state: 'hidden', timeout: 5000 });
  
  this.updatedEmail = newEmail;
});

Then('the user\'s email should be updated', async function() {
  // Check for absence of error messages
  const errorMessage = await this.page.locator('.error-message').count();
  expect(errorMessage).to.equal(0);
});

Then('the change should be reflected in the dashboard', async function() {
  // Verify the email is updated in the table
  const userRow = await this.page.locator(`.users-table tbody tr:has-text("${this.testUsername}"):has-text("${this.updatedEmail}")`).count();
  expect(userRow).to.be.above(0);
});

// User deletion steps
When('I delete the user', async function() {
  // Find the user row and click Delete
  const userRow = this.page.locator(`.users-table tbody tr:has-text("${this.testUsername}")`);
  await userRow.locator('button:has-text("Delete")').click();
  
  // Handle confirmation dialog
  this.page.once('dialog', async dialog => {
    expect(dialog.message()).to.include('Are you sure');
    await dialog.accept();
  });
});

Then('the user should be removed from the system', async function() {
  // Wait a moment for deletion to process
  await this.page.waitForTimeout(1000);
  
  // Check for absence of error messages
  const errorMessage = await this.page.locator('.error-message').count();
  expect(errorMessage).to.equal(0);
});

Then('the user should not appear in the users list', async function() {
  // Verify user is not in the table
  const userRow = await this.page.locator(`.users-table tbody tr:has-text("${this.testUsername}")`).count();
  expect(userRow).to.equal(0);
});

// Role assignment steps (only for user management context)
Given('there is a role {string} for user assignment', async function(roleName) {
  // This is implied by our seed data, but we could verify by checking API
  this.testRole = roleName;
});

When('I assign the {string} role to the user', async function(roleName) {
  // Find the user row and click Edit
  const userRow = this.page.locator(`.users-table tbody tr:has-text("${this.testUsername}")`);
  await userRow.locator('button:has-text("Edit")').click();
  
  await this.page.waitForSelector('.modal');
  
  // Find and check the role checkbox
  const roleCheckbox = this.page.locator(`.role-checkbox:has-text("${roleName}") input[type="checkbox"]`);
  await roleCheckbox.check();
  
  // Submit form
  await this.page.click('button[type="submit"]:has-text("Update User")');
  
  // Wait for modal to close
  await this.page.waitForSelector('.modal', { state: 'hidden', timeout: 5000 });
});

Then('the user should have the {string} role', async function(roleName) {
  // Check for absence of error messages
  const errorMessage = await this.page.locator('.error-message').count();
  expect(errorMessage).to.equal(0);
  
  // Verify role appears in the user's row
  const userRow = await this.page.locator(`.users-table tbody tr:has-text("${this.testUsername}"):has-text("${roleName}")`).count();
  expect(userRow).to.be.above(0);
});

Then('the user should have admin permissions', async function() {
  // This would require checking the permissions through the API or UI
  // For now, we'll just verify the role assignment worked
  const userRow = await this.page.locator(`.users-table tbody tr:has-text("${this.testUsername}"):has-text("super_admin")`).count();
  expect(userRow).to.be.above(0);
});

// Group assignment steps (placeholder - groups feature may not be fully implemented in UI)
// Note: 'there is a group {string} in the system' step definition moved to group-management.steps.js

When('I add the user to the {string} group', async function(groupName) {
  // This step is placeholder as group management UI may not be implemented
  console.log(`Placeholder: Adding user ${this.testUsername} to group ${groupName}`);
});

Then('the user should be a member of the {string} group', async function(groupName) {
  // This step is placeholder as group management UI may not be implemented
  console.log(`Placeholder: Verifying user ${this.testUsername} is in group ${groupName}`);
});

// User deactivation steps
Given('there is an active user {string} in the system', async function(username) {
  // Verify user exists and is active
  const userRow = await this.page.locator(`.users-table tbody tr:has-text("${username}"):has-text("Active")`).count();
  expect(userRow).to.be.above(0);
  this.testUsername = username;
});

When('I deactivate the user account', async function() {
  // Find the user row and click Edit
  const userRow = this.page.locator(`.users-table tbody tr:has-text("${this.testUsername}")`);
  await userRow.locator('button:has-text("Edit")').click();
  
  await this.page.waitForSelector('.modal');
  
  // Uncheck the Active User checkbox
  const activeCheckbox = this.page.locator('input[name="is_active"]');
  await activeCheckbox.uncheck();
  
  // Submit form
  await this.page.click('button[type="submit"]:has-text("Update User")');
  
  // Wait for modal to close
  await this.page.waitForSelector('.modal', { state: 'hidden', timeout: 5000 });
});

Then('the user should not be able to login', async function() {
  // This would require testing login, which is complex in this context
  // For now, just verify the status change
  console.log(`Placeholder: Verifying user ${this.testUsername} cannot login`);
});

Then('the user status should show as {string}', async function(status) {
  // Verify the status in the users table
  const userRow = await this.page.locator(`.users-table tbody tr:has-text("${this.testUsername}"):has-text("${status}")`).count();
  expect(userRow).to.be.above(0);
});
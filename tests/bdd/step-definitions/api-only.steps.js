const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');
const axios = require('axios');

let apiResponse;
let apiError;
let authToken;

Given('the API authentication service is running', async function() {
  try {
    const response = await axios.get('http://localhost:8080/health', { 
      timeout: 5000,
      validateStatus: () => true 
    });
    expect([200, 404]).to.include(response.status);
    console.log('✓ Backend service is running');
  } catch (error) {
    throw new Error(`Backend service is not responding: ${error.message}`);
  }
});

When('I login via API with username {string} and password {string}', async function(username, password) {
  try {
    const response = await axios.post('http://localhost:8080/auth/token', {
      grant_type: 'password',
      username,
      password
    });
    this.apiResponse = response;
    this.authToken = response.data.access_token;
    console.log(`✓ Login successful for user: ${username}`);
  } catch (error) {
    this.apiError = error;
    console.log(`✗ Login failed for user: ${username}`);
  }
});

Then('I should receive a valid JWT token via API', async function() {
  expect(this.apiResponse.status).to.equal(200);
  expect(this.apiResponse.data.access_token).to.exist;
  expect(this.apiResponse.data.token_type).to.equal('Bearer');
  console.log('✓ JWT token received successfully');
});

When('I request my permissions', async function() {
  try {
    const response = await axios.get('http://localhost:8080/me/permissions', {
      headers: { Authorization: `Bearer ${this.authToken}` }
    });
    this.apiResponse = response;
    console.log('✓ Permissions retrieved successfully');
  } catch (error) {
    this.apiError = error;
    console.log('✗ Failed to retrieve permissions');
  }
});

Then('I should see my roles and permissions via API', async function() {
  expect(this.apiResponse.status).to.equal(200);
  expect(this.apiResponse.data.roles).to.be.an('array');
  expect(this.apiResponse.data.effective_permissions).to.be.an('array');
  console.log(`✓ User has ${this.apiResponse.data.roles.length} roles and ${this.apiResponse.data.effective_permissions.length} effective permissions`);
});

When('I try to create a new user directly via API', async function() {
  try {
    const timestamp = Date.now();
    const response = await axios.post('http://localhost:8080/users', 
      {
        username: `testuser${timestamp}`,
        email: `test${timestamp}@example.com`,
        password: 'Test@123',
        first_name: 'Test',
        last_name: 'User'
      },
      {
        headers: { Authorization: `Bearer ${this.authToken}` },
        validateStatus: () => true
      }
    );
    this.apiResponse = response;
    console.log(`✓ API request completed with status: ${response.status}`);
  } catch (error) {
    this.apiError = error;
    console.log('✗ API request failed');
  }
});

Then('I should receive a {int} response', async function(statusCode) {
  expect(this.apiResponse.status).to.equal(statusCode);
  console.log(`✓ Received expected status code: ${statusCode}`);
});


When('I login with invalid credentials', async function() {
  try {
    const response = await axios.post('http://localhost:8080/auth/token', {
      grant_type: 'password',
      username: 'admin',
      password: 'wrongpassword'
    }, {
      validateStatus: () => true
    });
    this.apiResponse = response;
    console.log('✓ Invalid login attempt completed');
  } catch (error) {
    this.apiError = error;
    console.log('✗ Invalid login attempt failed');
  }
});

Then('I should receive a {int} Unauthorized response', async function(statusCode) {
  expect(this.apiResponse.status).to.equal(statusCode);
  console.log(`✓ Unauthorized access properly denied with status: ${statusCode}`);
});
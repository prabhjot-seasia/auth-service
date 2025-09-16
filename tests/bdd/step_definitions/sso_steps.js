const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');
const axios = require('axios');

let authToken;
let ssoResponse;
let permissionResponse;
let logoutResponse;
let serviceLoginResponse;

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';

Given('I authenticate as {string} with password {string}', async function (username, password) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/token`, {
      grant_type: 'password',
      username,
      password
    });
    
    expect(response.status).to.equal(200);
    expect(response.data.access_token).to.exist;
    
    authToken = response.data.access_token;
  } catch (error) {
    console.error('Authentication failed:', error.response?.data || error.message);
    throw error;
  }
});

When('I validate my token using the SSO endpoint', async function () {
  try {
    const response = await axios.get(`${API_BASE_URL}/sso/validate`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    ssoResponse = response.data;
  } catch (error) {
    console.error('SSO validation failed:', error.response?.data || error.message);
    ssoResponse = error.response?.data || { valid: false, error: error.message };
  }
});

When('I validate an invalid token using the SSO endpoint', async function () {
  try {
    const response = await axios.post(`${API_BASE_URL}/sso/validate`, {
      token: 'invalid-token'
    });
    
    ssoResponse = response.data;
  } catch (error) {
    console.error('SSO validation error (expected):', error.response?.data || error.message);
    ssoResponse = error.response?.data || { valid: false, error: error.message };
  }
});

When('I call the SSO validate endpoint without an authorization header', async function () {
  try {
    const response = await axios.get(`${API_BASE_URL}/sso/validate`);
    ssoResponse = response.data;
  } catch (error) {
    console.error('SSO validation error (expected):', error.response?.data || error.message);
    ssoResponse = error.response?.data || { valid: false, error: error.message };
  }
});

When('I check if I have {string} permission on {string} resource', async function (action, resource) {
  try {
    const response = await axios.post(`${API_BASE_URL}/sso/check-permission`, {
      token: authToken,
      resource,
      action
    });
    
    permissionResponse = response.data;
  } catch (error) {
    console.error('Permission check failed:', error.response?.data || error.message);
    permissionResponse = error.response?.data || { allowed: false, error: error.message };
  }
});

When('I logout using the SSO endpoint', async function () {
  try {
    const response = await axios.post(`${API_BASE_URL}/sso/logout`, {
      token: authToken
    });
    
    logoutResponse = response.data;
  } catch (error) {
    console.error('SSO logout failed:', error.response?.data || error.message);
    logoutResponse = error.response?.data || { success: false, error: error.message };
  }
});

When('I login to the service with username {string} and password {string}', async function (username, password) {
  try {
    const response = await axios.post(`${API_BASE_URL}/sso/login`, {
      username,
      password,
      service_id: 'test-service-id'
    });
    
    serviceLoginResponse = response.data;
  } catch (error) {
    console.error('Service login failed:', error.response?.data || error.message);
    serviceLoginResponse = error.response?.data || { success: false, error: error.message };
  }
});

Then('the token validation should succeed', function () {
  expect(ssoResponse).to.exist;
  expect(ssoResponse.valid).to.be.true;
});

Then('the token validation should fail', function () {
  expect(ssoResponse).to.exist;
  expect(ssoResponse.valid).to.be.false;
});

Then('I should receive user information including:', function (dataTable) {
  expect(ssoResponse).to.exist;
  
  const expectedData = {};
  dataTable.hashes().forEach(row => {
    expectedData[row.field] = row.value;
  });
  
  Object.keys(expectedData).forEach(field => {
    if (field === 'valid') {
      expect(ssoResponse[field]).to.equal(expectedData[field] === 'true');
    } else {
      expect(ssoResponse[field]).to.equal(expectedData[field]);
    }
  });
});

Then('I should receive an error message {string}', function (expectedError) {
  expect(ssoResponse).to.exist;
  expect(ssoResponse.error).to.include(expectedError);
});

Then('the permission check should return {string}', function (expectedResult) {
  expect(permissionResponse).to.exist;
  
  if (expectedResult === 'allowed: true') {
    expect(permissionResponse.allowed).to.be.true;
  } else if (expectedResult === 'allowed: false') {
    expect(permissionResponse.allowed).to.be.false;
  }
});

Then('the logout should succeed', function () {
  expect(logoutResponse).to.exist;
  expect(logoutResponse.success).to.be.true;
});

Then('I should receive an access token for the service', function () {
  expect(serviceLoginResponse).to.exist;
  expect(serviceLoginResponse.access_token).to.exist;
});

Then('the login should succeed', function () {
  expect(serviceLoginResponse).to.exist;
  expect(serviceLoginResponse.success).to.be.true;
});

// Service setup step
Given('a service exists with ID {string}', async function (serviceId) {
  // For this test, we'll assume the service exists or create a mock one
  // In a real test environment, you would set up the test service here
  console.log(`Using service ID: ${serviceId} for testing`);
});
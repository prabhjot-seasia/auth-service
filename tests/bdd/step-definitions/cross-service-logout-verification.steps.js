const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');
const axios = require('axios');

// Test context variables
let testToken, logoutResponse, validationResponse, documentServiceResponse;

Given('I get a valid JWT token for user {string}', async function (username) {
  try {
    const response = await axios.post('http://localhost:8080/auth/token', {
      grant_type: 'password',
      username: username,
      password: 'Admin@123'
    });
    
    expect(response.data.access_token).to.exist;
    
    testToken = response.data.access_token;
    console.log('✅ Got valid JWT token');
  } catch (error) {
    console.error('❌ Failed to get token:', error.message);
    throw error;
  }
});

When('I validate the token with auth service', async function () {
  try {
    validationResponse = await axios.post('http://localhost:8080/sso/validate', {
      token: testToken,
      client_id: 'test-client',
      client_secret: 'test-secret'
    });
    console.log('✅ Token validation request made');
  } catch (error) {
    validationResponse = error.response;
    console.log('✅ Token validation request made (with error response)');
  }
});

Then('the token should be valid', async function () {
  console.log('Validation response status:', validationResponse.status);
  console.log('Validation response data:', JSON.stringify(validationResponse.data, null, 2));
  
  expect(validationResponse.status).to.equal(200);
  expect(validationResponse.data.valid).to.be.true;
  
  console.log('✅ Token is valid');
});

When('I logout using the token via auth service API', async function () {
  try {
    logoutResponse = await axios.post('http://localhost:8080/sso/logout', {
      token: testToken
    });
    console.log('✅ Logout API call made');
  } catch (error) {
    logoutResponse = error.response;
    console.log('✅ Logout API call made (with error response)');
  }
});

Then('the logout should be successful', async function () {
  expect(logoutResponse.status).to.equal(200);
  expect(logoutResponse.data.success).to.be.true;
  
  console.log('✅ Logout was successful');
});

When('I validate the token with auth service again', async function () {
  try {
    validationResponse = await axios.post('http://localhost:8080/sso/validate', {
      token: testToken,
      client_id: 'test-client',
      client_secret: 'test-secret'
    });
    console.log('✅ Token validation request made again');
  } catch (error) {
    validationResponse = error.response;
    console.log('✅ Token validation request made again (with error response)');
  }
});

Then('the token should be invalid', async function () {
  expect(validationResponse.data.valid).to.be.false;
  
  console.log('✅ Token is now invalid');
});

Then('the error should indicate the token is blacklisted', async function () {
  expect(validationResponse.data.error).to.include('invalidated');
  
  console.log('✅ Token is blacklisted as expected');
});

When('I make a request to document service with the token', async function () {
  try {
    documentServiceResponse = await axios.get('http://localhost:8081/auth/me', {
      headers: { 'Authorization': `Bearer ${testToken}` }
    });
    console.log('✅ Document service request made with token');
  } catch (error) {
    documentServiceResponse = error.response;
    console.log('✅ Document service request made with token (with error response)');
  }
});

Then('the document service should accept the token', async function () {
  expect(documentServiceResponse.status).to.equal(200);
  
  console.log('✅ Document service accepted the token');
});

When('I make a request to document service with the same token', async function () {
  try {
    documentServiceResponse = await axios.get('http://localhost:8081/auth/me', {
      headers: { 'Authorization': `Bearer ${testToken}` }
    });
    console.log('✅ Document service request made with invalidated token');
  } catch (error) {
    documentServiceResponse = error.response;
    console.log('✅ Document service request made with invalidated token (with error response)');
  }
});

Then('the document service should reject the token', async function () {
  console.log('Document service response status:', documentServiceResponse.status);
  console.log('Document service response data:', JSON.stringify(documentServiceResponse.data, null, 2));
  
  expect(documentServiceResponse.status).to.not.equal(200);
  
  console.log('✅ Document service rejected the invalidated token');
});

Then('the response should be 401 unauthorized', async function () {
  expect(documentServiceResponse.status).to.equal(401);
  
  console.log('✅ Document service returned 401 as expected');
});
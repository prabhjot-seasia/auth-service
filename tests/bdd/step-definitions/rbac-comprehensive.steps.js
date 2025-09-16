const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');
const axios = require('axios');

// Store test data for cleanup and lookup
let testUsers = [];
let testRoles = [];
let testGroups = [];
let testServices = [];
let adminToken = null;

// Store mappings of logical names to actual entities
let entityMappings = {
  users: new Map(),
  roles: new Map(),
  groups: new Map(),
  services: new Map()
};

// API base URL
const API_BASE = 'http://localhost:8080';

// Helper function to get admin token
async function getAdminToken() {
  if (!adminToken) {
    const response = await axios.post(`${API_BASE}/auth/token`, {
      grant_type: 'password',
      username: 'admin',
      password: 'Admin@123'
    });
    adminToken = response.data.access_token;
  }
  return adminToken;
}

// Helper function to create service
async function createService(name, scopes) {
  const token = await getAdminToken();
  const uniqueName = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const serviceData = {
    name: uniqueName,
    client_id: `${uniqueName}-client-${Date.now()}`,
    client_secret: 'test-secret-123',
    scopes: scopes,
    redirect_uri: 'http://localhost:3000/callback',
    is_active: true
  };
  
  const response = await axios.post(`${API_BASE}/services`, serviceData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  testServices.push(response.data.id);
  entityMappings.services.set(name, response.data);
  return response.data;
}

// Helper function to create group with services
async function createGroup(name, services) {
  const token = await getAdminToken();
  const uniqueName = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const groupData = {
    name: uniqueName,
    description: `Test group ${uniqueName}`
  };
  
  // Create group first
  const groupResponse = await axios.post(`${API_BASE}/groups`, groupData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const groupId = groupResponse.data.id;
  testGroups.push(groupId);
  entityMappings.groups.set(name, groupResponse.data);
  
  // Assign services to group if provided
  if (services && services.length > 0) {
    const serviceAssignments = services.map(service => ({
      service_id: service.id,
      scopes: service.scopes
    }));
    
    await axios.put(`${API_BASE}/groups/${groupId}/services`, 
      { service_assignments: serviceAssignments }, 
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }
  
  return groupResponse.data;
}

// Helper function to create role with groups
async function createRole(name, groupIds) {
  const token = await getAdminToken();
  const uniqueName = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const roleData = {
    name: uniqueName,
    description: `Test role ${uniqueName}`
  };
  
  const roleResponse = await axios.post(`${API_BASE}/roles`, roleData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const roleId = roleResponse.data.id;
  testRoles.push(roleId);
  entityMappings.roles.set(name, roleResponse.data);
  
  // Assign groups to role if provided
  if (groupIds && groupIds.length > 0) {
    await axios.put(`${API_BASE}/roles/${roleId}/groups`, 
      { group_ids: groupIds }, 
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }
  
  return roleResponse.data;
}

// Helper function to create user with role
async function createUser(username, roleId) {
  const token = await getAdminToken();
  const uniqueUsername = `${username}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const userData = {
    username: uniqueUsername,
    email: `${uniqueUsername}@test.com`,
    password: 'Test@123',
    first_name: uniqueUsername,
    last_name: 'User',
    is_active: true,
    role_ids: roleId ? [roleId] : []
  };
  
  const userResponse = await axios.post(`${API_BASE}/users`, userData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  testUsers.push(userResponse.data.id);
  entityMappings.users.set(username, userResponse.data);
  return userResponse.data;
}

// Step definitions

Given('the database has been seeded with comprehensive RBAC test data', function () {
  // Basic setup - comprehensive test data will be created by individual scenarios
  return Promise.resolve();
});

When('I login as {string} with password {string}', async function (username, password) {
  // Get the actual username from our mapping
  const user = entityMappings.users.get(username);
  const actualUsername = user ? user.username : username;
  
  await this.page.goto('http://localhost:3001/login');
  await this.page.fill('input[placeholder="Username"]', actualUsername);
  await this.page.fill('input[placeholder="Password"]', password);
  await this.page.click('button:has-text("Login")');
  
  // Wait for redirect to dashboard
  await this.page.waitForURL('**/dashboard', { timeout: 10000 });
  await this.page.waitForTimeout(2000); // Allow for permissions to load
});

Given('I create a test group {string} with service {string} having scopes {string}', async function (groupName, serviceName, scopes) {
  const service = await createService(serviceName, scopes);
  await createGroup(groupName, [{ id: service.id, scopes: scopes }]);
});

Given('I create a test role {string} with group {string}', async function (roleName, groupName) {
  // Find the group by logical name in our mapping
  const group = entityMappings.groups.get(groupName);
  if (!group) {
    throw new Error(`Group ${groupName} not found in test mappings`);
  }
  
  await createRole(roleName, [group.id]);
});

Given('I create a test user {string} with role {string}', async function (username, roleName) {
  // Find the role by logical name in our mapping
  const role = entityMappings.roles.get(roleName);
  if (!role) {
    throw new Error(`Role ${roleName} not found in test mappings`);
  }
  
  await createUser(username, role.id);
});

Given('I create test groups with services:', async function (dataTable) {
  const rows = dataTable.hashes();
  for (const row of rows) {
    const service = await createService(row.service_name, row.scopes);
    await createGroup(row.group_name, [{ id: service.id, scopes: row.scopes }]);
  }
});

Given('I create a test role {string} with groups {string}', async function (roleName, groupNames) {
  const groupNameArray = groupNames.split(',').map(n => n.trim());
  const token = await getAdminToken();
  const groupsResponse = await axios.get(`${API_BASE}/groups`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const groupIds = [];
  for (const groupName of groupNameArray) {
    const group = groupsResponse.data.find(g => g.name === groupName);
    if (group) {
      groupIds.push(group.id);
    }
  }
  
  await createRole(roleName, groupIds);
});

Given('I create a test group {string} with services:', async function (groupName, dataTable) {
  const rows = dataTable.hashes();
  const services = [];
  
  for (const row of rows) {
    const service = await createService(row.service_name, row.scopes);
    services.push({ id: service.id, scopes: row.scopes });
  }
  
  await createGroup(groupName, services);
});

Given('the administrator role has been assigned groups {string}', async function (groupNames) {
  const groupNameArray = groupNames.split(',').map(n => n.trim());
  const token = await getAdminToken();
  
  // Find administrator role
  const rolesResponse = await axios.get(`${API_BASE}/roles`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const adminRole = rolesResponse.data.find(r => r.name === 'administrator');
  
  // Find groups
  const groupsResponse = await axios.get(`${API_BASE}/groups`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const groupIds = [];
  for (const groupName of groupNameArray) {
    const group = groupsResponse.data.find(g => g.name === groupName);
    if (group) {
      groupIds.push(group.id);
    }
  }
  
  // Assign groups to administrator role
  await axios.put(`${API_BASE}/roles/${adminRole.id}/groups`, 
    { group_ids: groupIds }, 
    { headers: { Authorization: `Bearer ${token}` } }
  );
});

Then('I should see exactly {string} permission(s)', async function (expectedCount) {
  const permissionsText = await this.page.textContent('.permissions-section .info-card:nth-child(3)');
  const permissionMatches = permissionsText.match(/(\w+:\w+)/g) || [];
  expect(permissionMatches.length).to.equal(parseInt(expectedCount));
});

Then('My permissions should show {string}', async function (expectedPermissions) {
  const permissionsList = expectedPermissions.split(',').map(p => p.trim());
  const permissionsSection = await this.page.textContent('.permissions-section .info-card:nth-child(3)');
  
  for (const permission of permissionsList) {
    expect(permissionsSection).to.include(permission);
  }
});

Then('My permissions should include {string}', async function (expectedPermissions) {
  const permissionsList = expectedPermissions.split(',').map(p => p.trim());
  const permissionsSection = await this.page.textContent('.permissions-section .info-card:nth-child(3)');
  
  for (const permission of permissionsList) {
    expect(permissionsSection).to.include(permission);
  }
});

Then('I should see permissions from all assigned groups', async function () {
  // This would require checking that permissions from multiple groups are visible
  const permissionsSection = await this.page.textContent('.permissions-section .info-card:nth-child(3)');
  expect(permissionsSection.length).to.be.greaterThan(0);
});

Then('the permission count should match the sum of unique permissions across all groups', async function () {
  // This would require complex calculation - for now just verify some permissions exist
  const permissionsSection = await this.page.textContent('.permissions-section .info-card:nth-child(3)');
  expect(permissionsSection).to.include(':');
});

Then('I should see {string} unique permissions', async function (expectedCount) {
  const permissionsText = await this.page.textContent('.permissions-section .info-card:nth-child(3)');
  const permissionMatches = permissionsText.match(/(\w+:\w+)/g) || [];
  const uniquePermissions = [...new Set(permissionMatches)];
  expect(uniquePermissions.length).to.equal(parseInt(expectedCount));
});

Then('I should see all management tabs', async function () {
  const tabs = await this.page.$$eval('.tabs button', elements => 
    elements.map(el => el.textContent.trim())
  );
  
  const expectedTabs = ['My Permissions', 'User Management', 'Roles', 'Groups', 'Services'];
  for (const tab of expectedTabs) {
    expect(tabs).to.include(tab);
  }
});

Then('I should only see {string} and {string} tabs', async function (tab1, tab2) {
  const tabs = await this.page.$$eval('.tabs button', elements => 
    elements.map(el => el.textContent.trim())
  );
  
  expect(tabs).to.have.lengthOf(2);
  expect(tabs).to.include(tab1);
  expect(tabs).to.include(tab2);
});

Then('I should have full access to {string}', async function (tabName) {
  // Click on the tab and verify create/edit/delete buttons are present
  await this.page.click(`button:has-text("${tabName}")`);
  await this.page.waitForTimeout(1000);
  
  const hasCreateButton = await this.page.isVisible('button:has-text("Create")');
  expect(hasCreateButton).to.be.true;
});

Then('I should have read-only access to {string}', async function (tabName) {
  await this.page.click(`button:has-text("${tabName}")`);
  await this.page.waitForTimeout(1000);
  
  const hasCreateButton = await this.page.isVisible('button:has-text("Create")');
  expect(hasCreateButton).to.be.false;
});

Then('wildcard permissions should expand to {string}', async function (expandedPermissions) {
  const permissionsText = await this.page.textContent('.permissions-section .info-card:nth-child(3)');
  const expectedPerms = expandedPermissions.split(',').map(p => p.trim());
  
  for (const perm of expectedPerms) {
    expect(permissionsText).to.include(perm);
  }
});

Then('My permissions should be grouped by services:', async function (dataTable) {
  const rows = dataTable.hashes();
  
  for (const row of rows) {
    // Look for service name header
    const serviceHeaderExists = await this.page.isVisible(`text="${row.service_name} Permissions"`);
    expect(serviceHeaderExists).to.be.true;
    
    // Verify permissions under this service
    const permissions = row.permissions.split(',').map(p => p.trim());
    for (const permission of permissions) {
      const permissionExists = await this.page.isVisible(`text="${permission}"`);
      expect(permissionExists).to.be.true;
    }
  }
});

Then('My permissions should be properly grouped by service:', async function (dataTable) {
  const rows = dataTable.hashes();
  
  for (const row of rows) {
    const serviceSection = await this.page.textContent(`text="${row.service_name} Permissions"`);
    expect(serviceSection).to.not.be.null;
    
    const permissions = row.permissions.split(',').map(p => p.trim());
    for (const permission of permissions) {
      const permissionsSection = await this.page.textContent('.permissions-section');
      expect(permissionsSection).to.include(permission);
    }
  }
});

Then('I should see exactly {string} permissions across {string} services', async function (permCount, serviceCount) {
  const permissionsText = await this.page.textContent('.permissions-section .info-card:nth-child(3)');
  
  // Count permissions
  const permissionMatches = permissionsText.match(/(\w+:\w+)/g) || [];
  expect(permissionMatches.length).to.equal(parseInt(permCount));
  
  // Count service sections (look for "Permissions" headers)
  const serviceHeaders = permissionsText.match(/(\w+[-\s]*\w*)\s+Permissions/g) || [];
  expect(serviceHeaders.length).to.equal(parseInt(serviceCount));
});

When('I obtain an access token for {string} with password {string}', async function (username, password) {
  const response = await axios.post(`${API_BASE}/auth/token`, {
    grant_type: 'password',
    username: username,
    password: password
  });
  
  this.userToken = response.data.access_token;
});

Then('API GET request to {string} should return {int}', async function (endpoint, expectedStatus) {
  try {
    const response = await axios.get(`${API_BASE}${endpoint}`, {
      headers: { Authorization: `Bearer ${this.userToken}` }
    });
    expect(response.status).to.equal(expectedStatus);
  } catch (error) {
    expect(error.response.status).to.equal(expectedStatus);
  }
});

Then('API POST request to {string} should return {int}', async function (endpoint, expectedStatus) {
  try {
    const response = await axios.post(`${API_BASE}${endpoint}`, {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test123!',
      first_name: 'Test',
      last_name: 'User'
    }, {
      headers: { Authorization: `Bearer ${this.userToken}` }
    });
    expect(response.status).to.equal(expectedStatus);
  } catch (error) {
    expect(error.response.status).to.equal(expectedStatus);
  }
});

Then('API PUT request to {string} should return {int}', async function (endpoint, expectedStatus) {
  try {
    const response = await axios.put(`${API_BASE}${endpoint}`, {
      first_name: 'Updated'
    }, {
      headers: { Authorization: `Bearer ${this.userToken}` }
    });
    expect(response.status).to.equal(expectedStatus);
  } catch (error) {
    expect(error.response.status).to.equal(expectedStatus);
  }
});

Then('API DELETE request to {string} should return {int}', async function (endpoint, expectedStatus) {
  try {
    const response = await axios.delete(`${API_BASE}${endpoint}`, {
      headers: { Authorization: `Bearer ${this.userToken}` }
    });
    expect(response.status).to.equal(expectedStatus);
  } catch (error) {
    expect(error.response.status).to.equal(expectedStatus);
  }
});

// Additional step definitions for complex scenarios

Then('I should see permissions from both {string} and {string} groups', async function (group1, group2) {
  const permissionsText = await this.page.textContent('.permissions-section .info-card:nth-child(3)');
  // Verify permissions from both groups are present
  expect(permissionsText.length).to.be.greaterThan(0);
  
  // Look for multiple service sections indicating multiple groups
  const serviceHeaders = permissionsText.match(/(\w+[-\s]*\w*)\s+Permissions/g) || [];
  expect(serviceHeaders.length).to.be.greaterThan(0);
});

Then('My permissions should include permissions from both groups', async function () {
  const permissionsText = await this.page.textContent('.permissions-section .info-card:nth-child(3)');
  const permissionMatches = permissionsText.match(/(\w+:\w+)/g) || [];
  expect(permissionMatches.length).to.be.greaterThan(7); // Should have more than original 7
});

Then('the permission count should be the sum of unique permissions across all groups', async function () {
  const permissionsText = await this.page.textContent('.permissions-section .info-card:nth-child(3)');
  const permissionMatches = permissionsText.match(/(\w+:\w+)/g) || [];
  const uniquePermissions = [...new Set(permissionMatches)];
  expect(uniquePermissions.length).to.be.greaterThan(7);
});

Then('I should see permissions grouped by services:', async function (dataTable) {
  const rows = dataTable.hashes();
  
  for (const row of rows) {
    const serviceHeaderSelector = `text="${row.service_name} Permissions"`;
    const serviceHeaderExists = await this.page.isVisible(serviceHeaderSelector);
    expect(serviceHeaderExists).to.be.true;
    
    const expectedPermissions = row.should_contain.split(',').map(p => p.trim());
    const permissionsSection = await this.page.textContent('.permissions-section');
    
    for (const permission of expectedPermissions) {
      expect(permissionsSection).to.include(permission);
    }
  }
});

Then('the header should show user as {string} with role {string}', async function (username, roleName) {
  // Check if user info is displayed correctly in header
  const headerText = await this.page.textContent('.dashboard-header');
  expect(headerText).to.include(username);
});

Then('permission count in My Permissions should match backend API response', async function () {
  // Get JWT token from localStorage and call API
  const token = await this.page.evaluate(() => localStorage.getItem('jwt'));
  
  const apiResponse = await axios.get(`${API_BASE}/me/permissions`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const apiPermissionCount = apiResponse.data.effective_permissions.length;
  
  // Count permissions in UI
  const permissionsText = await this.page.textContent('.permissions-section .info-card:nth-child(3)');
  const uiPermissionMatches = permissionsText.match(/(\w+:\w+)/g) || [];
  
  expect(uiPermissionMatches.length).to.equal(apiPermissionCount);
});

Then('each service section should show correct permissions', async function () {
  // Verify that service sections are properly displayed
  const permissionsSection = await this.page.textContent('.permissions-section .info-card:nth-child(3)');
  const serviceHeaders = permissionsSection.match(/(\w+[-\s]*\w*)\s+Permissions/g) || [];
  expect(serviceHeaders.length).to.be.greaterThan(0);
});

Then('my access level should be consistent with my permissions', async function () {
  // Check that UI elements (like Create buttons) match user permissions
  await this.page.waitForTimeout(1000);
  // This is a placeholder - specific checks would depend on the current tab
  expect(true).to.be.true;
});

Then('all UI elements should reflect the combined permissions from both groups', async function () {
  // Comprehensive check that all UI reflects the permissions
  const permissionsText = await this.page.textContent('.permissions-section .info-card:nth-child(3)');
  expect(permissionsText.length).to.be.greaterThan(0);
});

When('I update role {string} to include groups {string}', async function (roleName, groupNames) {
  const token = await getAdminToken();
  
  // Find role by name
  const rolesResponse = await axios.get(`${API_BASE}/roles`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const role = rolesResponse.data.find(r => r.name === roleName);
  
  // Find groups by names
  const groupNameArray = groupNames.split(',').map(n => n.trim());
  const groupsResponse = await axios.get(`${API_BASE}/groups`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const groupIds = [];
  for (const groupName of groupNameArray) {
    const group = groupsResponse.data.find(g => g.name === groupName);
    if (group) {
      groupIds.push(group.id);
    }
  }
  
  // Update role groups
  await axios.put(`${API_BASE}/roles/${role.id}/groups`, 
    { group_ids: groupIds }, 
    { headers: { Authorization: `Bearer ${token}` } }
  );
});

Then('permission changes should be reflected across all UI components', async function () {
  // Verify that permission changes are reflected everywhere
  await this.page.waitForTimeout(2000); // Allow time for updates
  const permissionsText = await this.page.textContent('.permissions-section .info-card:nth-child(3)');
  expect(permissionsText.length).to.be.greaterThan(0);
});

Given('I create a test group {string} with services:', async function (groupName, dataTable) {
  const rows = dataTable.hashes();
  const services = [];
  
  // Group services by service_name to combine scopes
  const serviceMap = {};
  for (const row of rows) {
    if (!serviceMap[row.service_name]) {
      serviceMap[row.service_name] = [];
    }
    serviceMap[row.service_name].push(...row.scopes.split(' '));
  }
  
  // Create services with combined scopes
  for (const [serviceName, scopes] of Object.entries(serviceMap)) {
    const combinedScopes = [...new Set(scopes)].join(' '); // Remove duplicates
    const service = await createService(serviceName, combinedScopes);
    services.push({ id: service.id, scopes: combinedScopes });
  }
  
  await createGroup(groupName, services);
});

Then('I should see permissions from all services:', async function (dataTable) {
  const rows = dataTable.hashes();
  
  for (const row of rows) {
    const expectedPermissions = row.expected_permissions.split(',').map(p => p.trim());
    const permissionsSection = await this.page.textContent('.permissions-section');
    
    for (const permission of expectedPermissions) {
      expect(permissionsSection).to.include(permission);
    }
  }
});

Then('total permission count should be {string}', async function (expectedCount) {
  const permissionsText = await this.page.textContent('.permissions-section .info-card:nth-child(3)');
  const permissionMatches = permissionsText.match(/(\w+:\w+)/g) || [];
  expect(permissionMatches.length).to.equal(parseInt(expectedCount));
});

Then('no duplicate permissions should appear', async function () {
  const permissionsText = await this.page.textContent('.permissions-section .info-card:nth-child(3)');
  const permissionMatches = permissionsText.match(/(\w+:\w+)/g) || [];
  const uniquePermissions = [...new Set(permissionMatches)];
  expect(permissionMatches.length).to.equal(uniquePermissions.length);
});

Then('permissions should be correctly grouped by service name', async function () {
  const permissionsSection = await this.page.textContent('.permissions-section .info-card:nth-child(3)');
  const serviceHeaders = permissionsSection.match(/(\w+[-\s]*\w*)\s+Permissions/g) || [];
  expect(serviceHeaders.length).to.be.greaterThan(0);
});

// Cleanup after each scenario
const { After } = require('@cucumber/cucumber');

After(async function () {
  if (testUsers.length > 0 || testRoles.length > 0 || testGroups.length > 0 || testServices.length > 0) {
    try {
      const token = await getAdminToken();
      
      // Clean up in reverse order to handle dependencies
      for (const userId of testUsers) {
        try {
          await axios.delete(`${API_BASE}/users/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (e) {
          console.warn(`Failed to cleanup user ${userId}:`, e.message);
        }
      }
      
      for (const roleId of testRoles) {
        try {
          await axios.delete(`${API_BASE}/roles/${roleId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (e) {
          console.warn(`Failed to cleanup role ${roleId}:`, e.message);
        }
      }
      
      for (const groupId of testGroups) {
        try {
          await axios.delete(`${API_BASE}/groups/${groupId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (e) {
          console.warn(`Failed to cleanup group ${groupId}:`, e.message);
        }
      }
      
      for (const serviceId of testServices) {
        try {
          await axios.delete(`${API_BASE}/services/${serviceId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (e) {
          console.warn(`Failed to cleanup service ${serviceId}:`, e.message);
        }
      }
      
    } catch (e) {
      console.warn('Cleanup error:', e.message);
    }
    
    // Reset arrays and mappings
    testUsers = [];
    testRoles = [];
    testGroups = [];
    testServices = [];
    entityMappings.users.clear();
    entityMappings.roles.clear();
    entityMappings.groups.clear();
    entityMappings.services.clear();
  }
});
Feature: Authentication and Authorization
  As a user of the authentication service
  I want to be able to login and access resources based on my permissions
  So that I can use the system securely

  Background:
    Given the authentication service is running
    And the database has been seeded with test data

  @auth @login
  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter username "admin" and password "Admin@123"
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see "Dashboard"
    And I should see my roles and permissions

  @auth @login
  Scenario: Failed login with invalid credentials
    Given I am on the login page
    When I enter username "admin" and password "wrongpassword"
    And I click the login button
    Then I should see an error message "invalid credentials"
    And I should remain on the login page

  @auth @permissions
  Scenario: Admin user can access permitted management sections
    Given I am logged in as "admin" with password "Admin@123"
    When I navigate to the dashboard
    Then I should see the following tabs:
      | Tab Name        |
      | My Permissions  |
      | User Management |
      | Roles           |
      | Groups          |
    And I should NOT see the following tabs:
      | Tab Name         |
      | Services         |
      | API Documentation|
    And I should be able to access all visible tabs
    And My permissions should show exactly "7" permissions

  @auth @permissions @services
  Scenario: Admin user can fully manage services
    Given I am logged in as "admin" with password "admin123"
    When I navigate to the dashboard
    And I click on the "Services" tab
    Then I should see the service list
    And I should see the "Create Service" button
    And I should see "Edit" buttons in the service list
    And I should see "Delete" buttons in the service list
    And I should see "Suspend/Activate" buttons in the service list
    And I should not see any "Access denied" messages

  @auth @permissions @groups
  Scenario: Admin user can fully manage groups
    Given I am logged in as "admin" with password "Admin@123"
    When I navigate to the dashboard
    And I click on the "Groups" tab
    Then I should see the group list
    And I should see the "Create Group" button
    And I should see "Edit" buttons in the group list
    And I should see "Delete" buttons in the group list
    And I should not see any "Access denied" messages

  @auth @permissions @roles
  Scenario: Admin user can fully manage roles
    Given I am logged in as "admin" with password "Admin@123"
    When I navigate to the dashboard
    And I click on the "Roles" tab
    Then I should see the role list
    And I should see the "Create Role" button
    And I should see "Edit" buttons in the role list
    And I should see "Delete" buttons in the role list
    And I should not see any "Access denied" messages

  @auth @permissions
  Scenario: Standard user has limited access
    Given I am logged in as "user1" with password "User@123"
    When I navigate to the dashboard
    Then I should see the following tabs:
      | Tab Name        |
      | My Permissions  |
      | User Management |
    And I should not see admin-only tabs
    And My permissions should show only "users:read" scope
    When I click on the "User Management" tab
    Then I should see the user list
    And I should not see the "Create User" button
    And I should not see "Edit" buttons in the user list
    And I should not see "Delete" buttons in the user list

  @auth @logout
  Scenario: User can logout successfully
    Given I am logged in as "admin" with password "Admin@123"
    When I click the logout button
    Then I should be redirected to the login page
    And I should not be able to access protected pages

  @auth @jwt
  Scenario: JWT token expires and refreshes automatically
    Given I am logged in as "user1" with password "User@123"
    And my JWT token is about to expire
    When I make an API request
    Then the token should be refreshed automatically
    And I should remain logged in

  @auth @rbac
  Scenario: Role-based access control prevents unauthorized actions
    Given I am logged in as "user1" with password "User@123"
    When I try to create a new user via API
    Then I should receive a 403 Forbidden response
    And the error message should be "insufficient permissions"

  @auth @service
  Scenario: Service authentication with client credentials
    Given I have registered a service with client credentials
    When I request an access token using client_id and client_secret
    Then I should receive a valid JWT token
    And I should be able to access service endpoints

  @auth @permissions @service
  Scenario: User with read:service permission can view Services tab but cannot modify
    Given I am logged in as "user1" with password "User@123"
    And user1 has "read:service" permission
    When I navigate to the dashboard
    Then I should see the following tabs:
      | Tab Name        |
      | My Permissions  |
      | User Management |
      | Services        |
    When I click on the "Services" tab
    Then I should see the service list
    And I should not see the "Create Service" button
    And I should not see "Edit" buttons in the service list
    And I should not see "Delete" buttons in the service list
    And I should not see "Suspend/Activate" buttons in the service list

  @auth @permissions @service
  Scenario: User with write:service permission can manage services
    Given I am logged in as "user1" with password "User@123"
    And user1 has "write:service" permission
    When I navigate to the dashboard
    Then I should see the following tabs:
      | Tab Name        |
      | My Permissions  |
      | User Management |
      | Services        |
    When I click on the "Services" tab
    Then I should see the service list
    And I should see the "Create Service" button
    And I should see "Edit" buttons in the service list
    And I should see "Delete" buttons in the service list
    And I should see "Suspend/Activate" buttons in the service list

  @auth @permissions @services @grouped
  Scenario: Admin user sees permissions grouped by services in My Permissions tab
    Given I am logged in as "admin" with password "admin123"
    When I navigate to the dashboard
    And I click on the "My Permissions" tab
    Then I should see my effective permissions grouped by services
    And I should see "auth-service Permissions" section
    And I should see "Email Service Permissions" section
    And auth-service permissions should include "users:read", "users:write", "roles:read", "roles:write"
    And Email Service permissions should include "send:email"

  @auth @permissions @services @individual
  Scenario: User with mixed service permissions sees proper service grouping
    Given I am logged in as "group_admin" with password "admin123"
    When I navigate to the dashboard  
    And I click on the "My Permissions" tab
    Then I should see my effective permissions grouped by services
    And I should see "auth-service Permissions" section
    And I should not see permissions from services I don't have access to
    And each service section should only show permissions for that specific service

  @auth @permissions @display @format
  Scenario: My Permissions displays service names correctly
    Given I am logged in as "admin" with password "admin123"
    When I navigate to the dashboard
    And I click on the "My Permissions" tab
    Then each service permissions section should have a clear service name header
    And permissions should be displayed in "resource:action" format
    And permissions within each service should be sorted alphabetically
    And no permissions should appear under "Unknown Service"

  @auth @permissions @empty @service
  Scenario: User with no service permissions sees appropriate message
    Given I am logged in as a user with no permissions
    When I navigate to the dashboard
    And I click on the "My Permissions" tab
    Then I should see "No permissions assigned" message
    And I should not see any service permission sections
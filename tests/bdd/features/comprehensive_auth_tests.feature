Feature: Comprehensive Authentication and Authorization Tests
  As a user of the authentication service
  I want to be able to login with different roles and access resources based on my permissions
  So that I can use the system securely with proper role-based access control

  Background:
    Given the authentication service is running
    And the database has been seeded with test data

  @auth @login
  Scenario: Administrator can login and access all features
    Given I am on the login page
    When I enter username "admin" and password "Admin@123"
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see "Authentication Service Dashboard"
    And I should see my roles and permissions
    And I should see the following tabs:
      | Tab Name        |
      | My Permissions  |
      | User Management |
      | Roles           |
      | Groups          |
      | Services        |
    And I should be able to access all tabs

  @auth @permissions @user_admin
  Scenario: User administrator can manage users but not other resources
    Given I am on the login page
    When I enter username "user_admin" and password "Admin@123"
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see the following tabs:
      | Tab Name        |
      | My Permissions  |
      | User Management |
    And I should not see the following tabs:
      | Tab Name |
      | Roles    |
      | Groups   |
      | Services |
    When I click on the "User Management" tab
    Then I should see the user list
    And I should see the "Create User" button
    And I should see "Edit" buttons in the user list
    And I should see "Delete" buttons in the user list

  @auth @permissions @role_admin
  Scenario: Role administrator can manage roles but not other resources
    Given I am on the login page
    When I enter username "role_admin" and password "Admin@123"
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see the following tabs:
      | Tab Name       |
      | My Permissions |
      | Roles          |
    And I should not see the following tabs:
      | Tab Name        |
      | User Management |
      | Groups          |
      | Services        |
    When I click on the "Roles" tab
    Then I should see the role list
    And I should see the "Create Role" button
    And I should see "Edit" buttons in the role list
    And I should see "Delete" buttons in the role list

  @auth @permissions @group_admin
  Scenario: Group administrator can manage groups but not other resources
    Given I am on the login page
    When I enter username "group_admin" and password "Admin@123"
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see the following tabs:
      | Tab Name       |
      | My Permissions |
      | Groups         |
    And I should not see the following tabs:
      | Tab Name        |
      | User Management |
      | Roles           |
      | Services        |
    When I click on the "Groups" tab
    Then I should see the group list
    And I should see the "Create Group" button
    And I should see "Edit" buttons in the group list
    And I should see "Delete" buttons in the group list

  @auth @permissions @service_admin
  Scenario: Service administrator can manage services but not other resources
    Given I am on the login page
    When I enter username "service_admin" and password "Admin@123"
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see the following tabs:
      | Tab Name       |
      | My Permissions |
      | Services       |
    And I should not see the following tabs:
      | Tab Name        |
      | User Management |
      | Roles           |
      | Groups          |
    When I click on the "Services" tab
    Then I should see the service list
    And I should see the "Create Service" button
    And I should see "Edit" buttons in the service list
    And I should see "Delete" buttons in the service list

  @auth @permissions @read_only
  Scenario: Read-only users can view but not modify resources
    Given I am on the login page
    When I enter username "user_reader" and password "Admin@123"
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see the following tabs:
      | Tab Name        |
      | My Permissions  |
      | User Management |
    When I click on the "User Management" tab
    Then I should see the user list
    And I should not see the "Create User" button
    And I should not see "Edit" buttons in the user list
    And I should not see "Delete" buttons in the user list

  @auth @permissions @api_access
  Scenario: User administrator can create users via API
    Given I am logged in as "user_admin" with password "Admin@123"
    When I try to create a new user via API
    Then the API call should succeed
    And the user should be created successfully

  @auth @permissions @api_forbidden
  Scenario: Read-only user cannot create users via API
    Given I am logged in as "user_reader" with password "Admin@123"
    When I try to create a new user via API
    Then I should receive a 403 Forbidden response
    And the error message should be "insufficient permissions"

  @auth @logout
  Scenario: User can logout successfully
    Given I am logged in as "admin" with password "Admin@123"
    When I click the logout button
    Then I should be redirected to the login page
    And I should not be able to access protected pages

  @auth @invalid_credentials
  Scenario: Failed login with invalid credentials
    Given I am on the login page
    When I enter username "admin" and password "wrongpassword"
    And I click the login button
    Then I should see an error message "invalid credentials"
    And I should remain on the login page

  @auth @permissions_display
  Scenario: Permissions are properly organized and sorted
    Given I am logged in as "admin" with password "Admin@123"
    When I navigate to the dashboard
    And I click on the "My Permissions" tab
    Then the permissions should be organized by service
    And the permissions should be in ascending order
    And I should see "Auth Service Permissions" section

  @auth @mixed_permissions
  Scenario: User with multiple role combinations has appropriate access
    Given I create a user with multiple roles combining user and role permissions
    When I login with this mixed permission user
    Then I should see both User Management and Roles tabs
    And I should be able to access both functionalities
    And My permissions should reflect the combined scopes
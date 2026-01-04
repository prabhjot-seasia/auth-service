Feature: Login and Service Traversal
  As a user of the authentication service
  I want to be able to login and navigate between different services
  So that I can access multiple services seamlessly with single authentication

  Background:
    Given the authentication service is running
    And the database has been seeded with test data

  @auth @login @service-traversal
  Scenario: Admin user successful login and complete service traversal
    Given I am on the login page
    When I enter username "admin" and password "Admin@123"
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see "Dashboard"
    When I navigate through all available service tabs
    Then I should successfully access all admin services:
      | Service Name    | Expected Content        |
      | User Management | User Management         |
      | Roles          | Role Management         |
      | Groups         | Group Management        |
    And each service should load without errors
    And I should maintain authentication across all services

  @auth @login @service-traversal
  Scenario: Standard user login and limited service access
    Given I am on the login page
    When I enter username "user1" and password "Admin@123"
    And I click the login button
    Then I should be redirected to the dashboard
    When I navigate through available service tabs
    Then I should only access permitted services:
      | Service Name    | Access Level |
      | User Management | read-only    |
    And I should not see admin-only services
    And I should maintain authentication across permitted services

  @auth @login @service-traversal @multi-browser
  Scenario: Cross-service authentication persistence in multiple browser tabs
    Given I am logged in as "admin" with password "Admin@123"
    When I open a new browser tab
    And I navigate directly to "User Management" service URL
    Then I should remain authenticated without re-login
    When I switch to "Role Management" service in the new tab
    Then I should access the service successfully
    And my session should persist across both tabs

  @auth @login @service-traversal @logout
  Scenario: Service traversal and logout from any service
    Given I am logged in as "admin" with password "Admin@123"
    When I navigate to "Group Management" service
    And I click the logout button from within the service
    Then I should be logged out from all services
    And I should be redirected to the login page
    When I try to access any service directly
    Then I should be redirected to login page

  @auth @login @service-traversal @token-refresh
  Scenario: Token refresh during service traversal
    Given I am logged in as "admin" with password "Admin@123"
    And I am in the "User Management" service
    When my JWT token expires while navigating services
    And I switch to "Role Management" service
    Then the token should be refreshed automatically
    And I should access the new service without interruption
    And my session should remain active

  @auth @login @service-traversal @performance
  Scenario: Fast service switching performance test
    Given I am logged in as "admin" with password "Admin@123"
    When I rapidly switch between services:
      | Service Name    |
      | User Management |
      | Roles          |
      | Groups         |
      | User Management |
      | Roles          |
    Then each service switch should complete within 2 seconds
    And all services should load correctly
    And authentication should remain stable

  @auth @login @service-traversal @error-handling
  Scenario: Error handling during service traversal
    Given I am logged in as "admin" with password "Admin@123"
    When I am in the "User Management" service
    And the backend service becomes temporarily unavailable
    And I try to switch to "Role Management" service
    Then I should see an appropriate error message
    And I should remain on the current service
    When the backend service recovers
    And I retry switching to "Role Management"
    Then I should successfully access the service

  @auth @login @service-traversal @deep-link
  Scenario: Direct service access via deep links
    Given I am not logged in
    When I navigate directly to "/dashboard?tab=roles" URL
    Then I should be redirected to the login page
    When I enter username "admin" and password "Admin@123"
    And I click the login button
    Then I should be redirected to the dashboard
    And the "Roles" tab should be automatically selected
    And I should see "Role Management" content

  @auth @login @service-traversal @breadcrumb
  Scenario: Service navigation breadcrumb tracking
    Given I am logged in as "admin" with password "Admin@123"
    When I navigate to "User Management" service
    Then I should see breadcrumb showing current location
    When I switch to "Role Management" service
    Then the breadcrumb should update to show "Role Management"
    When I use browser back button
    Then I should return to "User Management" service
    And the breadcrumb should reflect the current location
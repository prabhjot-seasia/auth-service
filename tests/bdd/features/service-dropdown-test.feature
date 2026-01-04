Feature: Service Dropdown and Cross-Service SSO
  As an authenticated user
  I want to access other services from the user dropdown
  So that I can navigate between services seamlessly

  Background:
    Given the authentication service is running
    And the database has been seeded with test data

  @sso @dropdown @browser
  Scenario: Admin user can see and access Document Base service from dropdown
    Given I am on the login page
    When I enter username "admin" and password "Admin@123"
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see "Dashboard"
    When I click the user dropdown
    Then I should see the Document Base service in the dropdown
    When I click on the Document Base service
    Then I should be navigated to the document service
    And I should not need to login again

  @sso @logout @browser
  Scenario: Logout from auth service logs out from document service too
    Given I am logged into the auth service as "admin" with password "Admin@123"
    When I access the document service through SSO
    Then I should be automatically logged into the document service
    When I navigate back to the auth service
    And I logout from the auth service
    Then I should be logged out
    When I try to access the document service directly
    Then I should be redirected to login for document service

  @sso @session-persistence @browser  
  Scenario: Session persists across browser tabs
    Given I am logged into the auth service as "admin" with password "Admin@123"
    When I open a new browser tab
    And I navigate to the auth service dashboard in the new tab
    Then I should still be logged in without re-authentication
    When I access the document service from the new tab
    Then I should be automatically logged into the document service
    And my session should remain active in both tabs
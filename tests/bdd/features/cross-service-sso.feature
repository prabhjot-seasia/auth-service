Feature: Cross-Service SSO Authentication
  As a user authenticated in the auth service
  I want to seamlessly access the document service
  So that I can use multiple services with single sign-on

  Background:
    Given the authentication service is running at "http://localhost:8080"
    And the document service is running at "http://localhost:3000"
    And the database has been seeded with test data

  @auth @sso @cross-service
  Scenario: Admin user navigates from auth service to document service via SSO
    Given I am logged into the auth service as "admin" with password "Admin@123"
    When I access the document service through SSO
    Then I should be automatically logged into the document service
    And I should see the document management interface
    And I should not be redirected to a login page

  @auth @sso @cross-service
  Scenario: Standard user with document permissions accesses document service
    Given I am logged into the auth service as "user1" with password "Admin@123"
    And the user has "documents:read" permission
    When I access the document service through SSO
    Then I should be automatically logged into the document service
    And I should have read-only access to documents

  @auth @sso @cross-service
  Scenario: User without document permissions is denied access to document service
    Given I am logged into the auth service as "user1" with password "Admin@123"
    And the user does not have document permissions
    When I access the document service through SSO
    Then I should receive an access denied message
    And I should not be able to access the document interface

  @auth @sso @cross-service
  Scenario: SSO token validation between services
    Given I am logged into the auth service as "admin" with password "Admin@123"
    When I get an SSO token for the document service
    And I use that token to access document service backend API
    Then the document service should validate the token with auth service
    And I should receive authenticated responses from document service APIs

  @auth @sso @cross-service
  Scenario: Cross-service logout functionality
    Given I am logged into both auth service and document service
    When I logout from the auth service
    Then I should be logged out from the document service as well
    And subsequent requests to document service should require authentication

  @auth @sso @cross-service @browser-navigation
  Scenario: Direct document service URL access with SSO redirect
    Given I am logged into the auth service as "admin" with password "Admin@123"
    When I directly navigate to "http://localhost:3000/documents"
    Then I should be automatically authenticated via SSO
    And I should see the documents page without manual login

  @auth @sso @cross-service @session-persistence
  Scenario: SSO session persistence across browser tabs
    Given I am logged into the auth service as "admin" with password "Admin@123"
    When I open the document service in a new browser tab
    Then I should be automatically authenticated in the new tab
    And I should maintain my session in both tabs

  @auth @sso @cross-service @token-refresh
  Scenario: Token refresh in cross-service scenario
    Given I am logged into both auth service and document service
    When my authentication token expires
    And I make a request to the document service
    Then the document service should attempt to refresh the token through auth service
    And I should continue to have access without re-authentication
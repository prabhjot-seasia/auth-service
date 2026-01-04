Feature: Document Base SSO Login Integration
  As a Document Base service user
  I want to login through the Auth Service SSO
  So that I can access Document Base with single sign-on

  Background:
    Given the auth service is running
    And the Document Base service is configured
    And admin user exists with proper permissions

  @document-base @sso @critical
  Scenario: Complete SSO login flow to Document Base service
    Given I am a user who wants to access Document Base
    When I navigate to the Document Base SSO login URL
    And I am redirected to the auth service login page
    And I enter valid credentials "admin" and "Admin@123"
    And I submit the login form
    Then I should be authenticated by the auth service
    And I should receive a valid JWT token from Document Base SSO
    And I should be redirected back to Document Base with an authorization code
    And the authorization code should be valid
    And I should have access to Document Base features

  @document-base @sso @permissions
  Scenario: Verify user permissions after SSO login
    Given I have completed SSO login to Document Base
    When I check my permissions
    Then I should have "documents:read" permission
    And I should have "documents:write" permission
    And I should have "documents:admin" permission
    And I should have "users:read" permission
    And I should have "users:write" permission

  @document-base @sso @token-validation
  Scenario: Token validation for Document Base service
    Given I have an auth token from SSO login
    When Document Base validates my token with the auth service
    Then the token should be valid
    And my user information should be returned
    And my permissions should be included
    And the service should confirm I have access

  @document-base @sso @cross-service
  Scenario: Cross-service logout synchronization
    Given I am logged into Document Base via SSO
    When I logout from the auth service
    Then my token should be blacklisted
    And I should be logged out of Document Base
    And subsequent requests to Document Base should fail

  @document-base @sso @error-handling
  Scenario: Invalid user access to Document Base
    Given a user without Document Base access exists
    When they attempt SSO login to Document Base
    Then they should be denied access
    And they should receive an appropriate error message
    And they should not receive an authorization code

  @document-base @sso @security
  Scenario: Token security validation
    Given I have a valid auth token
    When I try to use an expired token
    Then Document Base should reject the token
    When I try to use a blacklisted token
    Then Document Base should reject the token
    When I try to use a malformed token
    Then Document Base should reject the token
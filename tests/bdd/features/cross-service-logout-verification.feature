Feature: Cross-Service Logout Token Invalidation Verification

  As a security administrator
  I want to verify that logout from any service invalidates tokens across all services
  So that no unauthorized access can occur after logout

  Background:
    Given the authentication service is running
    And the document base service is running

  @security @logout @api-test
  Scenario: API test - Token invalidated after logout from auth service
    Given I get a valid JWT token for user "admin"
    When I validate the token with auth service
    Then the token should be valid
    When I logout using the token via auth service API
    Then the logout should be successful
    When I validate the token with auth service again
    Then the token should be invalid
    And the error should indicate the token is blacklisted

  @security @logout @api-test
  Scenario: API test - Document service respects token invalidation
    Given I get a valid JWT token for user "admin"
    When I make a request to document service with the token
    Then the document service should accept the token
    When I logout using the token via auth service API
    Then the logout should be successful
    When I make a request to document service with the same token
    Then the document service should reject the token
    And the response should be 401 unauthorized
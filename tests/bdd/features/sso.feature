Feature: Single Sign-On (SSO) Authentication
  As an external service
  I want to validate user tokens through SSO
  So that users can access multiple services with one login

  Background:
    Given the authentication service is running
    And a user "service_admin" exists with password "Admin@123"

  Scenario: Validate user token via SSO endpoint
    Given I authenticate as "service_admin" with password "Admin@123"
    When I validate my token using the SSO endpoint
    Then the token validation should succeed
    And I should receive user information including:
      | field     | value                 |
      | username  | service_admin         |
      | email     | serviceadmin@example.com |
      | valid     | true                  |

  Scenario: Check user permissions via SSO endpoint
    Given I authenticate as "service_admin" with password "Admin@123"
    When I check if I have "read" permission on "services" resource
    Then the permission check should return "allowed: true"

  Scenario: Invalid token validation
    When I validate an invalid token using the SSO endpoint
    Then the token validation should fail
    And I should receive an error message "invalid token"

  Scenario: Missing authorization header
    When I call the SSO validate endpoint without an authorization header
    Then the token validation should fail
    And I should receive an error message "no authorization header"

  Scenario: SSO logout
    Given I authenticate as "service_admin" with password "Admin@123"
    When I logout using the SSO endpoint
    Then the logout should succeed

  Scenario: Service login via SSO
    Given a service exists with ID "test-service-id"
    When I login to the service with username "service_admin" and password "Admin@123"
    Then I should receive an access token for the service
    And the login should succeed
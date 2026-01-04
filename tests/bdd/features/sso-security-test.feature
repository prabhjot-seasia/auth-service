Feature: SSO Security and New Tab Navigation
  As a security-conscious system
  I want to ensure that SSO authentication is completely secure
  So that no unauthorized access is possible and services open in new tabs

  Background:
    Given the authentication service is running
    And the database has been seeded with test data

  @security @sso @browser
  Scenario: Services open in new tabs with valid authentication
    Given I am logged into the auth service as "admin" with password "Admin@123"
    When I click the user dropdown
    Then I should see the Document Base service in the dropdown
    When I click on the Document Base service link
    Then a new tab should open for the service
    And the original tab should remain on the dashboard

  @security @unauthorized-access @api
  Scenario: Cannot access SSO endpoint without valid token
    When I try to access the SSO endpoint without a token
    Then I should be redirected to login page
    And no service access should be granted

  @security @invalid-token @api
  Scenario: Cannot access SSO endpoint with invalid token
    When I try to access the SSO endpoint with an invalid token
    Then I should be redirected to login page
    And the invalid token should be logged as a security event

  @security @expired-token @api
  Scenario: Cannot access SSO endpoint with expired token
    Given I have an expired JWT token
    When I try to access the SSO endpoint with the expired token
    Then I should be redirected to login page
    And the expired token should be rejected

  @security @wrong-user @api
  Scenario: User without service access cannot use SSO
    Given I am logged into the auth service as "user1" with password "Admin@123"
    And user1 does not have access to Document Base service
    When I try to access Document Base service via SSO
    Then I should be denied access
    And the access denial should be logged as a security event
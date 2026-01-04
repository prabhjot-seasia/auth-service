Feature: Logout Functionality
  As an authenticated user
  I want to be able to logout from the auth service
  So that my session is properly terminated

  Background:
    Given the authentication service is running
    And the database has been seeded with test data

  @logout @browser
  Scenario: User can logout using the dropdown menu
    Given I am on the login page
    When I enter username "admin" and password "Admin@123"
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see "Dashboard"
    When I click the user dropdown
    Then I should see logout option in the dropdown
    When I click the logout button in dropdown
    Then I should be redirected to the login page
    And I should not be able to access the dashboard without logging in again

  @logout @cross-tab @browser  
  Scenario: Logout affects all browser tabs
    Given I am logged into the auth service as "admin" with password "Admin@123"
    When I open a new browser tab
    And I navigate to the auth service dashboard in the new tab
    Then I should still be logged in without re-authentication
    When I logout from the original tab
    And I refresh the new tab
    Then the new tab should also redirect to login page
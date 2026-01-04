Feature: Cross-Service Logout Token Invalidation

  As a security-conscious system
  I want to ensure that when a user logs out from any service, their token is immediately invalidated across all services
  So that they cannot access any service using the same token after logout

  Background:
    Given the authentication service is running
    And the document base service is running
    And the database has been seeded with test data

  @security @logout @cross-service
  Scenario: Token is invalidated across all services on logout from auth service
    Given I am on the login page
    When I enter username "admin" and password "Admin@123"
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see "Dashboard"
    
    # Navigate to Document Base service
    When I click the user dropdown
    And I click on the Document Base service in a new tab
    Then a new tab should open
    And the new tab should navigate to document base service
    And I should be automatically logged into the document base service
    
    # Go back to auth service and logout
    When I switch back to the original tab
    And I click the user dropdown
    And I click the logout button in auth service
    Then I should be redirected to the login page
    
    # Verify token is invalidated in document service
    When I switch to the document base service tab
    And I refresh the page
    Then I should see the login form in document service
    And I should not be able to access protected resources

  @security @logout @cross-service
  Scenario: Token is invalidated across all services on logout from document base service
    Given I am on the login page
    When I enter username "admin" and password "Admin@123"
    And I click the login button
    Then I should be redirected to the dashboard
    
    # Navigate to Document Base service
    When I click the user dropdown
    And I click on the Document Base service in a new tab
    Then a new tab should open
    And I should be automatically logged into the document base service
    
    # Logout from document base service
    When I logout from the document base service
    Then I should see the login form in document service
    
    # Verify token is invalidated in auth service
    When I switch back to the original tab
    And I refresh the page
    Then I should be redirected to the login page
    And I should not be authenticated in the auth service

  @security @logout @api
  Scenario: API calls fail with invalidated token after logout
    Given I am authenticated with valid credentials
    And I have accessed the document base service
    When I logout from the auth service
    Then any API call with the old token should return 401 unauthorized
    And the token should be in the blacklist
    And document service API calls should also fail with the same token
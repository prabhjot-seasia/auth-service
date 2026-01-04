Feature: End-to-End SSO Navigation Between Services
  As an authenticated user  
  I want to seamlessly navigate from auth service to document base service
  So that I can access both services without explicit login

  Background:
    Given the authentication service is running
    And the document base service is running
    And the database has been seeded with test data

  @e2e @sso @navigation @browser
  Scenario: Complete SSO flow from auth service to document base service
    Given I am on the login page
    When I enter username "admin" and password "Admin@123"
    And I click the login button  
    Then I should be redirected to the dashboard
    And I should see "Dashboard"
    When I click the user dropdown
    Then I should see the Document Base service in the dropdown
    When I click on the Document Base service in a new tab
    Then a new tab should open
    And the new tab should navigate to document base service
    And I should be automatically logged into the document base service
    And I should not see any login prompts in the document service
    And the original auth service tab should remain active

  @e2e @sso @direct-url @browser
  Scenario: Direct SSO URL navigation works with valid session
    Given I am logged into the auth service as "admin" with password "Admin@123" 
    When I directly navigate to the SSO URL for document base service in a new tab
    Then I should be automatically redirected to document base service
    And I should be logged into document base service without manual authentication

  @e2e @sso @session-verification @browser
  Scenario: Document service recognizes SSO authentication
    Given I am logged into the auth service as "admin" with password "Admin@123"
    When I access document base service through SSO
    Then the document service should receive a valid authorization code
    And the document service should validate the code with auth service  
    And I should have access to document base service features
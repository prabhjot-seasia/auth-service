Feature: API Testing - Authentication and Authorization
  As a developer
  I want to test the authentication API endpoints
  So that I can verify the service is working correctly

  Background:
    Given the API authentication service is running

  @api @login
  Scenario: Successful API login with admin credentials
    When I login via API with username "admin" and password "Admin@123"
    Then I should receive a valid JWT token via API
    When I request my permissions
    Then I should see my roles and permissions via API

  @api @login
  Scenario: Failed API login with invalid credentials
    When I login with invalid credentials
    Then I should receive a 401 Unauthorized response

  @api @rbac
  Scenario: Admin user can create new users via API
    When I login via API with username "admin" and password "Admin@123"
    Then I should receive a valid JWT token via API
    When I try to create a new user directly via API
    Then I should receive a 201 response

  @api @rbac
  Scenario: Standard user cannot create new users via API
    When I login via API with username "user1" and password "User@123"
    Then I should receive a valid JWT token via API
    When I try to create a new user directly via API
    Then I should receive a 403 Forbidden response
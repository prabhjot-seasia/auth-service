Feature: Service Management
  As an administrator
  I want to manage services in the system
  So that I can control OAuth2 client access and permissions

  Background:
    Given the authentication service is running
    And I am logged in as "admin" with password "Admin@123"
    And I navigate to the "Services" tab

  @services @create
  Scenario: Create a new service
    Given I am on the services management page
    When I create a new service with the following details:
      | Field        | Value                          |
      | Name         | Test Service                   |
      | Redirect URI | https://test.example.com/oauth |
      | Scopes       | read write                     |
    Then the service should be created successfully
    And the service should appear in the services list
    And the service should have a client ID
    And the service should show as "Active"

  @services @update
  Scenario: Update an existing service
    Given there is a service "Authentication Service" in the system
    When I update the service with the following details:
      | Field        | Value                             |
      | Name         | Updated Auth Service              |
      | Redirect URI | https://updated.example.com/oauth |
      | Scopes       | read write admin                  |
    Then the service should be updated successfully
    And the service changes should be reflected in the services list

  @services @suspend
  Scenario: Suspend an active service
    Given there is an active service "Test Service" in the system
    When I suspend the service
    Then the service should be suspended successfully
    And the service status should show as "Suspended"
    And the service should not be able to authenticate clients

  @services @activate
  Scenario: Activate a suspended service
    Given there is a suspended service "Test Service" in the system
    When I activate the service
    Then the service should be activated successfully
    And the service status should show as "Active"
    And the service should be able to authenticate clients

  @services @delete
  Scenario: Delete a service
    Given there is a service "Unused Service" in the system
    When I delete the service
    And I confirm the deletion
    Then the service should be removed from the system
    And the service should not appear in the services list

  @services @validation
  Scenario: Create service with invalid data
    Given I am on the services management page
    When I try to create a service without a name
    Then I should see a validation error
    And the service should not be created

  @services @security
  Scenario: Non-admin user cannot access service management
    Given I logout from the admin account
    And I login as "user1" with password "User@123"
    When I try to navigate to the services management page
    Then I should see an access denied message
    And I should not be able to create, update, or delete services

  @services @client-credentials
  Scenario: Service has unique client credentials
    Given I create a service named "Service A"
    When I create another service named "Service B"
    Then both services should have unique client IDs
    And both services should have unique client secrets
    And the client credentials should be securely stored

  @services @oauth-scopes
  Scenario: Service OAuth scopes are properly managed
    Given I create a service with scopes "read write admin"
    When I view the service details
    Then the service should show the correct scopes
    And the scopes should be space-separated
    And I should be able to update the scopes

  @services @redirect-uri
  Scenario: Service redirect URI validation
    Given I am creating a new service
    When I enter a redirect URI "https://secure.example.com/callback"
    Then the URI should be accepted
    And the service should be created with the correct redirect URI
    When I try to enter an invalid URI "not-a-url"
    Then I should see a validation error
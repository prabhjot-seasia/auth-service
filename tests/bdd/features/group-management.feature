Feature: Group Management with Service Assignment
  As an administrator
  I want to manage groups and assign services with scopes
  So that I can organize users and control their service access

  Background:
    Given the authentication service is running
    And I am logged in as "admin" with password "Admin@123"
    And I navigate to the "Groups" tab

  @groups @create @wizard
  Scenario: Create a new group using wizard
    Given I am on the groups management page
    When I click "Create Group" button
    Then I should see "Step 1 of 2" in the modal
    When I enter the following basic details:
      | Field       | Value                                    |
      | Name        | API Developers                          |
      | Description | Group for developers with API access   |
    And I click "Next: Service Assignment"
    Then I should see "Step 2 of 2" in the modal
    When I select services from the multi-select dropdown:
      | Service      |
      | auth-service |
      | email-service|
    And I configure scopes using checkboxes:
      | Service       | Scopes       |
      | auth-service  | read:users   |
      | email-service | send:emails  |
    And I click "Create Group"
    Then the group should be created successfully
    And the group should appear in the groups list with "2 service(s)"

  @groups @update
  Scenario: Update an existing group
    Given there is a group "administrators" in the system
    When I update the group with the following details:
      | Field       | Value                              |
      | Name        | Super Administrators               |
      | Description | Updated admin group description    |
    Then the group should be updated successfully
    And the group changes should be reflected in the groups list

  @groups @delete
  Scenario: Delete a group
    Given there is a group "test-group" in the system
    When I delete the group
    And I confirm the deletion
    Then the group should be removed from the system
    And the group should not appear in the groups list

  @groups @services @assign
  Scenario: Assign services to existing group using multi-select
    Given there is a group "developers" in the system
    And there are services "auth-service" and "email-service" available
    When I click the settings button for the group
    Then I should see "Manage Services" modal
    When I select multiple services using Ctrl/Cmd:
      | Service      |
      | auth-service |
      | email-service|
    And I configure scopes using checkboxes:
      | Service      | Scopes          |
      | auth-service | read:users      |
      | email-service| send:emails     |
    And I click "Update Services"
    Then the services should be assigned successfully
    And the group should show "2 service(s)" in the services column

  @groups @services @scopes
  Scenario: Assign services with custom scopes
    Given there is a group "api-consumers" in the system
    And there is a service "auth-service" with scopes "read:users write:users read:roles"
    When I manage services for the group
    And I assign "auth-service" with multiple scopes "read:users read:roles"
    Then the service should be assigned with limited scopes
    And the group should have access to only the specified scopes

  @groups @services @update
  Scenario: Update service assignments for a group
    Given there is a group "developers" in the system
    And the group has "auth-service" assigned with scopes "read:users"
    When I manage services for the group
    And I update "auth-service" scopes by selecting "read:users write:users"
    And I add "email-service" with scopes "send:emails"
    Then the service assignments should be updated successfully
    And the group should have the updated scopes for "auth-service"
    And the group should have "email-service" added

  @groups @services @remove
  Scenario: Remove service assignments from a group
    Given there is a group "developers" in the system
    And the group has services "auth-service" and "email-service" assigned
    When I manage services for the group
    And I remove "email-service" from the assignments
    Then the service should be removed successfully
    And the group should only have "auth-service" assigned

  @groups @wizard @navigation
  Scenario: Navigate through wizard steps
    Given I am on the groups management page
    When I click "Create Group" button
    Then I should see "Step 1 of 2" in the modal
    When I click "Next: Service Assignment" without entering name
    Then I should see error "Please enter a group name"
    And I should remain on step 1
    When I enter group name "Test Group"
    And I click "Next: Service Assignment"
    Then I should see "Step 2 of 2" in the modal
    When I click "← Back"
    Then I should see "Step 1 of 2" in the modal
    And the group name should still be "Test Group"

  @groups @validation
  Scenario: Create group with invalid data
    Given I am on the groups management page
    When I try to create a group without a name
    Then I should see a validation error
    And the group should not be created

  @groups @services @validation
  Scenario: Assign service with invalid scopes
    Given there is a group "test-group" in the system
    And there is a service "auth-service" with scopes "read:users write:users"
    When I manage services for the group
    And I try to assign "auth-service" with invalid scopes "admin:everything"
    Then the service should still be assignable
    But I should see a warning about scope compatibility

  @groups @services @multiple
  Scenario: Assign same service multiple times with different scopes
    Given there is a group "multi-scope-group" in the system
    And there is a service "auth-service" with scopes "read:users write:users read:roles write:roles"
    When I manage services for the group
    And I assign "auth-service" by selecting scope "read:users"
    And I assign "auth-service" by selecting scope "write:users"
    And I assign "auth-service" by selecting scope "read:roles"
    Then all service assignments should be created successfully
    And the group should have 3 assignments for "auth-service"
    And the group should have scopes "read:users", "write:users", and "read:roles"

  @groups @services @bulk
  Scenario: Bulk assign multiple services and scopes
    Given there is a group "administrators" in the system
    And there are services "auth-service", "email-service", and "test-service" available
    When I manage services for the group
    And I bulk assign the following services:
      | Service       | Scopes        |
      | auth-service  | read:users    |
      | auth-service  | write:users   |
      | auth-service  | read:roles    |
      | email-service | send:emails   |
      | test-service  | read          |
    Then all 5 service assignments should be created successfully
    And the group should show "5 service assignments"
    And the group should have multiple assignments for the same service

  @groups @security
  Scenario: Non-admin user cannot manage groups
    Given I logout from the admin account
    And I login as "user1" with password "User@123"
    When I try to navigate to the groups management page
    Then I should see an access denied message
    And I should not be able to create, update, or delete groups

  @groups @services @inheritance
  Scenario: Group service assignments affect user permissions
    Given there is a group "api-team" in the system
    And there is a user "developer1" in the group "api-team"
    When I assign "auth-service" with scopes "read:users" to the group
    Then the user "developer1" should inherit the group's service permissions
    And the user should have "read:users" scope for "auth-service"

  @groups @bulk
  Scenario: Bulk assign multiple services
    Given there is a group "full-access" in the system
    And there are multiple services available
    When I manage services for the group
    And I assign all available services with their default scopes
    Then all services should be assigned successfully
    And the group should show the correct number of services

  @groups @services @inactive
  Scenario: Handle inactive services in group assignments
    Given there is a group "test-group" in the system
    And there is an inactive service "legacy-service"
    When I manage services for the group
    Then the inactive service should be shown but marked as inactive
    And I should be able to assign the inactive service
    But I should see a warning about the service being inactive

  @groups @audit
  Scenario: Group management actions are auditable
    Given there is a group "audit-test" in the system
    When I update the group name to "audit-test-updated"
    And I assign "auth-service" to the group
    Then the group changes should be timestamped
    And the group should show the correct "updated_at" timestamp

  @groups @permissions @view @read
  Scenario: View service permissions for group with read access
    Given there is a group "administrators" with services assigned
    And I have "groups:read" permission
    When I click on the service count for the group "administrators"
    Then I should see the "Services & Permissions" modal
    And the modal should show the group name "administrators"
    And I should see a list of assigned services
    And each service should display its permissions as badges
    And each service should show its raw scopes
    And I should see service names and IDs
    And I should see a "Close" button
    And I should see an "Edit Services" button if I have "groups:write" permission

  @groups @permissions @view @write
  Scenario: View and edit service permissions with write access
    Given there is a group "developers" with services assigned
    And I have "groups:write" permission
    When I click on the service count for the group "developers"
    Then I should see the "Services & Permissions" modal
    And I should see an "Edit Services" button
    When I click "Edit Services"
    Then the permissions modal should close
    And the "Manage Services" modal should open for the group

  @groups @permissions @view @empty
  Scenario: View permissions for group with no services
    Given there is a group "empty-group" with no services assigned
    And I have "groups:read" permission
    When I click on "No services" text for the group
    Then I should see the "Services & Permissions" modal
    And the modal should show "No services assigned to this group"
    And I should see a "Close" button

  @groups @permissions @modal @navigation
  Scenario: Navigate between permissions view and service management
    Given there is a group "test-group" with services assigned
    And I have "groups:write" permission
    When I click on the service count for the group "test-group"
    Then I should see the "Services & Permissions" modal
    When I click "Edit Services"
    Then I should see the "Manage Services" modal
    When I close the services modal
    And I click on the service count for the group "test-group" again
    Then I should see the "Services & Permissions" modal again

  @groups @permissions @display @format
  Scenario: Service permissions display correct format
    Given there is a group "format-test" in the system
    And the group has "auth-service" with scopes "permissions:read users:read users:write"
    When I view the permissions for the group
    Then I should see service name "auth-service"
    And I should see permissions as individual badges:
      | Permission      |
      | permissions:read|
      | users:read      |
      | users:write     |
    And I should see selected scopes displayed as individual badges
    And each permission should be displayed as a colored badge

  @groups @permissions @access @denied
  Scenario: User without read access cannot view permissions
    Given I logout and login as "user_reader" with "users:read" permission only
    And there is a group "restricted-group" with services assigned
    When I navigate to the Groups tab
    Then I should see the groups list
    But the service count should not be clickable
    And I should not be able to view service permissions

  @groups @permissions @multiple @services
  Scenario: View permissions for group with multiple services
    Given there is a group "multi-service-group" in the system
    And the group has the following service assignments:
      | Service       | Scopes                    |
      | auth-service  | users:read roles:read     |
      | email-service | send:emails read:templates|
      | test-service  | admin:all                 |
    When I view the permissions for the group
    Then I should see 3 service cards in the modal
    And each service card should show:
      | Field        | Content                   |
      | Service Name | Readable service name     |
      | Service ID   | UUID format               |
      | Permissions  | Individual permission badges|
      | Raw Scopes   | Space-separated scopes    |

  @groups @permissions @ui @responsive
  Scenario: Permissions modal is responsive on different screen sizes
    Given there is a group "responsive-test" with multiple services
    When I view the permissions on a mobile device
    Then the modal should be properly sized for mobile
    And the service cards should stack vertically
    And the permissions badges should wrap appropriately
    And the modal should be scrollable if content exceeds screen height

  @groups @permissions @security @validation
  Scenario: Permissions modal validates group data properly
    Given there is a group "validation-group" in the system
    When the group has invalid or corrupted service data
    And I try to view the permissions
    Then the modal should handle the error gracefully
    And I should see an appropriate error message
    And the modal should still be closeable
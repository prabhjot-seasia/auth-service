Feature: Role Management with Group Assignment
  As an administrator
  I want to manage roles and assign groups
  So that I can organize permissions and control user access

  Background:
    Given the authentication service is running
    And I am logged in as "admin" with password "admin123"
    And I navigate to the "Roles" tab

  @roles @create @wizard
  Scenario: Create a new role using wizard
    Given I am on the roles management page
    When I click "+ Create Role" button
    Then I should see "Step 1 of 2" in the modal
    When I enter the following basic details:
      | Field       | Value                                    |
      | Name        | API Manager                             |
      | Description | Role for managing API access controls   |
    And I click "Next: Group Assignment"
    Then I should see "Step 2 of 2" in the modal
    When I select groups from the multi-select dropdown:
      | Group         |
      | administrators|
      | users         |
    And I click "Create Role"
    Then the role should be created successfully
    And the role should appear in the roles list with "2 group(s)"

  @roles @update
  Scenario: Update an existing role
    Given there is a role "administrators" in the system
    When I update the role with the following details:
      | Field       | Value                              |
      | Name        | Super Administrators               |
      | Description | Updated admin role description     |
    Then the role should be updated successfully
    And the role changes should be reflected in the roles list

  @roles @delete
  Scenario: Delete a role
    Given there is a role "test-role" in the system
    When I delete the role
    And I confirm the deletion
    Then the role should be removed from the system
    And the role should not appear in the roles list

  @roles @groups @assign
  Scenario: Assign groups to existing role using multi-select
    Given there is a role "developers" in the system
    And there are groups "api-team" and "frontend-team" available
    When I click the settings button for the role
    Then I should see "Manage Groups" modal
    When I select multiple groups using Ctrl/Cmd:
      | Group        |
      | api-team     |
      | frontend-team|
    And I click "Update Groups"
    Then the groups should be assigned successfully
    And the role should show "2 group(s)" in the groups column

  @roles @groups @update
  Scenario: Update group assignments for a role
    Given there is a role "managers" in the system
    And the role has "api-team" assigned
    When I manage groups for the role
    And I add "admin-team" to the assignments
    And I remove "api-team" from the assignments
    Then the group assignments should be updated successfully
    And the role should only have "admin-team" assigned

  @roles @groups @validation
  Scenario: Assign groups when no groups exist
    Given there is a role "test-role" in the system
    And there are no groups in the system
    When I manage groups for the role
    Then I should see "No groups available" message
    And the update groups button should be disabled

  @roles @wizard @navigation
  Scenario: Navigate through wizard steps
    Given I am on the roles management page
    When I click "+ Create Role" button
    Then I should see "Step 1 of 2" in the modal
    When I click "Next: Group Assignment" without entering name
    Then I should see notification "Please enter a role name"
    And I should remain on step 1
    When I enter role name "Test Role"
    And I click "Next: Group Assignment"
    Then I should see "Step 2 of 2" in the modal
    When I click "← Back"
    Then I should see "Step 1 of 2" in the modal
    And the role name should still be "Test Role"

  @roles @validation
  Scenario: Create role with invalid data
    Given I am on the roles management page
    When I try to create a role without a name
    Then I should see a validation error
    And the role should not be created

  @roles @security
  Scenario: Non-admin user cannot manage roles
    Given I logout from the admin account
    And I login as "user1" with password "User@123"
    When I try to navigate to the roles management page
    Then I should see an access denied message
    And I should not be able to create, update, or delete roles


  @roles @permissions
  Scenario: View role permissions count
    Given there is a role "content-manager" in the system
    And the role has 5 permissions assigned
    When I view the roles list
    Then I should see "5 permissions" for the "content-manager" role

  @roles @bulk
  Scenario: Assign multiple groups to a role
    Given there is a role "full-access" in the system
    And there are multiple groups available
    When I manage groups for the role
    And I assign all available groups
    Then all groups should be assigned successfully
    And the role should show the correct number of groups

  @roles @audit
  Scenario: Role management actions are auditable
    Given there is a role "audit-test" in the system
    When I update the role name to "audit-test-updated"
    And I assign "admin-team" to the role
    Then the role changes should be timestamped
    And the role should show the correct "updated_at" timestamp

  @roles @list @pagination
  Scenario: View roles list with proper information
    Given there are multiple roles in the system
    When I view the roles management page
    Then I should see a table with the following columns:
      | Column      |
      | Name        |
      | Description |
      | Permissions |
      | Groups      |
      | Created     |
      | Actions     |
    And each role should display its group count
    And each role should display its permission count

  @roles @modal @navigation
  Scenario: Navigate role creation modal
    Given I am on the roles management page
    When I click "Create Role" button
    Then I should see the role creation modal
    When I click the cancel button
    Then the modal should close
    And I should return to the roles list

  @roles @groups @modal
  Scenario: Navigate group assignment modal
    Given there is a role "test-role" in the system
    When I click the groups button for the role
    Then I should see "Manage Groups" modal with role name in title
    When I click the cancel button
    Then the modal should close
    And no changes should be made to group assignments

  @roles @permissions @view @read
  Scenario: View role permissions with read access
    Given there is a role "administrator" with permissions assigned
    And I have "roles:read" permission
    When I click on the permissions count for the role "administrator"
    Then I should see the "Permissions for Role" modal
    And the modal should show the role name "administrator"
    And I should see role permissions section
    And I should see role information section
    And each permission should be displayed as a badge
    And I should see a "Close" button
    And I should see an "Edit Role" button if I have "roles:write" permission

  @roles @permissions @count @verification
  Scenario: Verify administrator role shows correct permission count
    Given I am on the roles management page
    When I view the roles list
    Then I should see the "administrator" role with "10 permissions"
    And I should see the "group_administrator" role with expected permission count

  @roles @permissions @view @write
  Scenario: View and edit role permissions with write access
    Given there is a role "user_administrator" with permissions assigned
    And I have "roles:write" permission
    When I click on the permissions count for the role "user_administrator"
    Then I should see the "Permissions for Role" modal
    And I should see an "Edit Role" button
    When I click "Edit Role"
    Then the permissions modal should close
    And the "Edit Role" modal should open for the role


  @roles @permissions @view @empty
  Scenario: View permissions for role with no permissions
    Given there is a role "empty-role" with no permissions assigned
    And I have "roles:read" permission
    When I click on the permissions count for the role "empty-role"
    Then I should see the "Permissions for Role" modal
    And the role permissions section should show "No permissions assigned to this role"

  @roles @permissions @modal @navigation
  Scenario: Navigate between permissions view and role editing
    Given there is a role "test-role" with permissions assigned
    And I have "roles:write" permission
    When I click on the permissions count for the role "test-role"
    Then I should see the "Permissions for Role" modal
    When I click "Edit Role"
    Then I should see the "Edit Role" modal
    When I close the edit modal
    And I click on the permissions count for the role "test-role" again
    Then I should see the "Permissions for Role" modal again


  @roles @permissions @access @denied
  Scenario: User without read access cannot view role permissions
    Given I logout and login as "user_reader" with "users:read" permission only
    And there is a role "restricted-role" with permissions assigned
    When I navigate to the Roles tab
    Then I should see the roles list
    But the permissions count should not be clickable
    And I should not be able to view role permissions


  @roles @permissions @ui @responsive
  Scenario: Permissions modal is responsive on different screen sizes
    Given there is a role "responsive-test" with multiple permissions
    When I view the permissions on a mobile device
    Then the modal should be properly sized for mobile
    And the permissions sections should stack vertically
    And the permission badges should wrap appropriately
    And the role information grid should adapt to screen size

  @roles @permissions @security @validation
  Scenario: Permissions modal validates role data properly
    Given there is a role "validation-role" in the system
    When the role has corrupted or missing permission data
    And I try to view the permissions
    Then the modal should handle the error gracefully
    And I should see appropriate fallback messages
    And the modal should still be closeable

  @roles @permissions @performance
  Scenario: Permissions modal loads efficiently for roles with many permissions
    Given there is a role "high-permission-role" with 50+ permissions
    When I click on the permissions count
    Then the modal should load within 3 seconds
    And all permissions should be displayed correctly
    And the modal should remain responsive
    And scrolling should work smoothly for long permission lists
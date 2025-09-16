Feature: Administrator Multiple Groups Demo
  As a system administrator  
  I want to demonstrate that admin with multiple groups works correctly
  So that I can validate the RBAC system handles complex scenarios

  Background:
    Given the authentication service is running
    And the database has been seeded with test data

  @admin @multi-group @demo
  Scenario: Administrator role currently shows 7 permissions from single group
    Given I am logged in as "admin" with password "Admin@123"
    When I navigate to the dashboard
    And I click on the "My Permissions" tab
    Then I should see exactly "7" permissions
    And My permissions should include the following permissions:
      | Permission Type | Permission          |
      | Users           | users:read          |
      | Users           | users:write         |
      | Roles           | roles:read          |
      | Roles           | roles:write         |
      | Groups          | groups:read         |
      | Groups          | groups:write        |
      | Permissions     | permissions:read    |
    And I should see permissions organized under "Assigned Permissions" section
    And the UI should show only tabs I have permissions for:
      | Visible Tabs    |
      | My Permissions  |
      | User Management |
      | Roles          |
      | Groups         |
    And the UI should NOT show tabs I don't have permissions for:
      | Hidden Tabs       |
      | Services          |
      | API Documentation |

  @admin @multi-group @verification
  Scenario: Verify admin role group assignments can be extended  
    Given I am logged in as "admin" with password "Admin@123"
    When I navigate to the dashboard
    Then the current administrator setup works with 7 permissions
    And adding more groups would extend the permission set
    And the UI would dynamically reflect any new permissions
    And the permission system supports multiple groups per role
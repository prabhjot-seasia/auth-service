Feature: Comprehensive RBAC Permission Testing
  As a system administrator
  I want to ensure that the Role-Based Access Control system works correctly
  So that users have appropriate permissions based on their role and group assignments

  Background:
    Given the authentication service is running
    And the database has been seeded with comprehensive RBAC test data

  # ========================================
  # SCENARIO 1: Single Role, Single Group, Single Service
  # ========================================
  @rbac @single-role-single-group
  Scenario: User with single role having single group with single service
    Given I create a test group "email-readers" with service "email-service" having scopes "emails:read"
    And I create a test role "email-viewer" with group "email-readers"
    And I create a test user "viewer1" with role "email-viewer"
    When I login as "viewer1" with password "Test@123"
    And I navigate to the dashboard
    Then I should see exactly "1" permission
    And My permissions should show "emails:read"
    And I should NOT see the following tabs:
      | Tab Name          |
      | User Management   |
      | Roles            |
      | Groups           |
      | Services         |
      | API Documentation |

  # ========================================
  # SCENARIO 2: Single Role, Multiple Groups, Single Service Each
  # ========================================
  @rbac @single-role-multiple-groups
  Scenario: User with single role having multiple groups each with single service
    Given I create test groups with services:
      | group_name     | service_name    | scopes                    |
      | user-readers   | auth-service    | users:read                |
      | role-readers   | auth-service    | roles:read                |
      | group-readers  | auth-service    | groups:read               |
    And I create a test role "system-reader" with groups "user-readers,role-readers,group-readers"
    And I create a test user "reader1" with role "system-reader"
    When I login as "reader1" with password "Test@123"
    And I navigate to the dashboard
    Then I should see exactly "3" permissions
    And My permissions should include "users:read,roles:read,groups:read"
    And I should see the following tabs:
      | Tab Name        |
      | My Permissions  |
      | User Management |
      | Roles          |
      | Groups         |
    And I should NOT see the following tabs:
      | Tab Name          |
      | Services         |
      | API Documentation |
    And I should NOT see any "Create" buttons in visible tabs

  # ========================================
  # SCENARIO 3: Single Role, Single Group, Multiple Services
  # ========================================
  @rbac @single-group-multiple-services
  Scenario: User with single role having single group with multiple services
    Given I create a test group "full-admin-group" with services:
      | service_name     | scopes                                         |
      | auth-service     | users:read users:write roles:read roles:write |
      | email-service    | emails:read emails:write emails:send          |
      | payment-service  | payments:read payments:process                |
    And I create a test role "multi-service-admin" with group "full-admin-group"
    And I create a test user "multiadmin1" with role "multi-service-admin"
    When I login as "multiadmin1" with password "Test@123"
    And I navigate to the dashboard
    Then I should see exactly "9" permissions
    And My permissions should be grouped by services:
      | service_name    | permissions                                    |
      | auth-service    | users:read,users:write,roles:read,roles:write |
      | email-service   | emails:read,emails:write,emails:send          |
      | payment-service | payments:read,payments:process                |

  # ========================================
  # SCENARIO 4: Administrator Role with Multiple Groups
  # ========================================
  @rbac @admin-multiple-groups
  Scenario: Administrator role with multiple groups reflects correct permissions
    Given I create a test group "email-administrators" with service "email-service" having scopes "emails:read emails:write emails:send"
    And the administrator role has been assigned groups "administrator,email-administrators"
    When I login as "admin" with password "Admin@123"
    And I navigate to the dashboard
    And I click on the "My Permissions" tab
    Then I should see permissions from both "administrator" and "email-administrators" groups
    And My permissions should include permissions from both groups
    And the permission count should be the sum of unique permissions across all groups
    And I should see permissions grouped by services:
      | service_name   | should_contain                                    |
      | auth-service   | users:read,users:write,roles:read,roles:write    |
      | email-service  | emails:read,emails:write,emails:send             |

  # ========================================
  # SCENARIO 5: Role Permission Inheritance Through Groups
  # ========================================
  @rbac @permission-inheritance
  Scenario: Role inherits permissions from all assigned groups
    Given I create test groups with services:
      | group_name      | service_name   | scopes                         |
      | user-managers   | auth-service   | users:read users:write        |
      | role-managers   | auth-service   | roles:read roles:write        |
      | service-viewers | auth-service   | services:read                 |
    And I create a test role "partial-admin" with groups "user-managers,role-managers,service-viewers"
    And I create a test user "partialadmin1" with role "partial-admin"
    When I login as "partialadmin1" with password "Test@123"
    And I navigate to the dashboard
    Then I should see exactly "5" permissions
    And I should see the following tabs:
      | Tab Name        |
      | My Permissions  |
      | User Management |
      | Roles          |
      | Services       |
    And I should see "Create" buttons in "User Management" and "Roles" tabs
    And I should NOT see "Create" button in "Services" tab

  # ========================================
  # SCENARIO 6: Empty Groups (No Services Assigned)
  # ========================================
  @rbac @empty-groups
  Scenario: User with role having empty groups has no permissions
    Given I create a test group "empty-group" with no services
    And I create a test role "empty-role" with group "empty-group"
    And I create a test user "emptyuser1" with role "empty-role"
    When I login as "emptyuser1" with password "Test@123"
    And I navigate to the dashboard
    Then I should see "No permissions assigned" message
    And I should only see the "My Permissions" tab

  # ========================================
  # SCENARIO 7: Overlapping Permissions Across Groups
  # ========================================
  @rbac @overlapping-permissions
  Scenario: Overlapping permissions across groups are deduplicated
    Given I create test groups with services:
      | group_name    | service_name  | scopes                       |
      | readers       | auth-service  | users:read roles:read        |
      | writers       | auth-service  | users:write roles:write      |
      | full-access   | auth-service  | users:read users:write roles:read roles:write groups:read groups:write |
    And I create a test role "mixed-access" with groups "readers,writers,full-access"
    And I create a test user "mixeduser1" with role "mixed-access"
    When I login as "mixeduser1" with password "Test@123"
    And I navigate to the dashboard
    Then I should see exactly "6" unique permissions
    And My permissions should include "users:read,users:write,roles:read,roles:write,groups:read,groups:write"

  # ========================================
  # SCENARIO 8: Dynamic Permission Updates
  # ========================================
  @rbac @dynamic-updates
  Scenario: User permissions update when role's groups are modified
    Given I create a test group "basic-group" with service "auth-service" having scopes "users:read"
    And I create a test group "advanced-group" with service "auth-service" having scopes "users:write roles:read roles:write"
    And I create a test role "dynamic-role" with group "basic-group"
    And I create a test user "dynamicuser1" with role "dynamic-role"
    When I login as "dynamicuser1" with password "Test@123"
    And I navigate to the dashboard
    Then I should see exactly "1" permission
    When I logout
    And I login as "admin" with password "Admin@123"
    And I update role "dynamic-role" to have groups "basic-group,advanced-group"
    And I logout
    And I login as "dynamicuser1" with password "Test@123"
    And I navigate to the dashboard
    Then I should see exactly "4" permissions
    And My permissions should include "users:read,users:write,roles:read,roles:write"

  # ========================================
  # SCENARIO 9: Service-Specific Permissions
  # ========================================
  @rbac @service-specific
  Scenario: User with service-specific permissions sees appropriate UI elements
    Given I create a test group "service-managers" with service "auth-service" having scopes "services:read services:write"
    And I create a test role "service-manager" with group "service-managers"
    And I create a test user "servicemanager1" with role "service-manager"
    When I login as "servicemanager1" with password "Test@123"
    And I navigate to the dashboard
    Then I should see the "Services" tab
    When I click on the "Services" tab
    Then I should see the "Create Service" button
    And I should see "Edit" buttons in the service list
    And I should see "Delete" buttons in the service list

  # ========================================
  # SCENARIO 10: Cross-Service Permission Validation
  # ========================================
  @rbac @cross-service
  Scenario: User permissions work correctly across different services
    Given I create test groups with services:
      | group_name          | service_name     | scopes                    |
      | auth-admins         | auth-service     | users:write roles:write   |
      | email-admins        | email-service    | templates:write send:bulk |
      | notification-admins | notify-service   | push:send sms:send        |
    And I create a test role "multi-service-role" with groups "auth-admins,email-admins,notification-admins"
    And I create a test user "multiservice1" with role "multi-service-role"
    When I login as "multiservice1" with password "Test@123"
    And I navigate to the dashboard
    Then My permissions should be properly grouped by service:
      | service_name   | permissions                   |
      | auth-service   | users:write,roles:write       |
      | email-service  | templates:write,send:bulk     |
      | notify-service | push:send,sms:send            |

  # ========================================
  # SCENARIO 11: Permission Removal Effects
  # ========================================
  @rbac @permission-removal
  Scenario: Removing permissions from role affects user access immediately
    Given I create a test group "full-access-group" with service "auth-service" having scopes "users:read users:write roles:read roles:write groups:read groups:write"
    And I create a test role "removable-role" with group "full-access-group"
    And I create a test user "removeuser1" with role "removable-role"
    When I login as "removeuser1" with password "Test@123"
    And I navigate to the dashboard
    Then I should see all management tabs
    When I logout
    And I login as "admin" with password "Admin@123"
    And I update group "full-access-group" to have service "auth-service" with scopes "users:read"
    And I logout
    And I login as "removeuser1" with password "Test@123"
    And I navigate to the dashboard
    Then I should only see "My Permissions" and "User Management" tabs
    And I should NOT see "Create User" button in User Management

  # ========================================
  # SCENARIO 12: Role Without Groups
  # ========================================
  @rbac @role-no-groups
  Scenario: Role without any groups provides no permissions
    Given I create a test role "groupless-role" with no groups
    And I create a test user "grouplessuser1" with role "groupless-role"
    When I login as "grouplessuser1" with password "Test@123"
    And I navigate to the dashboard
    Then I should see "No permissions assigned" message
    And I should only see the "My Permissions" tab

  # ========================================
  # SCENARIO 13: Complex Permission Hierarchy
  # ========================================
  @rbac @complex-hierarchy
  Scenario: Complex permission hierarchy with nested service dependencies
    Given I create test groups with services:
      | group_name        | service_name      | scopes                                        |
      | super-admins      | auth-service      | users:* roles:* groups:* services:*          |
      | limited-admins    | auth-service      | users:read roles:read                        |
      | api-consumers     | api-gateway       | api:read api:execute                         |
      | audit-viewers     | audit-service     | logs:read reports:read                       |
    And I create a test role "complex-role" with groups "limited-admins,api-consumers,audit-viewers"
    And I create a test user "complexuser1" with role "complex-role"
    When I login as "complexuser1" with password "Test@123"
    And I navigate to the dashboard
    Then I should see exactly "6" permissions across "3" services

  # ========================================
  # SCENARIO 14: Wildcard Permissions
  # ========================================
  @rbac @wildcard-permissions
  Scenario: Wildcard permissions grant full access to resource
    Given I create a test group "wildcard-group" with service "auth-service" having scopes "users:* roles:read"
    And I create a test role "wildcard-role" with group "wildcard-group"
    And I create a test user "wildcarduser1" with role "wildcard-role"
    When I login as "wildcarduser1" with password "Test@123"
    And I navigate to the dashboard
    Then I should have full access to "User Management"
    And I should have read-only access to "Roles"
    And wildcard permissions should expand to "users:read,users:write,users:delete,users:create"

  # ========================================
  # SCENARIO 15: API Permission Validation
  # ========================================
  @rbac @api-permissions
  Scenario: API endpoints respect RBAC permissions
    Given I create a test group "api-group" with service "auth-service" having scopes "users:read"
    And I create a test role "api-role" with group "api-group"
    And I create a test user "apiuser1" with role "api-role"
    When I obtain an access token for "apiuser1" with password "Test@123"
    Then API GET request to "/users" should return 200
    And API POST request to "/users" should return 403
    And API PUT request to "/users/123" should return 403
    And API DELETE request to "/users/123" should return 403

  # ========================================
  # SCENARIO 16: Administrator with Multiple Groups UI Consistency
  # ========================================
  @rbac @admin-ui-consistency
  Scenario: Administrator with multiple groups shows consistent permissions across all UI elements
    Given I create a test group "notification-admins" with service "notification-service" having scopes "notifications:read notifications:write push:send"
    And the administrator role has been assigned groups "administrator,notification-admins"
    When I login as "admin" with password "Admin@123"
    And I navigate to the dashboard
    Then the header should show user as "admin" with role "administrator"
    When I click on the "My Permissions" tab
    Then I should see permissions grouped by both services
    And permission count in My Permissions should match backend API response
    And each service section should show correct permissions
    When I navigate to "User Management" tab
    Then my access level should be consistent with my permissions
    When I navigate to "Roles" tab
    Then my access level should be consistent with my permissions
    And all UI elements should reflect the combined permissions from both groups

  # ========================================
  # SCENARIO 17: Real-time Permission Updates for Multi-Group Roles
  # ========================================
  @rbac @realtime-updates-multi-group
  Scenario: Permission updates reflect immediately when multi-group role is modified
    Given I create test groups with services:
      | group_name        | service_name      | scopes                    |
      | basic-permissions | auth-service      | users:read                |
      | advanced-perms    | auth-service      | users:write roles:read    |
    And I create a test role "evolving-role" with group "basic-permissions"
    And I create a test user "evolvinguser" with role "evolving-role"
    When I login as "evolvinguser" with password "Test@123"
    And I navigate to the dashboard
    Then I should see exactly "1" permission
    And I should only see "My Permissions" and "User Management" tabs
    And I should NOT see "Create User" button
    When I logout
    And I login as "admin" with password "Admin@123"
    And I update role "evolving-role" to include groups "basic-permissions,advanced-perms"
    And I logout
    And I login as "evolvinguser" with password "Test@123"
    And I navigate to the dashboard
    Then I should see exactly "3" permissions
    And I should see "User Management" and "Roles" tabs
    And I should see "Create User" button in User Management
    And permission changes should be reflected across all UI components

  # ========================================
  # SCENARIO 18: Group Service Scope Inheritance Validation
  # ========================================
  @rbac @group-service-inheritance
  Scenario: Role correctly inherits all permissions from group services across multiple services
    Given I create test groups with services:
      | group_name      | service_name    | scopes                                    |
      | multi-service-1 | auth-service    | users:read users:write                   |
      | multi-service-1 | email-service   | emails:read templates:write              |
      | multi-service-2 | auth-service    | roles:read groups:read                   |
      | multi-service-2 | sms-service     | messages:send bulk:send                  |
    And I create a test role "cross-service-role" with groups "multi-service-1,multi-service-2"
    And I create a test user "crossuser" with role "cross-service-role"
    When I login as "crossuser" with password "Test@123"
    And I navigate to the dashboard
    And I click on the "My Permissions" tab
    Then I should see permissions from all services:
      | service_name  | expected_permissions                     |
      | auth-service  | users:read,users:write,roles:read,groups:read |
      | email-service | emails:read,templates:write              |
      | sms-service   | messages:send,bulk:send                  |
    And total permission count should be "8"
    And no duplicate permissions should appear
    And permissions should be correctly grouped by service name
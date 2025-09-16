Feature: User Management
  As an administrator
  I want to manage users in the system
  So that I can control access and permissions

  Background:
    Given the authentication service is running
    And I am logged in as "admin" with password "Admin@123"

  @users @create
  Scenario: Create a new user
    Given I am on the users management page
    When I create a new user with the following details:
      | Field     | Value           |
      | Username  | newuser         |
      | Email     | new@example.com |
      | Password  | NewUser@123     |
      | FirstName | New             |
      | LastName  | User            |
    Then the user should be created successfully
    And the user should appear in the users list

  @users @update
  Scenario: Update an existing user
    Given there is a user "user1" in the system
    When I update the user's email to "updated@example.com"
    Then the user's email should be updated
    And the change should be reflected in the dashboard

  @users @delete
  Scenario: Delete a user
    Given there is a user "user10" in the system
    When I delete the user
    Then the user should be removed from the system
    And the user should not appear in the users list

  @users @roles
  Scenario: Assign roles to a user
    Given there is a user "user2" in the system
    And there is a role "super_admin" in the system
    When I assign the "super_admin" role to the user
    Then the user should have the "super_admin" role
    And the user should have admin permissions

  @users @groups
  Scenario: Add user to a group
    Given there is a user "user3" in the system
    And there is a group "administrators" in the system
    When I add the user to the "administrators" group
    Then the user should be a member of the "administrators" group

  @users @activation @deactivate
  Scenario: Deactivate an active user
    Given there is an active user "user4" in the system
    When I click the deactivate button for user "user4"
    And I confirm the deactivation
    Then the user should be deactivated successfully
    And the user status should show as "Inactive"
    And I should see a success notification "User user4 has been deactivated successfully"

  @users @activation @activate
  Scenario: Activate an inactive user
    Given there is an inactive user "user5" in the system
    When I click the activate button for user "user5"
    And I confirm the activation
    Then the user should be activated successfully
    And the user status should show as "Active"
    And I should see a success notification "User user5 has been activated successfully"

  @users @password @update
  Scenario: Update user password successfully
    Given there is a user "user6" in the system
    When I click the password update button for user "user6"
    Then I should see the "Update Password" modal
    When I enter the new password "NewPassword123!"
    And I confirm the new password "NewPassword123!"
    And I click "Update Password"
    Then the password should be updated successfully
    And I should see a success notification "Password updated successfully"
    And the modal should close

  @users @password @validation @mismatch
  Scenario: Fail to update password when passwords don't match
    Given there is a user "user7" in the system
    When I click the password update button for user "user7"
    And I enter the new password "NewPassword123!"
    And I confirm the new password "DifferentPassword123!"
    And I click "Update Password"
    Then I should see an error message "Passwords do not match"
    And the password should not be updated

  @users @password @validation @weak
  Scenario: Fail to update password when password is too weak
    Given there is a user "user8" in the system
    When I click the password update button for user "user8"
    And I enter the new password "123"
    And I confirm the new password "123"
    And I click "Update Password"
    Then I should see an error message about password requirements
    And the password should not be updated

  @users @activation @cancel
  Scenario: Cancel user deactivation
    Given there is an active user "user9" in the system
    When I click the deactivate button for user "user9"
    And I cancel the deactivation
    Then the user should remain active
    And the user status should show as "Active"

  @users @password @cancel
  Scenario: Cancel password update
    Given there is a user "user11" in the system
    When I click the password update button for user "user11"
    And I click "Cancel" in the password modal
    Then the modal should close
    And the password should not be updated

  @users @security @deactivated @login
  Scenario: Deactivated user cannot login
    Given there is a user "user12" with password "TestPass123!"
    And the user is deactivated
    When I logout from the admin account
    And I try to login as "user12" with password "TestPass123!"
    Then the login should fail
    And I should see an error message about inactive account

  @users @password @security @old
  Scenario: Old password becomes invalid after update
    Given there is a user "user13" with password "OldPassword123!"
    When I update the user's password to "NewPassword123!"
    And I logout from the admin account
    And I try to login as "user13" with password "OldPassword123!"
    Then the login should fail
    When I try to login as "user13" with password "NewPassword123!"
    Then the login should succeed

  @users @actions @buttons
  Scenario: Action buttons display correctly based on user status
    Given there are both active and inactive users in the system
    When I view the users list
    Then active users should show a "🔒" deactivate button
    And inactive users should show a "🔓" activate button
    And all users should show a "🔑" password update button
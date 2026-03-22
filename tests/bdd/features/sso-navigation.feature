Feature: SSO Navigation Between Auth Service and Document Base Service
  As a user of the auth service
  I want to navigate to document-base-service via SSO from the user dropdown
  So that I can seamlessly access external services without re-authenticating

  Background:
    Given the auth service backend is healthy
    And the auth service frontend is accessible

  @sso @navigation
  Scenario: Admin can see both services in the dropdown after login
    Given I login to auth service as "admin" with password "Admin@123"
    When I open the user dropdown
    Then I should see "auth-service" in the services list
    And I should see "document-base-service" in the services list

  @sso @navigation
  Scenario: doc_admin can see document-base-service in the dropdown
    Given I login to auth service as "doc_admin" with password "Admin@123"
    When I open the user dropdown
    Then I should see "document-base-service" in the services list

  @sso @navigation
  Scenario: doc_reader can see document-base-service in the dropdown
    Given I login to auth service as "doc_reader" with password "Admin@123"
    When I open the user dropdown
    Then I should see "document-base-service" in the services list

  @sso @navigation
  Scenario: group_admin should NOT see document-base-service in the dropdown
    Given I login to auth service as "group_admin" with password "Admin@123"
    When I open the user dropdown
    Then I should not see "document-base-service" in the services list

  @sso @navigation @redirect
  Scenario: doc_admin SSO redirect to document-base-service works
    Given I login to auth service as "doc_admin" with password "Admin@123"
    When I trigger SSO navigation to "document-base-clientid" with redirect "http://localhost:3001/auth/callback"
    Then the SSO response should redirect to "http://localhost:3001/auth/callback" with a code parameter

  @sso @navigation @redirect
  Scenario: admin SSO redirect to document-base-service works
    Given I login to auth service as "admin" with password "Admin@123"
    When I trigger SSO navigation to "document-base-clientid" with redirect "http://localhost:3001/auth/callback"
    Then the SSO response should redirect to "http://localhost:3001/auth/callback" with a code parameter

  @sso @navigation @redirect
  Scenario: group_admin SSO redirect to document-base-service is denied
    Given I login to auth service as "group_admin" with password "Admin@123"
    When I trigger SSO navigation to "document-base-clientid" with redirect "http://localhost:3001/auth/callback"
    Then the SSO response should redirect to the auth service login page

  @sso @navigation @reverse
  Scenario: Reverse flow - document-base-service SSO to auth-service works
    Given I login to auth service as "doc_admin" with password "Admin@123"
    When I trigger SSO navigation to "auth-service-client" with redirect "http://localhost:3000"
    Then the SSO response should redirect to "http://localhost:3000" with a code parameter

  @sso @navigation @dropdown
  Scenario: Services appear in dropdown immediately after login without refresh
    Given I login to auth service as "doc_admin" with password "Admin@123"
    When I open the user dropdown without refreshing
    Then I should see the services section in the dropdown
    And I should see "document-base-service" in the services list

  @sso @navigation @browser-e2e
  Scenario: Browser SSO flow - doc_admin lands on document-base-service home page
    Given I login to auth service as "doc_admin" with password "Admin@123"
    When I open the user dropdown
    And I click the "document-base-service" SSO link in the dropdown
    Then the browser should land on the document-base-service home page

  @sso @navigation @browser-e2e
  Scenario: Browser SSO flow - admin lands on document-base-service home page
    Given I login to auth service as "admin" with password "Admin@123"
    When I open the user dropdown
    And I click the "document-base-service" SSO link in the dropdown
    Then the browser should land on the document-base-service home page

  @sso @navigation @dropdown
  Scenario: Document-base-service SSO link in dropdown has correct URL structure
    Given I login to auth service as "doc_admin" with password "Admin@123"
    When I open the user dropdown
    Then the "document-base-service" link should contain "sso/login"
    And the "document-base-service" link should contain "client_id=document-base-clientid"
    And the "document-base-service" link should contain "redirect_uri"
    And the "document-base-service" link should contain "token="

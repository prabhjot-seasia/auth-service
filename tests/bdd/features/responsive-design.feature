Feature: Responsive Design and Cross-Browser Compatibility
  As a user
  I want to access the authentication service from different devices and browsers
  So that I can use the system anywhere

  Background:
    Given the authentication service is running

  @responsive @tablet
  Scenario Outline: Access application on tablets
    Given I am using "<device>" device
    When I navigate to the login page
    Then the login form should be properly displayed
    And all elements should be accessible
    And the layout should be responsive

    Examples:
      | device         |
      | iPad Pro       |
      | iPad Mini      |
      | Android Tablet |

  @browser @compatibility
  Scenario Outline: Cross-browser compatibility
    Given I am using "<browser>" browser
    When I navigate to the application
    And I login with valid credentials
    Then the application should work correctly
    And all features should be functional

    Examples:
      | browser |
      | Chrome  |
      | Firefox |
      | Safari  |
      | Edge    |

  @responsive @mobile
  Scenario: Mobile viewport adjustments
    Given I am using a mobile device with 375px width
    When I access the dashboard
    Then the navigation should be mobile-friendly
    And tables should be horizontally scrollable
    And all content should be readable

  @responsive @desktop
  Scenario: Desktop viewport optimization
    Given I am using a desktop with 1920px width
    When I access the dashboard
    Then the content should be centered with max-width
    And the layout should utilize available space efficiently
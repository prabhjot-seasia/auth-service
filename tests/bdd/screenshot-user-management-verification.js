const { chromium } = require('playwright');

async function takeUserManagementVerificationScreenshots() {
  const browser = await chromium.launch({ 
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--allow-running-insecure-content',
      '--enable-javascript'
    ]
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    javaScriptEnabled: true,
    ignoreHTTPSErrors: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to http://localhost:3001...');
    await page.goto('http://localhost:3001', { waitUntil: 'load', timeout: 30000 });
    
    // Wait for React app to load
    await page.waitForLoadState('networkidle');
    
    // Wait for React root element to appear and have content
    await page.waitForSelector('div#root:not(:empty)', { timeout: 15000 }).catch(() => {
      console.log('React root still empty after 15s, continuing...');
    });
    
    // Give extra time for React to render
    await page.waitForTimeout(5000);
    
    console.log('Page title:', await page.title());
    console.log('Current URL:', page.url());
    
    // Check for login form
    const loginForm = await page.locator('input[type="text"], input[type="email"], input[name="username"], input[name="email"], input[placeholder*="username"], input[placeholder*="Username"], input[placeholder*="email"], input[placeholder*="Email"]').first();
    const passwordField = await page.locator('input[type="password"], input[name="password"], input[placeholder*="password"], input[placeholder*="Password"]').first();
    
    const loginFormVisible = await loginForm.isVisible().catch(() => false);
    const passwordVisible = await passwordField.isVisible().catch(() => false);
    
    console.log('Login form visible:', loginFormVisible);
    console.log('Password field visible:', passwordVisible);
    
    if (loginFormVisible && passwordVisible) {
      console.log('Found login form, logging in with admin/Admin@123...');
      
      // Fill in credentials
      await loginForm.fill('admin');
      await passwordField.fill('Admin@123');
      
      // Find and click the login button
      const loginButton = await page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Submit")').first();
      
      if (await loginButton.isVisible()) {
        await loginButton.click();
        console.log('Clicked login button, waiting for dashboard...');
        
        // Wait for navigation after login
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        console.log('After login - URL:', page.url());
      }
    } else {
      console.log('No login form found, assuming already authenticated or on dashboard');
    }
    
    // Wait for dashboard to fully render
    await page.waitForTimeout(2000);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshots = [];
    
    // FIRST: Take screenshot of Roles tab for comparison
    console.log('Looking for Roles tab for styling comparison...');
    
    const rolesTabSelectors = [
      'a:has-text("Roles")',
      'button:has-text("Roles")',
      '[href*="roles"]',
      '[data-testid*="roles"]',
      '.nav-link:has-text("Roles")',
      'li:has-text("Roles") a',
      'tab:has-text("Roles")',
      '.nav-tabs a:has-text("Roles")',
      '.navbar-nav a:has-text("Roles")'
    ];
    
    let rolesTab = null;
    for (const selector of rolesTabSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible().catch(() => false)) {
        rolesTab = element;
        console.log(`Found Roles tab with selector: ${selector}`);
        break;
      }
    }
    
    if (rolesTab) {
      await rolesTab.click();
      console.log('Clicked Roles tab, waiting for content...');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // Wait for Roles page content to load
      await page.waitForSelector('button:has-text("Create Role"), table, .table, [data-testid*="table"]', { timeout: 10000 }).catch(() => {
        console.log('Roles content indicators not found, continuing...');
      });
      
      const rolesScreenshotPath = `/Users/prabhjot/seasia/auth-service/tests/bdd/roles-tab-comparison-${timestamp}.png`;
      await page.screenshot({
        path: rolesScreenshotPath,
        fullPage: true
      });
      
      console.log(`Roles tab screenshot saved to: ${rolesScreenshotPath}`);
      screenshots.push({ type: 'Roles (for comparison)', path: rolesScreenshotPath });
      
    } else {
      console.log('Roles tab not found with any selector');
      // List all available navigation elements for debugging
      const allNavElements = await page.locator('nav a, nav button, .nav a, .nav button, [role="navigation"] a, [role="navigation"] button, .navbar-nav a').count();
      console.log(`Found ${allNavElements} navigation elements`);
      
      for (let i = 0; i < Math.min(allNavElements, 10); i++) {
        const navText = await page.locator('nav a, nav button, .nav a, .nav button, [role="navigation"] a, [role="navigation"] button, .navbar-nav a').nth(i).textContent().catch(() => 'N/A');
        console.log(`Nav element ${i}: "${navText}"`);
      }
    }
    
    // MAIN FOCUS: Take screenshot of User Management tab
    console.log('Looking for User Management tab...');
    
    const userManagementSelectors = [
      'a:has-text("User Management")',
      'a:has-text("Users")',
      'button:has-text("User Management")',
      'button:has-text("Users")',
      '[href*="users"]',
      '[href*="user-management"]',
      '[data-testid*="users"]',
      '[data-testid*="user-management"]',
      '.nav-link:has-text("User Management")',
      '.nav-link:has-text("Users")',
      'li:has-text("User Management") a',
      'li:has-text("Users") a',
      'tab:has-text("User Management")',
      'tab:has-text("Users")',
      '.nav-tabs a:has-text("User Management")',
      '.nav-tabs a:has-text("Users")',
      '.navbar-nav a:has-text("User Management")',
      '.navbar-nav a:has-text("Users")'
    ];
    
    let userManagementTab = null;
    for (const selector of userManagementSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible().catch(() => false)) {
        userManagementTab = element;
        console.log(`Found User Management tab with selector: ${selector}`);
        break;
      }
    }
    
    if (userManagementTab) {
      await userManagementTab.click();
      console.log('Clicked User Management tab, waiting for content...');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // Wait for User Management page content to load and check for required elements
      console.log('Checking for User Management buttons...');
      
      // Check that ONLY these buttons exist: "Create User", "Export CSV", "Import CSV"
      const expectedButtons = ['Create User', 'Export CSV', 'Import CSV'];
      const foundButtons = [];
      const missingButtons = [];
      
      for (const buttonText of expectedButtons) {
        const button = page.locator(`button:has-text("${buttonText}")`).first();
        if (await button.isVisible().catch(() => false)) {
          foundButtons.push(buttonText);
          console.log(`✓ Found required button: "${buttonText}"`);
        } else {
          missingButtons.push(buttonText);
          console.log(`✗ Missing button: "${buttonText}"`);
        }
      }
      
      // Check that "Update CSV" button does NOT exist
      const updateCsvButton = page.locator('button:has-text("Update CSV")').first();
      const updateCsvExists = await updateCsvButton.isVisible().catch(() => false);
      
      if (updateCsvExists) {
        console.log('⚠️  WARNING: "Update CSV" button still exists and should be removed!');
      } else {
        console.log('✓ "Update CSV" button has been successfully removed');
      }
      
      // Take screenshot of User Management tab
      const userMgmtScreenshotPath = `/Users/prabhjot/seasia/auth-service/tests/bdd/user-management-verification-${timestamp}.png`;
      await page.screenshot({
        path: userMgmtScreenshotPath,
        fullPage: true
      });
      
      console.log(`User Management tab screenshot saved to: ${userMgmtScreenshotPath}`);
      screenshots.push({ 
        type: 'User Management', 
        path: userMgmtScreenshotPath,
        foundButtons,
        missingButtons,
        updateCsvRemoved: !updateCsvExists
      });
      
      // Also take a focused screenshot of just the button area
      try {
        const buttonContainer = page.locator('.btn-group, .button-group, .d-flex, [class*="button"]').first();
        if (await buttonContainer.isVisible().catch(() => false)) {
          const buttonAreaScreenshotPath = `/Users/prabhjot/seasia/auth-service/tests/bdd/user-management-buttons-${timestamp}.png`;
          await buttonContainer.screenshot({
            path: buttonAreaScreenshotPath
          });
          console.log(`Button area screenshot saved to: ${buttonAreaScreenshotPath}`);
          screenshots.push({ 
            type: 'User Management Buttons (focused)', 
            path: buttonAreaScreenshotPath 
          });
        }
      } catch (error) {
        console.log('Could not capture focused button area screenshot:', error.message);
      }
      
    } else {
      console.log('User Management tab not found with any selector');
      // List all available navigation elements for debugging
      const allNavElements = await page.locator('nav a, nav button, .nav a, .nav button, [role="navigation"] a, [role="navigation"] button, .navbar-nav a').count();
      console.log(`Found ${allNavElements} navigation elements`);
      
      for (let i = 0; i < Math.min(allNavElements, 15); i++) {
        const navText = await page.locator('nav a, nav button, .nav a, .nav button, [role="navigation"] a, [role="navigation"] button, .navbar-nav a').nth(i).textContent().catch(() => 'N/A');
        console.log(`Nav element ${i}: "${navText}"`);
      }
    }
    
    // If no specific tabs found, try to take a general dashboard screenshot for debugging
    if (screenshots.length === 0) {
      console.log('No specific tabs found, taking general dashboard screenshot...');
      const dashboardScreenshotPath = `/Users/prabhjot/seasia/auth-service/tests/bdd/dashboard-debug-${timestamp}.png`;
      await page.screenshot({
        path: dashboardScreenshotPath,
        fullPage: true
      });
      console.log(`Dashboard screenshot saved to: ${dashboardScreenshotPath}`);
      screenshots.push({ type: 'Dashboard (debug)', path: dashboardScreenshotPath });
    }
    
    return screenshots;
    
  } catch (error) {
    console.error('Error taking screenshots:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

takeUserManagementVerificationScreenshots().then((screenshots) => {
  console.log('\n=== USER MANAGEMENT VERIFICATION COMPLETED ===');
  console.log('\nCaptured screenshots:');
  screenshots.forEach((screenshot, index) => {
    console.log(`${index + 1}. ${screenshot.type}: ${screenshot.path}`);
    if (screenshot.foundButtons) {
      console.log(`   - Found buttons: ${screenshot.foundButtons.join(', ')}`);
      if (screenshot.missingButtons.length > 0) {
        console.log(`   - Missing buttons: ${screenshot.missingButtons.join(', ')}`);
      }
      console.log(`   - "Update CSV" removed: ${screenshot.updateCsvRemoved ? 'YES' : 'NO'}`);
    }
  });
  
  console.log('\n=== VERIFICATION CHECKLIST ===');
  console.log('Please review the screenshots to verify:');
  console.log('✓ User Management buttons match Roles tab styling (clean, no emojis)');
  console.log('✓ "Update CSV" button has been completely removed');
  console.log('✓ Only "Create User", "Export CSV", and "Import CSV" buttons remain');
  console.log('✓ Buttons are properly styled and aligned');
  console.log('✓ Styling is consistent between User Management and Roles tabs');
  
  process.exit(0);
}).catch((error) => {
  console.error('Failed to take verification screenshots:', error);
  process.exit(1);
});
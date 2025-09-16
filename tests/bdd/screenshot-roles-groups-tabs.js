const { chromium } = require('playwright');

async function takeRolesGroupsScreenshots() {
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
    
    // Wait for React app to load - be more patient
    await page.waitForLoadState('networkidle');
    
    // Wait for React root element to appear and have content
    await page.waitForSelector('div#root:not(:empty)', { timeout: 15000 }).catch(() => {
      console.log('React root still empty after 15s, continuing...');
    });
    
    // Give extra time for React to render
    await page.waitForTimeout(5000);
    
    console.log('Page title:', await page.title());
    console.log('Current URL:', page.url());
    
    // Debug: Check what's actually on the page
    const bodyText = await page.locator('body').textContent().catch(() => 'No body content');
    console.log('Page content preview:', bodyText.substring(0, 500));
    
    const allElements = await page.locator('*').count();
    console.log('Total elements on page:', allElements);
    
    // Check for any inputs
    const allInputs = await page.locator('input').count();
    console.log('Total input elements:', allInputs);
    
    // Check if we need to login with more detailed selectors
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
    
    // Take screenshot of Groups tab first (reference styling)
    console.log('Looking for Groups tab...');
    
    // Try different selectors for Groups tab
    const groupsTabSelectors = [
      'a:has-text("Groups")',
      'button:has-text("Groups")', 
      '[href*="groups"]',
      '[data-testid*="groups"]',
      '.nav-link:has-text("Groups")',
      'li:has-text("Groups") a',
      'tab:has-text("Groups")'
    ];
    
    let groupsTab = null;
    for (const selector of groupsTabSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible().catch(() => false)) {
        groupsTab = element;
        console.log(`Found Groups tab with selector: ${selector}`);
        break;
      }
    }
    
    if (groupsTab) {
      await groupsTab.click();
      console.log('Clicked Groups tab, waiting for content...');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Wait for Groups page content to load
      await page.waitForSelector('button:has-text("Create Group"), table, .table, [data-testid*="table"]', { timeout: 10000 }).catch(() => {
        console.log('Groups content indicators not found, continuing...');
      });
      
      const groupsScreenshotPath = `/Users/prabhjot/seasia/auth-service/tests/bdd/groups-tab-${timestamp}.png`;
      await page.screenshot({
        path: groupsScreenshotPath,
        fullPage: true
      });
      
      console.log(`Groups tab screenshot saved to: ${groupsScreenshotPath}`);
      screenshots.push({ type: 'Groups', path: groupsScreenshotPath });
      
    } else {
      console.log('Groups tab not found with any selector');
      // List all available navigation elements for debugging
      const allNavElements = await page.locator('nav a, nav button, .nav a, .nav button, [role="navigation"] a, [role="navigation"] button').count();
      console.log(`Found ${allNavElements} navigation elements`);
      
      for (let i = 0; i < Math.min(allNavElements, 10); i++) {
        const navText = await page.locator('nav a, nav button, .nav a, .nav button, [role="navigation"] a, [role="navigation"] button').nth(i).textContent().catch(() => 'N/A');
        console.log(`Nav element ${i}: "${navText}"`);
      }
    }
    
    // Now take screenshot of Roles tab
    console.log('Looking for Roles tab...');
    
    const rolesTabSelectors = [
      'a:has-text("Roles")',
      'button:has-text("Roles")',
      '[href*="roles"]',
      '[data-testid*="roles"]',
      '.nav-link:has-text("Roles")',
      'li:has-text("Roles") a',
      'tab:has-text("Roles")'
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
      await page.waitForTimeout(2000);
      
      // Wait for Roles page content to load
      await page.waitForSelector('button:has-text("Create Role"), table, .table, [data-testid*="table"]', { timeout: 10000 }).catch(() => {
        console.log('Roles content indicators not found, continuing...');
      });
      
      const rolesScreenshotPath = `/Users/prabhjot/seasia/auth-service/tests/bdd/roles-tab-${timestamp}.png`;
      await page.screenshot({
        path: rolesScreenshotPath,
        fullPage: true
      });
      
      console.log(`Roles tab screenshot saved to: ${rolesScreenshotPath}`);
      screenshots.push({ type: 'Roles', path: rolesScreenshotPath });
      
    } else {
      console.log('Roles tab not found with any selector');
    }
    
    // If no specific tabs found, try to take a general dashboard screenshot
    if (screenshots.length === 0) {
      console.log('No specific tabs found, taking general dashboard screenshot...');
      const dashboardScreenshotPath = `/Users/prabhjot/seasia/auth-service/tests/bdd/dashboard-${timestamp}.png`;
      await page.screenshot({
        path: dashboardScreenshotPath,
        fullPage: true
      });
      console.log(`Dashboard screenshot saved to: ${dashboardScreenshotPath}`);
      screenshots.push({ type: 'Dashboard', path: dashboardScreenshotPath });
    }
    
    return screenshots;
    
  } catch (error) {
    console.error('Error taking screenshots:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

takeRolesGroupsScreenshots().then((screenshots) => {
  console.log('\nScreenshot session completed successfully!');
  console.log('\nCaptured screenshots:');
  screenshots.forEach((screenshot, index) => {
    console.log(`${index + 1}. ${screenshot.type}: ${screenshot.path}`);
  });
  
  console.log('\nPurpose: Visual verification that:');
  console.log('- The "Create Role" button is properly aligned like the "Create Group" button');
  console.log('- The Roles table has the same responsive design as the Groups table');
  console.log('- Both tabs have consistent styling and layout');
  
  process.exit(0);
}).catch((error) => {
  console.error('Failed to take screenshots:', error);
  process.exit(1);
});
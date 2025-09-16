const { chromium } = require('playwright');

async function takeScreenshot() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    javaScriptEnabled: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to http://localhost:3001...');
    await page.goto('http://localhost:3001', { waitUntil: 'load', timeout: 30000 });
    
    // Wait for React app to load - look for signs that the app has rendered
    await page.waitForLoadState('networkidle');
    
    // Wait for React root element or any common React indicators
    await page.waitForSelector('div#root, div[data-reactroot], .App, .app, body > div > div', { timeout: 10000 }).catch(() => {
      console.log('No React root element found, continuing...');
    });
    
    await page.waitForTimeout(5000); // Give React app time to fully render
    
    // Get page title and URL for debugging
    console.log('Page title:', await page.title());
    console.log('Current URL:', page.url());
    
    // Check what's actually on the page
    const bodyText = await page.locator('body').textContent();
    console.log('Page content preview:', bodyText.substring(0, 200));
    
    // Look for any form inputs first
    const allInputs = await page.locator('input').count();
    console.log('Found inputs:', allInputs);
    
    // Check if we're on a login page and login
    const loginForm = await page.locator('input[type="text"], input[type="email"], input[name="username"], input[placeholder*="username"], input[placeholder*="Username"]').first();
    const passwordField = await page.locator('input[type="password"]').first();
    
    const loginFormVisible = await loginForm.isVisible().catch(() => false);
    const passwordVisible = await passwordField.isVisible().catch(() => false);
    
    console.log('Login form visible:', loginFormVisible);
    console.log('Password field visible:', passwordVisible);
    
    if (loginFormVisible && passwordVisible) {
      console.log('Found login form, logging in...');
      
      // Fill in credentials
      await loginForm.fill('admin');
      await passwordField.fill('Admin@123');
      
      // Find and click the login button
      const loginButton = await page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Submit")').first();
      console.log('Login button found:', await loginButton.isVisible().catch(() => false));
      
      if (await loginButton.isVisible()) {
        await loginButton.click();
        console.log('Clicked login button, waiting for navigation...');
        
        // Wait for navigation after login
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        console.log('After login - URL:', page.url());
        console.log('After login - Title:', await page.title());
      }
    } else {
      console.log('No login form found, might already be on dashboard or different page structure');
    }
    
    // Wait a bit for the dashboard to fully render
    await page.waitForTimeout(2000);
    
    // Look for logout button or header elements with more variations
    const logoutSelectors = [
      'button:has-text("Logout")', 
      'button:has-text("Sign out")', 
      'a:has-text("Logout")', 
      'a:has-text("Sign out")',
      'button:has-text("Log out")',
      '[data-testid="logout"]',
      '.logout-btn',
      '#logout',
      'button[class*="logout"]',
      'a[href*="logout"]'
    ];
    
    let logoutButton = null;
    for (const selector of logoutSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible().catch(() => false)) {
        logoutButton = element;
        console.log(`Found logout button with selector: ${selector}`);
        break;
      }
    }
    
    if (logoutButton) {
      console.log('Found logout button, taking screenshot...');
      
      // Scroll to make sure the header/logout button is visible
      await page.locator('header, nav, .header, .navbar, .top-nav').first().scrollIntoViewIfNeeded().catch(() => {});
      
    } else {
      console.log('Logout button not found with any selector, checking all buttons...');
      const allButtons = await page.locator('button').count();
      const allLinks = await page.locator('a').count();
      console.log(`Found ${allButtons} buttons and ${allLinks} links on the page`);
      
      // Get text content of all buttons for debugging
      for (let i = 0; i < Math.min(allButtons, 10); i++) {
        const buttonText = await page.locator('button').nth(i).textContent().catch(() => 'N/A');
        console.log(`Button ${i}: "${buttonText}"`);
      }
    }
    
    // Take screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = `/Users/prabhjot/seasia/auth-service/tests/bdd/dashboard-logout-button-${timestamp}.png`;
    
    await page.screenshot({
      path: screenshotPath,
      fullPage: false // Take viewport screenshot to focus on header area
    });
    
    console.log(`Screenshot saved to: ${screenshotPath}`);
    
    // Also try to take a focused screenshot of just the header if we can find it
    const headerElement = await page.locator('header, nav, .header, .navbar, .top-bar').first();
    if (await headerElement.isVisible()) {
      const headerScreenshotPath = `/Users/prabhjot/seasia/auth-service/tests/bdd/header-logout-button-${timestamp}.png`;
      await headerElement.screenshot({ path: headerScreenshotPath });
      console.log(`Header screenshot saved to: ${headerScreenshotPath}`);
    }
    
    return screenshotPath;
    
  } catch (error) {
    console.error('Error taking screenshot:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

takeScreenshot().then((path) => {
  console.log('Screenshot completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('Failed to take screenshot:', error);
  process.exit(1);
});
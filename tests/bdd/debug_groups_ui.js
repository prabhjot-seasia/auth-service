const { chromium } = require('playwright');

async function debugGroupsUI() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Login as admin
    await page.goto('http://localhost:3001');
    await page.waitForTimeout(2000);
    
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Click on Groups tab
    console.log('Clicking Groups tab...');
    await page.click('text=Groups');
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ 
      path: '/Users/prabhjot/seasia/auth-service/tests/bdd/debug-groups-ui.png',
      fullPage: true 
    });
    
    // Check for buttons
    const editButtons = await page.locator('.btn-icon:has-text("✏️")').count();
    const deleteButtons = await page.locator('.btn-icon:has-text("🗑️")').count();
    const allButtons = await page.locator('.action-buttons button').count();
    
    console.log(`Edit buttons found: ${editButtons}`);
    console.log(`Delete buttons found: ${deleteButtons}`);
    console.log(`Total action buttons found: ${allButtons}`);
    
    // Get HTML content of the actions column
    const actionsHtml = await page.locator('td.actions').first().innerHTML();
    console.log('Actions column HTML:', actionsHtml);
    
    // Check for permission components
    const permissionDivs = await page.locator('[data-testid*="permission"]').count();
    console.log(`Permission components found: ${permissionDivs}`);
    
    await page.waitForTimeout(5000);  // Keep browser open for inspection
    
  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ 
      path: '/Users/prabhjot/seasia/auth-service/tests/bdd/debug-error.png',
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

debugGroupsUI();
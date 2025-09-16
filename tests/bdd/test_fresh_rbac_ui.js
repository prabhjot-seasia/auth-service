const { chromium } = require('playwright');

async function testFreshRBACUI() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Listen to console logs
  page.on('console', msg => {
    if (msg.text().includes('PermissionContext') || msg.text().includes('RequirePermission')) {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    }
  });
  
  try {
    console.log('=== TESTING FRESH RBAC SYSTEM ===');
    
    // Test 1: Admin user login and access
    console.log('=== Testing admin user (should have all access) ===');
    await page.goto('http://localhost:3001');
    await page.waitForTimeout(2000);
    
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForTimeout(5000);
    
    // Check tabs visible to admin
    const visibleTabs = await page.locator('.dashboard-tabs a').allTextContents();
    console.log('Admin visible tabs:', visibleTabs);
    
    // Check Groups tab specifically
    await page.click('text=Groups');
    await page.waitForTimeout(3000);
    
    const groupsCount = await page.locator('tbody tr').count();
    const editButtons = await page.locator('.btn-icon:has-text("✏️")').count();
    const deleteButtons = await page.locator('.btn-icon:has-text("🗑️")').count();
    
    console.log(`Admin Groups tab - Groups: ${groupsCount}, Edit buttons: ${editButtons}, Delete buttons: ${deleteButtons}`);
    
    // Take screenshot
    await page.screenshot({ path: '/Users/prabhjot/seasia/auth-service/tests/bdd/admin-groups.png', fullPage: true });
    
    // Test 2: Group admin user login and access  
    console.log('=== Testing group_admin user (should have groups access only) ===');
    await page.click('text=Logout');
    await page.waitForTimeout(2000);
    
    await page.fill('input[type="text"]', 'group_admin');
    await page.fill('input[type="password"]', 'Admin@123'); 
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForTimeout(5000);
    
    // Check tabs visible to group_admin
    const groupAdminTabs = await page.locator('.dashboard-tabs a').allTextContents();
    console.log('Group admin visible tabs:', groupAdminTabs);
    
    // Should see My Permissions and Groups only
    const shouldSeeGroups = groupAdminTabs.includes('Groups');
    const shouldNotSeeUsers = !groupAdminTabs.includes('User Management');
    const shouldNotSeeRoles = !groupAdminTabs.includes('Roles'); 
    const shouldNotSeeServices = !groupAdminTabs.includes('Services');
    
    console.log(`Group admin permissions - Groups: ${shouldSeeGroups}, No Users: ${shouldNotSeeUsers}, No Roles: ${shouldNotSeeRoles}, No Services: ${shouldNotSeeServices}`);
    
    // Check Groups tab functionality
    if (shouldSeeGroups) {
      await page.click('text=Groups');
      await page.waitForTimeout(3000);
      
      const groupAdminGroupsCount = await page.locator('tbody tr').count();
      const groupAdminEditButtons = await page.locator('.btn-icon:has-text("✏️")').count();
      const groupAdminDeleteButtons = await page.locator('.btn-icon:has-text("🗑️")').count();
      
      console.log(`Group admin Groups tab - Groups: ${groupAdminGroupsCount}, Edit buttons: ${groupAdminEditButtons}, Delete buttons: ${groupAdminDeleteButtons}`);
    }
    
    // Take screenshot  
    await page.screenshot({ path: '/Users/prabhjot/seasia/auth-service/tests/bdd/group-admin-access.png', fullPage: true });
    
    console.log('=== Fresh RBAC UI Test Complete ===');
    
  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ 
      path: '/Users/prabhjot/seasia/auth-service/tests/bdd/rbac-error.png',
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

testFreshRBACUI();
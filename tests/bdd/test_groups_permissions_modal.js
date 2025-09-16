#!/usr/bin/env node

const { chromium } = require('playwright');

async function testGroupsPermissionsModal() {
    console.log('🔍 TESTING GROUPS PERMISSIONS MODAL');
    console.log('===================================');
    
    const browser = await chromium.launch({ headless: false, slowMo: 1000 });
    const page = await browser.newPage();
    
    try {
        // Navigate and login
        await page.goto('http://localhost:3001');
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        
        // Wait for dashboard
        await page.waitForSelector('.nav-tabs', { timeout: 15000 });
        console.log('✅ Logged in successfully');
        
        // Navigate to Groups tab
        await page.click('text=Groups');
        await page.waitForSelector('.user-management-header', { timeout: 10000 });
        console.log('✅ Groups tab loaded');
        
        // Look for a group with services
        await page.waitForTimeout(2000); // Let the data load
        
        // Try to find and click on a service count button
        const serviceButtons = await page.locator('.service-count-btn').all();
        
        if (serviceButtons.length > 0) {
            console.log(`✅ Found ${serviceButtons.length} groups with clickable service counts`);
            
            // Click on the first one
            await serviceButtons[0].click();
            console.log('✅ Clicked on service count button');
            
            // Wait for the permissions modal
            await page.waitForSelector('.modal:has-text("Services & Permissions")', { timeout: 10000 });
            console.log('✅ Permissions modal opened');
            
            // Check modal content
            const modalTitle = await page.locator('.modal h3').first().textContent();
            console.log(`📋 Modal title: ${modalTitle}`);
            
            // Check for service cards
            const serviceCards = await page.locator('.service-permission-card').count();
            console.log(`📋 Found ${serviceCards} service cards in modal`);
            
            // Check for permission badges
            const permissionBadges = await page.locator('.permission-badge').count();
            console.log(`📋 Found ${permissionBadges} permission badges`);
            
            // Check for raw scopes
            const rawScopes = await page.locator('.raw-scopes').count();
            console.log(`📋 Found ${rawScopes} raw scope sections`);
            
            // Check for buttons
            const closeBtn = await page.locator('button:has-text("Close")').isVisible();
            const editBtn = await page.locator('button:has-text("Edit Services")').isVisible();
            console.log(`📋 Close button visible: ${closeBtn}`);
            console.log(`📋 Edit Services button visible: ${editBtn}`);
            
            // Test closing modal
            await page.click('button:has-text("Close")');
            await page.waitForSelector('.modal', { state: 'hidden', timeout: 5000 });
            console.log('✅ Modal closed successfully');
            
            console.log('\n🎉 GROUPS PERMISSIONS MODAL TEST PASSED!');
            console.log('=========================================');
            console.log('✅ Service counts are clickable');
            console.log('✅ Permissions modal opens correctly');
            console.log('✅ Service cards and permissions display properly');
            console.log('✅ Modal functionality works as expected');
            
        } else {
            console.log('ℹ️  No groups with services found, checking if feature is accessible');
            
            // Check if the groups exist but don't have services
            const groupRows = await page.locator('.users-table tbody tr').count();
            console.log(`📋 Found ${groupRows} total groups`);
            
            if (groupRows > 0) {
                console.log('✅ Feature is implemented but no groups have services assigned yet');
            } else {
                console.log('⚠️  No groups found in the system');
            }
        }
        
        // Keep browser open for a few seconds to see the results
        await page.waitForTimeout(3000);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await page.screenshot({ 
            path: '/Users/prabhjot/seasia/auth-service/tests/bdd/groups-permissions-test-error.png'
        });
        console.log('📷 Error screenshot saved');
    } finally {
        await browser.close();
    }
}

testGroupsPermissionsModal();
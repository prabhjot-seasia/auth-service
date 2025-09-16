#!/usr/bin/env node

const { chromium } = require('playwright');

async function testPermissionsFix() {
    console.log('🔍 TESTING PERMISSIONS FROM GROUP SERVICES');
    console.log('==========================================');
    
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
        
        // Test 1: Check "My Permissions" tab for group service permissions
        console.log('\n📋 Testing "My Permissions" tab...');
        await page.click('text=My Permissions');
        await page.waitForSelector('.permissions-list', { timeout: 10000 });
        
        const permissionItems = await page.locator('.permission-item').count();
        console.log(`📋 Found ${permissionItems} total permissions`);
        
        // Get all permission texts
        const permissions = [];
        for (let i = 0; i < permissionItems; i++) {
            const permText = await page.locator('.permission-item').nth(i).textContent();
            permissions.push(permText.trim());
        }
        
        console.log('📋 Current permissions:', permissions);
        
        // Test 2: Check Roles tab for administrator role permissions
        console.log('\n🎭 Testing Roles tab for administrator permissions...');
        await page.click('text=Roles');
        await page.waitForSelector('.users-table', { timeout: 10000 });
        
        // Look for administrator role
        const adminRoleRow = await page.locator('tr:has-text("administrator")').first();
        if (await adminRoleRow.isVisible()) {
            console.log('✅ Found administrator role');
            
            // Get permission count
            const permissionCountBtn = await adminRoleRow.locator('.permission-count-btn').first();
            const permissionCountText = await permissionCountBtn.textContent();
            console.log(`📋 Administrator role permissions: ${permissionCountText}`);
            
            // Click to view permissions
            await permissionCountBtn.click();
            await page.waitForSelector('.modal:has-text("Permissions for Role")', { timeout: 10000 });
            console.log('✅ Role permissions modal opened');
            
            // Count permission badges
            const permissionBadges = await page.locator('.permission-badge').count();
            console.log(`📋 Permission badges in modal: ${permissionBadges}`);
            
            // Get badge texts
            const badgeTexts = [];
            for (let i = 0; i < permissionBadges; i++) {
                const badgeText = await page.locator('.permission-badge').nth(i).textContent();
                badgeTexts.push(badgeText.trim());
            }
            console.log('📋 Permission badges:', badgeTexts);
            
            // Close modal
            await page.click('button:has-text("Close")');
            await page.waitForSelector('.modal', { state: 'hidden', timeout: 5000 });
            console.log('✅ Modal closed');
        } else {
            console.log('⚠️  Administrator role not found');
        }
        
        console.log('\n🎉 PERMISSIONS TEST COMPLETED!');
        console.log('===============================');
        console.log('✅ Both direct role permissions and group service permissions should now be visible');
        console.log('✅ Multiple services attached to groups should all contribute their permissions');
        console.log('✅ Check if you can see permissions from all services now');
        
        // Keep browser open for a few seconds to see the results
        await page.waitForTimeout(5000);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await page.screenshot({ 
            path: '/Users/prabhjot/seasia/auth-service/tests/bdd/permissions-test-error.png'
        });
        console.log('📷 Error screenshot saved');
    } finally {
        await browser.close();
    }
}

testPermissionsFix();
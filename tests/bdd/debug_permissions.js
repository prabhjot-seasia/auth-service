#!/usr/bin/env node

const { chromium } = require('playwright');

async function debugPermissions() {
    console.log('🔍 DEBUGGING PERMISSION COUNTS');
    console.log('===============================');
    
    const browser = await chromium.launch({ headless: false, slowMo: 500 });
    const page = await browser.newPage();
    
    try {
        // Navigate and login
        await page.goto('http://localhost:3001');
        await page.waitForTimeout(2000);
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        
        // Wait for dashboard
        await page.waitForSelector('.nav-tabs', { timeout: 15000 });
        console.log('✅ Logged in successfully');
        
        // Check Roles tab
        console.log('\n🎭 Checking Roles tab...');
        await page.click('text=Roles');
        await page.waitForSelector('.users-table', { timeout: 10000 });
        
        // Get all roles and their permission counts
        const roleRows = await page.locator('.users-table tbody tr').count();
        console.log(`📋 Found ${roleRows} roles`);
        
        for (let i = 0; i < roleRows; i++) {
            const row = page.locator('.users-table tbody tr').nth(i);
            const nameCell = await row.locator('td').nth(0).textContent();
            const permissionCell = await row.locator('td').nth(2).textContent();
            const groupsCell = await row.locator('td').nth(3).textContent();
            
            console.log(`📋 Role "${nameCell.trim()}": ${permissionCell.trim()}, ${groupsCell.trim()}`);
            
            // If this is administrator or group_administrator, click to see details
            if (nameCell.includes('administrator') || nameCell.includes('group_administrator')) {
                console.log(`🔍 Examining ${nameCell.trim()} in detail...`);
                
                const permissionBtn = await row.locator('.permission-count-btn').first();
                await permissionBtn.click();
                await page.waitForSelector('.modal:has-text("Permissions for Role")', { timeout: 10000 });
                
                // Count permission badges
                const badges = await page.locator('.permission-badge').count();
                console.log(`   📋 Permission badges in modal: ${badges}`);
                
                // Get all badge texts
                const badgeTexts = [];
                for (let j = 0; j < badges; j++) {
                    const badgeText = await page.locator('.permission-badge').nth(j).textContent();
                    badgeTexts.push(badgeText.trim());
                }
                
                console.log(`   📋 Permissions: ${badgeTexts.join(', ')}`);
                
                // Check if we can see group memberships
                const groupMemberships = await page.locator('.group-membership-card').count();
                if (groupMemberships > 0) {
                    console.log(`   📋 Group memberships: ${groupMemberships}`);
                    for (let k = 0; k < groupMemberships; k++) {
                        const groupCard = page.locator('.group-membership-card').nth(k);
                        const groupName = await groupCard.locator('h5').textContent();
                        console.log(`      - Group: ${groupName.trim()}`);
                    }
                } else {
                    console.log(`   📋 No group memberships visible in modal`);
                }
                
                // Close modal
                await page.click('button:has-text("Close")');
                await page.waitForSelector('.modal', { state: 'hidden', timeout: 5000 });
                
                console.log(''); // Empty line for readability
            }
        }
        
        // Also check My Permissions tab
        console.log('👤 Checking My Permissions tab...');
        await page.click('text=My Permissions');
        await page.waitForSelector('.permissions-list', { timeout: 10000 });
        
        const myPermissions = await page.locator('.permission-item').count();
        console.log(`📋 My Permissions count: ${myPermissions}`);
        
        const myPermTexts = [];
        for (let i = 0; i < myPermissions; i++) {
            const permText = await page.locator('.permission-item').nth(i).textContent();
            myPermTexts.push(permText.trim());
        }
        console.log(`📋 My Permissions: ${myPermTexts.join(', ')}`);
        
        console.log('\n🎉 DEBUG COMPLETED!');
        console.log('===================');
        
        // Keep browser open for inspection
        await page.waitForTimeout(10000);
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.log('Error stack:', error.stack);
    } finally {
        await browser.close();
    }
}

debugPermissions();
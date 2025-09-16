#!/usr/bin/env node

const { chromium } = require('playwright');

async function testButtonAlignment() {
    console.log('🔍 TESTING UI BUTTON ALIGNMENT & SIZING');
    console.log('==========================================');
    
    const browser = await chromium.launch({ headless: false, slowMo: 500 });
    const page = await browser.newPage();
    
    try {
        // Navigate to the application
        console.log('\n1. Navigating to application...');
        await page.goto('http://localhost:3001');
        await page.waitForLoadState('networkidle');
        
        // Login as admin
        console.log('\n2. Logging in as admin...');
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        
        // Wait for dashboard to load
        await page.waitForSelector('.nav-tabs', { timeout: 10000 });
        console.log('✅ Login successful');
        
        // Navigate to User Management tab
        console.log('\n3. Navigating to User Management tab...');
        await page.click('text=User Management');
        await page.waitForSelector('.user-management-header', { timeout: 10000 });
        
        // Check button alignment and sizing
        console.log('\n4. Checking button alignment and sizing...');
        const headerActions = await page.locator('.header-actions').first();
        await headerActions.waitFor({ state: 'visible' });
        
        // Get all buttons in header actions
        const buttons = await headerActions.locator('.btn-small').all();
        console.log(`Found ${buttons.length} buttons in header actions`);
        
        if (buttons.length > 0) {
            console.log('\n5. Analyzing button dimensions...');
            
            const buttonInfo = [];
            for (let i = 0; i < buttons.length; i++) {
                const button = buttons[i];
                const boundingBox = await button.boundingBox();
                const text = await button.textContent();
                
                if (boundingBox) {
                    buttonInfo.push({
                        text: text?.trim() || `Button ${i + 1}`,
                        width: Math.round(boundingBox.width),
                        height: Math.round(boundingBox.height),
                        x: Math.round(boundingBox.x),
                        y: Math.round(boundingBox.y)
                    });
                }
            }
            
            // Display button information
            console.log('\nButton Analysis:');
            console.log('================');
            buttonInfo.forEach((info, index) => {
                console.log(`${index + 1}. "${info.text}"`);
                console.log(`   Dimensions: ${info.width} x ${info.height}px`);
                console.log(`   Position: (${info.x}, ${info.y})`);
                console.log('');
            });
            
            // Check if all buttons have consistent heights
            const heights = buttonInfo.map(info => info.height);
            const allSameHeight = heights.every(h => h === heights[0]);
            
            if (allSameHeight) {
                console.log(`✅ All buttons have consistent height: ${heights[0]}px`);
            } else {
                console.log(`⚠️  Button heights vary: ${heights.join('px, ')}px`);
            }
            
            // Check horizontal alignment (Y position should be same)
            const yPositions = buttonInfo.map(info => info.y);
            const allSameY = yPositions.every(y => Math.abs(y - yPositions[0]) <= 2); // Allow 2px tolerance
            
            if (allSameY) {
                console.log(`✅ All buttons are horizontally aligned at Y: ${yPositions[0]}px`);
            } else {
                console.log(`⚠️  Button Y positions vary: ${yPositions.join('px, ')}px`);
            }
            
            // Take screenshot
            console.log('\n6. Taking screenshot of button layout...');
            await page.screenshot({ path: 'user-management-buttons.png', fullPage: false });
            console.log('✅ Screenshot saved as user-management-buttons.png');
            
            console.log('\n🎉 BUTTON ALIGNMENT TEST COMPLETED!');
            console.log('=====================================');
            if (allSameHeight && allSameY) {
                console.log('✅ All buttons are properly aligned and sized');
            } else {
                console.log('⚠️  Some alignment issues detected - see details above');
            }
        } else {
            console.log('❌ No buttons found in header actions');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await page.screenshot({ path: 'error-screenshot.png' });
    } finally {
        await browser.close();
    }
}

testButtonAlignment();
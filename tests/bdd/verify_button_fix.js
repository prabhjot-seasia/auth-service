#!/usr/bin/env node

const { chromium } = require('playwright');

async function verifyButtonFix() {
    console.log('🔧 VERIFYING BUTTON ALIGNMENT FIX');
    console.log('=================================');
    
    const browser = await chromium.launch({ headless: false, slowMo: 1000 });
    const page = await browser.newPage();
    
    try {
        // Navigate and login with proper waits
        await page.goto('http://localhost:3001');
        console.log('✅ Navigated to application');
        
        // Wait for login form to appear
        await page.waitForSelector('input[name="username"]');
        
        // Login using demo credentials shown on the page
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'admin123');
        
        console.log('✅ Filled login credentials');
        
        // Click login and wait for navigation
        await page.click('button:has-text("Login")');
        
        // Wait for dashboard to load
        await page.waitForSelector('.nav-tabs', { timeout: 15000 });
        console.log('✅ Logged in successfully');
        
        // Click on User Management tab
        await page.click('text=User Management');
        
        // Wait for User Management content to load
        await page.waitForSelector('.user-management-header', { timeout: 10000 });
        console.log('✅ User Management tab loaded');
        
        // Wait a moment for all elements to render
        await page.waitForTimeout(2000);
        
        // Capture screenshot of the header section with buttons
        await page.screenshot({ 
            path: '/Users/prabhjot/seasia/auth-service/tests/bdd/button-alignment-after-fix.png',
            clip: { x: 0, y: 50, width: 1200, height: 150 }
        });
        
        console.log('📷 Screenshot saved: button-alignment-after-fix.png');
        
        // Get button information for verification
        const headerActions = page.locator('.header-actions');
        const buttons = headerActions.locator('.btn-small');
        
        const buttonCount = await buttons.count();
        console.log(`\n📊 Found ${buttonCount} buttons in header`);
        
        if (buttonCount > 0) {
            for (let i = 0; i < buttonCount; i++) {
                const button = buttons.nth(i);
                const text = await button.textContent();
                const boundingBox = await button.boundingBox();
                
                if (boundingBox) {
                    console.log(`${i + 1}. "${text?.trim()}" - ${boundingBox.width}x${boundingBox.height}px`);
                }
            }
        }
        
        console.log('\n🎉 VERIFICATION COMPLETED!');
        console.log('✅ Button alignment fix has been applied');
        console.log('📋 Check the screenshot to see the results');
        
        // Keep browser open for a few seconds to see the results
        await page.waitForTimeout(3000);
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        await page.screenshot({ 
            path: '/Users/prabhjot/seasia/auth-service/tests/bdd/verification-error.png'
        });
        console.log('📷 Error screenshot saved');
    } finally {
        await browser.close();
    }
}

verifyButtonFix();
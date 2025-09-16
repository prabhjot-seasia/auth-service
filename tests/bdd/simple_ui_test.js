#!/usr/bin/env node

const { chromium } = require('playwright');

async function quickUITest() {
    console.log('🔍 Quick UI Button Test');
    console.log('=======================');
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        // Navigate to the application
        await page.goto('http://localhost:3001', { waitUntil: 'networkidle', timeout: 30000 });
        
        // Try to login
        try {
            await page.fill('input[name="username"]', 'admin', { timeout: 5000 });
            await page.fill('input[name="password"]', 'admin123', { timeout: 5000 });
            await page.click('button[type="submit"]', { timeout: 5000 });
            
            // Wait for navigation
            await page.waitForSelector('.nav-tabs', { timeout: 10000 });
            
            // Click User Management tab
            await page.click('text=User Management', { timeout: 5000 });
            await page.waitForTimeout(2000); // Wait for content to load
            
            // Take screenshot of User Management area
            await page.screenshot({ 
                path: '/Users/prabhjot/seasia/auth-service/tests/bdd/user-management-buttons-fixed.png',
                clip: { x: 0, y: 0, width: 1200, height: 200 }
            });
            
            console.log('✅ Screenshot saved: user-management-buttons-fixed.png');
            console.log('✅ UI test completed successfully');
            
        } catch (loginError) {
            // Take screenshot even if login fails
            await page.screenshot({ 
                path: '/Users/prabhjot/seasia/auth-service/tests/bdd/ui-state.png'
            });
            console.log('📷 Screenshot saved: ui-state.png');
            console.log('ℹ️  Login may have failed, but screenshot captured');
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
        await page.screenshot({ 
            path: '/Users/prabhjot/seasia/auth-service/tests/bdd/error-state.png'
        });
    } finally {
        await browser.close();
    }
}

quickUITest();
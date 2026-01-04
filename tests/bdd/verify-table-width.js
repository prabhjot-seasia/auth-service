const { chromium } = require('playwright');

async function verifyTableWidth() {
    console.log('🔍 Starting table width verification...');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    
    try {
        // Navigate to login page
        console.log('📱 Navigating to login page...');
        await page.goto('http://localhost:3001/login');
        await page.waitForLoadState('networkidle');
        
        // Login as admin
        console.log('🔑 Logging in as admin...');
        await page.fill('input[type="text"]', 'admin');
        await page.fill('input[type="password"]', 'Admin@123');
        await page.click('button[type="submit"]');
        
        // Wait for dashboard
        await page.waitForSelector('.dashboard-container', { timeout: 10000 });
        console.log('✅ Dashboard loaded successfully');
        
        // Navigate to User Management
        console.log('👥 Switching to User Management tab...');
        await page.click('button:has-text("User Management")');
        await page.waitForSelector('.users-table', { timeout: 10000 });
        
        // Wait for users to load
        await page.waitForTimeout(2000);
        
        // Measure table width with normal users vs extreme users
        console.log('📏 Measuring table widths...');
        
        const tableElement = await page.$('.users-table');
        if (!tableElement) {
            throw new Error('Table not found!');
        }
        
        // Get initial table width
        const initialTableWidth = await tableElement.evaluate(el => el.getBoundingClientRect().width);
        console.log(`📊 Initial table width: ${initialTableWidth}px`);
        
        // Search for extreme users
        console.log('🔍 Searching for extreme test users...');
        const searchInput = await page.$('input[placeholder*="Search"], input[placeholder*="search"], .search-input');
        if (searchInput) {
            await searchInput.fill('extreme');
            await page.waitForTimeout(2000);
            
            // Check if any rows are visible after search
            const visibleRows = await page.$$('.users-table tbody tr');
            console.log(`📊 Found ${visibleRows.length} rows after search`);
            
            if (visibleRows.length === 0) {
                console.log('⚠️  No rows found after search, trying different search terms...');
                await searchInput.fill('long');
                await page.waitForTimeout(2000);
                const longRows = await page.$$('.users-table tbody tr');
                console.log(`📊 Found ${longRows.length} rows after searching for "long"`);
            }
            
            // Measure table width with extreme content
            const extremeTableWidth = await tableElement.evaluate(el => el.getBoundingClientRect().width);
            console.log(`📊 Table width with extreme content: ${extremeTableWidth}px`);
            
            // Check if width is constant
            const widthDifference = Math.abs(initialTableWidth - extremeTableWidth);
            console.log(`📏 Width difference: ${widthDifference}px`);
            
            if (widthDifference < 5) {
                console.log('✅ SUCCESS: Table width is constant!');
            } else {
                console.log('❌ FAILURE: Table width is NOT constant!');
                console.log(`   Expected: ~${initialTableWidth}px, Got: ${extremeTableWidth}px`);
            }
            
            // Check if action buttons are contained
            console.log('🔘 Checking action button containment...');
            const actionCells = await page.$$('.users-table td:nth-child(6)');
            let buttonsContained = true;
            let buttonIssues = [];
            
            for (let i = 0; i < actionCells.length; i++) {
                const cell = actionCells[i];
                const cellRect = await cell.boundingBox();
                const buttons = await cell.$$('button');
                
                for (const button of buttons) {
                    const buttonRect = await button.boundingBox();
                    if (buttonRect && cellRect && (buttonRect.x + buttonRect.width > cellRect.x + cellRect.width + 5)) {
                        buttonsContained = false;
                        buttonIssues.push(`Row ${i + 1}: Button extends ${(buttonRect.x + buttonRect.width) - (cellRect.x + cellRect.width)}px beyond cell`);
                    }
                }
            }
            
            if (buttonsContained) {
                console.log('✅ SUCCESS: Action buttons are properly contained!');
            } else {
                console.log('❌ FAILURE: Some action buttons extend beyond their cells!');
                buttonIssues.forEach(issue => console.log(`   ${issue}`));
            }
            
            // Clear search to show all users again
            await searchInput.fill('');
            await page.waitForTimeout(1000);
            
            // Final table width check
            const finalTableWidth = await tableElement.evaluate(el => el.getBoundingClientRect().width);
            console.log(`📊 Final table width: ${finalTableWidth}px`);
            
            // Overall result
            const overallSuccess = widthDifference < 5 && buttonsContained;
            console.log('\n' + '='.repeat(60));
            if (overallSuccess) {
                console.log('🎉 OVERALL SUCCESS: Table width constraint is working properly!');
                console.log('✅ Table maintains constant width regardless of content length');
                console.log('✅ Action buttons stay within their column boundaries');
            } else {
                console.log('⚠️  OVERALL FAILURE: Table width constraint needs more work!');
                if (widthDifference >= 5) {
                    console.log('❌ Table width changes with content length');
                }
                if (!buttonsContained) {
                    console.log('❌ Action buttons extend beyond their columns');
                }
            }
            console.log('='.repeat(60));
            
        } else {
            console.log('⚠️  Search input not found, checking table width only...');
            console.log(`📊 Current table width: ${initialTableWidth}px`);
        }
        
    } catch (error) {
        console.error('❌ Error during verification:', error.message);
        console.error(error.stack);
    } finally {
        await browser.close();
    }
}

verifyTableWidth();
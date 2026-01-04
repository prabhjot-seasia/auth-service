const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// Variables to store context across steps
let authServiceTab, documentServiceTab, currentToken;

When('I switch back to the original tab', async function () {
  // Find the auth service tab (should be the first page or the one with login/dashboard)
  const pages = await this.context.pages();
  
  console.log('Available pages:');
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const url = page.url();
    console.log(`  Page ${i}: ${url}`);
    
    if (url.includes('localhost:8080') || url.includes('8080') || url.includes('/') && !url.includes('3000')) {
      await page.bringToFront();
      this.page = page; // Update current page reference
      console.log('✅ Switched back to auth service tab:', url);
      return;
    }
  }
  
  // If no 8080 page found, just use the first page (likely the original auth service page)
  if (pages.length > 0) {
    const firstPage = pages[0];
    await firstPage.bringToFront();
    this.page = firstPage;
    console.log('✅ Switched back to first page (assumed auth service):', firstPage.url());
    return;
  }
  
  throw new Error('No pages found');
});

When('I click the logout button in auth service', async function () {
  try {
    // Wait for the logout button to be visible
    await this.page.waitForSelector('.dropdown-logout', { timeout: 10000 });
    
    // Click the logout button
    await this.page.click('.dropdown-logout');
    console.log('✅ Clicked logout button');
    
    // Wait for redirect to login page
    await this.page.waitForFunction(() => {
      return window.location.pathname === '/' || 
             document.querySelector('.login-container') !== null ||
             document.querySelector('input[placeholder="Username"]') !== null;
    }, { timeout: 10000 });
    
    console.log('✅ Logout completed, redirected to login page');
  } catch (error) {
    console.log('❌ Logout failed:', error.message);
    throw error;
  }
});

When('I switch to the document base service tab', async function () {
  const pages = await this.context.pages();
  
  // Find the document base service tab
  for (const page of pages) {
    const url = page.url();
    if (url.includes('localhost:3000') || url.includes('3000')) {
      documentServiceTab = page;
      await page.bringToFront();
      this.page = page; // Update current page reference
      console.log('✅ Switched to document base service tab:', url);
      return;
    }
  }
  
  throw new Error('Document base service tab not found');
});

When('I refresh the page', async function () {
  await this.page.reload({ waitUntil: 'networkidle0' });
  console.log('✅ Page refreshed');
});

Then('I should see the login form in document service', async function () {
  try {
    // Wait for login form elements to appear
    const loginFormExists = await Promise.race([
      this.page.waitForSelector('input[type="text"], input[placeholder*="username"], input[name="username"]', { timeout: 15000 }).then(() => true),
      this.page.waitForSelector('.login-container, .login-form, form', { timeout: 15000 }).then(() => true)
    ]);
    
    if (loginFormExists) {
      console.log('✅ Login form detected in document service');
    }
    
    // Additional check for specific login elements
    const hasUsernameInput = await this.page.$('input[type="text"], input[placeholder*="username"], input[name="username"]') !== null;
    const hasPasswordInput = await this.page.$('input[type="password"], input[placeholder*="password"], input[name="password"]') !== null;
    
    console.log('Username input present:', hasUsernameInput);
    console.log('Password input present:', hasPasswordInput);
    
    expect(hasUsernameInput || hasPasswordInput).to.be.true;
    
  } catch (error) {
    console.log('❌ Failed to detect login form in document service');
    
    // Debug: log current page content
    const currentUrl = this.page.url();
    const title = await this.page.title();
    console.log('Current URL:', currentUrl);
    console.log('Page title:', title);
    
    // Check what's actually on the page
    const bodyContent = await this.page.evaluate(() => {
      return document.body.innerText.substring(0, 500);
    });
    console.log('Page content preview:', bodyContent);
    
    throw new Error('Login form not found in document service after token invalidation');
  }
});

Then('I should not be able to access protected resources', async function () {
  try {
    // Try to access a protected resource
    const currentUrl = this.page.url();
    
    // If we're on login page, that's good - token was invalidated
    if (currentUrl.includes('/auth/callback') || 
        await this.page.$('input[type="text"], input[type="password"]') !== null) {
      console.log('✅ Cannot access protected resources - redirected to login');
      return;
    }
    
    // If we can still access protected content, that's a problem
    const protectedContent = await this.page.$('.dashboard, .document, .file-viewer');
    if (protectedContent) {
      throw new Error('Still able to access protected resources - token was not properly invalidated');
    }
    
    console.log('✅ Protected resources are not accessible');
  } catch (error) {
    console.log('❌ Token invalidation check failed:', error.message);
    throw error;
  }
});

When('I logout from the document base service', async function () {
  try {
    // Look for logout button in document service
    const logoutSelectors = [
      'button:contains("Logout")',
      'button:contains("Sign Out")',
      '.logout-btn',
      '.logout',
      '[data-testid="logout"]',
      'a[href*="logout"]'
    ];
    
    let logoutButton = null;
    for (const selector of logoutSelectors) {
      try {
        if (selector.includes(':contains')) {
          // Use XPath for text-based selection
          const xpath = `//button[contains(text(), 'Logout')] | //button[contains(text(), 'Sign Out')] | //a[contains(text(), 'Logout')] | //a[contains(text(), 'Sign Out')]`;
          const elements = await this.page.$x(xpath);
          if (elements.length > 0) {
            logoutButton = elements[0];
            break;
          }
        } else {
          logoutButton = await this.page.$(selector);
          if (logoutButton) break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (logoutButton) {
      await logoutButton.click();
      console.log('✅ Clicked logout button in document service');
      
      // Wait for logout to complete
      await this.page.waitForFunction(() => {
        return document.querySelector('input[type="text"], input[type="password"]') !== null ||
               window.location.pathname.includes('/login') ||
               window.location.pathname === '/';
      }, { timeout: 10000 });
      
    } else {
      // If no logout button found, call the logout API directly
      console.log('No logout button found, calling logout API directly');
      
      await this.page.evaluate(async () => {
        const token = localStorage.getItem('access_token');
        if (token) {
          try {
            // Call document service logout
            await fetch('/auth/logout', { method: 'POST' });
            
            // Call auth service logout
            await fetch('http://localhost:8080/sso/logout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: token })
            });
            
            localStorage.removeItem('access_token');
            window.location.reload();
          } catch (error) {
            console.log('Logout API call failed:', error);
          }
        }
      });
      
      await this.page.waitForTimeout(2000); // Wait for reload
    }
    
    console.log('✅ Logout from document service completed');
    
  } catch (error) {
    console.log('❌ Failed to logout from document service:', error.message);
    throw error;
  }
});

Then('I should not be authenticated in the auth service', async function () {
  try {
    // Check if we're on login page or can access protected content
    const isOnLoginPage = await Promise.race([
      this.page.waitForSelector('input[placeholder="Username"], .login-container', { timeout: 5000 }).then(() => true),
      this.page.waitForFunction(() => window.location.pathname === '/', { timeout: 5000 }).then(() => false)
    ]);
    
    if (isOnLoginPage) {
      console.log('✅ Not authenticated in auth service - on login page');
      return;
    }
    
    // If we can still see dashboard, that's a problem
    const dashboard = await this.page.$('.dashboard');
    if (dashboard) {
      throw new Error('Still authenticated in auth service - can access dashboard');
    }
    
    console.log('✅ Not authenticated in auth service');
    
  } catch (error) {
    console.log('❌ Auth service authentication check failed:', error.message);
    throw error;
  }
});

// API testing steps
Given('I am authenticated with valid credentials', async function () {
  // Login and store token
  const response = await fetch('http://localhost:8080/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'password',
      username: 'admin',
      password: 'Admin@123'
    })
  });
  
  const result = await response.json();
  currentToken = result.access_token;
  expect(currentToken).to.exist;
  console.log('✅ Authenticated and token stored');
});

Given('I have accessed the document base service', async function () {
  // Verify token works with document service
  const response = await fetch('http://localhost:8081/auth/me', {
    headers: { 'Authorization': `Bearer ${currentToken}` }
  });
  
  expect(response.ok).to.be.true;
  console.log('✅ Token works with document base service');
});

When('I logout from the auth service', async function () {
  // Call logout API
  const response = await fetch('http://localhost:8080/sso/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: currentToken })
  });
  
  expect(response.ok).to.be.true;
  console.log('✅ Logout API called successfully');
});

Then('any API call with the old token should return 401 unauthorized', async function () {
  // Test auth service API
  const authResponse = await fetch('http://localhost:8080/me/permissions', {
    headers: { 'Authorization': `Bearer ${currentToken}` }
  });
  
  expect(authResponse.status).to.equal(401);
  console.log('✅ Auth service API returns 401 for invalidated token');
});

Then('the token should be in the blacklist', async function () {
  // Test token validation endpoint
  const response = await fetch('http://localhost:8080/sso/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: currentToken })
  });
  
  const result = await response.json();
  expect(result.valid).to.be.false;
  expect(result.error).to.include('invalidated');
  console.log('✅ Token is blacklisted and validation fails');
});

Then('document service API calls should also fail with the same token', async function () {
  // Test document service API
  const docResponse = await fetch('http://localhost:8081/auth/me', {
    headers: { 'Authorization': `Bearer ${currentToken}` }
  });
  
  expect(docResponse.status).to.equal(401);
  console.log('✅ Document service API also returns 401 for invalidated token');
});

// Store tab references for cleanup
When('I open the Document Base service in a new tab', async function () {
  authServiceTab = this.page; // Store reference to auth service tab
  
  // Rest of the existing implementation
  await this.page.waitForSelector('.services-section', { timeout: 10000 });
  
  const serviceLinks = await this.page.$$eval('a[target="_blank"]', links => 
    links.map(link => ({
      text: link.textContent.trim(),
      href: link.href
    }))
  );
  
  const documentBaseLink = serviceLinks.find(link => 
    link.text.includes('Document Base') || link.href.includes('localhost:3000')
  );
  
  if (!documentBaseLink) {
    throw new Error('Document Base service link not found');
  }
  
  await this.page.click('a[target="_blank"]');
  console.log('✅ Clicked Document Base service link');
  
  // Wait for new tab and get reference
  await this.page.waitForTimeout(2000);
  const pages = await this.browser.pages();
  documentServiceTab = pages[pages.length - 1]; // Get the newest tab
  
  console.log('✅ New tab opened successfully');
});
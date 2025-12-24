const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--window-size=450,900']
  });

  try {
    const page = await browser.newPage();
    
    // Simulate mobile viewport
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true
    });

    const targetUrl = process.env.TEST_URL || 'http://localhost:8081';
    console.log(`Navigating to ${targetUrl}...`);
    
    // Listen for alerts
    page.on('dialog', async dialog => {
        console.log(`ALERT: ${dialog.message()}`);
        await dialog.dismiss();
    });

    await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    console.log('Waiting for app to load...');
    await page.waitForFunction(() => document.body.innerText.length > 0);

    console.log('Looking for "Login" button...');
    
    // Use text locator to find Login. 
    // We wait for it to be visible.
    const loginButton = await page.waitForSelector('::-p-text(Login)', { timeout: 5000 });
    
    if (!loginButton) {
        throw new Error('Login button not found');
    }

    console.log('Clicking Login...');
    await loginButton.click();

    // Wait for Email Input
    console.log('Waiting for inputs...');
    try {
        await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    } catch (e) {
        console.log('Timeout waiting for email input. Taking debug screenshot...');
        await page.screenshot({ path: 'debug-login-click.png' });
        const html = await page.content();
        // console.log('Page HTML:', html); // Commented out to reduce noise, enable if needed
        throw e;
    }

    // Type credentials
    console.log('Filling credentials...');
    await page.type('input[type="email"]', 'test@test.test');
    await page.type('input[type="password"]', process.env.TEST_PASSWORD || 'test@test.test');

    // Click Sign In
    console.log('Submitting...');
    let signInClicked = false;
    try {
        console.log('Waiting for Sign In button...');
        const signInButton = await page.waitForSelector('::-p-text(Sign In)', { visible: true, timeout: 10000 });
        console.log('Sign In button found, clicking...');
        await signInButton.click();
        signInClicked = true;
        console.log('Clicked Sign In.');
    } catch (e) {
        console.log('Timeout or error waiting for Sign In button.');
        await page.screenshot({ path: 'debug-before-sign-in-click.png' });
        const html = await page.content();
        // console.log('Page HTML:', html); // Commented out to reduce noise, enable if needed
        throw new Error('Could not find or click Sign In button.');
    }

    // Wait for success indicator
    // We look for the absence of login form elements to confirm navigation away from login page.
    console.log('Waiting for login to complete...');
    try {
        await page.waitForFunction(
            () => {
                // Check if email and password inputs are no longer present on the page
                const emailInput = document.querySelector('input[type="email"]');
                const passwordInput = document.querySelector('input[type="password"]');
                return !emailInput && !passwordInput;
            },
            { timeout: 10000 }
        );
        console.log('✅ Login Successful! Login form is no longer visible.');
    } catch (e) {
        console.log('⚠️ Login verification timed out. Taking screenshot...');
        await page.screenshot({ path: 'login-verification-fail.png' });
        const html = await page.content();
        // console.log('Page HTML:', html); // Commented out to reduce noise, enable if needed
        throw new Error('Login verification failed. Login form elements were still present.');
    }

  } catch (error) {

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
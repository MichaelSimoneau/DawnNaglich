// Use Puppeteer since it's already installed, but test API calls directly
const puppeteer = require('puppeteer');

const BASE_URL = 'https://dawnnaglich.com';

async function testApiCalls() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();

  try {
    console.log('Navigating to', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForTimeout(3000); // Wait for page to load

    console.log('\n=== Testing API Calls ===\n');

    // Test 1: generateGeminiResponse
    console.log('Test 1: Testing generateGeminiResponse API...');
    try {
      const result = await page.evaluate(async () => {
        const response = await fetch('/api/generateGeminiResponse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              conversationHistory: [],
              userMessage: 'Hello, test message',
              userRole: 'client',
            },
          }),
        });
        
        const data = await response.json();
        return {
          status: response.status,
          ok: response.ok,
          data: data,
        };
      });

      if (result.ok && result.status === 200) {
        console.log('✓ generateGeminiResponse: SUCCESS');
        console.log('  Response:', JSON.stringify(result.data, null, 2).substring(0, 200));
      } else {
        console.log('✗ generateGeminiResponse: FAILED');
        console.log('  Status:', result.status);
        console.log('  Response:', JSON.stringify(result.data, null, 2));
      }
    } catch (error) {
      console.log('✗ generateGeminiResponse: ERROR');
      console.log('  Error:', error.message);
    }

    // Test 2: getCalendarEventsSecure
    console.log('\nTest 2: Testing getCalendarEventsSecure API...');
    try {
      const result = await page.evaluate(async () => {
        const response = await fetch('/api/getCalendarEventsSecure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              timeMin: new Date().toISOString(),
              timeMax: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
          }),
        });
        
        const data = await response.json();
        return {
          status: response.status,
          ok: response.ok,
          data: data,
        };
      });

      if (result.ok && result.status === 200) {
        console.log('✓ getCalendarEventsSecure: SUCCESS');
        console.log('  Response items count:', result.data?.result?.data?.items?.length || result.data?.items?.length || 0);
      } else {
        console.log('✗ getCalendarEventsSecure: FAILED');
        console.log('  Status:', result.status);
        console.log('  Response:', JSON.stringify(result.data, null, 2).substring(0, 200));
      }
    } catch (error) {
      console.log('✗ getCalendarEventsSecure: ERROR');
      console.log('  Error:', error.message);
    }

    // Test 3: createGeminiLiveSession
    console.log('\nTest 3: Testing createGeminiLiveSession API...');
    try {
      const result = await page.evaluate(async () => {
        const response = await fetch('/api/createGeminiLiveSession', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {},
          }),
        });
        
        const data = await response.json();
        return {
          status: response.status,
          ok: response.ok,
          data: data,
        };
      });

      if (result.ok && result.status === 200) {
        console.log('✓ createGeminiLiveSession: SUCCESS');
        console.log('  Response:', JSON.stringify(result.data, null, 2).substring(0, 200));
      } else {
        console.log('✗ createGeminiLiveSession: FAILED');
        console.log('  Status:', result.status);
        console.log('  Response:', JSON.stringify(result.data, null, 2));
      }
    } catch (error) {
      console.log('✗ createGeminiLiveSession: ERROR');
      console.log('  Error:', error.message);
    }

    console.log('\n=== API Tests Complete ===\n');

  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testApiCalls().catch(console.error);


/* eslint-disable @typescript-eslint/no-require-imports */
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
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for page to load

    console.log('\n=== Testing API Calls ===\n');

    // Test 1: generateGeminiResponse
    console.log('Test 1: Testing generateGeminiResponse API...');
    try {
      const result = await page.evaluate(async () => {
        const response = await fetch('https://us-central1-dawn-naglich.cloudfunctions.net/generateGeminiResponse', {
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
        
        const contentType = response.headers.get('content-type');
        let data;
        const text = await response.text();
        
        if (contentType && contentType.includes('application/json')) {
          try {
            data = JSON.parse(text);
          } catch {
            data = { error: 'Failed to parse JSON', text: text.substring(0, 500) };
          }
        } else {
          data = { error: 'Not JSON response', contentType, text: text.substring(0, 500) };
        }
        
        return {
          status: response.status,
          ok: response.ok,
          contentType: contentType,
          data: data,
        };
      });

      if (result.ok && result.status === 200 && result.contentType && result.contentType.includes('application/json')) {
        console.log('✓ generateGeminiResponse: SUCCESS');
        console.log('  Response:', JSON.stringify(result.data, null, 2).substring(0, 300));
      } else {
        console.log('✗ generateGeminiResponse: FAILED');
        console.log('  Status:', result.status);
        console.log('  Content-Type:', result.contentType);
        console.log('  Response:', JSON.stringify(result.data, null, 2).substring(0, 500));
      }
    } catch (error) {
      console.log('✗ generateGeminiResponse: ERROR');
      console.log('  Error:', error.message);
      console.log('  Stack:', error.stack);
    }

    // Test 2: getCalendarEventsSecure
    console.log('\nTest 2: Testing getCalendarEventsSecure API...');
    try {
      const result = await page.evaluate(async () => {
        const response = await fetch('https://us-central1-dawn-naglich.cloudfunctions.net/getCalendarEventsSecure', {
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
        
        const contentType = response.headers.get('content-type');
        let data;
        const text = await response.text();
        
        if (contentType && contentType.includes('application/json')) {
          try {
            data = JSON.parse(text);
          } catch {
            data = { error: 'Failed to parse JSON', text: text.substring(0, 500) };
          }
        } else {
          data = { error: 'Not JSON response', contentType, text: text.substring(0, 500) };
        }
        
        return {
          status: response.status,
          ok: response.ok,
          contentType: contentType,
          data: data,
        };
      });

      if (result.ok && result.status === 200 && result.contentType && result.contentType.includes('application/json')) {
        console.log('✓ getCalendarEventsSecure: SUCCESS');
        console.log('  Response items count:', result.data?.result?.data?.items?.length || result.data?.items?.length || 0);
      } else {
        console.log('✗ getCalendarEventsSecure: FAILED');
        console.log('  Status:', result.status);
        console.log('  Content-Type:', result.contentType);
        console.log('  Response:', JSON.stringify(result.data, null, 2).substring(0, 500));
      }
    } catch (error) {
      console.log('✗ getCalendarEventsSecure: ERROR');
      console.log('  Error:', error.message);
    }

    // Test 3: createGeminiLiveSession
    console.log('\nTest 3: Testing createGeminiLiveSession API...');
    try {
      const result = await page.evaluate(async () => {
        const response = await fetch('https://us-central1-dawn-naglich.cloudfunctions.net/createGeminiLiveSession', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {},
          }),
        });
        
        const contentType = response.headers.get('content-type');
        let data;
        const text = await response.text();
        
        if (contentType && contentType.includes('application/json')) {
          try {
            data = JSON.parse(text);
          } catch {
            data = { error: 'Failed to parse JSON', text: text.substring(0, 500) };
          }
        } else {
          data = { error: 'Not JSON response', contentType, text: text.substring(0, 500) };
        }
        
        return {
          status: response.status,
          ok: response.ok,
          contentType: contentType,
          data: data,
        };
      });

      if (result.ok && result.status === 200 && result.contentType && result.contentType.includes('application/json')) {
        console.log('✓ createGeminiLiveSession: SUCCESS');
        console.log('  Response:', JSON.stringify(result.data, null, 2).substring(0, 300));
      } else {
        console.log('✗ createGeminiLiveSession: FAILED');
        console.log('  Status:', result.status);
        console.log('  Content-Type:', result.contentType);
        console.log('  Response:', JSON.stringify(result.data, null, 2).substring(0, 500));
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


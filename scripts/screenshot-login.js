#!/usr/bin/env node

/**
 * Script to generate a PNG screenshot of the Login component
 * Uses Puppeteer to render the component and capture it as an image
 */

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");

// Import the Login component
// Note: This requires the component to work in a Node environment
// For React Native components, we'll use a different approach
async function generateLoginScreenshot() {
  const outputPath = path.join(__dirname, "..", "login-screenshot.png");

  // Create a temporary HTML file that will render the Login component
  const tempHtmlPath = path.join(__dirname, "..", "temp-login-preview.html");

  // HTML template that will load the component via a dev server or static build
  // Since we can't easily render React Native components server-side,
  // we'll use Puppeteer to navigate to a local server or static file
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Preview</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            background-color: #022C22;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        #root {
            width: 100%;
            max-width: 430px;
            margin: 0 auto;
        }
    </style>
</head>
<body>
    <div id="root">
        <!-- Component will be rendered here by React -->
        <div style="color: white; text-align: center; padding: 40px;">
            <p>Loading Login component...</p>
            <p style="font-size: 12px; color: #94A3B8; margin-top: 10px;">
                If you see this, the component failed to load.
                Make sure to run: pnpm start --web
                Then navigate to the login page.
            </p>
        </div>
    </div>
    <script>
        // This will be replaced with actual component rendering
        // For now, we'll use Puppeteer to navigate to the actual app
        console.log('Preview page loaded');
    </script>
</body>
</html>`;

  // Write temp HTML file
  fs.writeFileSync(tempHtmlPath, htmlContent, "utf8");

  console.log("Starting browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // Set viewport to mobile size (typical for login screens)
    await page.setViewport({
      width: 430,
      height: 932,
      deviceScaleFactor: 2,
    });

    // Check if dev server is running, otherwise use the temp HTML
    const devServerUrl = "http://localhost:8081";
    let urlToUse = `file://${tempHtmlPath}`;

    try {
      // Try to connect to dev server first
      const response = await page.goto(devServerUrl, {
        waitUntil: "networkidle0",
        timeout: 3000,
      });
      if (response && response.ok()) {
        urlToUse = devServerUrl;
        console.log("Using dev server at", devServerUrl);
      }
    } catch (e) {
      console.log("Dev server not available, using static HTML approach");
      console.log(
        "Note: For best results, start the dev server with: pnpm start --web",
      );
    }

    if (urlToUse === `file://${tempHtmlPath}`) {
      // Alternative: Use a simpler approach - render a static version
      // Since React Native components need the full app context,
      // we'll create a visual representation based on the component styles
      await page.goto(urlToUse);

      // Inject the Login component's visual structure
      const loginHtml = [
        '<div style="flex: 1; background-color: #022C22; padding: 25px; display: flex; flex-direction: column; justify-content: center; min-height: 100vh;">',
        '  <div style="text-align: center; margin-bottom: 40px;">',
        '    <div style="width: 80px; height: 80px; background-color: #10B981; border-radius: 24px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; transform: rotate(3deg);">',
        '      <span style="font-size: 32px;">🌿</span>',
        "    </div>",
        '    <div style="font-size: 36px; font-weight: 700; color: #ECFDF5; margin-bottom: 5px;">Dawn Naglich</div>',
        '    <div style="font-size: 10px; font-weight: 800; color: #10B981; opacity: 0.6; letter-spacing: 2px;">WELLNESS & MUSCLE ACTIVATION</div>',
        "  </div>",
        '  <div style="background-color: rgba(255,255,255,0.08); border-radius: 40px; padding: 30px; border: 1px solid rgba(255,255,255,0.1);">',
        '    <div style="font-size: 24px; font-weight: 700; color: #FFF; margin-bottom: 25px;">Secure Sign In</div>',
        '    <button style="display: flex; align-items: center; justify-content: center; background-color: #ECFDF5; border-radius: 20px; padding: 14px; margin-bottom: 25px; border: none; width: 100%; cursor: pointer;">',
        '      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style="width: 20px; height: 20px; margin-right: 12px;" />',
        '      <span style="color: #064E3B; font-weight: 600; font-size: 16px;">Continue with Google</span>',
        "    </button>",
        '    <div style="display: flex; align-items: center; margin-bottom: 25px;">',
        '      <div style="flex: 1; height: 1px; background-color: rgba(255,255,255,0.1);"></div>',
        '      <div style="margin: 0 15px; color: #10B981; font-size: 10px; font-weight: 800; opacity: 0.5;">OR EMAIL</div>',
        '      <div style="flex: 1; height: 1px; background-color: rgba(255,255,255,0.1);"></div>',
        "    </div>",
        '    <div style="margin-bottom: 20px;">',
        '      <label style="font-size: 10px; font-weight: 800; color: #10B981; margin-bottom: 8px; margin-left: 4px; opacity: 0.8; display: block;">EMAIL ADDRESS</label>',
        '      <input type="email" placeholder="name@example.com" style="background-color: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 14px 20px; font-size: 16px; color: #FFF; width: 100%;" />',
        "    </div>",
        '    <div style="margin-bottom: 20px;">',
        '      <label style="font-size: 10px; font-weight: 800; color: #10B981; margin-bottom: 8px; margin-left: 4px; opacity: 0.8; display: block;">PASSWORD</label>',
        '      <input type="password" placeholder="••••••••" style="background-color: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 14px 20px; font-size: 16px; color: #FFF; width: 100%;" />',
        "    </div>",
        '    <button style="background-color: #10B981; border-radius: 20px; padding: 16px; width: 100%; border: none; margin-top: 10px; cursor: pointer;">',
        '      <span style="color: #022C22; font-size: 18px; font-weight: 700;">Sign In</span>',
        "    </button>",
        '    <div style="display: flex; justify-content: center; margin-top: 30px;">',
        '      <span style="color: #94A3B8; font-size: 14px;">Don\'t have an account?</span>',
        '      <span style="color: #10B981; font-weight: 700; font-size: 14px; margin-left: 5px; cursor: pointer;"> Create One</span>',
        "    </div>",
        "  </div>",
        "</div>",
      ].join("\n");

      await page.evaluate((html) => {
        const root = document.getElementById("root");
        root.innerHTML = html;
      }, loginHtml);

      // Wait for any images to load
      await page.waitForTimeout(1000);
    } else {
      // If using dev server, wait for the component to render
      await page.waitForSelector("#root", { timeout: 10000 });
      await page.waitForTimeout(2000); // Give it time to fully render
    }

    // Take screenshot
    console.log("Capturing screenshot...");
    await page.screenshot({
      path: outputPath,
      type: "png",
      fullPage: true,
    });

    console.log(`✓ Screenshot saved to: ${outputPath}`);
  } catch (error) {
    console.error("Error generating screenshot:", error.message);
    process.exit(1);
  } finally {
    await browser.close();

    // Clean up temp file
    if (fs.existsSync(tempHtmlPath)) {
      fs.unlinkSync(tempHtmlPath);
    }
  }
}

// Run the script
generateLoginScreenshot().catch(console.error);

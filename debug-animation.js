import puppeteer from 'puppeteer';
import fs from 'fs';

async function captureAnimation() {
  console.log('🎬 Starting animation capture...');

  const browser = await puppeteer.launch({
    headless: false, // Show browser window
    defaultViewport: null, // Use full screen
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--start-maximized', // Start maximized
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
    ],
  });

  const page = await browser.newPage();

  // Listen to console logs from the page
  page.on('console', (msg) => {
    const text = msg.text();
    if (
      text.includes('🚀') ||
      text.includes('🎯') ||
      text.includes('GEMINI') ||
      text.includes('startZoom1Animation') ||
      text.includes('goToScene') ||
      text.includes('Scene:') ||
      text.includes('ERROR') ||
      text.includes('Error')
    ) {
      console.log('PAGE LOG:', text);
    }
  });

  try {
    console.log('📡 Navigating to localhost:5174...');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' });

    console.log('⏳ Waiting for page to load...');
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds for initialization

    console.log('🔍 Looking for Begin button...');

    // First, click the Begin button
    try {
      const beginButton = await page.$('button');
      if (beginButton) {
        const buttonText = await beginButton.evaluate((el) => el.textContent);
        if (buttonText && buttonText.includes('Begin')) {
          console.log('✅ Found Begin button, clicking...');
          await beginButton.click();
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for transition
        }
      }

      // Wait for the number picker scene and fill it
      await page.waitForSelector('.grid-cols-10', { timeout: 10000 });
      console.log('✅ Found number picker, selecting numbers...');

      const mainNumbers = [7, 14, 21, 28, 35]; // 5 main numbers (1-50)
      const luckyStars = [3, 9]; // 2 lucky stars (1-12)

      console.log('🎯 Selecting main numbers...');
      const mainGrid = await page.$('.grid-cols-10');
      for (const number of mainNumbers) {
        const button = await mainGrid.$(`button:nth-child(${number})`);
        if (button) {
          await button.click();
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      console.log('⭐ Selecting lucky stars...');
      const luckyGrid = await page.$('.grid-cols-12');
      for (const number of luckyStars) {
        const button = await luckyGrid.$(`button:nth-child(${number})`);
        if (button) {
          await button.click();
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      console.log('✅ Numbers selected, looking for Confirm button...');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Find and click Confirm Selection button
      const confirmButton = await page.$('button[class*="w-full"]');

      if (confirmButton) {
        console.log('🎯 Found Confirm button, clicking...');
        await confirmButton.click();

        console.log('🎬 Waiting for zoom1 scene to load...');
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

        // Look for Next button in zoom1 scene
        console.log('🔍 Looking for Next button in zoom1 scene...');
        let nextButton = await page.$('button');

        if (nextButton) {
          console.log('🎯 Found Next button in zoom1 scene, clicking...');
          await nextButton.click();

          console.log('🎬 Waiting for zoom2 scene (A Sea of Possibilities)...');
          await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for zoom2 scene

          // Look for the Next button in zoom2 scene that triggers the actual animation
          console.log('🔍 Looking for Next button in zoom2 scene that triggers animation...');

          // Find the button specifically containing "Next" text
          const nextButtonHandle = await page.evaluateHandle(() => {
            const buttons = document.querySelectorAll('button');
            for (const button of buttons) {
              if (button.textContent && button.textContent.trim() === 'Next') {
                return button;
              }
            }
            return null;
          });

          nextButton = nextButtonHandle.asElement();

          if (nextButton) {
            console.log(
              '🎯 Found Next button in zoom2 scene, clicking to trigger ACTUAL animation...',
            );

            // Take screenshot before clicking
            await page.screenshot({ path: 'Examples/test/debug-before-animation-click.png' });

            console.log('🎯 Found Next button, clicking to trigger WILD animation...');
            await nextButton.click();

            // IMMEDIATE aftermath - take screenshots RIGHT after click
            console.log('📸 Taking IMMEDIATE screenshots to capture star vomit...');
            await page.screenshot({ path: 'Examples/test/immediate-after-click.png' });
            await new Promise((resolve) => setTimeout(resolve, 50)); // 50ms later
            await page.screenshot({ path: 'Examples/test/50ms-after-click.png' });
            await new Promise((resolve) => setTimeout(resolve, 50)); // 100ms total
            await page.screenshot({ path: 'Examples/test/100ms-after-click.png' });
            await new Promise((resolve) => setTimeout(resolve, 100)); // 200ms total
            await page.screenshot({ path: 'Examples/test/200ms-after-click.png' });

            console.log(
              '🎬 Now taking rapid screenshots every 0.1 seconds to capture ongoing chaos...',
            );

            // Take just 2 quick screenshots to check improved density
            await new Promise((resolve) => setTimeout(resolve, 500));
            await page.screenshot({ path: `Examples/test/improved-density-01.png` });
            console.log(`📸 Improved Density Test 1/2 captured`);

            await new Promise((resolve) => setTimeout(resolve, 500));
            await page.screenshot({ path: `Examples/test/improved-density-02.png` });
            console.log(`📸 Improved Density Test 2/2 captured`);

            console.log('🎬 Star chaos capture complete!');
            await page.screenshot({ path: 'Examples/test/final-chaos.png' });
          } else {
            console.log('❌ Could not find Next button in zoom2 scene');
            await page.screenshot({ path: 'Examples/debug-no-animation-button.png' });
          }
        } else {
          console.log('❌ Could not find Next button in zoom1 scene');
          await page.screenshot({ path: 'Examples/debug-no-next-button.png' });
        }
      } else {
        console.log('❌ Could not find Confirm button');
        await page.screenshot({ path: 'Examples/debug-no-button.png' });
      }
    } catch (error) {
      console.log('❌ Error during interaction:', error.message);
      await page.screenshot({ path: 'Examples/debug-error.png' });
    }
  } catch (error) {
    console.log('❌ Navigation error:', error.message);
  } finally {
    console.log('🏁 Closing browser...');
    await browser.close();
  }
}

// Run the capture
captureAnimation().catch(console.error);

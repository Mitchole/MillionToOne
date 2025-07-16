/**
 * MASTER FLOW TEST - Source of Truth for MillionToOne App Flow
 *
 * This script captures the complete user journey and serves as the definitive
 * reference for understanding app behavior, timing, and animation sequences.
 *
 * CRITICAL NOTES:
 * - Always wait 15 seconds on page load for performance benchmarking
 * - The zoom animation only triggers on "Next" click in zoom2 scene ("A Sea of Possibilities")
 * - Hamburger menu requires finding button in top-right corner (x > 1000, y < 100)
 * - Console logs provide valuable debugging info (star generation, scene changes, performance)
 *
 * UPDATE INSTRUCTIONS:
 * Only update this script at the end of development sessions with new findings.
 * This ensures the next Claude instance has accurate flow understanding.
 */

const puppeteer = require('puppeteer');

async function masterFlowTest() {
  console.log('🎬 MASTER FLOW TEST - Complete MillionToOne Journey');
  console.log('📋 This test captures the full user experience for development reference');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      slowMo: 100,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    // Capture all relevant console logs for debugging
    page.on('console', (msg) => {
      const text = msg.text();
      if (
        text.includes('DETERMINISTIC') ||
        text.includes('SCENE') ||
        text.includes('FPS') ||
        text.includes('PERFORMANCE') ||
        text.includes('MESH') ||
        text.includes('🌟') ||
        text.includes('🎯') ||
        text.includes('🚀')
      ) {
        console.log('PAGE LOG:', text);
      }
    });

    // Listen for errors
    page.on('error', (err) => console.error('🚨 PAGE ERROR:', err.message));
    page.on('pageerror', (err) => console.error('🚨 PAGE SCRIPT ERROR:', err.message));
    browser.on('disconnected', () => console.error('🚨 BROWSER DISCONNECTED'));

    // === PHASE 1: HOMEPAGE & BENCHMARKING ===
    console.log('\n📍 PHASE 1: Homepage & Performance Benchmarking');
    await page.goto('http://localhost:5175');

    // CRITICAL: Wait 15 seconds for performance benchmarking to complete
    console.log('⏱️  Waiting 15 seconds for performance benchmarking...');
    console.log('   (This determines star quality: low/medium/high)');
    await new Promise((resolve) => setTimeout(resolve, 15000));

    console.log('📸 Screenshot: Homepage after benchmarking');
    await page.screenshot({
      path: 'src/__tests__/puppeteer/screenshots/01-homepage-post-benchmark.png',
    });

    // === PHASE 2: BEGIN FLOW ===
    console.log('\n📍 PHASE 2: Begin Button');
    const beginButton = await page.$('button');
    if (beginButton) {
      const buttonText = await beginButton.evaluate((el) => el.textContent);
      if (buttonText && buttonText.includes('Begin')) {
        console.log('✅ Clicking Begin button');
        await beginButton.click();
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log('📸 Screenshot: After Begin clicked');
    await page.screenshot({ path: 'src/__tests__/puppeteer/screenshots/02-after-begin.png' });

    // === PHASE 3: NUMBER SELECTION ===
    console.log('\n📍 PHASE 3: Number Selection');
    await page.waitForSelector('.grid-cols-10', { timeout: 10000 });
    console.log('✅ Number picker loaded');

    // Generate random numbers for testing
    const mainNumbers = [];
    while (mainNumbers.length < 5) {
      const num = Math.floor(Math.random() * 50) + 1;
      if (!mainNumbers.includes(num)) mainNumbers.push(num);
    }
    const luckyStars = [];
    while (luckyStars.length < 2) {
      const num = Math.floor(Math.random() * 12) + 1;
      if (!luckyStars.includes(num)) luckyStars.push(num);
    }

    console.log(`🎯 Selecting main numbers: [${mainNumbers.join(', ')}]`);
    const mainGrid = await page.$('.grid-cols-10');
    for (const number of mainNumbers) {
      const button = await mainGrid.$(`button:nth-child(${number})`);
      if (button) {
        await button.click();
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    console.log(`⭐ Selecting lucky stars: [${luckyStars.join(', ')}]`);
    const luckyGrid = await page.$('.grid-cols-12');
    for (const number of luckyStars) {
      const button = await luckyGrid.$(`button:nth-child(${number})`);
      if (button) {
        await button.click();
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    console.log('📸 Screenshot: Numbers selected');
    await page.screenshot({ path: 'src/__tests__/puppeteer/screenshots/03-numbers-selected.png' });

    // === PHASE 4: CONFIRM SELECTION ===
    console.log('\n📍 PHASE 4: Confirm Selection');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const confirmButton = await page.$('button[class*="w-full"]');
    if (confirmButton) {
      console.log('✅ Clicking Confirm Selection');
      await confirmButton.click();
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // === PHASE 5: ZOOM1 SCENE ===
    console.log('\n📍 PHASE 5: Zoom1 Scene');
    console.log('📸 Screenshot: Zoom1 scene');
    await page.screenshot({ path: 'src/__tests__/puppeteer/screenshots/04-zoom1-scene.png' });

    // Find Next button in zoom1 (need to check all buttons, not just first)
    console.log('🔍 Looking for Next button in zoom1...');
    const buttons1 = await page.$$('button');
    for (const button of buttons1) {
      const buttonText = await button.evaluate((el) => el.textContent);
      if (buttonText && buttonText.includes('Next')) {
        console.log('✅ Clicking Next in zoom1 scene');
        await button.click();
        break;
      }
    }

    // === PHASE 6: ZOOM2 SCENE (PRE-ANIMATION) ===
    console.log('\n📍 PHASE 6: Zoom2 Scene - "A Sea of Possibilities"');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log('📸 Screenshot: Zoom2 scene (before animation trigger)');
    await page.screenshot({
      path: 'src/__tests__/puppeteer/screenshots/05-zoom2-before-animation.png',
    });

    // === PHASE 7: TRIGGER ZOOM ANIMATION (CRITICAL MOMENT) ===
    console.log('\n📍 PHASE 7: 🚨 CRITICAL ANIMATION TRIGGER 🚨');
    console.log('This Next button click triggers the main zoom animation');

    const buttons2 = await page.$$('button');
    for (const button of buttons2) {
      const buttonText = await button.evaluate((el) => el.textContent);
      if (buttonText && buttonText.includes('Next')) {
        console.log('🎯 TRIGGERING ZOOM ANIMATION - Clicking Next in zoom2');
        await button.click();
        break;
      }
    }

    // === PHASE 8: ANIMATION SEQUENCE CAPTURE ===
    console.log('\n📍 PHASE 8: Animation Sequence (10 seconds)');
    console.log('Capturing zoom animation every 500ms for detailed analysis');

    // Wait for animation to start
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Capture 20 screenshots over 10 seconds (every 500ms)
    for (let i = 0; i < 20; i++) {
      const frameNum = i.toString().padStart(2, '0');
      console.log(`📸 Animation frame ${i + 1}/20 (${(i * 0.5).toFixed(1)}s)`);
      await page.screenshot({
        path: `src/__tests__/puppeteer/screenshots/06-animation-frame-${frameNum}.png`,
      });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // === PHASE 9: POST-ANIMATION STATE ===
    console.log('\n📍 PHASE 9: Post-Animation State');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('📸 Screenshot: Final state after animation');
    await page.screenshot({ path: 'src/__tests__/puppeteer/screenshots/07-final-state.png' });

    // === PHASE 10: HAMBURGER MENU TEST (OPTIONAL) ===
    console.log('\n📍 PHASE 10: Hamburger Menu Test (Optional)');
    try {
      // Find hamburger button (top-right corner)
      const allButtons = await page.$$('button');
      let hamburgerButton = null;

      for (const button of allButtons) {
        const buttonRect = await button.boundingBox();
        const buttonText = await button.evaluate((el) => el.textContent);

        // Look for button in top right that's not Begin button
        if (
          buttonRect &&
          buttonRect.x > 1000 &&
          buttonRect.y < 100 &&
          !buttonText.includes('Begin')
        ) {
          hamburgerButton = button;
          break;
        }
      }

      if (hamburgerButton) {
        console.log('✅ Found hamburger menu, testing...');
        await hamburgerButton.click();
        await new Promise((resolve) => setTimeout(resolve, 1000));

        console.log('📸 Screenshot: Hamburger menu opened');
        await page.screenshot({
          path: 'src/__tests__/puppeteer/screenshots/08-hamburger-menu.png',
        });
      }
    } catch (error) {
      console.log('⚠️  Hamburger menu test skipped:', error.message);
    }

    console.log('\n🏁 MASTER FLOW TEST COMPLETE');
    console.log('✅ All screenshots saved to src/__tests__/puppeteer/screenshots/');
    console.log('📊 Check console logs above for performance and debugging info');

    await new Promise((resolve) => setTimeout(resolve, 2000));
    await browser.close();
  } catch (error) {
    console.error('\n🚨 MASTER FLOW TEST FAILED:', error.message);
    console.error('🚨 Stack trace:', error.stack);

    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('🚨 Failed to close browser:', closeError.message);
      }
    }

    throw error;
  }
}

// Export for use in other scripts if needed
if (require.main === module) {
  masterFlowTest().catch((error) => {
    console.error('🚨 FATAL ERROR:', error.message);
    process.exit(1);
  });
}

module.exports = { masterFlowTest };

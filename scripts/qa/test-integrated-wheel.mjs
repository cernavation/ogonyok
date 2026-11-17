import { chromium } from 'playwright-core';

async function main() {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  console.log('Navigating to http://localhost:3099/...');
  await page.goto('http://localhost:3099/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // Check section #modes
  const section = await page.locator('#modes');
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);

  // Take screenshot in resting ring state
  await page.screenshot({ path: '/Users/user/.gemini/antigravity/brain/f33f2529-53c2-4bb6-8a3d-5b08904399b6/visual_audit/INTEGRATED_wheel_resting.png' });
  console.log('Saved INTEGRATED_wheel_resting.png');

  // Click next button in floating control bar to advance wheel
  const nextBtn = page.locator('button[aria-label="Следующая победа"]');
  if (await nextBtn.isVisible()) {
    await nextBtn.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: '/Users/user/.gemini/antigravity/brain/f33f2529-53c2-4bb6-8a3d-5b08904399b6/visual_audit/INTEGRATED_wheel_turned.png' });
    console.log('Saved INTEGRATED_wheel_turned.png');
  }

  // Mobile test
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/Users/user/.gemini/antigravity/brain/f33f2529-53c2-4bb6-8a3d-5b08904399b6/visual_audit/INTEGRATED_wheel_mobile.png' });
  console.log('Saved INTEGRATED_wheel_mobile.png');

  console.log('Console errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

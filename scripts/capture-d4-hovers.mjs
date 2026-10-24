import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('screenshots/D4');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => chromium.launch({ headless: true }));
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // 1. Menu item hover
  console.log('Capturing: 01-hover-menu-item.png');
  const navItem = await page.$('.nav-item:nth-child(2)'); // "Поиск"
  if (navItem) {
    await navItem.hover();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT_DIR, '01-hover-menu-item.png') });
  }

  // 2. Post hover (hover over a post body)
  console.log('Capturing: 02-hover-post.png');
  const post = await page.$('article, [id^="day-card-"]');
  if (post) {
    await post.hover();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT_DIR, '02-hover-post.png') });
  }

  // 3. Action icon hover (flame or comment)
  console.log('Capturing: 03-hover-action-icon.png');
  const actionBtn = await page.$('button[aria-label*="огонёк"], button[aria-label*="комментар"], .post-actions button, button.rounded-full');
  if (actionBtn) {
    await actionBtn.hover();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT_DIR, '03-hover-action-icon.png') });
  }

  // 4. Button hover ("Записать" pill)
  console.log('Capturing: 04-hover-button.png');
  const composeBtn = await page.$('button.x-compose-btn, button:has-text("Записать")');
  if (composeBtn) {
    await composeBtn.hover();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT_DIR, '04-hover-button.png') });
  }

  // 5. Tab hover ("Подписки")
  console.log('Capturing: 05-hover-tab.png');
  const tabBtn = await page.$('button:has-text("Подписки"), [role="tab"]:nth-child(2)');
  if (tabBtn) {
    await tabBtn.hover();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT_DIR, '05-hover-tab.png') });
  }

  // 6. Input hover/focus
  console.log('Capturing: 06-hover-input.png');
  const searchInput = await page.$('.right-rail input, input[placeholder*="Поиск"], .search-box');
  if (searchInput) {
    await searchInput.hover();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT_DIR, '06-hover-input.png') });
  }

  // 7. Right rail card item hover
  console.log('Capturing: 07-hover-right-rail-card.png');
  const railItem = await page.$('.right-rail a, .right-rail button, .right-rail .cursor-pointer');
  if (railItem) {
    await railItem.hover();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT_DIR, '07-hover-right-rail-card.png') });
  }

  // 8. Quick focus hover
  console.log('Capturing: 08-hover-quick-focus.png');
  const focusBar = await page.$('[aria-label="Утренний фокус"] button, .quick-focus button, button:has-text("Утренний фокус")');
  if (focusBar) {
    await focusBar.hover();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT_DIR, '08-hover-quick-focus.png') });
  }

  // 9. Stories hover
  console.log('Capturing: 09-hover-stories.png');
  const storyRing = await page.$('.story-ring');
  if (storyRing) {
    await storyRing.hover();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT_DIR, '09-hover-stories.png') });
  }

  // 10. Chat hover
  console.log('Capturing: 10-hover-chat.png');
  const chatNav = await page.$('.nav-item:has-text("Чаты"), button[aria-label="Чаты"]');
  if (chatNav) {
    await chatNav.click();
    await page.waitForTimeout(400);
    const chatRow = await page.$('.msgr__row, .chat-thread-row, [role="listitem"] button');
    if (chatRow) {
      await chatRow.hover();
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(OUT_DIR, '10-hover-chat.png') });
    }
  }

  // Switch back to home
  const homeNav = await page.$('.nav-item:has-text("Главная"), button[aria-label="Главная"]');
  if (homeNav) {
    await homeNav.click();
    await page.waitForTimeout(400);
  }

  // 11-15: Responsive widths checks
  console.log('Capturing: 11-desktop-1440-dark.png');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT_DIR, '11-desktop-1440-dark.png') });

  console.log('Capturing: 12-desktop-1280-dark.png');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT_DIR, '12-desktop-1280-dark.png') });

  console.log('Capturing: 13-desktop-1024-icons-only.png');
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT_DIR, '13-desktop-1024-icons-only.png') });

  console.log('Capturing: 14-tablet-768-dark.png');
  await page.setViewportSize({ width: 768, height: 900 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT_DIR, '14-tablet-768-dark.png') });

  console.log('Capturing: 15-mobile-390-dark.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT_DIR, '15-mobile-390-dark.png') });

  // 16-17: Light theme checks
  console.log('Setting apple-light theme...');
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'apple-light');
  });
  await page.waitForTimeout(300);

  console.log('Capturing: 16-desktop-1440-light.png');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT_DIR, '16-desktop-1440-light.png') });

  console.log('Capturing: 17-mobile-390-light.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT_DIR, '17-mobile-390-light.png') });

  await browser.close();
  console.log('All D4 screenshots successfully captured in screenshots/D4/');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const url = process.argv[2] || 'http://localhost:3000';
const name = process.argv[3] || 'screen';

(async () => {
  if (!fs.existsSync('.vision')) {
    fs.mkdirSync('.vision', { recursive: true });
  }

  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    browser = await chromium.launch({ headless: true });
  }
  const context = await browser.newContext();
  
  // 1. Desktop 1280x800
  const pageDesk = await context.newPage();
  await pageDesk.setViewportSize({ width: 1280, height: 800 });
  await pageDesk.goto(url, { waitUntil: 'domcontentloaded' });
  await pageDesk.waitForTimeout(500);
  await pageDesk.screenshot({ path: `.vision/${name}-desktop.png`, fullPage: false });
  
  // 2. Mobile iPhone 390x844
  const pageMob = await context.newPage();
  await pageMob.setViewportSize({ width: 390, height: 844 });
  await pageMob.goto(url, { waitUntil: 'domcontentloaded' });
  await pageMob.waitForTimeout(500);
  await pageMob.screenshot({ path: `.vision/${name}-mobile.png`, fullPage: false });

  await browser.close();
  console.log(`📸 Скриншоты сохранены в .vision/${name}-desktop.png и mobile.png`);
})();

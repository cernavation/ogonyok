import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

async function run() {
  console.log('--- CAPTURING STAGE 06 UI SCREENSHOTS (DESKTOP & MOBILE) ---')
  const evidenceDir = path.resolve(process.cwd(), 'night/evidence/06')
  fs.mkdirSync(evidenceDir, { recursive: true })

  let browser
  try {
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  } catch {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }

  // 1. Desktop Test (1440x900)
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })
  const page = await desktopContext.newPage()

  console.log('1. Navigating to Comrades view (Desktop 1440x900)...')
  await page.goto('http://localhost:3000/?view=comrades', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: path.join(evidenceDir, 'comrades-desktop-1440x900.png') })

  console.log('2. Opening QR Modal (Desktop 1440x900)...')
  const qrButton = page.locator('button:has-text("Показать QR-код")').first()
  if (await qrButton.isVisible()) {
    await qrButton.click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(evidenceDir, 'comrades-qr-desktop-1440x900.png') })
    // Close QR modal
    const closeBtn = page.locator('button:has-text("Закрыть")').first()
    if (await closeBtn.isVisible()) await closeBtn.click()
    await page.waitForTimeout(400)
  }

  console.log('3. Navigating to Search Tab (Desktop 1440x900)...')
  const searchTab = page.locator('button:has-text("Найти")').first()
  if (await searchTab.isVisible()) {
    await searchTab.click()
    await page.waitForTimeout(500)
    const searchInput = page.locator('input[placeholder*="Поиск соратников"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('cernavation')
      await page.waitForTimeout(1000)
    }
    await page.screenshot({ path: path.join(evidenceDir, 'comrades-search-desktop-1440x900.png') })
  }

  console.log('4. Navigating to Invite Page (Desktop 1440x900)...')
  await page.goto('http://localhost:3000/invite/cernavation', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: path.join(evidenceDir, 'invite-desktop-1440x900.png') })

  console.log('5. Navigating to User Profile Page (Desktop 1440x900)...')
  await page.goto('http://localhost:3000/u/cernavation', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: path.join(evidenceDir, 'profile-desktop-1440x900.png') })

  // 2. Mobile Test (390x844)
  console.log('6. Navigating to Comrades view (Mobile 390x844)...')
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    isMobile: true,
  })
  const mobilePage = await mobileContext.newPage()
  await mobilePage.goto('http://localhost:3000/?view=comrades', { waitUntil: 'networkidle' })
  await mobilePage.waitForTimeout(1000)
  await mobilePage.screenshot({ path: path.join(evidenceDir, 'comrades-mobile-390x844.png') })

  console.log('7. Navigating to Invite Page (Mobile 390x844)...')
  await mobilePage.goto('http://localhost:3000/invite/cernavation', { waitUntil: 'networkidle' })
  await mobilePage.waitForTimeout(1000)
  await mobilePage.screenshot({ path: path.join(evidenceDir, 'invite-mobile-390x844.png') })

  await browser.close()
  console.log('--- ALL SCREENSHOTS CAPTURED SUCCESSFULLY ---')
}

run().catch((err) => {
  console.error('Screenshot Capture Failed:', err)
  process.exit(1)
})

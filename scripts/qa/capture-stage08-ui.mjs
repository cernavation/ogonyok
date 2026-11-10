import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

async function run() {
  console.log('--- CAPTURING STAGE 08 UI SCREENSHOTS (DESKTOP & MOBILE) ---')
  const evidenceDir = path.resolve(process.cwd(), 'night/evidence/08')
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

  // 1. Desktop Context (1440x900)
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })
  const page = await desktopContext.newPage()

  console.log('1. Navigating to Chat with Nikolay (Desktop 1440x900)...')
  await page.goto('http://localhost:3000/chats/nikolay', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)

  await page.screenshot({ path: path.join(evidenceDir, 'messenger-desktop-chat-1440x900.png') })
  console.log('   Saved messenger-desktop-chat-1440x900.png')

  // 2. Open GIF modal
  console.log('2. Opening GIF modal with GIPHY attribution...')
  const gifBtn = page.locator('button:has-text("GIF")').first()
  if (await gifBtn.isVisible()) {
    await gifBtn.click()
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(evidenceDir, 'messenger-giphy-modal-desktop-1440x900.png') })
    console.log('   Saved messenger-giphy-modal-desktop-1440x900.png')

    // Close GIF modal
    const closeBtn = page.locator('button[aria-label="Закрыть"]').first()
    if (await closeBtn.isVisible()) {
      await closeBtn.click()
      await page.waitForTimeout(400)
    }
  }

  // 3. Open Scheduled Messages options / modal
  console.log('3. Opening Scheduled Messages modal...')
  const clockBtn = page.locator('button[title*="Отправить позже"], button[aria-label="Опции отправки"]').first()
  if (await clockBtn.isVisible()) {
    await clockBtn.click()
    await page.waitForTimeout(800)
    await page.screenshot({ path: path.join(evidenceDir, 'messenger-scheduled-modal-desktop-1440x900.png') })
    console.log('   Saved messenger-scheduled-modal-desktop-1440x900.png')

    const closeBtn = page.locator('button[aria-label="Закрыть"]').first()
    if (await closeBtn.isVisible()) {
      await closeBtn.click()
      await page.waitForTimeout(400)
    }
  }

  // 4. Open Menu -> Group/Chat options
  console.log('4. Opening Chat Menu (⋯)...')
  const menuBtn = page.locator('button[aria-label="Меню чата"]').first()
  if (await menuBtn.isVisible()) {
    await menuBtn.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(evidenceDir, 'messenger-chat-menu-desktop-1440x900.png') })
    console.log('   Saved messenger-chat-menu-desktop-1440x900.png')
  }

  // 5. Mobile Context (390x844)
  console.log('5. Navigating to Mobile Messenger (390x844)...')
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    isMobile: true,
  })
  const mobilePage = await mobileContext.newPage()
  await mobilePage.goto('http://localhost:3000/chats/nikolay', { waitUntil: 'networkidle' })
  await mobilePage.waitForTimeout(1200)

  await mobilePage.screenshot({ path: path.join(evidenceDir, 'messenger-mobile-chat-390x844.png') })
  console.log('   Saved messenger-mobile-chat-390x844.png')

  await browser.close()
  console.log('--- ALL STAGE 08 SCREENSHOTS CAPTURED SUCCESSFULLY ---')
}

run().catch((err) => {
  console.error('Screenshot Capture Failed:', err)
  process.exit(1)
})

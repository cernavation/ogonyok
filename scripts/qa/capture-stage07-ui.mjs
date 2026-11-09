import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

async function run() {
  console.log('--- CAPTURING STAGE 07 UI SCREENSHOTS (DESKTOP & MOBILE) ---')
  const evidenceDir = path.resolve(process.cwd(), 'night/evidence/07')
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

  console.log('1. Navigating to Home (Desktop 1440x900)...')
  await page.goto('http://localhost:3000/?view=home', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  console.log('2. Triggering Telegram Desktop Toast...')
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent('ogonek:toast', {
        detail: {
          id: 'toast-qa-1',
          type: 'new_message',
          title: 'Николай (Основатель)',
          body: 'Привет! Проверь, как отображается центр уведомлений и веб-звуки.',
          senderId: 'mock-user-nikolay',
        },
      })
    )
  })
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(evidenceDir, 'telegram-toast-desktop-1440x900.png') })
  console.log('   Saved telegram-toast-desktop-1440x900.png')

  console.log('3. Opening Notification Center modal (Desktop 1440x900)...')
  // We can open by clicking the Bell button in sidebar or navigating to notifications
  await page.goto('http://localhost:3000/?view=notifications', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(evidenceDir, 'notifications-center-desktop-1440x900.png') })
  console.log('   Saved notifications-center-desktop-1440x900.png')

  console.log('4. Navigating to Settings -> Notifications Panel (Desktop 1440x900)...')
  await page.goto('http://localhost:3000/?view=settings', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const notifTab = page.locator('button:has-text("Уведомления")').first()
  if (await notifTab.isVisible()) {
    await notifTab.click()
    await page.waitForTimeout(500)
  }
  await page.screenshot({ path: path.join(evidenceDir, 'notifications-settings-desktop-1440x900.png') })
  console.log('   Saved notifications-settings-desktop-1440x900.png')

  console.log('5. Navigating to Chat view (Desktop 1440x900)...')
  await page.goto('http://localhost:3000/?view=messages', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: path.join(evidenceDir, 'chats-missed-call-desktop-1440x900.png') })
  console.log('   Saved chats-missed-call-desktop-1440x900.png')

  // 2. Mobile Context (390x844)
  console.log('6. Navigating to Notification Center (Mobile 390x844)...')
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    isMobile: true,
  })
  const mobilePage = await mobileContext.newPage()
  await mobilePage.goto('http://localhost:3000/?view=notifications', { waitUntil: 'networkidle' })
  await mobilePage.waitForTimeout(1000)
  await mobilePage.screenshot({ path: path.join(evidenceDir, 'notifications-center-mobile-390x844.png') })
  console.log('   Saved notifications-center-mobile-390x844.png')

  console.log('7. Triggering Toast on Mobile (Mobile 390x844)...')
  await mobilePage.goto('http://localhost:3000/?view=home', { waitUntil: 'networkidle' })
  await mobilePage.waitForTimeout(800)
  await mobilePage.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent('ogonek:toast', {
        detail: {
          id: 'toast-mobile-qa',
          type: 'missed_call',
          title: 'Анна',
          body: '📞 Пропущенный звонок',
          senderId: 'mock-user-anna',
        },
      })
    )
  })
  await mobilePage.waitForTimeout(600)
  await mobilePage.screenshot({ path: path.join(evidenceDir, 'telegram-toast-mobile-390x844.png') })
  console.log('   Saved telegram-toast-mobile-390x844.png')

  await browser.close()
  console.log('--- ALL SCREENSHOTS CAPTURED SUCCESSFULLY ---')
}

run().catch((err) => {
  console.error('Screenshot Capture Failed:', err)
  process.exit(1)
})

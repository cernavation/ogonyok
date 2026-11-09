import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

async function run() {
  console.log('--- CAPTURING STAGE 05 UI SCREENSHOTS (DESKTOP & MOBILE) ---')
  const evidenceDir = path.resolve(process.cwd(), 'night/evidence/05')
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

  console.log('Navigating to Home (Desktop 1440x900)...')
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: path.join(evidenceDir, 'home-desktop-1440x900.png') })

  console.log('Opening Auth Modal for Registration (Desktop 1440x900)...')
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('ogonek:open-auth', { detail: 'register' }))
  })
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(evidenceDir, 'auth-modal-desktop-1440x900.png') })

  // 2. Mobile Test (390x844)
  console.log('Navigating to Home (Mobile 390x844)...')
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    isMobile: true,
  })
  const mobilePage = await mobileContext.newPage()
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await mobilePage.waitForTimeout(1000)
  await mobilePage.screenshot({ path: path.join(evidenceDir, 'home-mobile-390x844.png') })

  console.log('Opening Auth Modal for Registration (Mobile 390x844)...')
  await mobilePage.evaluate(() => {
    window.dispatchEvent(new CustomEvent('ogonek:open-auth', { detail: 'register' }))
  })
  await mobilePage.waitForTimeout(600)
  await mobilePage.screenshot({ path: path.join(evidenceDir, 'auth-modal-mobile-390x844.png') })

  await browser.close()
  console.log('Screenshots captured successfully in night/evidence/05/')
}

run().catch((err) => {
  console.error('Failed to capture screenshots:', err)
  process.exit(1)
})

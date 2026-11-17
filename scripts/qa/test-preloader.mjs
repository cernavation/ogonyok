import { launchGuardBrowser } from '../../tools/guard/browser.mjs'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = '/Users/user/.gemini/antigravity/brain/f33f2529-53c2-4bb6-8a3d-5b08904399b6/visual_audit'
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })
}

async function testPreloader() {
  console.log('--- Starting Preloader Automated Verification ---')
  const browser = await launchGuardBrowser()
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message)
  })

  const startTime = Date.now()
  console.log('1. Navigating to http://localhost:3099/ ...')
  await page.goto('http://localhost:3099/', { waitUntil: 'domcontentloaded' })

  // Check if Preloader is mounted immediately
  const preloaderEl = page.locator('[aria-label="Загрузка Priday"]')
  const isPresent = await preloaderEl.count()
  console.log(`2. Preloader element present in DOM: ${isPresent > 0}`)

  // Wait 1.0s and verify preloader is visible
  await page.waitForTimeout(1000)
  const isVisibleAt1s = await preloaderEl.isVisible()
  console.log(`3. Preloader visible at 1.0s: ${isVisibleAt1s}`)
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'preloader_active_1s.png') })
  console.log('   Captured preloader_active_1s.png')

  // Check WebGL canvas inside preloader
  const canvasCount = await page.locator('[aria-label="Загрузка Priday"] canvas').count()
  console.log(`4. WebGL canvas count inside preloader: ${canvasCount}`)

  // Wait until 2.5s and check preloader
  await page.waitForTimeout(1500)
  const isVisibleAt25s = await preloaderEl.isVisible()
  console.log(`5. Preloader visible at 2.5s: ${isVisibleAt25s}`)
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'preloader_active_25s.png') })
  console.log('   Captured preloader_active_25s.png')

  // Wait until 4.8s (after 3.0s minimum duration + 750ms fade-out)
  await page.waitForTimeout(2300)
  const isVisibleAt48s = await preloaderEl.isVisible()
  console.log(`6. Preloader visible at 4.8s (should be false/unmounted): ${isVisibleAt48s}`)
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'landing_page_revealed_48s.png') })
  console.log('   Captured landing_page_revealed_48s.png')

  // Check footer flame SVG
  const footerFlameTop = await page.locator('#appleFlameFooterTop').count()
  const footerFlameBottom = await page.locator('#appleFlameFooterBottom').count()
  console.log(`7. Footer SVG Flame definitions present: Top=${footerFlameTop}, Bottom=${footerFlameBottom}`)

  // Filter ignorable dev warnings
  const seriousErrors = consoleErrors.filter(
    (e) => !e.includes('favicon') && !e.includes('download the React DevTools')
  )
  console.log(`8. Serious Console Errors: ${seriousErrors.length}`)
  if (seriousErrors.length > 0) {
    console.log('Errors:', seriousErrors)
  }

  const durationTotal = Date.now() - startTime
  console.log(`--- Preloader Verification Finished in ${durationTotal}ms ---`)

  await browser.close()
}

testPreloader().catch((err) => {
  console.error('Test failed with error:', err)
  process.exit(1)
})

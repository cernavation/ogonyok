import { chromium } from 'playwright-core'
import path from 'path'
import fs from 'fs'

async function capture() {
  const outDir = path.resolve('audit/screens-v3')
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  const browser = await chromium.launch({ channel: 'chrome', headless: true })

  // ── 1. Desktop 1440 ──────────────────────────────────────────
  console.log('Capturing Desktop 1440...')
  const pageDesk = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })

  await pageDesk.goto('http://localhost:3000/ru', { waitUntil: 'networkidle' })
  await pageDesk.waitForTimeout(1000)

  const problemEl = pageDesk.locator('#problem')
  await problemEl.scrollIntoViewIfNeeded()
  await pageDesk.waitForTimeout(1500)

  // Full problem section screenshot
  await problemEl.screenshot({
    path: path.join(outDir, 'problem-desktop-1440.png'),
  })

  // Capture sub-blocks
  const subBlocks = await problemEl.locator('> div').all()
  console.log(`Found ${subBlocks.length} sections in #problem`)
  if (subBlocks[0]) {
    // 2.1 and 2.2 are inside the first container div
    const rows = await subBlocks[0].locator('> div').all()
    if (rows[0]) {
      await rows[0].screenshot({ path: path.join(outDir, 'block-2.1-head-desktop.png') })
    }
    if (rows[1]) {
      await rows[1].screenshot({ path: path.join(outDir, 'block-2.2-calendar-desktop.png') })
    }
  }
  if (subBlocks[1]) {
    await subBlocks[1].screenshot({ path: path.join(outDir, 'block-2.3-treadmill-desktop.png') })
  }
  if (subBlocks[2]) {
    await subBlocks[2].screenshot({ path: path.join(outDir, 'final-line-desktop.png') })
  }

  // ── 2. Mobile 390 ────────────────────────────────────────────
  console.log('Capturing Mobile 390...')
  const pageMobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  })

  await pageMobile.goto('http://localhost:3000/ru', { waitUntil: 'networkidle' })
  await pageMobile.waitForTimeout(1000)

  const problemMobileEl = pageMobile.locator('#problem')
  await problemMobileEl.scrollIntoViewIfNeeded()
  await pageMobile.waitForTimeout(1500)

  await problemMobileEl.screenshot({
    path: path.join(outDir, 'problem-mobile-390.png'),
  })

  const mobileSubBlocks = await problemMobileEl.locator('> div').all()
  if (mobileSubBlocks[0]) {
    const rows = await mobileSubBlocks[0].locator('> div').all()
    if (rows[0]) {
      await rows[0].screenshot({ path: path.join(outDir, 'block-2.1-head-mobile.png') })
    }
    if (rows[1]) {
      await rows[1].screenshot({ path: path.join(outDir, 'block-2.2-calendar-mobile.png') })
    }
  }
  if (mobileSubBlocks[1]) {
    await mobileSubBlocks[1].screenshot({ path: path.join(outDir, 'block-2.3-treadmill-mobile.png') })
  }
  if (mobileSubBlocks[2]) {
    await mobileSubBlocks[2].screenshot({ path: path.join(outDir, 'final-line-mobile.png') })
  }

  await browser.close()
  console.log('All detailed screenshots saved!')
}

capture().catch((err) => {
  console.error('Capture error:', err)
  process.exit(1)
})

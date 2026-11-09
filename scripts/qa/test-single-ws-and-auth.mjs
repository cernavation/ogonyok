import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

async function run() {
  console.log('--- STARTING PLAYWRIGHT REALTIME & AUTH AUDIT ---')
  const evidenceDir = path.resolve(process.cwd(), 'night/evidence/03')
  fs.mkdirSync(evidenceDir, { recursive: true })

  const logLines = []
  function log(msg) {
    console.log(msg)
    logLines.push(`[${new Date().toISOString()}] ${msg}`)
  }

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
  
  // 1. Desktop 1440x900
  log('Testing Desktop 1440x900 viewport...')
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })
  const desktopPage = await desktopContext.newPage()

  const webSocketUrls = []
  desktopPage.on('websocket', (ws) => {
    log(`WebSocket opened: ${ws.url()}`)
    webSocketUrls.push(ws.url())
    ws.on('close', () => log(`WebSocket closed: ${ws.url()}`))
    ws.on('framesent', (event) => log(`WebSocket sent frame: ${event.payload?.slice(0, 80)}`))
    ws.on('framereceived', (event) => log(`WebSocket received frame: ${event.payload?.slice(0, 80)}`))
  })

  const networkRequests = []
  desktopPage.on('request', (req) => {
    networkRequests.push(`${req.method()} ${req.url()}`)
  })

  // Navigate to local dev server (port 3000)
  log('Navigating to http://localhost:3000...')
  await desktopPage.goto('http://localhost:3000', { waitUntil: 'networkidle' })

  // Screenshot desktop
  const desktopScreenshot = path.join(evidenceDir, 'auth-desktop-1440x900.png')
  await desktopPage.screenshot({ path: desktopScreenshot, fullPage: false })
  log(`Desktop screenshot saved to ${desktopScreenshot}`)

  // Verify WebSockets in desktop
  log(`Total WebSockets opened on initial load: ${webSocketUrls.length}`)
  if (webSocketUrls.length <= 1) {
    log('PASS: At most 1 Realtime WebSocket created.')
  } else {
    log(`WARNING: Expected <= 1 WebSocket, but found ${webSocketUrls.length}`)
  }

  // 2. Mobile 390x844
  log('Testing Mobile 390x844 viewport...')
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
  })
  const mobilePage = await mobileContext.newPage()
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  const mobileScreenshot = path.join(evidenceDir, 'auth-mobile-390x844.png')
  await mobilePage.screenshot({ path: mobileScreenshot, fullPage: false })
  log(`Mobile screenshot saved to ${mobileScreenshot}`)

  await browser.close()

  const logFile = path.join(evidenceDir, 'single_ws_and_auth_log.txt')
  fs.writeFileSync(logFile, logLines.join('\n') + '\n', 'utf8')
  log(`Audit finished. Log written to ${logFile}`)
}

run().catch((err) => {
  console.error('Playwright audit failed:', err)
  process.exit(1)
})

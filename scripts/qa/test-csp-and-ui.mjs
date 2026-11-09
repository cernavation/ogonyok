import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

async function run() {
  console.log('--- STARTING CSP & UI INTEGRITY AUDIT ---')
  const evidenceDir = path.resolve(process.cwd(), 'night/evidence/03')
  fs.mkdirSync(evidenceDir, { recursive: true })

  const auditLog = []
  function log(msg) {
    console.log(msg)
    auditLog.push(`[${new Date().toISOString()}] ${msg}`)
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

  const cspViolations = []
  const consoleErrors = []

  // 1. Desktop Test (1440x900)
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })
  const page = await desktopContext.newPage()

  page.on('console', (msg) => {
    const text = msg.text()
    if (msg.type() === 'error') {
      consoleErrors.push(`[CONSOLE ERROR] ${text}`)
    }
    if (text.toLowerCase().includes('content security policy') || text.toLowerCase().includes('violates')) {
      cspViolations.push(text)
    }
  })

  page.on('pageerror', (err) => {
    consoleErrors.push(`[PAGE ERROR] ${err.message}`)
  })

  // Navigate to Home
  log('Testing Home page under CSP...')
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await page.screenshot({ path: path.join(evidenceDir, 'csp_desktop_home_1440x900.png'), fullPage: false })

  // Navigate to Chats
  log('Testing Chats view under CSP...')
  await page.goto('http://localhost:3000/chats', { waitUntil: 'networkidle' })
  await page.screenshot({ path: path.join(evidenceDir, 'csp_desktop_chats_1440x900.png'), fullPage: false })

  // 2. Mobile Test (390x844)
  log('Testing Mobile viewport under CSP...')
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    isMobile: true,
  })
  const mobilePage = await mobileContext.newPage()
  mobilePage.on('console', (msg) => {
    const text = msg.text()
    if (text.toLowerCase().includes('content security policy') || text.toLowerCase().includes('violates')) {
      cspViolations.push(`[Mobile] ${text}`)
    }
  })
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await mobilePage.screenshot({ path: path.join(evidenceDir, 'csp_mobile_home_390x844.png'), fullPage: false })

  await browser.close()

  log(`Total CSP violations detected: ${cspViolations.length}`)
  log(`Total Console errors: ${consoleErrors.length}`)

  if (cspViolations.length === 0) {
    log('PASS: Zero Content Security Policy violations detected.')
  } else {
    log(`FAIL: CSP violations found:\n${cspViolations.join('\n')}`)
  }

  const logContent = [
    `=== CSP AUDIT LOG ===`,
    `Date: ${new Date().toISOString()}`,
    `CSP Violations: ${cspViolations.length}`,
    ...cspViolations.map((v) => `CSP VIOLATION: ${v}`),
    `Console Errors: ${consoleErrors.length}`,
    ...consoleErrors.slice(0, 20),
    ...auditLog,
  ].join('\n')

  fs.writeFileSync(path.join(evidenceDir, 'csp_console_audit.txt'), logContent, 'utf8')
  console.log('CSP Audit finished successfully!')
}

run().catch((err) => {
  console.error('CSP Audit script failed:', err)
  process.exit(1)
})

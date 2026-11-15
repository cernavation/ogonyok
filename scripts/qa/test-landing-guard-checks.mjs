#!/usr/bin/env node
/**
 * TARGETED GUARD CHECKS FOR LANDING, SIGNIN, REGISTER, PRIVACY & TERMS
 */

import { launchGuardBrowser } from '../../tools/guard/browser.mjs'
import { runDomChecks, runContrastChecks } from '../../tools/guard/checks.mjs'
import { VIEWPORTS } from '../../tools/guard/config.mjs'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

const SCREENS = [
  { id: 'landing', path: '/?view=landing' },
  { id: 'privacy', path: '/privacy' },
  { id: 'terms', path: '/terms' },
]

async function testScreens() {
  const browser = await launchGuardBrowser()
  let totalIssues = 0

  try {
    const context = await browser.newContext()
    const page = await context.newPage()

    for (const screen of SCREENS) {
      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height })
        await page.goto(`${BASE_URL}${screen.path}`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(200)

        const domIssues = await runDomChecks(page, { screen: screen.id, viewport: vp })
        const contrastIssues = await runContrastChecks(page, { screen: screen.id, viewport: vp })

        const issues = [...domIssues, ...contrastIssues]
        if (issues.length > 0) {
          console.log(`[ISSUES on ${screen.id} ${vp.name}]:`, issues.length)
          for (const iss of issues) {
            console.log(`  - [${iss.checkId}]: ${iss.message} (selector: ${iss.selector})`)
          }
          totalIssues += issues.length
        } else {
          console.log(`[OK]: ${screen.id} on ${vp.name}`)
        }
      }
    }

    console.log(`\nTOTAL ISSUES FOUND: ${totalIssues}`)
    if (totalIssues > 0) {
      process.exit(1)
    }
  } finally {
    await browser.close()
  }
}

testScreens().catch((err) => {
  console.error(err)
  process.exit(1)
})

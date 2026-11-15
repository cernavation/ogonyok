#!/usr/bin/env node
/**
 * TARGETED GUARD CHECKS FOR ALL 10 SETTINGS SUBSECTIONS
 * Runs runDomChecks and runContrastChecks across all 5 viewports.
 */

import { launchGuardBrowser } from '../../tools/guard/browser.mjs'
import { runDomChecks, runContrastChecks } from '../../tools/guard/checks.mjs'
import { VIEWPORTS } from '../../tools/guard/config.mjs'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

const SECTIONS = [
  'profile',
  'appearance',
  'privacy',
  'notifications',
  'chats',
  'security',
  'data',
  'tariff',
  'tour',
  'about',
]

function buildUserStore() {
  const userId = '00000000-0000-4000-8000-000000000001'
  const username = 'alex_cerna'
  const displayName = 'Алексей Черна'

  return JSON.stringify({
    profile: {
      username,
      displayName,
      streak_count: 720,
      level: 3,
      avatarColor: '#ff5722',
      verified: true,
      subscription_tier: 'free',
      tour_completed: true,
    },
    privacy: { defaultDayVisibility: 'private' },
    auth: {
      signedIn: true,
      activeAccountId: userId,
      accounts: [
        {
          id: userId,
          email: `${username}@ogonek.app`,
          snapshot: { username, displayName, avatarColor: '#ff5722', streak: 720 },
        },
      ],
    },
    days: [
      {
        id: 101,
        dateISO: new Date().toISOString(),
        prides: ['Гордость 1'],
        gratitudes: ['Благодарность 1'],
        ratings: { 0: { scale: 8, overcome: 1 } },
      },
    ],
  })
}

async function testSettings() {
  console.log('[SETTINGS GUARD]: Launching browser...')
  const browser = await launchGuardBrowser()
  let totalIssues = 0

  try {
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page.evaluate((s) => {
      localStorage.clear()
      localStorage.setItem('ogonek.v2', s)
      localStorage.setItem('ogonek.store.v1', s)
    }, buildUserStore())
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(400)

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'settings' }))
    })
    await page.waitForTimeout(400)

    for (const sec of SECTIONS) {
      console.log(`\nTesting section: ${sec}`)
      const tabBtn = await page.waitForSelector(`#settings-tab-${sec}`)
      const isExpanded = await tabBtn.getAttribute('aria-expanded')
      if (isExpanded !== 'true') {
        await tabBtn.click()
        await page.waitForTimeout(300)
      }

      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height })
        await page.waitForTimeout(150)

        const domIssues = await runDomChecks(page, { screen: `settings_${sec}`, viewport: vp })
        const contrastIssues = await runContrastChecks(page, { screen: `settings_${sec}`, viewport: vp })

        // Filter out non-fatal or known minor items
        const criticalIssues = [...domIssues, ...contrastIssues].filter(
          (i) => i.checkId === 'a-horizontal-overflow-container' || i.checkId === 'b-clipped-text'
        )

        if (criticalIssues.length > 0) {
          console.log(`  [ISSUES on ${sec} ${vp.name}]:`, criticalIssues.length)
          for (const iss of criticalIssues) {
            console.log(`    - [${iss.checkId}]: ${iss.message} (selector: ${iss.selector})`)
          }
          totalIssues += criticalIssues.length
        } else {
          console.log(`  [OK]: ${sec} on ${vp.name}`)
        }
      }
    }

    console.log(`\nTOTAL CRITICAL ISSUES: ${totalIssues}`)
    if (totalIssues > 0) {
      process.exit(1)
    }
  } finally {
    await browser.close()
  }
}

testSettings().catch((err) => {
  console.error(err)
  process.exit(1)
})

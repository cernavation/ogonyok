#!/usr/bin/env node
/**
 * TARGETED GUARD CHECKS FOR STEP 17 (Performance & Offline)
 * Runs runDomChecks and runContrastChecks across all 5 viewports.
 */

import { launchGuardBrowser } from '../../tools/guard/browser.mjs'
import { runDomChecks, runContrastChecks } from '../../tools/guard/checks.mjs'
import { VIEWPORTS } from '../../tools/guard/config.mjs'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

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

async function main() {
  console.log('[STEP 17 GUARD]: Launching browser...')
  const browser = await launchGuardBrowser()

  let totalDomIssues = 0
  let totalContrastIssues = 0

  try {
    for (const vp of VIEWPORTS) {
      console.log(`[STEP 17 GUARD]: Running checks on ${vp.name} (${vp.width}x${vp.height})...`)
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
      const page = await ctx.newPage()

      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
      await page.evaluate((s) => {
        localStorage.clear()
        localStorage.setItem('ogonek.v2', s)
        localStorage.setItem('ogonek:tour-completed', 'true')
      }, buildUserStore())
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(500)

      const domRes = await runDomChecks(page, {
        screen: 'app',
        viewport: vp,
        step: '17',
        allowedRegions: [],
      })
      const domIssues = Array.isArray(domRes) ? domRes : domRes?.issues || []
      totalDomIssues += domIssues.length

      const contrastRes = await runContrastChecks(page, {
        screen: 'app',
        viewport: vp,
        theme: 'x-black',
        step: '17',
        allowedRegions: [],
      })
      const contrastIssues = Array.isArray(contrastRes) ? contrastRes : contrastRes?.issues || []
      totalContrastIssues += contrastIssues.length

      console.log(`  -> ${vp.name}: DOM issues=${domIssues.length}, Contrast issues=${contrastIssues.length}`)
      await ctx.close()
    }

    console.log(`\n[STEP 17 GUARD SUMMARY]: DOM issues: ${totalDomIssues}, Contrast issues: ${totalContrastIssues}`)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error('[STEP 17 GUARD ERROR]:', err)
  process.exit(1)
})

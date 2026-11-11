import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const MAC_CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
]

/**
 * Launches headless Chromium reliably using Playwright cache or system Chrome fallback.
 */
export async function launchGuardBrowser() {
  const errors = []

  try {
    return await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio'],
    })
  } catch (err) {
    errors.push(`default: ${err?.message || err}`)
  }

  for (const executablePath of MAC_CHROME_PATHS) {
    if (!fs.existsSync(executablePath)) continue
    try {
      return await chromium.launch({
        executablePath,
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio'],
      })
    } catch (err) {
      errors.push(`${path.basename(executablePath)}: ${err?.message || err}`)
    }
  }

  try {
    return await chromium.launch({
      channel: 'chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio'],
    })
  } catch (err) {
    errors.push(`channel=chrome: ${err?.message || err}`)
  }

  throw new Error(`Unable to launch headless Chromium (${errors.join('; ')})`)
}

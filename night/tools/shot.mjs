#!/usr/bin/env node
import { chromium } from 'playwright-core'
import fs from 'fs'
import path from 'path'

function parseArgs() {
  const args = process.argv.slice(2)
  let url = null
  let name = null
  let stage = process.env.STAGE || '00'

  const positional = []
  for (const arg of args) {
    if (arg.startsWith('--url=')) {
      url = arg.split('=')[1]
    } else if (arg.startsWith('--name=')) {
      name = arg.split('=')[1]
    } else if (arg.startsWith('--stage=')) {
      stage = arg.split('=')[1]
    } else if (!arg.startsWith('--')) {
      positional.push(arg)
    }
  }

  if (!url && positional[0]) url = positional[0]
  if (!name && positional[1]) name = positional[1]
  if (positional[2]) stage = positional[2]

  if (!url) {
    url = 'http://localhost:3000'
  }
  if (!name) {
    name = 'page'
  }

  if (url.startsWith('/')) {
    url = `http://localhost:3000${url}`
  }

  // Ensure stage is padded or clean string e.g. "00"
  stage = String(stage).trim()
  if (stage.length === 1 && !isNaN(stage)) {
    stage = `0${stage}`
  }

  return { url, name, stage }
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'chrome', headless: true })
  } catch (err) {
    return await chromium.launch({ headless: true })
  }
}

async function main() {
  const { url, name, stage } = parseArgs()
  const outDir = path.resolve(`night/evidence/${stage}`)
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  console.log(`[shot] Starting capture: URL=${url}, name=${name}, stage=${stage}`)
  console.log(`[shot] Output directory: ${outDir}`)

  const browser = await launchBrowser()

  try {
    // 1. Desktop 1440x900
    const desktopFile = path.join(outDir, `${name}-1440x900.png`)
    const desktopPage = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    })
    console.log(`[shot] Navigating desktop (1440x900)...`)
    await desktopPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await desktopPage.waitForTimeout(1200)
    await desktopPage.screenshot({ path: desktopFile, fullPage: false })
    console.log(`[shot] Desktop screenshot saved: ${desktopFile}`)
    await desktopPage.close()

    // 2. Mobile 390x844
    const mobileFile = path.join(outDir, `${name}-390x844.png`)
    const mobilePage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    })
    console.log(`[shot] Navigating mobile (390x844)...`)
    await mobilePage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await mobilePage.waitForTimeout(1200)
    await mobilePage.screenshot({ path: mobileFile, fullPage: false })
    console.log(`[shot] Mobile screenshot saved: ${mobileFile}`)
    await mobilePage.close()

    console.log(`[shot] Successfully captured both viewports for ${name}`)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error('[shot] Fatal error:', err)
  process.exit(1)
})

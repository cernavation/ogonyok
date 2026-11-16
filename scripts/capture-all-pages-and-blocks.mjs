#!/usr/bin/env node
/**
 * CAPTURE ALL PAGES AND ALL LANDING BLOCKS FOR VISUAL AUDIT
 */

import fs from 'node:fs'
import path from 'node:path'
import { launchGuardBrowser } from '../tools/guard/browser.mjs'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3099'
const OUT_DIR = '/Users/user/.gemini/antigravity/brain/f33f2529-53c2-4bb6-8a3d-5b08904399b6/visual_audit'

fs.mkdirSync(OUT_DIR, { recursive: true })

async function runCapture() {
  console.log(`[AUDIT]: Starting comprehensive capture from ${BASE_URL}...`)
  const browser = await launchGuardBrowser()

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2, // Retina resolution for crisp examination
    })
    const page = await context.newPage()

    // Helper to scroll and trigger all animations
    async function revealAll(p) {
      await p.evaluate(async () => {
        const total = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
        const step = 600
        for (let y = 0; y < total; y += step) {
          window.scrollTo(0, y)
          await new Promise((r) => setTimeout(r, 30))
        }
        document
          .querySelectorAll('.fade-up, .fade-blur, .fade-scale, .fade-slide-left, .fade-slide-right')
          .forEach((el) => {
            el.classList.add('visible')
          })
        window.scrollTo(0, 0)
      })
      await p.waitForTimeout(300)
    }

    // 1. CAPTURE ALL SECTIONS OF LANDING PAGE (Desktop 1440px)
    console.log('[AUDIT]: Loading landing page (pure root http://localhost:3099/)...')
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    await revealAll(page)

    // Sections list on landing page
    const landingSections = [
      { id: '01_landing_hero', selector: 'section[aria-label="Главный экран Priday"], section[aria-label="Главный экран Огонька"]' },
      { id: '02_landing_how_it_works', selector: '#how' },
      { id: '03_landing_modes', selector: '#modes' },
      { id: '04_landing_levels', selector: '#levels' },
      { id: '05_landing_numbers', selector: 'section[aria-label="Реальные цифры"]' },
      { id: '06_landing_quotes', selector: 'section[aria-label="Отзывы и истории участников"], section[aria-label="Цитаты"]' },
      { id: '06b_landing_ai_ceremony', selector: 'section[aria-label="ИИ-наставник Priday"]' },
      { id: '07_landing_showcase', selector: '#showcase' },
      { id: '08_landing_privacy', selector: '#privacy' },
      { id: '09_landing_open_and_free', selector: '#open' },
      { id: '10_landing_pricing', selector: '#pricing' },
      { id: '11_landing_together_banner', selector: 'section[aria-label="Финальный призыв к действию"]' },
      { id: '12_landing_footer', selector: 'footer' },
    ]

    for (const sec of landingSections) {
      try {
        const el = await page.$(sec.selector)
        if (el) {
          await el.evaluate((node) => node.scrollIntoView({ behavior: 'instant', block: 'start' }))
          // Offset fixed navbar
          await page.evaluate(() => window.scrollBy(0, -80))
          await page.waitForTimeout(250)
          const filePath = path.join(OUT_DIR, `${sec.id}.png`)
          await el.screenshot({ path: filePath })
          console.log(`  ✓ Saved section: ${sec.id}.png`)
        } else {
          console.warn(`  ⚠️ Selector not found for ${sec.id}: ${sec.selector}`)
        }
      } catch (err) {
        console.error(`  ❌ Error capturing ${sec.id}:`, err.message)
      }
    }

    // Full landing page desktop overview
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(OUT_DIR, '00_landing_full_desktop.png'), fullPage: true })
    console.log('  ✓ Saved 00_landing_full_desktop.png')

    // 2. CAPTURE ALL DEDICATED SUBPAGES
    const subpages = [
      { id: '13_page_ai', path: '/ai' },
      { id: '14_page_examples', path: '/examples' },
      { id: '15_page_community', path: '/community' },
      { id: '16_page_platform', path: '/platform' },
      { id: '17_page_how_it_works', path: '/how-it-works' },
      { id: '18_page_modes', path: '/modes' },
      { id: '19_page_reviews', path: '/reviews' },
      { id: '20_page_manifesto', path: '/manifesto' },
      { id: '21_page_support', path: '/support' },
      { id: '22_page_terms', path: '/terms' },
      { id: '23_page_privacy', path: '/privacy' },
      { id: '24_page_login', path: '/login' },
      { id: '25_page_register', path: '/register' },
    ]

    for (const sp of subpages) {
      try {
        console.log(`[AUDIT]: Loading subpage ${sp.path}...`)
        await page.goto(`${BASE_URL}${sp.path}`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(400)
        await revealAll(page)
        const filePath = path.join(OUT_DIR, `${sp.id}.png`)
        await page.screenshot({ path: filePath, fullPage: true })
        console.log(`  ✓ Saved subpage: ${sp.id}.png`)
      } catch (err) {
        console.error(`  ❌ Error capturing subpage ${sp.id}:`, err.message)
      }
    }

    // 3. CAPTURE AUTH MODALS (Desktop)
    try {
      console.log('[AUDIT]: Capturing Auth Modals...')
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(500)

      // Open Sign In Modal
      const signinBtn = await page.$('button:has-text("Войти")')
      if (signinBtn) {
        await signinBtn.click()
        await page.waitForTimeout(600)
        await page.screenshot({ path: path.join(OUT_DIR, '26_modal_auth_signin.png') })
        console.log('  ✓ Saved 26_modal_auth_signin.png')

        // Switch to Register tab inside modal
        const regTab = await page.$('button[role="tab"]:has-text("Регистрация")')
        if (regTab) {
          await regTab.click()
          await page.waitForTimeout(500)
          await page.screenshot({ path: path.join(OUT_DIR, '27_modal_auth_register.png') })
          console.log('  ✓ Saved 27_modal_auth_register.png')
        }
      }
    } catch (err) {
      console.error('  ❌ Error capturing auth modals:', err.message)
    }

    // 4. CAPTURE MOBILE RESPONSIVE (390x844 iPhone 14)
    console.log('[AUDIT]: Capturing Mobile viewports (390px)...')
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    })
    const mobilePage = await mobileContext.newPage()

    await mobilePage.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await mobilePage.waitForTimeout(800)
    await mobilePage.screenshot({ path: path.join(OUT_DIR, '28_mobile_landing_hero.png') })
    console.log('  ✓ Saved 28_mobile_landing_hero.png')

    // Open mobile burger menu
    const burgerBtn = await mobilePage.$('#mobile-nav-toggle, button[aria-label*="меню"]')
    if (burgerBtn) {
      await burgerBtn.click()
      await mobilePage.waitForTimeout(500)
      await mobilePage.screenshot({ path: path.join(OUT_DIR, '29_mobile_navbar_drawer.png') })
      console.log('  ✓ Saved 29_mobile_navbar_drawer.png')
    }

    await mobileContext.close()
    await context.close()
    console.log('[AUDIT]: All visual screenshots captured successfully!')
  } finally {
    await browser.close()
  }
}

runCapture().catch((err) => {
  console.error('[AUDIT]: Fatal capture error:', err)
  process.exit(1)
})

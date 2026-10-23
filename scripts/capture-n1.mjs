#!/usr/bin/env node
/**
 * CAPTURE SUITE N1 — Verification Screenshots
 * 
 * Captures in screenshots/N1/:
 * 1. landing-desktop-dark.png
 * 2. landing-desktop-light.png
 * 3. landing-mobile-dark.png
 * 4. landing-mobile-light.png
 * 5. onboarding.png
 * 6. empty-leaderboard.png
 * 7. empty-explore.png
 * 8. empty-messages.png
 * 9. empty-friends.png
 */

import { chromium } from 'playwright-core'
import fs from 'fs'
import path from 'path'

const BASE_URL = process.env.AUDIT_BASE_URL || 'http://localhost:3000'
const OUT_DIR = path.resolve('screenshots/N1')

async function launchBrowser() {
  const possiblePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]
  for (const exe of possiblePaths) {
    if (fs.existsSync(exe)) {
      try {
        return await chromium.launch({ executablePath: exe, headless: true })
      } catch {}
    }
  }
  return await chromium.launch({ channel: 'chrome', headless: true })
}

async function main() {
  console.log('📸 Запуск съемки скриншотов верификации N1...')
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true })
  }

  const browser = await launchBrowser()

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. ЛЕНДИНГ ГОСТЯ (ДЕКСТОП + МОБИЛЬНЫЙ, ТЁМНАЯ + СВЕТЛАЯ)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('▶ Съемка лендинга гостя...')
    const landingConfigs = [
      { name: 'landing-desktop-dark.png', width: 1440, height: 900, theme: 'x-black' },
      { name: 'landing-desktop-light.png', width: 1440, height: 900, theme: 'apple-light' },
      { name: 'landing-mobile-dark.png', width: 390, height: 844, theme: 'x-black' },
      { name: 'landing-mobile-light.png', width: 390, height: 844, theme: 'apple-light' },
    ]

    for (const conf of landingConfigs) {
      const context = await browser.newContext({
        viewport: { width: conf.width, height: conf.height },
        deviceScaleFactor: 2,
      })

      // Очищаем хранилище — гость не авторизован
      await context.addInitScript((themeId) => {
        try {
          localStorage.clear()
          sessionStorage.clear()
          localStorage.setItem('ogonek.appearance.v1', JSON.stringify({ theme: themeId, accent: 'flame' }))
          document.documentElement.setAttribute('data-theme', themeId)
          document.documentElement.setAttribute('data-accent', 'flame')
        } catch {}
      }, conf.theme)

      const page = await context.newPage()
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(600)

      await page.evaluate((themeId) => {
        document.documentElement.setAttribute('data-theme', themeId)
        document.body.className = themeId
      }, conf.theme)
      await page.waitForTimeout(300)

      const filePath = path.join(OUT_DIR, conf.name)
      await page.screenshot({ path: filePath })
      console.log(`  ✓ ${conf.name} сохранён`)
      await context.close()
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. ОНБОРДИНГ (ВЫБОР @НИКА, СЛОЖНОСТИ, ТУР, ПЕРВАЯ ГОРДОСТЬ)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('▶ Съемка экрана онбординга...')
    {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
      })

      await context.addInitScript(() => {
        try {
          const store = {
            schemaVersion: 1,
            days: [],
            auth: {
              signedIn: true,
              hasOnboarded: false,
              activeAccountId: 'acc-newbie',
              accounts: [
                {
                  id: 'acc-newbie',
                  username: '',
                  displayName: 'Новый Пользователь',
                  role: 'member',
                  streak: 0,
                  level: 3,
                },
              ],
            },
          }
          localStorage.setItem('ogonek.store.v1', JSON.stringify(store))
          localStorage.setItem('ogonek.appearance.v1', JSON.stringify({ theme: 'x-black', accent: 'flame' }))
          document.documentElement.setAttribute('data-theme', 'x-black')
        } catch {}
      })

      const page = await context.newPage()
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(500)

      // Открываем модалку онбординга
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ogonek:open-onboarding'))
      })
      await page.waitForTimeout(500)

      const filePath = path.join(OUT_DIR, 'onboarding.png')
      await page.screenshot({ path: filePath })
      console.log(`  ✓ onboarding.png сохранён`)
      await context.close()
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. ПУСТЫЕ СОСТОЯНИЯ (РЕЙТИНГ, ПОИСК, ЧАТЫ, ДРУЗЬЯ)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('▶ Съемка пустых состояний без фейков...')
    {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
      })

      // Авторизованный пользователь без фейковых друзей
      await context.addInitScript(() => {
        try {
          const store = {
            schemaVersion: 1,
            days: [],
            auth: {
              signedIn: true,
              hasOnboarded: true,
              activeAccountId: 'acc-real-user',
              accounts: [
                {
                  id: 'acc-real-user',
                  username: 'alex_solitary',
                  displayName: 'Алексей',
                  role: 'owner',
                  streak: 1,
                  level: 3,
                  participateLeaderboard: true,
                },
              ],
            },
            friends: [],
            chatThreads: [],
          }
          localStorage.setItem('ogonek.store.v1', JSON.stringify(store))
          localStorage.setItem('ogonek.appearance.v1', JSON.stringify({ theme: 'x-black', accent: 'flame' }))
          document.documentElement.setAttribute('data-theme', 'x-black')
        } catch {}
      })

      const page = await context.newPage()
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(500)

      // A. Пустой рейтинг: "Пока ты один в рейтинге. Пригласи друзей"
      console.log('  • Рейтинг (я один, пригласи друзей)...')
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'leaderboard' }))
      })
      await page.waitForTimeout(500)
      await page.screenshot({ path: path.join(OUT_DIR, 'empty-leaderboard.png') })
      console.log('  ✓ empty-leaderboard.png сохранён')

      // B. Пустой поиск: "Найди друзей по нику"
      console.log('  • Поиск (найди друзей по нику)...')
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'explore' }))
      })
      await page.waitForTimeout(500)
      await page.screenshot({ path: path.join(OUT_DIR, 'empty-explore.png') })
      console.log('  ✓ empty-explore.png сохранён')

      // C. Пустые чаты: "Напиши первому другу"
      console.log('  • Чаты (напиши первому другу)...')
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'messages' }))
      })
      await page.waitForTimeout(500)
      await page.screenshot({ path: path.join(OUT_DIR, 'empty-messages.png') })
      console.log('  ✓ empty-messages.png сохранён')

      // D. Пустые друзья: модалка друзей
      console.log('  • Друзья (у тебя пока нет друзей)...')
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ogonek:open-friends'))
      })
      await page.waitForTimeout(500)
      await page.screenshot({ path: path.join(OUT_DIR, 'empty-friends.png') })
      console.log('  ✓ empty-friends.png сохранён')

      await context.close()
    }

    console.log('\n🎉 Все 9 скриншотов успешно сохранены в screenshots/N1/')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error('Ошибка в scripts/capture-n1.mjs:', err)
  process.exit(1)
})

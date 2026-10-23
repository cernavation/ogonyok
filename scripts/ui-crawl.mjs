#!/usr/bin/env node
/**
 * UI CRAWL SUITE — ОГОНЁК
 * 
 * Автоматизированный обход и верификация всех экранов и состояний приложения:
 * - Поддержка десктопного (1440×900) и мобильного (390×844) viewport
 * - Тестирование тем (Dark / Light)
 * - Обход всех 9 экранов навигации
 * - Проверка ключевых модальных окон и состояний
 * - Поддержка режима --fast для мгновенных проверок
 * - Автоматический тест-режим (NEXT_PUBLIC_DEMO_MODE=1 / авторизованная тестовая сессия)
 */

import { chromium } from 'playwright-core'
import fs from 'fs'
import path from 'path'

export const CONFIG = {
  baseUrl: process.env.AUDIT_BASE_URL || 'http://localhost:3000',
  outputDir: path.resolve('screenshots/crawl'),
  fastMode: process.argv.includes('--fast'),

  viewports: [
    { id: 'desktop', name: 'Desktop (1440×900)', width: 1440, height: 900, isMobile: false },
    { id: 'mobile', name: 'Mobile (390×844)', width: 390, height: 844, isMobile: true },
  ],

  themes: [
    { id: 'x-black', label: 'Dark (x-black)' },
    { id: 'apple-light', label: 'Light (apple-light)' },
  ],

  // 9 основных экранов приложения
  screens: [
    { id: 'home', title: 'Главная', sidebarText: 'Главная', mobileLabel: 'Главная' },
    { id: 'explore', title: 'Поиск', sidebarText: 'Поиск', mobileLabel: 'Поиск' },
    { id: 'messages', title: 'Чаты', sidebarText: 'Чаты', mobileLabel: 'Чаты' },
    { id: 'vault', title: 'Evidence Vault', sidebarText: 'Evidence Vault', mobileLabel: 'Evidence Vault' },
    { id: 'analytics', title: 'Статистика', sidebarText: 'Статистика', mobileLabel: 'Аналитика' },
    { id: 'leaderboard', title: 'Рейтинг', sidebarText: 'Рейтинг', mobileLabel: 'Рейтинг' },
    { id: 'profile', title: 'Профиль', sidebarText: 'Профиль', mobileLabel: 'Профиль' },
    { id: 'settings', title: 'Настройки', sidebarText: 'Настройки', mobileLabel: 'Настройки' },
    { id: 'intentions', title: 'Намерения', sidebarText: 'Намерения', mobileLabel: 'Намерения' },
  ],

  // Интерактивные состояния
  states: [
    {
      id: 'composer',
      title: 'Композер записи',
      setup: async (page) => {
        await page.evaluate(() => {
          window.dispatchEvent(new CustomEvent('ogonek:open-composer'))
        })
        await page.waitForSelector('.modal, div[role="dialog"], .composer-modal', { timeout: 2000 }).catch(() => {})
        await page.waitForTimeout(200)
      },
    },
    {
      id: 'onboarding',
      title: 'Онбординг',
      setup: async (page) => {
        await page.evaluate(() => {
          window.dispatchEvent(new CustomEvent('ogonek:open-onboarding'))
        })
        await page.waitForSelector('div[aria-label="Онбординг Огонька"], div[role="dialog"]', { timeout: 2000 }).catch(() => {})
        await page.waitForTimeout(200)
      },
    },
  ],
}

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
  try {
    return await chromium.launch({ channel: 'chrome', headless: true })
  } catch (err) {
    console.warn('[Crawl] Chrome channel fallback to default chromium:', err.message)
    return await chromium.launch({ headless: true })
  }
}

async function resetModals(page) {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(100)
  const closeBtn = await page.$('button[aria-label="Закрыть"]')
  if (closeBtn) await closeBtn.click({ force: true, timeout: 300 }).catch(() => {})
}

async function navigateToScreen(page, screenDef) {
  await resetModals(page)

  // Попытка клика через сайдбар (десктоп)
  const sidebarBtn = await page.$(`aside.sidebar button:has-text("${screenDef.sidebarText}")`)
  if (sidebarBtn && await sidebarBtn.isVisible()) {
    await sidebarBtn.click({ force: true, timeout: 1500 }).catch(() => {})
    await page.waitForTimeout(200)
    return
  }

  // Попытка клика через нижнюю мобильную панель
  const bottomBtn = await page.$(`nav.bottom-nav button:has-text("${screenDef.mobileLabel}"), nav button:has-text("${screenDef.mobileLabel}")`)
  if (bottomBtn && await bottomBtn.isVisible()) {
    await bottomBtn.click({ force: true, timeout: 1500 }).catch(() => {})
    await page.waitForTimeout(200)
    return
  }

  // Fallback через CustomEvent навигации
  await page.evaluate((viewId) => {
    window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: viewId }))
  }, screenDef.id)
  await page.waitForTimeout(200)
}

export async function runCrawl() {
  const startTime = Date.now()
  console.log('═════════════════════════════════════════════════════════════════')
  console.log(`🕷️ ЗАПУСК UI-CRAWL ОГОНЬКА ${CONFIG.fastMode ? '(--fast режим)' : '(полный обход)'}`)
  console.log(`Целевой адрес: ${CONFIG.baseUrl}`)
  console.log(`Папка скриншотов: ${CONFIG.outputDir}`)
  console.log('═════════════════════════════════════════════════════════════════\n')

  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true })
  }

  const browser = await launchBrowser()
  const errors = []

  const viewportsToRun = CONFIG.fastMode ? [CONFIG.viewports[0]] : CONFIG.viewports
  const themesToRun = CONFIG.fastMode ? [CONFIG.themes[0]] : CONFIG.themes

  try {
    for (const viewport of viewportsToRun) {
      for (const theme of themesToRun) {
        console.log(`\n▶ Окружение: ${viewport.name} | Тема: ${theme.label}`)

        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: 2,
        })

        // Гарантируем авторизованный демо-режим для скрипта обхода
        await context.addInitScript(() => {
          try {
            const raw = localStorage.getItem('ogonek.store.v1')
            const store = raw ? JSON.parse(raw) : {}
            store.auth = {
              ...(store.auth || {}),
              signedIn: true,
              hasOnboarded: true,
              activeAccountId: store.auth?.activeAccountId || 'acc-owner',
              accounts: store.auth?.accounts || [
                {
                  id: 'acc-owner',
                  username: 'alex_creator',
                  displayName: 'Алексей (Создатель)',
                  role: 'owner',
                  streak: 705,
                  level: 3,
                  participateLeaderboard: true,
                },
              ],
            }
            localStorage.setItem('ogonek.store.v1', JSON.stringify(store))
          } catch {}
        })

        const page = await context.newPage()

        page.on('pageerror', (err) => {
          errors.push(`[${viewport.id}/${theme.id}] Uncaught: ${err.message}`)
        })

        await page.goto(CONFIG.baseUrl, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(300)

        // 1. Обход всех 9 экранов
        for (const screen of CONFIG.screens) {
          process.stdout.write(`  • Обход экрана "${screen.title}"... `)
          await navigateToScreen(page, screen)
          await page.waitForTimeout(150)

          const shotPath = path.join(CONFIG.outputDir, `${viewport.id}-${theme.id}-${screen.id}.png`)
          await page.screenshot({ path: shotPath })
          console.log(`[OK]`)
        }

        // 2. Обход состояний
        for (const state of CONFIG.states) {
          process.stdout.write(`  ★ Обход состояния "${state.title}"... `)
          try {
            await resetModals(page)
            await state.setup(page)
            await page.waitForTimeout(150)

            const shotPath = path.join(CONFIG.outputDir, `${viewport.id}-${theme.id}-state-${state.id}.png`)
            await page.screenshot({ path: shotPath })
            console.log(`[OK]`)
            await resetModals(page)
          } catch (err) {
            console.log(`[Сбой: ${err.message}]`)
          }
        }

        await context.close()
      }
    }
  } finally {
    await browser.close()
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n═════════════════════════════════════════════════════════════════`)
  console.log(`✅ UI-Crawl завершён за ${durationSec}с.`)
  if (errors.length > 0) {
    console.warn(`Обнаружены ошибки страницы (${errors.length}):`)
    errors.forEach((e) => console.warn(`  - ${e}`))
  } else {
    console.log(`Все экраны успешно обойдены без критических ошибок.`)
  }
  console.log(`Скриншоты сохранены в: ${CONFIG.outputDir}`)
  console.log(`═════════════════════════════════════════════════════════════════\n`)
}

// Запуск при прямом вызове
if (process.argv[1] && process.argv[1].endsWith('ui-crawl.mjs')) {
  runCrawl().catch((err) => {
    console.error('Ошибка выполнения UI-Crawl:', err)
    process.exit(1)
  })
}

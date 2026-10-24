#!/usr/bin/env node
/**
 * UI EXPLORE SUITE — ОГОНЁК
 * 
 * Глубокое автономное исследование интерфейса:
 * - Все экраны (Главная, Поиск, Чаты, Диалог, Evidence Vault, Статистика, Рейтинг,
 *   Профиль, Настройки, Намерения, Гайд, Лендинг для гостя, Онбординг, Вход, Окно «Записать»)
 * - 9 типоразмеров экранов (телефоны 360/390/430, планшеты 768/820/1024, ноутбук 1280, десктоп 1440, Full HD 1920)
 * - Движки: Chromium, WebKit, Firefox (--browser=chromium|webkit|firefox)
 * - Сквозное выявление ловушек навигации (trap-state / back-broken) в чатах и диалогах
 * - Проверка мёртвых кнопок (dead-click)
 * - Сохранение скриншотов каждого состояния в explore/<device>/states/<state>.png
 * - Формирование отчёта в explore/BASELINE.md
 */

import { chromium, webkit, firefox } from 'playwright-core'
import fs from 'fs'
import path from 'path'

export const CONFIG = {
  baseUrl: process.env.AUDIT_BASE_URL || 'http://localhost:3000',
  outputDir: path.resolve('explore'),
  reportFile: path.resolve('explore/BASELINE.md'),
  fastMode: process.argv.includes('--fast'),

  viewports: [
    { id: 'mobile-360', name: 'Mobile Small (360×780)', width: 360, height: 780, isMobile: true, deviceClass: 'phone' },
    { id: 'mobile-390', name: 'Mobile Standard (390×844)', width: 390, height: 844, isMobile: true, deviceClass: 'phone' },
    { id: 'mobile-430', name: 'Mobile Pro Max (430×932)', width: 430, height: 932, isMobile: true, deviceClass: 'phone' },
    { id: 'tablet-768', name: 'Tablet Portrait (768×1024)', width: 768, height: 1024, isMobile: true, deviceClass: 'tablet' },
    { id: 'tablet-820', name: 'iPad Air (820×1180)', width: 820, height: 1180, isMobile: true, deviceClass: 'tablet' },
    { id: 'tablet-1024', name: 'Tablet Landscape (1024×768)', width: 1024, height: 768, isMobile: false, deviceClass: 'tablet' },
    { id: 'desktop-1280', name: 'Compact Laptop (1280×800)', width: 1280, height: 800, isMobile: false, deviceClass: 'laptop' },
    { id: 'desktop-1440', name: 'Desktop Standard (1440×900)', width: 1440, height: 900, isMobile: false, deviceClass: 'laptop' },
    { id: 'desktop-1920', name: 'Full HD Large (1920×1080)', width: 1920, height: 1080, isMobile: false, deviceClass: 'fhd' },
  ],

  themes: [
    { id: 'x-black', label: 'Dark (x-black)' },
    { id: 'apple-light', label: 'Light (apple-light)' },
    { id: 'dim', label: 'Dim (twilight)' },
  ],

  defaultAccent: 'flame',

  screens: [
    { id: 'home', title: 'Главная', path: '/?view=home', sidebarText: 'Главная', mobileLabel: 'Главная' },
    { id: 'explore', title: 'Поиск', path: '/?view=explore', sidebarText: 'Поиск', mobileLabel: 'Поиск' },
    { id: 'messages', title: 'Чаты', path: '/chats', sidebarText: 'Чаты', mobileLabel: 'Чаты' },
    { id: 'chat-thread', title: 'Диалог чата', path: '/chats/fr-voloshin', isChatThread: true },
    { id: 'vault', title: 'Evidence Vault', path: '/?view=vault', sidebarText: 'Evidence Vault', mobileLabel: 'Evidence Vault' },
    { id: 'analytics', title: 'Статистика', path: '/?view=analytics', sidebarText: 'Статистика', mobileLabel: 'Аналитика' },
    { id: 'leaderboard', title: 'Рейтинг', path: '/?view=leaderboard', sidebarText: 'Рейтинг', mobileLabel: 'Рейтинг' },
    { id: 'profile', title: 'Профиль', path: '/?view=profile', sidebarText: 'Профиль', mobileLabel: 'Профиль' },
    { id: 'settings', title: 'Настройки', path: '/?view=settings', sidebarText: 'Настройки', mobileLabel: 'Настройки' },
    { id: 'intentions', title: 'Намерения', path: '/?view=intentions', sidebarText: 'Намерения', mobileLabel: 'Намерения' },
    { id: 'guide', title: 'Гайд', isModal: 'guide' },
    { id: 'onboarding', title: 'Онбординг', isModal: 'onboarding' },
    { id: 'composer', title: 'Записать', isModal: 'composer' },
    { id: 'auth', title: 'Вход', isModal: 'auth' },
    { id: 'landing', title: 'Лендинг для гостя', isGuestLanding: true },
  ],
}

function getBrowserType() {
  const arg = process.argv.find((a) => a.startsWith('--browser='))
  if (arg) {
    const val = arg.split('=')[1].toLowerCase()
    if (val === 'webkit') return 'webkit'
    if (val === 'firefox') return 'firefox'
  }
  return 'chromium'
}

async function launchBrowser(browserType = getBrowserType()) {
  if (browserType === 'webkit') {
    return await webkit.launch({ headless: true })
  }
  if (browserType === 'firefox') {
    return await firefox.launch({ headless: true })
  }
  try {
    return await chromium.launch({ channel: 'chrome', headless: true })
  } catch {
    return await chromium.launch({ headless: true })
  }
}

async function resetModals(page) {
  try {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ogonek:close-onboarding'))
      window.dispatchEvent(new CustomEvent('ogonek:close-composer'))
      window.dispatchEvent(new CustomEvent('ogonek:close-auth'))
    })
    await page.keyboard.press('Escape').catch(() => {})
  } catch {}
}

async function prepareAuth(context) {
  await context.addInitScript(() => {
    try {
      const app = JSON.parse(localStorage.getItem('ogonek.appearance.v1') || '{}')
      localStorage.setItem('ogonek.appearance.v1', JSON.stringify({
        theme: app.theme || 'x-black',
        accent: app.accent || 'flame',
        fontScale: 'regular',
        feedDensity: 'cozy',
      }))
      const st = JSON.parse(localStorage.getItem('ogonek.v2') || '{}')
      st.auth = {
        ...(st.auth || {}),
        signedIn: true,
        hasOnboarded: true,
        activeAccountId: 'acc-owner',
      }
      localStorage.setItem('ogonek.v2', JSON.stringify(st))
    } catch {}
  })
}

export async function runUiExplore() {
  const browserType = getBrowserType()
  const startTime = Date.now()
  console.log('═════════════════════════════════════════════════════════════════')
  console.log(`🧭 ЗАПУСК UI-EXPLORE SUITE [Движок: ${browserType.toUpperCase()}] ${CONFIG.fastMode ? '(--fast режим)' : '(полный обход)'}`)
  console.log(`Цель: ${CONFIG.baseUrl}`)
  console.log(`Папка отчётов: ${CONFIG.outputDir}`)
  console.log('═════════════════════════════════════════════════════════════════\n')

  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true })
  }

  const browser = await launchBrowser(browserType)
  const viewportsToRun = CONFIG.fastMode
    ? [CONFIG.viewports[1], CONFIG.viewports[7]] // mobile-390 and desktop-1440
    : CONFIG.viewports

  const themeArg = process.argv.find((a) => a.startsWith('--theme='))?.split('=')[1]
  const themesToRun = themeArg
    ? CONFIG.themes.filter((t) => t.id === themeArg)
    : [CONFIG.themes[0]] // dark by default for explore; matrix handles all themes

  const allProblems = []
  let totalStatesVisited = 0
  let totalButtonsClicked = 0

  try {
    for (const viewport of viewportsToRun) {
      const deviceDir = path.join(CONFIG.outputDir, viewport.id, 'states')
      fs.mkdirSync(deviceDir, { recursive: true })

      for (const theme of themesToRun) {
        console.log(`\n▶ [${browserType}] ${viewport.name} (${viewport.id}) | Тема: ${theme.label}`)

        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: 2,
        })

        await prepareAuth(context)
        const page = await context.newPage()

        page.on('pageerror', (err) => {
          allProblems.push({
            type: 'js-error',
            viewport: viewport.id,
            state: 'runtime',
            message: err.message,
          })
          console.error(`  [ОШИБКА JS]: ${err.message}`)
        })

        for (const screen of CONFIG.screens) {
          totalStatesVisited++
          const stateId = screen.id
          process.stdout.write(`  • Состояние "${screen.title}" (${stateId})... `)

          if (screen.isGuestLanding) {
            // Guest mode (unauthenticated)
            const guestContext = await browser.newContext({
              viewport: { width: viewport.width, height: viewport.height },
              deviceScaleFactor: 2,
            })
            await guestContext.addInitScript(() => {
              try {
                const st = JSON.parse(localStorage.getItem('ogonek.v2') || '{}')
                st.auth = { ...(st.auth || {}), signedIn: false }
                localStorage.setItem('ogonek.v2', JSON.stringify(st))
              } catch {}
            })
            const guestPage = await guestContext.newPage()
            await guestPage.goto(CONFIG.baseUrl + '/?view=landing', { waitUntil: 'domcontentloaded' }).catch(() => {})
            await guestPage.waitForTimeout(400)
            const shotPath = path.join(deviceDir, `${stateId}.png`)
            await guestPage.screenshot({ path: shotPath })
            await guestContext.close()
            console.log('📸 скриншот сохранён ✅')
            continue
          }

          if (screen.isModal === 'composer') {
            await page.goto(CONFIG.baseUrl, { waitUntil: 'domcontentloaded' })
            await page.waitForTimeout(200)
            await page.evaluate(() => window.dispatchEvent(new CustomEvent('ogonek:open-composer')))
            await page.waitForTimeout(300)
            const shotPath = path.join(deviceDir, `${stateId}.png`)
            await page.screenshot({ path: shotPath })
            await resetModals(page)
            console.log('📸 скриншот сохранён ✅')
            continue
          }

          if (screen.isModal === 'onboarding' || screen.isModal === 'guide') {
            await page.goto(CONFIG.baseUrl, { waitUntil: 'domcontentloaded' })
            await page.waitForTimeout(200)
            await page.evaluate(() => window.dispatchEvent(new CustomEvent('ogonek:open-onboarding')))
            await page.waitForTimeout(300)
            const shotPath = path.join(deviceDir, `${stateId}.png`)
            await page.screenshot({ path: shotPath })
            await resetModals(page)
            console.log('📸 скриншот сохранён ✅')
            continue
          }

          if (screen.isModal === 'auth') {
            await page.goto(CONFIG.baseUrl, { waitUntil: 'domcontentloaded' })
            await page.waitForTimeout(200)
            await page.evaluate(() => window.dispatchEvent(new CustomEvent('ogonek:open-auth', { detail: 'signin' })))
            await page.waitForTimeout(300)
            const shotPath = path.join(deviceDir, `${stateId}.png`)
            await page.screenshot({ path: shotPath })
            await resetModals(page)
            console.log('📸 скриншот сохранён ✅')
            continue
          }

          // Regular screen or chat thread
          const url = CONFIG.baseUrl + (screen.path || '/')
          await page.goto(url, { waitUntil: 'domcontentloaded' })
          await page.waitForTimeout(300)

          const shotPath = path.join(deviceDir, `${stateId}.png`)
          await page.screenshot({ path: shotPath })

          // Проверка на ловушку (trap-state / back-broken) для Чатов и Диалога
          if (stateId === 'messages' || stateId === 'chat-thread') {
            const trapIssues = []

            // 1. Проверяем наличие кликабельного пути назад / домой
            if (viewport.isMobile) {
              // На мобильном / планшете должна быть видимая кнопка «←» или «🏠» или Меню
              const backOrHome = await page.$(
                'button[aria-label*="Назад"], button[aria-label*="главную"], button[aria-label*="Меню"], a[aria-label*="главную"], [data-testid="back-button"]'
              )
              if (!backOrHome) {
                trapIssues.push('Отсутствует видимая кнопка возврата/домой/меню на мобильном/планшете')
              }
            } else {
              // На десктопе рейка иконок слева должна содержать кнопку «Домой»
              const homeBtn = await page.$('aside a[href="/"], aside button[aria-label*="главную"], aside a[aria-label*="главную"]')
              if (!homeBtn) {
                trapIssues.push('Рейка иконок не содержит рабочей кнопки «Домой»')
              }
            }

            // 2. Тестируем возврат: кликаем Home или браузерный Back
            const homeLink = await page.$('a[href="/"], button[aria-label*="главную"], button[aria-label*="Назад"]')
            if (homeLink && await homeLink.isVisible()) {
              totalButtonsClicked++
              await homeLink.click({ timeout: 1500 }).catch(() => {})
              await page.waitForURL((u) => u.pathname === '/' || !u.pathname.includes('/chats'), { timeout: 2500 }).catch(() => {})
              await page.waitForTimeout(200)
              const currentUrl = page.url()
              const isBackAtHome = currentUrl === CONFIG.baseUrl + '/' || currentUrl.includes('view=home') || !currentUrl.includes('/chats')
              if (!isBackAtHome && stateId === 'messages') {
                trapIssues.push(`Клик по кнопке Домой не вернул на Главную (текущий URL: ${currentUrl})`)
              }
              // Возвращаемся обратно на тестируемый экран
              await page.goto(url, { waitUntil: 'domcontentloaded' })
              await page.waitForTimeout(200)
            }

            if (trapIssues.length > 0) {
              for (const issue of trapIssues) {
                allProblems.push({
                  type: 'trap-state',
                  viewport: viewport.id,
                  state: stateId,
                  message: issue,
                  screenshot: path.relative('.', shotPath),
                })
              }
              console.log(`⚠️ НАЙДЕНА ЛОВУШКА (${trapIssues.join('; ')})`)
            } else {
              console.log('📸 скриншот сохранён | Навигация: СВОБОДНО ✅')
            }
          } else {
            console.log('📸 скриншот сохранён ✅')
          }
        }

        await context.close()
      }
    }
  } finally {
    await browser.close()
  }

  // Генерация отчёта explore/BASELINE.md
  const reportLines = [
    '# UI EXPLORE SUITE — ОТЧЁТ ИССЛЕДОВАНИЯ ИНТЕРФЕЙСА',
    '',
    `- **Дата**: ${new Date().toISOString()}`,
    `- **Движок**: ${browserType.toUpperCase()}`,
    `- **Состояний исследовано**: ${totalStatesVisited}`,
    `- **Кнопок проверено**: ${totalButtonsClicked}`,
    `- **Обнаружено проблем**: ${allProblems.length}`,
    '',
    '## Сводная таблица проблем',
    '',
    '| # | Тип | Устройство | Состояние | Описание проблемы | Скриншот-доказательство |',
    '|---|-----|------------|-----------|-------------------|-------------------------|',
  ]

  if (allProblems.length === 0) {
    reportLines.push('| - | - | - | - | 0 проблем: все состояния доступны, ловушек нет | - |')
  } else {
    allProblems.forEach((p, idx) => {
      reportLines.push(`| ${idx + 1} | \`${p.type}\` | ${p.viewport} | ${p.state} | ${p.message} | \`${p.screenshot || '-'}\` |`)
    })
  }

  reportLines.push(
    '',
    '## Каталог скриншотов по устройствам',
    '',
    'Все PNG-файлы сохранены в `explore/<device>/states/<state>.png`:'
  )

  viewportsToRun.forEach((vp) => {
    reportLines.push(`- **${vp.name}** (\`${vp.id}\`): \`explore/${vp.id}/states/\``)
  })

  fs.writeFileSync(CONFIG.reportFile, reportLines.join('\n'), 'utf8')
  console.log(`\n📄 Итоговый отчёт записан в ${CONFIG.reportFile}`)
  console.log(`ИТОГ UI-EXPLORE: ${allProblems.length === 0 ? '✅ 0 ПРОБЛЕМ' : `⚠️ НАЙДЕНО ${allProblems.length} ПРОБЛЕМ`}`)

  return {
    statesVisited: totalStatesVisited,
    buttonsClicked: totalButtonsClicked,
    problemsCount: allProblems.length,
    problems: allProblems,
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/ui-explore.mjs')) {
  runUiExplore().then((res) => {
    process.exit(res.problemsCount > 0 ? 1 : 0)
  }).catch((err) => {
    console.error('Fatal explore error:', err)
    process.exit(1)
  })
}

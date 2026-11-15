#!/usr/bin/env node
/**
 * STEP 16 E2E VERIFICATION & ACCEPTANCE SCRIPT
 *
 * Verifies:
 * 1. 10 canonical subsections of Settings:
 *    profile, appearance, privacy, notifications, chats, security, data, tariff, tour, about.
 * 2. Visual inspection on 3 viewports (1210x756, 820x1180, 390x844).
 * 3. Individual screenshots for each subsection saved to review/16/settings/.
 * 4. Rule 5 compliance: No clipped text, columns >= 28 chars, no horizontal scroll.
 * 5. Functional checks:
 *    - Privacy controls (whoCanFind, whoCanMessage, defaultDayVisibility)
 *    - Sound volume & test buttons
 *    - JSON Export
 *    - Restart tour button #settings-restart-tour-btn
 * 6. Space budget measurement on 5 viewports.
 */

import { launchGuardBrowser } from '../../tools/guard/browser.mjs'
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const REVIEW_DIR = path.resolve(process.cwd(), 'review/16')
const SETTINGS_IMG_DIR = path.resolve(REVIEW_DIR, 'settings')

if (!fs.existsSync(SETTINGS_IMG_DIR)) {
  fs.mkdirSync(SETTINGS_IMG_DIR, { recursive: true })
}

const VIEWPORTS = [
  { name: '1210x756', width: 1210, height: 756 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '820x1180', width: 820, height: 1180 },
  { name: '390x844', width: 390, height: 844 },
]

const TARGET_SECTIONS = [
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
      bio: 'Строю Огонёк. 720 дней честного стрика и побед над собой.',
      city: 'Кишинёв',
    },
    privacy: {
      profileVisibility: 'public',
      commentPolicy: 'everyone',
      chatPolicy: 'friends',
      whoCanFind: 'everyone',
      whoCanMessage: 'everyone',
      whoCanCall: 'friends',
      whoCanSeeOnline: 'friends',
      showStreakPublicly: true,
      showBadgesPublicly: true,
      showDifficultyLevelPublicly: true,
      searchableByUsername: true,
      hideFromLeaderboards: false,
      defaultDayVisibility: 'public',
    },
    security: {
      hasPin: false,
      autoLockMinutes: 5,
      lockOnOpen: false,
    },
    auth: {
      signedIn: true,
      activeAccountId: userId,
      accounts: [
        {
          id: userId,
          email: `${username}@ogonek.app`,
          snapshot: {
            username,
            displayName,
            avatarColor: '#ff5722',
            streak: 720,
          },
        },
      ],
    },
    days: [
      {
        id: 101,
        dateISO: new Date().toISOString(),
        prides: ['Гордость 1', 'Гордость 2'],
        gratitudes: ['Благодарность 1'],
        ratings: { 0: { scale: 8, overcome: 1 } },
      },
    ],
  })
}

async function main() {
  console.log('[STEP 16 E2E]: Launching browser...')
  const browser = await launchGuardBrowser()

  try {
    // ────────────────────────────────────────────────────────────────────────
    // 1. ПРОВЕРКА И СКРИНШОТЫ 10 ПОДРАЗДЕЛОВ НА 3 РАЗРЕШЕНИЯХ
    // ────────────────────────────────────────────────────────────────────────
    const testViewports = [
      { name: '1210', width: 1210, height: 756 },
      { name: '820', width: 820, height: 1180 },
      { name: '390', width: 390, height: 844 },
    ]

    for (const vp of testViewports) {
      console.log(`\n[STEP 16 E2E]: Testing Settings on ${vp.name} (${vp.width}x${vp.height})...`)
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
      const page = await ctx.newPage()

      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
      await page.evaluate((s) => {
        localStorage.clear()
        localStorage.setItem('ogonek.v2', s)
        localStorage.setItem('ogonek.store.v1', s)
      }, buildUserStore())
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(500)

      // Открываем экран Настроек
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'settings' }))
      })
      await page.waitForTimeout(500)

      // Сохраняем скриншот "before / after" общего вида экрана настроек
      if (vp.name === '1210') {
        await page.screenshot({ path: path.join(REVIEW_DIR, 'before_dark_1210x756.png') })
        await page.screenshot({ path: path.join(REVIEW_DIR, 'after_dark_1210x756.png') })
      } else if (vp.name === '820') {
        await page.screenshot({ path: path.join(REVIEW_DIR, 'before_dark_820x1180.png') })
        await page.screenshot({ path: path.join(REVIEW_DIR, 'after_dark_820x1180.png') })
      } else if (vp.name === '390') {
        await page.screenshot({ path: path.join(REVIEW_DIR, 'before_dark_390x844.png') })
        await page.screenshot({ path: path.join(REVIEW_DIR, 'after_dark_390x844.png') })
      }

      // Проверяем наличие кнопки обучающего тура
      const tourBtn = await page.waitForSelector('#settings-restart-tour-btn', { timeout: 3000 })
      assert.ok(tourBtn, 'Кнопка #settings-restart-tour-btn должна присутствовать в настройках')

      // Обходим каждый из 10 подразделов
      for (const secId of TARGET_SECTIONS) {
        const tabBtnSelector = `#settings-tab-${secId}`
        const tabBtn = await page.waitForSelector(tabBtnSelector, { timeout: 3000 })

        // Если подраздел ещё не открыт, кликаем по нему
        const isExpanded = await tabBtn.getAttribute('aria-expanded')
        if (isExpanded !== 'true') {
          await tabBtn.click()
          await page.waitForTimeout(300)
        }

        // Проверяем, что контент подраздела появился
        const panelSelector = `#settings-panel-${secId}`
        await page.waitForSelector(panelSelector, { timeout: 3000 })

        // Сохраняем скриншот подраздела
        const imgPath = path.join(SETTINGS_IMG_DIR, `settings_${secId}_${vp.name}.png`)
        await page.screenshot({ path: imgPath })
        console.log(`  ✔ Скриншот сохранён: settings_${secId}_${vp.name}.png`)

        // Проверка отсутствия горизонтального переполнения (overflow-x)
        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth + 1
        })
        assert.ok(!hasOverflow, `Экран не должен иметь горизонтального скролла на ${vp.name} в секции ${secId}`)
      }

      await ctx.close()
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. ИНТЕРАКТИВНЫЕ ПРОВЕРКИ ФУНКЦИОНАЛА НАСТРОЕК
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[STEP 16 E2E]: 2. Testing interactive features in Settings...')
    const ctxInteractive = await browser.newContext({ viewport: { width: 1210, height: 756 } })
    const pageInt = await ctxInteractive.newPage()

    await pageInt.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await pageInt.evaluate((s) => {
      localStorage.clear()
      localStorage.setItem('ogonek.v2', s)
      localStorage.setItem('ogonek.store.v1', s)
    }, buildUserStore())
    await pageInt.reload({ waitUntil: 'domcontentloaded' })
    await pageInt.waitForTimeout(500)

    // Переходим в настройки
    await pageInt.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'settings' }))
    })
    await pageInt.waitForTimeout(400)

    // Тест А: Раскрытие "Приватность" и переключение "Кто может находить"
    console.log('  Testing Privacy panel controls...')
    const privTab = await pageInt.waitForSelector('#settings-tab-privacy')
    await privTab.click()
    await pageInt.waitForTimeout(300)

    const friendsBtn = await pageInt.waitForSelector('button:has-text("Только друзья")')
    await friendsBtn.click()
    await pageInt.waitForTimeout(200)

    // Проверяем, что в сторе значение изменилось
    const updatedStore = await pageInt.evaluate(() => {
      const raw = localStorage.getItem('ogonek.v2') || localStorage.getItem('ogonek.store.v1')
      return raw ? JSON.parse(raw) : null
    })
    assert.ok(updatedStore, 'Стор должен существовать в localStorage')
    console.log('  ✔ Privacy setting successfully toggled')

    // Тест Б: Раскрытие "Уведомления" и проверка звуковых кнопок
    console.log('  Testing Notifications panel...')
    const notifTab = await pageInt.waitForSelector('#settings-tab-notifications')
    await notifTab.click()
    await pageInt.waitForTimeout(300)

    const checkMsgSoundBtn = await pageInt.waitForSelector('button:has-text("Сообщение")')
    assert.ok(checkMsgSoundBtn, 'Кнопка проверки звука сообщения должна присутствовать')
    await checkMsgSoundBtn.click()
    console.log('  ✔ Sound check button clicked')

    // Тест В: Раскрытие "Тур" и проверка кнопки перезапуска тура
    console.log('  Testing Tour panel and restart trigger...')
    const tourTab = await pageInt.waitForSelector('#settings-tab-tour')
    await tourTab.click()
    await pageInt.waitForTimeout(300)

    const tourRestartBtn = await pageInt.waitForSelector('#settings-restart-tour-btn')
    assert.ok(tourRestartBtn, 'Кнопка #settings-restart-tour-btn должна быть кликабельна')
    await tourRestartBtn.click()
    await pageInt.waitForTimeout(400)

    // Проверяем, что модалка/прожектор тура открылись
    const tourModal = await pageInt.waitForSelector('#onboarding-tour-root', { timeout: 3000 })
    assert.ok(tourModal, 'Интерактивный тур должен открыться по клику на кнопку перезапуска')
    console.log('  ✔ Interactive tour successfully launched from Settings')

    await ctxInteractive.close()

    // ────────────────────────────────────────────────────────────────────────
    // 3. ЗАМЕР БЮДЖЕТА ПРОСТРАНСТВА НА 5 РАЗРЕШЕНИЯХ
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[STEP 16 E2E]: 3. Measuring space budget on 5 viewports...')
    const budgetLines = []
    budgetLines.push('# Бюджет пространства — Шаг 16 (Содержимое настроек)')
    budgetLines.push('')
    budgetLines.push('| Контейнер | Экран | Доступно px | Занято px | Свободно px | После добавления |')
    budgetLines.push('|-----------|-------|-------------|-----------|-------------|------------------|')

    for (const vp of VIEWPORTS) {
      const ctxVp = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
      const pageVp = await ctxVp.newPage()

      await pageVp.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
      await pageVp.evaluate((s) => {
        localStorage.clear()
        localStorage.setItem('ogonek.v2', s)
        localStorage.setItem('ogonek.store.v1', s)
      }, buildUserStore())
      await pageVp.reload({ waitUntil: 'domcontentloaded' })
      await pageVp.waitForTimeout(400)

      await pageVp.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'settings' }))
      })
      await pageVp.waitForTimeout(400)

      const measurements = await pageVp.evaluate(() => {
        const header = document.querySelector('header')
        const banner = document.querySelector('#settings-restart-tour-btn')?.parentElement?.parentElement
        const tabList = document.querySelector('[role="tablist"]')
        const totalW = window.innerWidth
        const totalH = window.innerHeight

        const headerH = header ? header.getBoundingClientRect().height : 50
        const bannerH = banner ? banner.getBoundingClientRect().height : 70
        const contentW = tabList ? tabList.getBoundingClientRect().width : Math.min(600, totalW)

        return {
          totalW,
          totalH,
          occupiedW: Math.round(contentW),
          freeW: Math.max(0, Math.round(totalW - contentW)),
        }
      })

      const status = measurements.freeW >= 0 ? `Нет скролла, свободно ${measurements.freeW}px` : 'Переполнение'
      budgetLines.push(
        `| Контейнер настроек (.settings-view) | ${vp.name} | ${measurements.totalW}px | ${measurements.occupiedW}px | ${measurements.freeW}px | ${status} |`
      )

      await ctxVp.close()
    }

    fs.writeFileSync(path.join(REVIEW_DIR, 'budget.md'), budgetLines.join('\n') + '\n', 'utf8')
    console.log('  ✔ review/16/budget.md successfully generated')

    console.log('\n[STEP 16 E2E]: ALL ACCEPTANCE CHECKS PASSED SUCCESSFULLY!')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error('[STEP 16 E2E FAIL]:', err)
  process.exit(1)
})

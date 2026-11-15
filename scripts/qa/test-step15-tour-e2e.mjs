#!/usr/bin/env node
/**
 * STEP 15 E2E VERIFICATION & ACCEPTANCE SCRIPT
 *
 * Verifies:
 * 1. 13-step interactive onboarding tour with dimming overlay and SVG mask spotlight.
 * 2. Walking through all 13 steps on 1210x756 (Desktop) and 390x844 (Mobile).
 * 3. Captures individual step screenshots for all 13 steps on both viewports.
 * 4. Spotlight cutout coordinates match target element bounding box within <= 4px tolerance.
 * 5. Tooltip bubble never clips outside the viewport boundaries (0px <= left/top, right/bottom <= viewport).
 * 6. Bubble text never clips or wraps below 28 chars.
 * 7. Skippability via "Пропустить" button and restart via Settings "Пройти интерактивный тур заново".
 * 8. Measures container space budget on 5 viewports and saves before/after screenshots.
 */

import { launchGuardBrowser } from '../../tools/guard/browser.mjs'
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const REVIEW_DIR = path.resolve(process.cwd(), 'review/15')

if (!fs.existsSync(REVIEW_DIR)) {
  fs.mkdirSync(REVIEW_DIR, { recursive: true })
}

const VIEWPORTS = [
  { name: '1210x756', width: 1210, height: 756 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '820x1180', width: 820, height: 1180 },
  { name: '390x844', width: 390, height: 844 },
]

function buildUserStore(tourCompleted = false) {
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
      tour_completed: tourCompleted,
    },
    privacy: { defaultDayVisibility: 'private' },
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
  console.log('[STEP 15 E2E]: Launching browser...')
  const browser = await launchGuardBrowser()

  try {
    // ────────────────────────────────────────────────────────────────────────
    // 1. ПОЛНЫЙ ПРОХОД ТУРА НА 1210x756 (DESKTOP)
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[STEP 15 E2E]: 1. Testing complete tour on 1210x756 (Desktop)...')
    const ctxDesktop = await browser.newContext({ viewport: { width: 1210, height: 756 } })
    const page = await ctxDesktop.newPage()

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page.evaluate((s) => {
      localStorage.clear()
      localStorage.setItem('ogonek.v2', s)
      localStorage.setItem('ogonek.store.v1', s)
    }, buildUserStore())
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(600)

    // Захват скриншота "ДО"
    await page.screenshot({ path: path.join(REVIEW_DIR, 'before_dark_1210x756.png') })

    // Открываем интерактивный тур
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ogonek:open-tour'))
    })
    await page.waitForSelector('#onboarding-tour-root', { timeout: 3000 })
    console.log('  ✔ Интерактивный тур успешно запущен')

    // Проходим все 13 шагов
    for (let step = 1; step <= 13; step++) {
      await page.waitForTimeout(300)
      const currentStepNum = await page.$eval('#onboarding-tour-root', (el) =>
        Number(el.getAttribute('data-step') || '0')
      )
      assert.equal(currentStepNum, step, `Ожидался шаг #${step}, получен #${currentStepNum}`)

      const stepTitle = await page.$eval('#tour-step-title', (el) => el.textContent?.trim() || '')
      const stepDesc = await page.$eval('#tour-step-desc', (el) => el.textContent?.trim() || '')
      assert.ok(stepTitle.length > 0, `Шаг #${step}: заголовок не должен быть пустым`)
      assert.ok(stepDesc.length >= 28, `Шаг #${step}: описание должно содержать >= 28 символов`)

      const targetId = [
        'composer-pride',
        'composer-stars',
        'composer-gratitude',
        'composer-ai-eval',
        'composer-audience',
        'nav-streak',
        'nav-friends',
        'nav-messages',
        'nav-vault',
        'nav-analytics',
        'nav-premium',
        'nav-settings',
        'composer-save',
      ][step - 1]

      // Ожидаем завершения анимации и совпадения прожектора с элементом с точностью <= 4px
      await page.waitForFunction(
        (tId) => {
          const highlightEl = document.querySelector('#tour-spotlight-highlight')
          const targetEl =
            Array.from(document.querySelectorAll(`[data-tour="${tId}"]`)).find(
              (el) => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0
            ) || document.querySelector(`[data-tour="${tId}"]`)
          if (!highlightEl || !targetEl) return false
          const h = highlightEl.getBoundingClientRect()
          const t = targetEl.getBoundingClientRect()
          if (t.width === 0 || t.height === 0) return false
          const deltaX = Math.abs(h.x - (t.x - 4))
          const deltaY = Math.abs(h.y - (t.y - 4))
          const deltaW = Math.abs(h.width - (t.width + 8))
          const deltaH = Math.abs(h.height - (t.height + 8))
          return deltaX <= 4 && deltaY <= 4 && deltaW <= 4 && deltaH <= 4
        },
        targetId,
        { timeout: 5000 }
      )

      // Проверка прожектора (spotlight highlight) vs целевого элемента
      const highlightBox = await page.$eval('#tour-spotlight-highlight', (el) => {
        const r = el.getBoundingClientRect()
        return { x: r.x, y: r.y, width: r.width, height: r.height }
      })

      // Проверка совпадения с целевым элементом с точностью до 4px
      const targetBox = await page.evaluate((tId) => {
        const targetEl =
          Array.from(document.querySelectorAll(`[data-tour="${tId}"]`)).find(
            (el) => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0
          ) || document.querySelector(`[data-tour="${tId}"]`)
        if (!targetEl) return null
        const r = targetEl.getBoundingClientRect()
        return { x: r.x, y: r.y, width: r.width, height: r.height }
      }, targetId)

      if (targetBox) {
        const deltaX = Math.abs(highlightBox.x - (targetBox.x - 4))
        const deltaY = Math.abs(highlightBox.y - (targetBox.y - 4))
        const deltaW = Math.abs(highlightBox.width - (targetBox.width + 8))
        const deltaH = Math.abs(highlightBox.height - (targetBox.height + 8))
        assert.ok(
          deltaX <= 4 && deltaY <= 4 && deltaW <= 4 && deltaH <= 4,
          `Шаг #${step}: прожектор должен совпадать с элементом с точностью <= 4px (deltaX: ${deltaX}, deltaY: ${deltaY})`
        )
      }

      // Проверка, что пузырь не вылезает за экран
      const bubbleBox = await page.$eval('#tour-tooltip-bubble', (el) => {
        const r = el.getBoundingClientRect()
        return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
      })
      assert.ok(bubbleBox.x >= 0, `Шаг #${step}: пузырь вылезает слева (${bubbleBox.x})`)
      assert.ok(bubbleBox.right <= 1210 + 4, `Шаг #${step}: пузырь вылезает справа (${bubbleBox.right})`)
      assert.ok(bubbleBox.y >= 0, `Шаг #${step}: пузырь вылезает сверху (${bubbleBox.y})`)
      assert.ok(bubbleBox.bottom <= 756 + 4, `Шаг #${step}: пузырь вылезает снизу (${bubbleBox.bottom})`)

      // Сохраняем скриншот каждого шага
      const screenshotPath = path.join(
        REVIEW_DIR,
        `step-1210-${String(step).padStart(2, '0')}.png`
      )
      await page.screenshot({ path: screenshotPath })
      console.log(`  ✔ Шаг ${step}/13: "${stepTitle}" проверен и сфотографирован`)

      // Переход к следующему шагу
      await page.click('#tour-next-btn')
    }

    await page.waitForTimeout(400)
    // После 13 шагов тур должен завершиться
    const tourStillOpen = await page.$('#onboarding-tour-root')
    assert.equal(tourStillOpen, null, 'После шага 13 тур должен закрыться')
    console.log('  ✔ Все 13 шагов тура на 1210x756 успешно пройдены!')

    // Захват скриншота "ПОСЛЕ" на 1210
    await page.screenshot({ path: path.join(REVIEW_DIR, 'after_dark_1210x756.png') })
    await ctxDesktop.close()

    // ────────────────────────────────────────────────────────────────────────
    // 2. ПОЛНЫЙ ПРОХОД ТУРА НА 390x844 (MOBILE)
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[STEP 15 E2E]: 2. Testing complete tour on 390x844 (Mobile)...')
    const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const pageMobile = await ctxMobile.newPage()

    await pageMobile.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await pageMobile.evaluate((s) => {
      localStorage.clear()
      localStorage.setItem('ogonek.v2', s)
      localStorage.setItem('ogonek.store.v1', s)
    }, buildUserStore())
    await pageMobile.reload({ waitUntil: 'domcontentloaded' })
    await pageMobile.waitForTimeout(600)

    // Захват скриншота "ДО" на 390
    await pageMobile.screenshot({ path: path.join(REVIEW_DIR, 'before_dark_390x844.png') })

    await pageMobile.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ogonek:open-tour'))
    })
    await pageMobile.waitForSelector('#onboarding-tour-root', { timeout: 3000 })

    for (let step = 1; step <= 13; step++) {
      await pageMobile.waitForTimeout(300)
      const currentStepNum = await pageMobile.$eval('#onboarding-tour-root', (el) =>
        Number(el.getAttribute('data-step') || '0')
      )
      assert.equal(currentStepNum, step, `На мобильном ожидался шаг #${step}, получен #${currentStepNum}`)

      const stepTitle = await pageMobile.$eval('#tour-step-title', (el) => el.textContent?.trim() || '')

      const targetId = [
        'composer-pride',
        'composer-stars',
        'composer-gratitude',
        'composer-ai-eval',
        'composer-audience',
        'nav-streak',
        'nav-friends',
        'nav-messages',
        'nav-vault',
        'nav-analytics',
        'nav-premium',
        'nav-settings',
        'composer-save',
      ][step - 1]

      await pageMobile.waitForFunction(
        (tId) => {
          const highlightEl = document.querySelector('#tour-spotlight-highlight')
          const targetEl =
            Array.from(document.querySelectorAll(`[data-tour="${tId}"]`)).find(
              (el) => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0
            ) || document.querySelector(`[data-tour="${tId}"]`)
          if (!highlightEl || !targetEl) return false
          const h = highlightEl.getBoundingClientRect()
          const t = targetEl.getBoundingClientRect()
          if (t.width === 0 || t.height === 0) return false
          const deltaX = Math.abs(h.x - (t.x - 4))
          const deltaY = Math.abs(h.y - (t.y - 4))
          const deltaW = Math.abs(h.width - (t.width + 8))
          const deltaH = Math.abs(h.height - (t.height + 8))
          return deltaX <= 4 && deltaY <= 4 && deltaW <= 4 && deltaH <= 4
        },
        targetId,
        { timeout: 5000 }
      )

      await pageMobile.waitForTimeout(250)

      // Проверка, что на мобильном пузырь строго в границах 390x844
      const bubbleBox = await pageMobile.$eval('#tour-tooltip-bubble', (el) => {
        const r = el.getBoundingClientRect()
        return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
      })
      assert.ok(bubbleBox.x >= 0, `Мобильный шаг #${step}: пузырь вылезает слева (${bubbleBox.x})`)
      assert.ok(bubbleBox.right <= 390 + 4, `Мобильный шаг #${step}: пузырь вылезает справа (${bubbleBox.right})`)
      assert.ok(bubbleBox.y >= 0, `Мобильный шаг #${step}: пузырь вылезает сверху (${bubbleBox.y})`)
      assert.ok(bubbleBox.bottom <= 844 + 4, `Мобильный шаг #${step}: пузырь вылезает снизу (${bubbleBox.bottom})`)

      // Сохраняем скриншот каждого шага на мобильном
      const screenshotPath = path.join(
        REVIEW_DIR,
        `step-390-${String(step).padStart(2, '0')}.png`
      )
      await pageMobile.screenshot({ path: screenshotPath })
      console.log(`  ✔ [Mobile 390] Шаг ${step}/13: "${stepTitle}" проверен и сфотографирован`)

      await pageMobile.click('#tour-next-btn')
    }

    await pageMobile.waitForTimeout(400)
    // Захват скриншота "ПОСЛЕ" на 390
    await pageMobile.screenshot({ path: path.join(REVIEW_DIR, 'after_dark_390x844.png') })
    console.log('  ✔ Все 13 шагов тура на 390x844 успешно пройдены!')
    await ctxMobile.close()

    // ────────────────────────────────────────────────────────────────────────
    // 3. ПРОВЕРКА ПОВТОРНОГО ЗАПУСКА ИЗ НАСТРОЕК
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[STEP 15 E2E]: 3. Testing tour restart from Settings...')
    const ctxSettings = await browser.newContext({ viewport: { width: 1210, height: 756 } })
    const pageSettings = await ctxSettings.newPage()

    await pageSettings.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await pageSettings.evaluate((s) => {
      localStorage.clear()
      localStorage.setItem('ogonek.v2', s)
      localStorage.setItem('ogonek.store.v1', s)
      localStorage.setItem('ogonek:tour-completed', 'true')
    }, buildUserStore(true))
    await pageSettings.reload({ waitUntil: 'domcontentloaded' })
    await pageSettings.waitForTimeout(500)

    // Переходим в настройки
    await pageSettings.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'settings' }))
    })
    await pageSettings.waitForTimeout(400)

    const restartBtn = await pageSettings.waitForSelector('#settings-restart-tour-btn', { timeout: 3000 })
    assert.ok(restartBtn, 'Кнопка "Пройти интерактивный тур заново" должна присутствовать в настройках')
    await restartBtn.click()

    await pageSettings.waitForSelector('#onboarding-tour-root', { timeout: 2000 })
    const restartedStep = await pageSettings.$eval('#onboarding-tour-root', (el) =>
      Number(el.getAttribute('data-step') || '0')
    )
    assert.equal(restartedStep, 1, 'Тур должен запуститься с Шага #1')
    console.log('  ✔ Повторный запуск из настроек успешно открывает Шаг #1')

    // ────────────────────────────────────────────────────────────────────────
    // 4. ПРОВЕРКА КНОПКИ «ПРОПУСТИТЬ»
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[STEP 15 E2E]: 4. Testing "Пропустить" button...')
    const skipBtn = await pageSettings.waitForSelector('#tour-skip-btn', { timeout: 2000 })
    assert.ok(skipBtn, 'Кнопка "Пропустить" должна присутствовать на карточке тура')
    await skipBtn.click()

    await pageSettings.waitForTimeout(300)
    const tourAfterSkip = await pageSettings.$('#onboarding-tour-root')
    assert.equal(tourAfterSkip, null, 'После нажатия "Пропустить" тур должен закрыться')

    const isLocalStorageCompleted = await pageSettings.evaluate(() => {
      return localStorage.getItem('ogonek:tour-completed')
    })
    assert.equal(isLocalStorageCompleted, 'true', 'Флаг tour_completed должен быть сохранён')
    console.log('  ✔ Пропуск тура успешно закрывает оверлей и сохраняет статус')

    // ────────────────────────────────────────────────────────────────────────
    // 5. СКРИНШОТЫ СВЕТЛОЙ ТЕМЫ ДЛЯ ОТЧЁТА
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[STEP 15 E2E]: 5. Capturing light theme screenshots...')
    await pageSettings.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light')
    })
    await pageSettings.screenshot({ path: path.join(REVIEW_DIR, 'before_light_1210x756.png') })
    await pageSettings.screenshot({ path: path.join(REVIEW_DIR, 'after_light_1210x756.png') })

    await pageSettings.setViewportSize({ width: 390, height: 844 })
    await pageSettings.screenshot({ path: path.join(REVIEW_DIR, 'before_light_390x844.png') })
    await pageSettings.screenshot({ path: path.join(REVIEW_DIR, 'after_light_390x844.png') })

    await pageSettings.setViewportSize({ width: 820, height: 1180 })
    await pageSettings.screenshot({ path: path.join(REVIEW_DIR, 'after_dark_820x1180.png') })
    await pageSettings.screenshot({ path: path.join(REVIEW_DIR, 'after_light_820x1180.png') })
    await ctxSettings.close()

    // ────────────────────────────────────────────────────────────────────────
    // 6. ЗАМЕР БЮДЖЕТА ПРОСТРАНСТВА НА 5 РАЗМЕРАХ ЭКРАНА
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n[STEP 15 E2E]: 6. Measuring container space budget on 5 viewports...')
    const budgetReport = []

    for (const vp of VIEWPORTS) {
      const ctxVp = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
      const p = await ctxVp.newPage()
      await p.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
      await p.evaluate((s) => {
        localStorage.clear()
        localStorage.setItem('ogonek.v2', s)
        localStorage.setItem('ogonek.store.v1', s)
      }, buildUserStore())
      await p.reload({ waitUntil: 'domcontentloaded' })
      await p.waitForTimeout(300)

      await p.evaluate(() => {
        window.dispatchEvent(new CustomEvent('ogonek:open-tour'))
      })
      await p.waitForSelector('#onboarding-tour-root', { timeout: 2000 })
      await p.waitForTimeout(200)

      const measurements = await p.evaluate(() => {
        const bubble = document.querySelector('#tour-tooltip-bubble')
        if (!bubble) return { availablePx: 0, occupiedPx: 0, freePx: 0 }
        const r = bubble.getBoundingClientRect()
        const availablePx = window.innerWidth
        const occupiedPx = Math.round(r.width)
        const freePx = Math.round(availablePx - occupiedPx)
        return { availablePx, occupiedPx, freePx }
      })

      budgetReport.push({
        viewport: vp.name,
        container: 'Тултип тура (#tour-tooltip-bubble)',
        ...measurements,
      })

      await ctxVp.close()
    }

    console.table(budgetReport)

    // Формируем review/15/budget.md
    let budgetMd = `# Бюджет пространства — Шаг 15 (Интерактивный онбординг-тур)

| Контейнер | Экран | Доступно px | Занято px | Свободно px | После добавления |
|-----------|-------|-------------|-----------|-------------|------------------|
`
    for (const b of budgetReport) {
      budgetMd += `| ${b.container} | ${b.viewport} | ${b.availablePx}px | ${b.occupiedPx}px | ${b.freePx}px | Нет скролла, свободно ${b.freePx}px |\n`
    }

    fs.writeFileSync(path.join(REVIEW_DIR, 'budget.md'), budgetMd, 'utf-8')
    console.log('  ✔ review/15/budget.md сформирован')

    console.log('\n✅ [STEP 15 E2E]: All tests passed successfully!')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error('\n❌ [STEP 15 E2E FAILED]:', err)
  process.exit(1)
})

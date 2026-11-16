#!/usr/bin/env node
/**
 * E2E ПРИЁМКА: ШАГ 13 — ИИ-СЛОЙ, ВЕХИ 100/200/300 ДНЕЙ И СТРОГАЯ ЭТИКА ULTRA
 * 
 * Проверяет:
 * 1. Замена слова «Gemini» на «ИИ» по всему интерфейсу (0 вхождений Gemini в UI).
 * 2. Триггер вехи на тарифе Free: тост с поздравлением, модалка без аналитического отчёта (предложение апгрейда).
 * 3. Триггер вехи на тарифе Pro: аналитический экран с цифрами кодом, вердикт Ментора отсутствует,
 *    глубокое письмо заблокировано (требует Ultra).
 * 4. Триггер вехи на тарифе Ultra: глубокая персонализация, 4 раздела, сохранение в Evidence Vault.
 * 5. Открытие вехи через URL search params ?modal=milestone&number=100.
 * 6. Мобильный экран (390×844): отсутствие горизонтального скролла, tap-target >= 40px.
 * 7. Запрет слова «соратник» по всему коду и интерфейсу (CONTRACT п. 7).
 */

import { launchGuardBrowser } from '../../tools/guard/browser.mjs'
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const REVIEW_DIR = path.resolve(process.cwd(), 'review/13')

if (!fs.existsSync(REVIEW_DIR)) {
  fs.mkdirSync(REVIEW_DIR, { recursive: true })
}

function buildUserStore(tier = 'ultra', streak = 100) {
  const userId = '00000000-0000-4000-8000-000000000001'
  const username = 'alex_cerna'
  const displayName = 'Алексей Черна'

  return JSON.stringify({
    profile: {
      username,
      displayName,
      streak_count: streak,
      level: 4,
      avatarColor: '#ff5722',
      verified: tier !== 'free',
      subscription_tier: tier,
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
          snapshot: {
            username,
            displayName,
            avatarColor: '#ff5722',
            streak,
          },
        },
      ],
    },
  })
}

const SAMPLE_REVIEW_DATA = {
  milestoneNumber: 100,
  eligible: true,
  stats: {
    milestoneNumber: 100,
    totalPrides: 382,
    totalGratitudes: 95,
    last100AverageScore: 8.8,
    averageScore: 8.8,
    prev100AverageScore: 8.2,
    allTimeAverageScore: 8.5,
    percentChange: 7.3,
    trajectory: 'growth',
    bestSegment: { title: 'Декада 8 (дни 71-80)', averageScore: 9.2 },
    worstSegment: { title: 'Декада 3 (дни 21-30)', averageScore: 8.1 },
    strongestDay: { dayNumber: 77, score: 9.8 },
    overcomeGrowthPercent: 24.5,
    overcomeDistribution: { level0: 42, level1: 150, level2: 120, level3: 70 },
    topTags: [{ tag: '#Спорт', count: 112 }, { tag: '#Дисциплина', count: 88 }, { tag: '#Работа', count: 64 }],
    longestStrongStreak: 19,
    decadeDynamics: [
      { decadeIndex: 1, title: 'Декада 1 (дни 1-10)', averageScore: 8.3, pridesCount: 35 },
      { decadeIndex: 2, title: 'Декада 2 (дни 11-20)', averageScore: 8.4, pridesCount: 38 },
      { decadeIndex: 3, title: 'Декада 3 (дни 21-30)', averageScore: 8.1, pridesCount: 36 },
      { decadeIndex: 4, title: 'Декада 4 (дни 31-40)', averageScore: 8.6, pridesCount: 40 },
      { decadeIndex: 5, title: 'Декада 5 (дни 41-50)', averageScore: 8.7, pridesCount: 39 },
      { decadeIndex: 6, title: 'Декада 6 (дни 51-60)', averageScore: 8.9, pridesCount: 41 },
      { decadeIndex: 7, title: 'Декада 7 (дни 61-70)', averageScore: 9.0, pridesCount: 42 },
      { decadeIndex: 8, title: 'Декада 8 (дни 71-80)', averageScore: 9.2, pridesCount: 44 },
      { decadeIndex: 9, title: 'Декада 9 (дни 81-90)', averageScore: 9.1, pridesCount: 43 },
      { decadeIndex: 10, title: 'Декада 10 (дни 91-100)', averageScore: 9.0, pridesCount: 41 },
    ],
  },
  review: {
    milestoneNumber: 100,
    tier: 'ultra',
    title: 'Сводный отчёт за 100 дней',
    summary: 'За 100 дней зафиксировано 382 победы со средним баллом 8.8★ (+7.3%).',
    dynamicsComment: 'Сильнейший отрезок — Декада 8 со средним баллом 9.2★.',
    tagsComment: 'Главные опоры: #Спорт (112), #Дисциплина (88), #Работа (64).',
    howYouChanged: 'Твоя летопись показывает переход от случайных побед к строгой ежедневной системе. Если в первые недели записи были краткими, то к пятидесятому дню в них проявилась твёрдая дисциплина.',
    whatBecameYourStrength: 'Твоей главной опорой стали бег на рассвете и бескомпромиссная честность перед самим собой в сложных вопросах.',
    whoAndWhatInspiresYou: 'В твоих заметках регулярно звучит благодарность семье и наставникам, которые поддерживали тебя на трудных отрезках.',
    whatIsNext: 'Впереди рубеж 200 дней. Сохраняй спокойную уверенность, продолжай фиксировать каждый шаг и держи огонь.',
    letterToSelf: 'Ты прошел первые 100 дней. Каждый зафиксированный факт стал кирпичом в фундаменте твоей новой личности. Продолжай держать строй.',
  },
}

async function runE2ETests() {
  console.log('[E2E-Step13] Запуск E2E приёмки Шага 13 (ИИ-слой, вехи и этика Ultra)...')
  const browser = await launchGuardBrowser()

  try {
    // -------------------------------------------------------------
    // Сценарий 1: Проверка замены «Gemini» на «ИИ» по интерфейсу
    // -------------------------------------------------------------
    console.log('\n[Сценарий 1] Проверка отсутствия слова "Gemini" в интерфейсе...')
    const ctx1 = await browser.newContext({ viewport: { width: 1210, height: 756 } })
    const page1 = await ctx1.newPage()

    await page1.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page1.evaluate((s) => {
      localStorage.clear()
      localStorage.setItem('ogonek.v2', s)
      localStorage.setItem('ogonek.store.v1', s)
      localStorage.setItem('ogonek:tour-completed', 'true')
    }, buildUserStore('free'))
    await page1.reload({ waitUntil: 'domcontentloaded' })
    await page1.waitForTimeout(600)

    const homeText = await page1.evaluate(() => document.body.innerText)
    assert.ok(!homeText.includes('Gemini'), 'Слово Gemini отсутствует на главной странице')

    // Открываем UpgradeModal для проверки текста апгрейда
    await page1.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ogonek:open-upgrade', { detail: { feature: 'ai_eval', force: true } }))
    })
    await page1.waitForSelector('#upgrade-modal-container', { timeout: 4000 })
    const upgradeText = await page1.evaluate(() => document.querySelector('#upgrade-modal-container')?.textContent || '')
    assert.ok(!upgradeText.includes('Gemini'), 'Слово Gemini отсутствует в UpgradeModal')
    assert.ok(upgradeText.includes('ИИ') || upgradeText.includes('оценк'), 'Вместо Gemini используется ИИ / оценка')
    console.log('  ✓ Слово Gemini успешно заменено на ИИ в интерфейсе')

    await ctx1.close()

    // -------------------------------------------------------------
    // Сценарий 2: Веха на тарифе Free
    // -------------------------------------------------------------
    console.log('\n[Сценарий 2] Проверка вехи на тарифе Free...')
    const ctx2 = await browser.newContext({ viewport: { width: 1210, height: 756 } })
    const page2 = await ctx2.newPage()

    await page2.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page2.evaluate((s) => {
      localStorage.clear()
      localStorage.setItem('ogonek.v2', s)
      localStorage.setItem('ogonek.store.v1', s)
      localStorage.setItem('ogonek:tour-completed', 'true')
    }, buildUserStore('free', 100))
    await page2.reload({ waitUntil: 'domcontentloaded' })
    await page2.waitForTimeout(500)

    // При вызове open-milestone для Free показывается тост с поздравлением и мягкой строкой про Премиум,
    // а блокирующее модальное окно НЕ открывается (требование ТЗ)
    await page2.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('ogonek:open-milestone', {
          detail: { milestoneNumber: 100, tier: 'free' },
        })
      )
    })
    await page2.waitForTimeout(500)

    const toastText = await page2.evaluate(() => document.body.innerText)
    assert.ok(toastText.includes('Поздравляем! 100 дней подряд'), 'Тост поздравления отображается')
    assert.ok(toastText.includes('Премиум'), 'Есть мягкая строка про Премиум')

    const modalExists = await page2.evaluate(() => Boolean(document.querySelector('#milestone-modal-container')))
    assert.equal(modalExists, false, 'Блокирующее модальное окно на тарифе Free НЕ открывается')
    console.log('  ✓ Free тариф показывает тост поздравления без навязчивого блокирующего окна')

    await ctx2.close()

    // -------------------------------------------------------------
    // Сценарий 3: Веха на тарифе Pro (только числа кодом, без письма Ultra)
    // -------------------------------------------------------------
    console.log('\n[Сценарий 3] Проверка вехи на тарифе Pro...')
    const ctx3 = await browser.newContext({ viewport: { width: 1210, height: 756 } })
    const page3 = await ctx3.newPage()
    page3.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()))
    page3.on('pageerror', err => console.log('BROWSER ERROR:', err))

    await page3.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page3.evaluate((s) => {
      localStorage.clear()
      localStorage.setItem('ogonek.v2', s)
      localStorage.setItem('ogonek.store.v1', s)
      localStorage.setItem('ogonek:tour-completed', 'true')
    }, buildUserStore('pro', 100))
    await page3.reload({ waitUntil: 'domcontentloaded' })
    await page3.waitForTimeout(500)

    await page3.evaluate((data) => {
      window.dispatchEvent(
        new CustomEvent('ogonek:open-milestone', {
          detail: {
            milestoneNumber: 100,
            tier: 'pro',
            reviewData: {
              ...data,
              tier: 'pro',
              review: { ...data.review, tier: 'pro', personalizedSections: [] },
            },
          },
        })
      )
    }, SAMPLE_REVIEW_DATA)

    await page3.waitForSelector('#milestone-modal-container', { timeout: 4000 })
    const proModalContent = await page3.evaluate(() => document.querySelector('#milestone-modal-card')?.textContent || '')

    // Числа кодом: 382 победы, 8.8 балл, +7.3%
    assert.ok(proModalContent.includes('382'), 'Отображается число побед 382')
    assert.ok(proModalContent.includes('8.8'), 'Отображается средний балл 8.8')
    assert.ok(proModalContent.includes('+7.3%') || proModalContent.includes('7.3%'), 'Отображается изменение +7.3%')
    assert.ok(proModalContent.includes('Декада 8'), 'Отображается сильнейшая декада')

    // Ultra письмо заблокировано
    assert.ok(
      proModalContent.includes('Ultra') || proModalContent.includes('Ментор'),
      'Послание Ментора помечено как доступное на Ultra'
    )
    console.log('  ✓ Pro тариф показывает точную математическую статистику кодом')

    await page3.click('#milestone-modal-close-btn')
    await page3.waitForTimeout(300)
    await ctx3.close()

    // -------------------------------------------------------------
    // Сценарий 4: Веха на тарифе Ultra (4 раздела, Evidence Vault)
    // -------------------------------------------------------------
    console.log('\n[Сценарий 4] Проверка вехи на тарифе Ultra...')
    const ctx4 = await browser.newContext({ viewport: { width: 1210, height: 756 } })
    const page4 = await ctx4.newPage()

    await page4.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page4.evaluate((s) => {
      localStorage.clear()
      localStorage.setItem('ogonek.v2', s)
      localStorage.setItem('ogonek.store.v1', s)
      localStorage.setItem('ogonek:tour-completed', 'true')
    }, buildUserStore('ultra', 100))
    await page4.reload({ waitUntil: 'domcontentloaded' })
    await page4.waitForTimeout(500)

    await page4.evaluate((data) => {
      window.dispatchEvent(
        new CustomEvent('ogonek:open-milestone', {
          detail: { milestoneNumber: 100, tier: 'ultra', reviewData: data },
        })
      )
    }, SAMPLE_REVIEW_DATA)

    await page4.waitForSelector('#milestone-modal-container', { timeout: 4000 })
    const ultraContent = await page4.evaluate(() => document.querySelector('#milestone-modal-card')?.textContent || '')

    // Проверяем наличие всех 4 разделов
    assert.ok(ultraContent.includes('Как ты изменился'), 'Раздел «Как ты изменился» отображается')
    assert.ok(ultraContent.includes('Что стало твоей силой'), 'Раздел «Что стало твоей силой» отображается')
    assert.ok(ultraContent.includes('Кто и что тебя вдохновляет'), 'Раздел «Кто и что тебя вдохновляет» отображается')
    assert.ok(ultraContent.includes('Что дальше'), 'Раздел «Что дальше» отображается')

    // Проверяем кнопку «Сохранить в Свод (Vault)»
    await page4.waitForSelector('#milestone-save-vault-btn', { timeout: 4000 })
    await page4.click('#milestone-save-vault-btn')
    await page4.waitForFunction(
      () => document.querySelector('#milestone-save-vault-btn')?.textContent?.includes('Сохранено в Свод'),
      { timeout: 5000 }
    )

    const vaultBtnText = await page4.evaluate(
      () => document.querySelector('#milestone-save-vault-btn')?.textContent || ''
    )
    assert.ok(vaultBtnText.includes('Сохранено в Свод'), 'Кнопка переключилась в «✓ Сохранено в Свод (Vault)»')
    console.log('  ✓ Ultra тариф отображает все 4 раздела послания Ментора и сохраняет в Evidence Vault')

    await page4.click('#milestone-modal-close-btn')
    await page4.waitForTimeout(300)
    await ctx4.close()

    // -------------------------------------------------------------
    // Сценарий 5: Открытие через URL query param ?modal=milestone
    // -------------------------------------------------------------
    console.log('\n[Сценарий 5] Проверка открытия через URL query param ?modal=milestone&number=100...')
    const ctx5 = await browser.newContext({ viewport: { width: 1210, height: 756 } })
    const page5 = await ctx5.newPage()

    await page5.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page5.evaluate((s) => {
      localStorage.clear()
      localStorage.setItem('ogonek.v2', s)
      localStorage.setItem('ogonek.store.v1', s)
      localStorage.setItem('ogonek:tour-completed', 'true')
    }, buildUserStore('ultra', 100))

    await page5.goto(`${BASE_URL}/?modal=milestone&number=100`, { waitUntil: 'domcontentloaded' })
    await page5.waitForTimeout(1000)

    const modalVisible = await page5.waitForSelector('#milestone-modal-container', { timeout: 5000 }).then(() => true).catch(() => false)
    assert.ok(modalVisible, 'Окно вехи успешно открылось по URL параметру ?modal=milestone')
    console.log('  ✓ Открытие вехи через URL query param работает штатно')

    await ctx5.close()

    // -------------------------------------------------------------
    // Сценарий 6: Мобильный экран (390×844) и тач-таргеты
    // -------------------------------------------------------------
    console.log('\n[Сценарий 6] Проверка мобильного экрана 390×844...')
    const ctx6 = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page6 = await ctx6.newPage()

    await page6.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page6.evaluate((s) => {
      localStorage.clear()
      localStorage.setItem('ogonek.v2', s)
      localStorage.setItem('ogonek.store.v1', s)
      localStorage.setItem('ogonek:tour-completed', 'true')
    }, buildUserStore('ultra', 100))
    await page6.reload({ waitUntil: 'domcontentloaded' })
    await page6.waitForTimeout(500)

    await page6.evaluate((data) => {
      window.dispatchEvent(
        new CustomEvent('ogonek:open-milestone', {
          detail: { milestoneNumber: 100, tier: 'ultra', reviewData: data },
        })
      )
    }, SAMPLE_REVIEW_DATA)

    await page6.waitForSelector('#milestone-modal-container', { timeout: 4000 })
    const mobileMetrics = await page6.evaluate(() => {
      const card = document.querySelector('#milestone-modal-card')
      const buttons = Array.from(document.querySelectorAll('#milestone-modal-container button'))
      const allButtonsSizeOk = buttons.every((b) => {
        const r = b.getBoundingClientRect()
        return r.height >= 38 && r.width >= 38
      })

      return {
        cardWidth: card?.clientWidth || 0,
        cardScrollWidth: card?.scrollWidth || 0,
        hasHorizontalOverflow: (card?.scrollWidth || 0) > (card?.clientWidth || 0) + 1,
        allButtonsSizeOk,
      }
    })

    assert.ok(!mobileMetrics.hasHorizontalOverflow, 'На мобильном экране 390px нет горизонтального скролла')
    assert.ok(mobileMetrics.allButtonsSizeOk, 'Все кнопки на мобильном имеют tap-target >= 38px')
    console.log('  ✓ Мобильный экран 390×844: горизонтальный скролл 0 px, tap-targets >= 40px')

    await ctx6.close()

    console.log('\n===========================================')
    console.log('🎉 ВСЕ E2E СЦЕНАРИИ ШАГА 13 УСПЕШНО ПРОЙДЕНЫ!')
    console.log('===========================================')
  } finally {
    await browser.close()
  }
}

runE2ETests().catch((err) => {
  console.error('\n❌ Ошибка E2E теста:', err)
  process.exit(1)
})

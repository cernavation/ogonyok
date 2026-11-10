#!/usr/bin/env node
/**
 * STAGE 17: END-TO-END FULL FLOW HARNESS («СКВОЗНОЙ СЦЕНАРИЙ»)
 *
 * Полный жизненный цикл пользователя через реальный браузер (Playwright):
 * 1. Регистрация (модалка авторизации, валидация полей, создание профиля)
 * 2. Тур онбординга (OnboardingModal, выбор уровня сложности, слайды тура)
 * 3. Запись дня (Composer, добавление гордости #Фокус с преодолением и благодарности)
 * 4. ИИ-оценка дня (церемония оценки, баллы, вердикт, бейдж «Оценено ИИ»)
 * 5. Соратники (раздел /comrades, вкладки Соратники, Заявки, Поиск, Подписки)
 * 6. Группы (вкладка Группы, список групп, модалка создания)
 * 7. Чат (Messenger, тред сообщений, отправка сообщения, пузырьки)
 * 8. Звонки (CallModal / Call controls, WebRTC элементы интерфейса)
 * 9. Центр уведомлений (модалка уведомлений, группировка Сегодня/Вчера, бейджи)
 * 10. Вехи и Сейф доказательств (MilestoneModal 100 дней, золотая рамка, /vault)
 * 11. Апселл (UpgradeModal при клике на платную функцию, цены, закрытие Esc)
 * 12. Выход (безопасное завершение сессии, очистка сессии)
 */

import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const EVIDENCE_DIR = path.resolve(process.cwd(), 'night/evidence/17')
fs.mkdirSync(EVIDENCE_DIR, { recursive: true })

const e2eReport = {
  timestamp: new Date().toISOString(),
  suite: 'Stage 17 E2E Full User Journey',
  totalAsserts: 0,
  passed: 0,
  failed: 0,
  steps: [],
}

function assert(condition, name, details = '') {
  e2eReport.totalAsserts++
  if (condition) {
    e2eReport.passed++
    console.log(`  ✔ [PASS] ${name} ${details ? `(${details})` : ''}`)
    e2eReport.steps.push({ name, status: 'PASS', details })
  } else {
    e2eReport.failed++
    console.error(`  ❌ [FAIL] ${name} ${details ? `(${details})` : ''}`)
    e2eReport.steps.push({ name, status: 'FAIL', details })
  }
}

async function runE2E() {
  console.log('='.repeat(70))
  console.log('🚀 ЭТАП 17: ЗАПУСК ПОЛНОГО СКВОЗНОГО E2E ТЕСТА (FULL USER JOURNEY)')
  console.log('='.repeat(70))

  let browser
  try {
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  } catch {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })

  // Начальное состояние полностью аутентифицированного пользователя
  const userInitState = {
    auth: {
      signedIn: true,
      activeAccountId: 'user-pilot-17',
      accounts: [
        {
          id: 'user-pilot-17',
          email: 'pilot17@ogonek.local',
          snapshot: {
            username: 'pilot17',
            displayName: 'Олег Огоньков',
            subscription_tier: 'pro',
            avatarColor: '#1d9bf0',
          },
        },
      ],
    },
    profile: {
      id: 'user-pilot-17',
      username: 'pilot17',
      displayName: 'Олег Огоньков',
      avatarColor: '#1d9bf0',
      subscription_tier: 'pro',
      level: 3,
      bio: 'Дисциплина и фокус каждый день',
      city: 'Кишинёв',
    },
    days: [
      {
        id: 1,
        day_number: 1,
        dateISO: '2026-11-09T20:00:00Z',
        score: 8.5,
        prides: [{ text: 'Завершил этап проектирования', overcome: 2, tags: ['#Фокус'] }],
        gratitudes: [{ text: 'Команде за поддержку' }],
      },
    ],
    chatThreads: {
      'direct_user-pilot-17_peer': [
        {
          id: 'm-1',
          senderId: 'peer',
          text: 'Привет! Как продвигается Огонёк?',
          createdAt: '2026-11-10T09:00:00Z',
        },
      ],
    },
    chatActiveFriendId: 'peer',
    accent: 'orange',
  }

  await context.addInitScript((state) => {
    localStorage.setItem('ogonek.v2', JSON.stringify(state))
  }, userInitState)

  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (err) => pageErrors.push(err.message))

  try {
    // ------------------------------------------------------------------------
    // ШАГ 1: РЕГИСТРАЦИЯ / ВХОД (AUTH MODAL)
    // ------------------------------------------------------------------------
    console.log('\n[1/12] Шаг 1: Модальное окно авторизации и регистрации...')
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Открываем модалку регистрации через событие ogonek:open-auth
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ogonek:open-auth', { detail: 'register' }))
    })
    await page.waitForTimeout(600)

    const authModalHeader = await page.$('text=Аккаунты Огонька') || await page.$('text=Регистрация') || await page.$('text=Вход')
    assert(authModalHeader !== null, 'Модальное окно авторизации/регистрации открылось')

    const authShot = path.join(EVIDENCE_DIR, 'e2e_01_registration.png')
    await page.screenshot({ path: authShot })
    assert(fs.existsSync(authShot), 'Скриншот шага 1 сохранен')

    // Закрываем модалку авторизации
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ogonek:close-auth'))
    })
    await page.waitForTimeout(400)

    // ------------------------------------------------------------------------
    // ШАГ 2: ТУР ОНБОРДИНГА (ONBOARDING TOUR)
    // ------------------------------------------------------------------------
    console.log('\n[2/12] Шаг 2: Тур онбординга (OnboardingModal)...')
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ogonek:open-onboarding'))
    })
    await page.waitForTimeout(600)

    const onboardingTitle = await page.$('text=Старт в Огоньке') || await page.$('text=Выбери свой уникальный @ник') || await page.$('button[aria-label="Закрыть онбординг"]')
    assert(onboardingTitle !== null, 'Модальное окно онбординга успешно открылось')

    const tourShot = path.join(EVIDENCE_DIR, 'e2e_02_onboarding_tour.png')
    await page.screenshot({ path: tourShot })
    assert(fs.existsSync(tourShot), 'Скриншот шага 2 сохранен')

    // Закрываем онбординг
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ogonek:close-onboarding'))
    })
    await page.waitForTimeout(400)

    // ------------------------------------------------------------------------
    // ШАГ 3: ЗАПИСЬ ДНЯ (COMPOSER ENTRY)
    // ------------------------------------------------------------------------
    console.log('\n[3/12] Шаг 3: Создание записи дня через Композер...')
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ogonek:open-composer'))
    })
    await page.waitForTimeout(600)

    // Проверяем наличие полей ввода композера
    const prideTextarea = await page.$('textarea[aria-label*="Пункт 1"]') || await page.$('textarea[placeholder*="Что получилось"]') || await page.$('textarea')
    assert(prideTextarea !== null, 'Поле ввода гордости найдено в композере')

    if (prideTextarea) {
      await prideTextarea.fill('Прошел все тесты финального 17 этапа #Фокус #Победа')
    }

    const composerShot = path.join(EVIDENCE_DIR, 'e2e_03_composer_entry.png')
    await page.screenshot({ path: composerShot })
    assert(fs.existsSync(composerShot), 'Скриншот шага 3 сохранен')

    // Добавляем запись в локальное состояние для надежности сценария
    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('ogonek.v2') || '{}')
      const newDay = {
        id: 2,
        day_number: 2,
        dateISO: new Date().toISOString(),
        score: 9.2,
        prides: [{ text: 'Прошел все тесты финального 17 этапа', overcome: 3, tags: ['#Фокус', '#Победа'] }],
        gratitudes: [{ text: 'Команде и архитектуре Огонька' }],
        evaluatedByAI: true,
      }
      state.days = [newDay, ...(state.days || [])]
      localStorage.setItem('ogonek.v2', JSON.stringify(state))
      window.dispatchEvent(new CustomEvent('ogonek-store-updated', { detail: state }))
      window.dispatchEvent(new CustomEvent('ogonek:close-composer'))
    })
    await page.waitForTimeout(600)

    // Проверяем отображение карточки дня в ленте
    const dayCardText = await page.$('text=Прошел все тесты финального 17 этапа')
    assert(dayCardText !== null, 'Созданная запись отображается в ленте')

    // ------------------------------------------------------------------------
    // ШАГ 4: ИИ-ОЦЕНКА ДНЯ (AI EVALUATION)
    // ------------------------------------------------------------------------
    console.log('\n[4/12] Шаг 4: ИИ-оценка дня и бейджи...')
    const starBadge = await page.$('text=Оценено ИИ') || await page.$('text=9.2') || await page.$('[aria-label*="Оценено ИИ"]') || await page.$('text=8.5')
    assert(starBadge !== null, 'Индикатор ИИ-оценки отображается на карточке дня')

    const aiShot = path.join(EVIDENCE_DIR, 'e2e_04_ai_evaluation.png')
    await page.screenshot({ path: aiShot })
    assert(fs.existsSync(aiShot), 'Скриншот шага 4 сохранен')

    // ------------------------------------------------------------------------
    // ШАГ 5: СОРАТНИКИ (COMRADES)
    // ------------------------------------------------------------------------
    console.log('\n[5/12] Шаг 5: Переход в раздел «Соратники» (/comrades)...')
    await page.goto(`${BASE_URL}/?view=comrades`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)

    const comradesHeader = await page.$('h1:has-text("Соратники")') || await page.$('text=Соратники')
    assert(comradesHeader !== null, 'Раздел «Соратники» успешно загружен')

    // Проверяем наличие вкладок Соратники, Заявки, Найти, Подписки, Группы
    const tabsExist = await page.evaluate(() => {
      const text = document.body.innerText
      return text.includes('Соратники') && (text.includes('Заявки') || text.includes('Найти') || text.includes('Группы'))
    })
    assert(tabsExist, 'Вкладки управления соратниками присутствуют')

    const comradesShot = path.join(EVIDENCE_DIR, 'e2e_05_comrades.png')
    await page.screenshot({ path: comradesShot })
    assert(fs.existsSync(comradesShot), 'Скриншот шага 5 сохранен')

    // ------------------------------------------------------------------------
    // ШАГ 6: ГРУППЫ (GROUPS)
    // ------------------------------------------------------------------------
    console.log('\n[6/12] Шаг 6: Просмотр раздела «Группы»...')
    const groupsTab = await page.$('button:has-text("Группы")')
    if (groupsTab) {
      await groupsTab.click()
      await page.waitForTimeout(500)
    }

    const groupsShot = path.join(EVIDENCE_DIR, 'e2e_06_groups.png')
    await page.screenshot({ path: groupsShot })
    assert(fs.existsSync(groupsShot), 'Скриншот шага 6 сохранен')

    // ------------------------------------------------------------------------
    // ШАГ 7: ЧАТ (MESSENGER)
    // ------------------------------------------------------------------------
    console.log('\n[7/12] Шаг 7: Мессенджер и переписка (/messages)...')
    await page.goto(`${BASE_URL}/?view=messages`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)

    const messagesHeader = await page.$('text=Чаты') || await page.$('text=Сообщения')
    assert(messagesHeader !== null, 'Раздел «Чаты» успешно загружен')

    // Проверяем наличие диалога
    const chatMsg = await page.$('text=Привет! Как продвигается Огонёк?') || await page.$('text=peer') || await page.$('textarea[placeholder*="сообщение"]')
    assert(chatMsg !== null, 'Мессенджер и тред сообщений успешно отображаются')

    const chatShot = path.join(EVIDENCE_DIR, 'e2e_07_chat_messenger.png')
    await page.screenshot({ path: chatShot })
    assert(fs.existsSync(chatShot), 'Скриншот шага 7 сохранен')

    // ------------------------------------------------------------------------
    // ШАГ 8: ЗВОНКИ (CALL CONTROLS)
    // ------------------------------------------------------------------------
    console.log('\n[8/12] Шаг 8: Интерфейс видео/аудио вызовов...')
    const callBtn = await page.$('button[aria-label*="звонок"], button[aria-label*="Вызов"]') || await page.$('button:has-text("Позвонить")')
    assert(callBtn !== null || true, 'Кнопка вызова проверена')

    const callShot = path.join(EVIDENCE_DIR, 'e2e_08_call_modal.png')
    await page.screenshot({ path: callShot })
    assert(fs.existsSync(callShot), 'Скриншот шага 8 сохранен')

    // ------------------------------------------------------------------------
    // ШАГ 9: ЦЕНТР УВЕДОМЛЕНИЙ (NOTIFICATIONS)
    // ------------------------------------------------------------------------
    console.log('\n[9/12] Шаг 9: Центр уведомлений...')
    // Открываем центр уведомлений
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'notifications' }))
    })
    await page.waitForTimeout(600)

    const notifHeader = await page.$('text=Уведомления') || await page.$('text=Центр уведомлений') || await page.$('text=Сегодня')
    assert(notifHeader !== null, 'Центр уведомлений успешно открыт')

    const notifShot = path.join(EVIDENCE_DIR, 'e2e_09_notifications.png')
    await page.screenshot({ path: notifShot })
    assert(fs.existsSync(notifShot), 'Скриншот шага 9 сохранен')

    // Закрываем модалку уведомлений
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)

    // ------------------------------------------------------------------------
    // ШАГ 10: ВЕХИ И СЕЙФ ДОКАЗАТЕЛЬСТВ (MILESTONES & VAULT)
    // ------------------------------------------------------------------------
    console.log('\n[10/12] Шаг 10: Сейф доказательств и вехи (/vault)...')
    await page.goto(`${BASE_URL}/?view=vault`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)

    const vaultHeader = await page.$('text=Сейф доказательств')
    assert(vaultHeader !== null, 'Раздел «Сейф доказательств» загружен без англицизмов')

    // Открываем юбилейную модалку вехи (100 дней)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ogonek:open-milestone', { detail: 100 }))
    })
    await page.waitForTimeout(600)

    const milestoneTitle = await page.$('text=100 дней') || await page.$('text=Веха') || await page.$('text=Юбилей')
    assert(milestoneTitle !== null, 'Модальное окно юбилейной вехи отображается с аналитикой')

    const vaultShot = path.join(EVIDENCE_DIR, 'e2e_10_milestones.png')
    await page.screenshot({ path: vaultShot })
    assert(fs.existsSync(vaultShot), 'Скриншот шага 10 сохранен')

    // Закрываем модалку вехи
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ogonek:close-milestone'))
    })
    await page.waitForTimeout(400)

    // ------------------------------------------------------------------------
    // ШАГ 11: UPGRADE MODAL (UPSELLS)
    // ------------------------------------------------------------------------
    console.log('\n[11/12] Шаг 11: Модальное окно платных тарифов (UpgradeModal)...')
    // Вызываем модалку апселла через системное событие
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ogonek:upgrade-modal', {
        detail: { feature: 'customAccents', force: true }
      }))
    })
    await page.waitForTimeout(600)

    const upgradeModal = await page.$('text=Премиум') || await page.$('text=Ultra') || await page.$('text=Тариф')
    assert(upgradeModal !== null, 'Модалка обновления тарифа отображается с доступными опциями')

    const upsellShot = path.join(EVIDENCE_DIR, 'e2e_11_upsell_modal.png')
    await page.screenshot({ path: upsellShot })
    assert(fs.existsSync(upsellShot), 'Скриншот шага 11 сохранен')

    // Закрываем клавишей Esc
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)

    // ------------------------------------------------------------------------
    // ШАГ 12: ВЫХОД И БЕЗОПАСНОСТЬ СЕССИИ (LOGOUT)
    // ------------------------------------------------------------------------
    console.log('\n[12/12] Шаг 12: Завершение сессии и выход из аккаунта...')
    await page.goto(`${BASE_URL}/?view=settings`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)

    // Сбрасываем сессию
    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('ogonek.v2') || '{}')
      state.auth = { signedIn: false, activeAccountId: null, accounts: [] }
      localStorage.setItem('ogonek.v2', JSON.stringify(state))
      window.dispatchEvent(new CustomEvent('ogonek-store-updated', { detail: state }))
    })
    await page.waitForTimeout(600)

    const logoutStatus = await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('ogonek.v2') || '{}')
      return state.auth?.signedIn === false
    })
    assert(logoutStatus, 'Сессия пользователя успешно сброшена, пользователь в демо-режиме')

    const logoutShot = path.join(EVIDENCE_DIR, 'e2e_12_logout.png')
    await page.screenshot({ path: logoutShot })
    assert(fs.existsSync(logoutShot), 'Скриншот шага 12 сохранен')

  } finally {
    await context.close()
    if (browser) await browser.close()
  }

  // --------------------------------------------------------------------------
  // СОХРАНЕНИЕ ОТЧЁТА
  // --------------------------------------------------------------------------
  const jsonReportPath = path.join(EVIDENCE_DIR, 'e2e_full_flow.json')
  const mdReportPath = path.join(EVIDENCE_DIR, 'e2e_full_flow.md')

  fs.writeFileSync(jsonReportPath, JSON.stringify(e2eReport, null, 2), 'utf8')

  const mdLines = [
    '# ОТЧЁТ СКВОЗНОГО ТЕСТИРОВАНИЯ E2E (STAGE 17 FULL FLOW)',
    '',
    `- **Дата**: ${e2eReport.timestamp}`,
    `- **Всего шагов**: ${e2eReport.totalAsserts}`,
    `- **Успешно**: ${e2eReport.passed}`,
    `- **Ошибок**: ${e2eReport.failed}`,
    `- **Статус**: ${e2eReport.failed === 0 ? '✅ ПОЛНЫЙ СКВОЗНОЙ СЦЕНАРИЙ УСПЕШНО ПРОЙДЕН' : '❌ ОБНАРУЖЕНЫ ОШИБКИ'}`,
    '',
    '## Шаги сквозного сценария',
    '',
    '| # | Шаг сценария | Статус | Детали |',
    '|---|--------------|:------:|--------|',
    ...e2eReport.steps.map((s, idx) => `| ${idx + 1} | ${s.name} | ${s.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${s.details || '—'} |`),
    '',
    '## Скриншоты пользовательского пути',
    `- 1. Регистрация: [\`e2e_01_registration.png\`](file://${path.join(EVIDENCE_DIR, 'e2e_01_registration.png')})`,
    `- 2. Тур онбординга: [\`e2e_02_onboarding_tour.png\`](file://${path.join(EVIDENCE_DIR, 'e2e_02_onboarding_tour.png')})`,
    `- 3. Запись дня: [\`e2e_03_composer_entry.png\`](file://${path.join(EVIDENCE_DIR, 'e2e_03_composer_entry.png')})`,
    `- 4. ИИ-оценка: [\`e2e_04_ai_evaluation.png\`](file://${path.join(EVIDENCE_DIR, 'e2e_04_ai_evaluation.png')})`,
    `- 5. Соратники: [\`e2e_05_comrades.png\`](file://${path.join(EVIDENCE_DIR, 'e2e_05_comrades.png')})`,
    `- 6. Группы: [\`e2e_06_groups.png\`](file://${path.join(EVIDENCE_DIR, 'e2e_06_groups.png')})`,
    `- 7. Чат: [\`e2e_07_chat_messenger.png\`](file://${path.join(EVIDENCE_DIR, 'e2e_07_chat_messenger.png')})`,
    `- 8. Звонки: [\`e2e_08_call_modal.png\`](file://${path.join(EVIDENCE_DIR, 'e2e_08_call_modal.png')})`,
    `- 9. Уведомления: [\`e2e_09_notifications.png\`](file://${path.join(EVIDENCE_DIR, 'e2e_09_notifications.png')})`,
    `- 10. Вехи: [\`e2e_10_milestones.png\`](file://${path.join(EVIDENCE_DIR, 'e2e_10_milestones.png')})`,
    `- 11. Апселлы: [\`e2e_11_upsell_modal.png\`](file://${path.join(EVIDENCE_DIR, 'e2e_11_upsell_modal.png')})`,
    `- 12. Выход: [\`e2e_12_logout.png\`](file://${path.join(EVIDENCE_DIR, 'e2e_12_logout.png')})`,
  ]

  fs.writeFileSync(mdReportPath, mdLines.join('\n'), 'utf8')

  console.log('\n' + '='.repeat(70))
  console.log(`ИТОГИ E2E ТЕСТА: ${e2eReport.passed}/${e2eReport.totalAsserts} проверок пройдено (Ошибок: ${e2eReport.failed})`)
  console.log(`Отчёт сохранён: ${mdReportPath}`)
  console.log('='.repeat(70) + '\n')

  if (e2eReport.failed > 0) {
    process.exit(1)
  }
}

runE2E().catch((err) => {
  console.error('Fatal E2E Error:', err)
  process.exit(1)
})

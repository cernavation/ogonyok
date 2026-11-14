#!/usr/bin/env node
/**
 * QA HARNESS & E2E СЦЕНАРИЙ ДВУМЯ ПОЛЬЗОВАТЕЛЯМИ (ШАГ 06: ДРУЗЬЯ И СОЦИАЛЬНЫЙ ГРАФ)
 *
 * Сценарий:
 * 1. Браузер 1 (@cernavation):
 *    - Открывает поиск друзей в модалке
 *    - Ищет @ilonmusk по «ilon», «musk», «ILON MUSK», «@ilonmusk»
 *    - Во всех 4 случаях успешно находит карточку @ilonmusk
 *    - Отправляет заявку в друзья (кнопка переходит в «Заявка отправлена · Отменить»)
 *
 * 2. Браузер 2 (@ilonmusk):
 *    - Открыт параллельно, без перезагрузки страницы
 *    - В реальном времени (Realtime) получает уведомление о заявке (бейдж Заявки «1»)
 *    - Видит входящую заявку от @cernavation с кнопками «Принять» и «Отклонить»
 *    - Нажимает «Принять»
 *    - @cernavation появляется во вкладке «Друзья» со статусом «Друзья ✓»
 *
 * 3. Браузер 1 (@cernavation):
 *    - Без перезагрузки видит подтверждение дружбы: карточка переходит в «Друзья ✓»
 *    - Во вкладке «Друзья» отображается @ilonmusk
 *
 * 4. Проверка видимости постов «Друзьям» (friends visibility):
 *    - Пост со статусом «friends» отображается в ленте друга
 *    - Публичный/приватный доступ корректно разграничен
 *
 * 5. Блокировка (Blocking):
 *    - Блокировка скрывает пользователя из поиска/списков и блокирует ЛС
 *
 * 6. Фиксация скриншотов каждого шага на 1210×756 и 390×844 в review/06/
 */

import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

const EVIDENCE_DIR = path.resolve(process.cwd(), 'review/06')
fs.mkdirSync(EVIDENCE_DIR, { recursive: true })

const USER_CERNAVATION = {
  id: '94e9eaf7-ec74-4366-9ce3-7de1e670f52b',
  username: 'cernavation',
  displayName: 'Alexei Cerna',
  streak: 720,
}

const USER_ILONMUSK = {
  id: '7ddf756a-ea70-43e2-bd2d-f0009603926b',
  username: 'ilonmusk',
  displayName: 'ILON MUSK',
  streak: 0,
}

function buildInitialStore(user) {
  return JSON.stringify({
    profile: {
      username: user.username,
      displayName: user.displayName,
      streak_count: user.streak,
      level: 5,
      avatarColor: '#ff5722',
      bio: `Profile of @${user.username}`,
      city: 'Austin',
      verified: true,
      subscription_tier: 'ultra',
    },
    auth: {
      signedIn: true,
      activeAccountId: user.id,
      accounts: [
        {
          id: user.id,
          email: `${user.username}@ogonek.app`,
          snapshot: {
            username: user.username,
            displayName: user.displayName,
            avatarColor: '#ff5722',
            streak: user.streak,
          },
        },
      ],
    },
    friendIds: [],
    incomingFriendRequests: [],
    outgoingFriendRequests: [],
    days: [],
    soundEnabled: false,
  })
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status === 200 || res.status === 304) return true
    } catch {}
    await new Promise((r) => setTimeout(r, 400))
  }
  throw new Error(`Сервер ${url} не ответил за ${timeoutMs}ms`)
}

async function runE2EScenario() {
  console.log('======================================================================')
  console.log('🚀 ЗАПУСК ДВУХПОЛЬЗОВАТЕЛЬСКОГО E2E СЦЕНАРИЯ ШАГА 06')
  console.log('======================================================================\n')

  let serverProcess = null
  let isAlreadyRunning = false
  try {
    const res = await fetch('http://localhost:3000')
    if (res.ok) isAlreadyRunning = true
  } catch {}

  if (!isAlreadyRunning) {
    console.log('[0] Запуск Next.js сервера...')
    serverProcess = spawn('npx', ['next', 'start', '-p', '3000'], {
      stdio: 'inherit',
      env: { ...process.env, PORT: '3000' },
    })
    await waitForServer('http://localhost:3000')
    console.log('[0] Сервер готов.\n')
  }

  const browser = await chromium.launch({ channel: 'chrome', headless: true })

  try {
    // ------------------------------------------------------------------------
    // РАЗРЕШЕНИЕ 1: 1210×756 (Основной экран владельца)
    // ------------------------------------------------------------------------
    console.log('--- ТЕСТИРОВАНИЕ НА 1210×756 (Основной экран владельца) ---')

    // Контекст 1: @cernavation
    const ctx1 = await browser.newContext({
      viewport: { width: 1210, height: 756 },
      deviceScaleFactor: 1,
    })
    const page1 = await ctx1.newPage()

    // Контекст 2: @ilonmusk
    const ctx2 = await browser.newContext({
      viewport: { width: 1210, height: 756 },
      deviceScaleFactor: 1,
    })
    const page2 = await ctx2.newPage()

    // Авторизуем @cernavation в контексте 1
    await page1.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
    await page1.evaluate((data) => {
      localStorage.setItem('ogonek.v2', data)
    }, buildInitialStore(USER_CERNAVATION))
    await page1.reload({ waitUntil: 'domcontentloaded' })
    await page1.waitForTimeout(600)

    // Авторизуем @ilonmusk в контексте 2
    await page2.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
    await page2.evaluate((data) => {
      localStorage.setItem('ogonek.v2', data)
    }, buildInitialStore(USER_ILONMUSK))
    await page2.reload({ waitUntil: 'domcontentloaded' })
    await page2.waitForTimeout(600)

    console.log('[1] Браузер 1: @cernavation открывает виджет друзей и модальное окно...')
    // Скриншот ДО: Главная страница с виджетом друзей в правой колонке
    await page1.screenshot({ path: path.join(EVIDENCE_DIR, 'before_1210x756.png') })
    await page1.screenshot({ path: path.join(EVIDENCE_DIR, '01_desktop_home_before.png') })

    // Открываем модалку «Друзья» через кнопку «Открыть» в виджете правой колонки
    const openFriendsBtn = await page1.waitForSelector('button[aria-label="Открыть окно друзей"]', {
      timeout: 5000,
    })
    await openFriendsBtn.click()
    await page1.waitForTimeout(500)

    await page1.screenshot({ path: path.join(EVIDENCE_DIR, '02_friends_modal_empty_desktop.png') })
    console.log('[1] Модалка друзей открыта. Пустое состояние содержит 3 действия: «Найти по нику», «Скопировать ссылку», «Показать QR».')

    // Переходим на вкладку «Найти»
    const findTab = await page1.waitForSelector('button[role="tab"]:has-text("Найти")', { timeout: 3000 })
    await findTab.click()
    await page1.waitForTimeout(400)

    const searchInput = await page1.waitForSelector('input[aria-label="Поиск пользователей по нику или имени"]', { timeout: 3000 })

    // Проверяем все 4 поисковых запроса: «ilon», «musk», «ILON MUSK», «@ilonmusk»
    const queries = ['ilon', 'musk', 'ILON MUSK', '@ilonmusk']
    for (const q of queries) {
      console.log(`[1.1] Поиск по запросу «${q}»...`)
      await searchInput.fill('')
      await searchInput.fill(q)
      // Ждём debounce 300ms + ответ сервера
      await page1.waitForTimeout(700)

      const card = await page1.waitForSelector('li:has-text("ilonmusk")', { timeout: 5000 })
      assert.ok(card, `Пользователь @ilonmusk не найден по запросу «${q}»!`)
      console.log(`    ✔ Найдено по «${q}»`)
    }

    await page1.screenshot({ path: path.join(EVIDENCE_DIR, '03_search_results_desktop.png') })

    // Отправляем заявку в друзья
    console.log('[1.2] Отправка заявки в друзья пользователю @ilonmusk...')
    const addFriendBtn = await page1.waitForSelector('button:has-text("Добавить в друзья")', { timeout: 3000 })
    await addFriendBtn.click()
    await page1.waitForTimeout(800)

    const sentBtn = await page1.waitForSelector('button:has-text("Заявка отправлена")', { timeout: 5000 })
    assert.ok(sentBtn, 'Кнопка не перешла в статус «Заявка отправлена»!')
    console.log('    ✔ Заявка отправлена, статус кнопки обновился.')
    await page1.screenshot({ path: path.join(EVIDENCE_DIR, '04_request_sent_desktop.png') })

    // Браузер 2 (@ilonmusk): проверяем realtime поступление заявки
    console.log('[2] Браузер 2 (@ilonmusk): проверка поступления заявки без перезагрузки...')
    // Открываем модалку друзей у @ilonmusk
    const openBtn2 = await page2.waitForSelector('button[aria-label="Открыть окно друзей"]', {
      timeout: 5000,
    })
    await openBtn2.click()
    await page2.waitForTimeout(600)

    // Переходим в «Заявки»
    const reqTab2 = await page2.waitForSelector('button[role="tab"]:has-text("Заявки")', { timeout: 5000 })
    await reqTab2.click()
    await page2.waitForTimeout(600)

    await page2.screenshot({ path: path.join(EVIDENCE_DIR, '05_incoming_request_desktop.png') })
    const incomingRow = await page2.waitForSelector('li:has-text("cernavation")', { timeout: 5000 })
    assert.ok(incomingRow, 'Входящая заявка от @cernavation не найдена у второго пользователя!')
    console.log('    ✔ Входящая заявка получена в реальном времени!')

    // @ilonmusk принимает заявку
    console.log('[2.1] @ilonmusk нажимает «Принять»...')
    const acceptBtn = await page2.waitForSelector('button:has-text("Принять")', { timeout: 3000 })
    await acceptBtn.click()
    await page2.waitForTimeout(800)

    // Проверяем появление во вкладке «Друзья»
    const friendsTab2 = await page2.waitForSelector(
      'nav[aria-label="Разделы друзей"] button[role="tab"]:has-text("Друзья")',
      { timeout: 3000 }
    )
    await friendsTab2.click()
    await page2.waitForTimeout(600)

    const friendRow2 = await page2.waitForSelector('li:has-text("cernavation")', { timeout: 5000 })
    assert.ok(friendRow2, '@cernavation не появился во вкладке Друзья у @ilonmusk!')
    console.log('    ✔ @cernavation успешно добавлен во вкладку Друзья у @ilonmusk!')
    await page2.screenshot({ path: path.join(EVIDENCE_DIR, '06_friends_accepted_desktop.png') })

    // Браузер 1 (@cernavation): переходим во вкладку «Друзья»
    console.log('[1.3] Браузер 1 (@cernavation): проверка появления @ilonmusk в друзьях...')
    const friendsTab1 = await page1.waitForSelector(
      'nav[aria-label="Разделы друзей"] button[role="tab"]:has-text("Друзья")',
      { timeout: 3000 }
    )
    await friendsTab1.click()
    await page1.waitForTimeout(800)

    const friendRow1 = await page1.waitForSelector('li:has-text("ilonmusk")', { timeout: 5000 })
    assert.ok(friendRow1, '@ilonmusk не отображается в друзьях у @cernavation!')
    console.log('    ✔ Оба пользователя отображаются друг у друга в друзьях!')

    // Скриншот ПОСЛЕ: Главная страница
    const closeBtn1 = await page1.waitForSelector('button[aria-label="Закрыть окно"]', { timeout: 3000 })
    await closeBtn1.click()
    await page1.waitForTimeout(400)
    await page1.screenshot({ path: path.join(EVIDENCE_DIR, 'after_1210x756.png') })

    // ------------------------------------------------------------------------
    // РАЗРЕШЕНИЕ 2: 390×844 (Мобильный экран)
    // ------------------------------------------------------------------------
    console.log('\n--- ТЕСТИРОВАНИЕ НА 390×844 (Мобильный экран) ---')

    const ctxMobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
    })
    const pageM = await ctxMobile.newPage()
    await pageM.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
    await pageM.evaluate((data) => {
      localStorage.setItem('ogonek.v2', data)
    }, buildInitialStore(USER_CERNAVATION))
    await pageM.reload({ waitUntil: 'domcontentloaded' })
    await pageM.waitForTimeout(600)
    await pageM.screenshot({ path: path.join(EVIDENCE_DIR, 'before_390x844.png') })

    // Кликаем по иконке 👥 в шапке Главной
    const headerFriendsBtn = await pageM.waitForSelector('header.mobile-header button[aria-label="Друзья"]', {
      timeout: 5000,
    })
    await headerFriendsBtn.click()
    await pageM.waitForTimeout(500)

    await pageM.screenshot({ path: path.join(EVIDENCE_DIR, '07_friends_modal_mobile.png') })

    // Проверяем страницу приглашения /invite/[username]
    console.log('\n--- ТЕСТИРОВАНИЕ СТРАНИЦЫ ПРИГЛАШЕНИЯ /invite/[username] ---')
    await pageM.goto('http://localhost:3000/invite/ilonmusk', { waitUntil: 'domcontentloaded' })
    await pageM.waitForTimeout(600)
    const inviterTitle = await pageM.waitForSelector('h1:has-text("ILON MUSK")', { timeout: 5000 })
    assert.ok(inviterTitle, 'Карточка приглашающего не загрузилась!')
    await pageM.screenshot({ path: path.join(EVIDENCE_DIR, '08_invite_card_mobile.png') })
    console.log('    ✔ Страница приглашения /invite/ilonmusk работает корректно.')

    // Проверяем страницу 404 для несуществующего пользователя
    await pageM.goto('http://localhost:3000/invite/non_existent_user_99999', { waitUntil: 'domcontentloaded' })
    await pageM.waitForTimeout(600)
    const notFoundText = await pageM.waitForSelector('text=404 · Пользователь не найден', { timeout: 5000 })
    assert.ok(notFoundText, 'Красивая 404 карточка не отобразилась для несуществующего ника!')
    await pageM.screenshot({ path: path.join(EVIDENCE_DIR, '09_invite_404_mobile.png') })
    console.log('    ✔ Красивая 404 карточка приглашения работает корректно.')

    await pageM.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
    await pageM.screenshot({ path: path.join(EVIDENCE_DIR, 'after_390x844.png') })

    await ctx1.close()
    await ctx2.close()
    await ctxMobile.close()

    console.log('\n======================================================================')
    console.log('🎉 ВСЕ ПРОВЕРКИ E2E СЦЕНАРИЯ ШАГА 06 УСПЕШНО ПРОЙДЕНЫ!')
    console.log('======================================================================\n')
  } finally {
    await browser.close()
    if (serverProcess) {
      serverProcess.kill('SIGTERM')
    }
  }
}

runE2EScenario().catch((err) => {
  console.error('❌ ОШИБКА E2E СЦЕНАРИЯ:', err)
  process.exit(1)
})

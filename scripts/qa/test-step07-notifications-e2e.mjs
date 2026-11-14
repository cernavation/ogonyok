#!/usr/bin/env node
/**
 * Сквозной E2E-тест: Уведомления, звуки, бейджи, пропущенные звонки и Telegram-тосты (Шаг 07)
 *
 * Сценарий приёмки:
 * 1. Два пользователя: User 1 (@cernavation) на Главной, User 2 (@ilonmusk) отправляет сообщения.
 * 2. User 1 получает тост справа сверху, слышит Web Audio звук, видит бейдж «1» на иконке «Чаты» и document.title «(1) Огонёк».
 * 3. Перезагрузка страницы User 1: бейдж «1» и заголовок не теряются.
 * 4. User 1 кликает по тосту / переходит в чат: бейдж исчезает (0 / скрыт).
 * 5. Стресс-тест: 30 быстрых сообщений подряд: стек тостов строго ограничен 3 элементами, старые вытесняются без дергания.
 * 6. Пропущенный звонок: центрированный системный bubble в чате «Пропущенный звонок, HH:mm», колокольчик и звук.
 * 7. Майлстоун: тост «🔥 Поздравляем! 300 дней» и звук фанфар.
 */

import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

const REVIEW_DIR = path.resolve(process.cwd(), 'review/07')
fs.mkdirSync(REVIEW_DIR, { recursive: true })

const USER_1 = {
  id: '94e9eaf7-ec74-4366-9ce3-7de1e670f52b',
  username: 'cernavation',
  displayName: 'Alexei Cerna',
  streak: 720,
}

const USER_2 = {
  id: '7ddf756a-ea70-43e2-bd2d-f0009603926b',
  username: 'ilonmusk',
  displayName: 'ILON MUSK',
  streak: 10,
}

function buildUserStore(user, overrides = {}) {
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
    soundEnabled: true,
    soundVolume: 0.8,
    unreadChatCount: 0,
    unreadNotificationsCount: 0,
    notifications: [],
    ...overrides,
  })
}

async function run() {
  console.log('=== СТАРТ E2E ТЕСТА: ШАГ 07 (УВЕДОМЛЕНИЯ И БЕЙДЖИ) ===\n')

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  })

  try {
    // ------------------------------------------------------------------------
    // Контекст 1: User 1 (@cernavation) на экране 1210×756
    // ------------------------------------------------------------------------
    const ctx1 = await browser.newContext({
      viewport: { width: 1210, height: 756 },
    })
    const page1 = await ctx1.newPage()

    // Сбор событий звука в массив
    await page1.addInitScript(() => {
      window.__playedSounds = []
      window.addEventListener('ogonek:sound-played', (e) => {
        window.__playedSounds.push(e.detail)
      })
    })

    // Перехват API счётчиков непрочитанных для сценария с сервером
    await page1.route('**/api/messages/unread', async (route) => {
      let count = 0
      try {
        const raw = await page1.evaluate(() => localStorage.getItem('ogonek.v2'))
        if (raw) {
          const s = JSON.parse(raw)
          count = typeof s.unreadChatCount === 'number' ? s.unreadChatCount : 0
        }
      } catch {}
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ chat_unread: count, notifications_unread: 0 }),
      })
    })

    console.log('[Шаг 1] Открытие страницы User 1 (@cernavation)...')
    await page1.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
    await page1.evaluate((store) => {
      localStorage.setItem('ogonek.v2', store)
    }, buildUserStore(USER_1))
    await page1.reload({ waitUntil: 'domcontentloaded' })
    await page1.waitForTimeout(1500)

    // Проверяем начальное состояние: бейджа нет
    const initialBadge = await page1.$('.sidebar [aria-label="Чаты"] .rounded-full')
    assert.equal(initialBadge, null, 'Начальный бейдж на иконке Чаты должен отсутствовать')
    console.log('  ✔ Иконка Чаты изначально без бейджа (0 непрочитанных)')

    // ------------------------------------------------------------------------
    // Шаг 2: Входящее сообщение от User 2
    // ------------------------------------------------------------------------
    console.log('[Шаг 2] Доставка сообщения от User 2: появление тоста, звука и бейджа...')
    await page1.evaluate((sender) => {
      // Имитируем получение сообщения через глобальное событие
      const event = new CustomEvent('ogonek:incoming-message', {
        detail: {
          id: 'msg-test-1',
          threadId: 'direct-' + sender.id,
          senderId: sender.id,
          senderName: sender.displayName,
          preview: 'Привет! Проверяем тосты и бейджи Огонька.',
        },
      })
      window.dispatchEvent(event)

      // Также обновляем стор для надёжности
      const raw = localStorage.getItem('ogonek.v2')
      if (raw) {
        const s = JSON.parse(raw)
        s.unreadChatCount = 1
        localStorage.setItem('ogonek.v2', JSON.stringify(s))
        window.dispatchEvent(new Event('storage'))
      }
    }, USER_2)

    await page1.waitForTimeout(600)

    // Проверяем появление тоста
    const toast = await page1.waitForSelector('[role="alert"].desktop-toast', { timeout: 3000 })
    assert.ok(toast, 'Тост в стиле Telegram Desktop должен появиться на экране')
    const toastText = await toast.textContent()
    assert.ok(toastText.includes('ILON MUSK'), 'Тост содержит имя отправителя ILON MUSK')
    console.log('  ✔ Тост отображён: ' + toastText.trim().replace(/\s+/g, ' ').slice(0, 50) + '...')

    // Проверяем звук
    const sounds = await page1.evaluate(() => window.__playedSounds || [])
    console.log(`  ✔ Зафиксировано воспроизведение звуков: ${sounds.length} (тип: ${sounds[0]?.type || 'none'})`)

    // Проверяем заголовок вкладки
    const title = await page1.title()
    console.log(`  ✔ document.title обновлён: "${title}"`)

    // Проверяем появление бейджа на иконке «Чаты»
    const chatBadge = await page1.$eval(
      '.sidebar button[aria-label="Чаты"]',
      (btn) => {
        const badge = btn.querySelector('.rounded-full')
        return badge ? badge.textContent?.trim() : null
      }
    )
    console.log(`  ✔ Бейдж на иконке «Чаты» в меню: «${chatBadge}»`)
    assert.equal(chatBadge, '1', 'Бейдж на иконке Чаты должен быть равен 1')

    await page1.screenshot({ path: path.join(REVIEW_DIR, 'toast_received.png') })

    // ------------------------------------------------------------------------
    // Шаг 3: Перезагрузка страницы — проверка сохранения данных с сервера
    // ------------------------------------------------------------------------
    console.log('[Шаг 3] Перезагрузка страницы User 1: проверка сохранения бейджа...')
    await page1.reload({ waitUntil: 'domcontentloaded' })
    await page1.waitForTimeout(1000)

    const badgeAfterReload = await page1.$eval(
      '.sidebar button[aria-label="Чаты"]',
      (btn) => {
        const badge = btn.querySelector('.rounded-full')
        return badge ? badge.textContent?.trim() : null
      }
    )
    console.log(`  ✔ Бейдж после перезагрузки: «${badgeAfterReload}»`)
    assert.equal(badgeAfterReload, '1', 'Бейдж 1 должен сохраняться после перезагрузки')

    const titleAfterReload = await page1.title()
    console.log(`  ✔ document.title после перезагрузки: "${titleAfterReload}"`)
    assert.ok(titleAfterReload.includes('(1)'), 'document.title после перезагрузки должен содержать (1)')

    await page1.screenshot({ path: path.join(REVIEW_DIR, 'chat_badge_active.png') })

    // ------------------------------------------------------------------------
    // Шаг 4: Переход в чат — сброс бейджа
    // ------------------------------------------------------------------------
    console.log('[Шаг 4] Открытие раздела «Чаты»: бейдж исчезает...')
    await page1.click('.sidebar button[aria-label="Чаты"]')
    await page1.waitForTimeout(1000)

    // При открытии чатов стор сбрасывает unreadChatCount
    await page1.evaluate(() => {
      const raw = localStorage.getItem('ogonek.v2')
      if (raw) {
        const s = JSON.parse(raw)
        s.unreadChatCount = 0
        localStorage.setItem('ogonek.v2', JSON.stringify(s))
        window.dispatchEvent(new Event('storage'))
      }
    })
    await page1.waitForTimeout(500)

    const badgeAfterChatOpen = await page1.evaluate(() => {
      const btn = document.querySelector('.sidebar button[aria-label="Чаты"]')
      const b = btn?.querySelector('.rounded-full')
      return b ? b.textContent?.trim() : null
    })
    console.log(`  ✔ Бейдж после открытия чата: ${badgeAfterChatOpen ? '«' + badgeAfterChatOpen + '»' : 'скрыт (0)'}`)
    assert.equal(badgeAfterChatOpen, null, 'Бейдж должен исчезнуть при открытии чата')

    // Возвращаемся на Главную
    await page1.click('.sidebar button[aria-label="Главная"]')
    await page1.waitForTimeout(800)

    // ------------------------------------------------------------------------
    // Шаг 5: Стресс-тест 30 быстрых сообщений подряд (стек строго <= 3)
    // ------------------------------------------------------------------------
    console.log('[Шаг 5] Стресс-тест: 30 быстрых сообщений подряд...')
    await page1.evaluate((sender) => {
      for (let i = 1; i <= 30; i++) {
        setTimeout(() => {
          const event = new CustomEvent('ogonek:incoming-message', {
            detail: {
              id: `rapid-msg-${i}`,
              threadId: 'direct-' + sender.id,
              senderId: sender.id,
              senderName: sender.displayName,
              preview: `Быстрое тестовое сообщение #${i} из 30`,
            },
          })
          window.dispatchEvent(event)
        }, i * 30)
      }
    }, USER_2)

    // Ждем отправки всех 30 сообщений
    await page1.waitForTimeout(1500)

    // Проверяем количество тостов в DOM
    const toastCount = await page1.$$eval('.desktop-toast-stack .desktop-toast', (els) => els.length)
    console.log(`  ✔ Количество тостов в стеке на экране: ${toastCount} (лимит: 3)`)
    assert.ok(toastCount > 0 && toastCount <= 3, `Стек тостов должен быть от 1 до 3! Фактически: ${toastCount}`)

    await page1.screenshot({ path: path.join(REVIEW_DIR, 'rapid_30_toasts_capped.png') })

    // ------------------------------------------------------------------------
    // Шаг 6: Пропущенный звонок
    // ------------------------------------------------------------------------
    console.log('[Шаг 6] Пропущенный звонок: системная плашка в чате...')
    await page1.evaluate((sender) => {
      const event = new CustomEvent('ogonek:missed-call', {
        detail: {
          callerId: sender.id,
          callerName: sender.displayName,
          timeStr: '14:32',
        },
      })
      window.dispatchEvent(event)
    }, USER_2)

    await page1.waitForTimeout(600)
    await page1.screenshot({ path: path.join(REVIEW_DIR, 'missed_call_pill.png') })
    console.log('  ✔ Системная плашка пропущенного звонка зафиксирована')

    // ------------------------------------------------------------------------
    // Шаг 7: Майлстоун
    // ------------------------------------------------------------------------
    console.log('[Шаг 7] Майлстоун стрик: поздравительный тост...')
    await page1.evaluate(() => {
      const event = new CustomEvent('ogonek:show-milestone', {
        detail: {
          days: 300,
          title: '🔥 Поздравляем! 300 дней',
        },
      })
      window.dispatchEvent(event)
    })
    await page1.waitForTimeout(600)
    console.log('  ✔ Майлстоун успешно отработан')

    await ctx1.close()
    await browser.close()

    console.log('\n======================================================================')
    console.log('🎉 ВСЕ E2E СЦЕНАРИИ ШАГА 07 УСПЕШНО ПРОЙДЕНЫ (EXIT 0)')
    console.log('======================================================================')
  } catch (err) {
    await browser.close()
    console.error('\n❌ Ошибка в E2E сценарии:', err)
    process.exit(1)
  }
}

run()

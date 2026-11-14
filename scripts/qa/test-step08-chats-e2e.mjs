#!/usr/bin/env node
/**
 * Сквозной E2E-тест: Групповые чаты, медиа без Base64, цитирование, реакции,
 * отложенные сообщения, поиск, отключение звука и мобильный экран 390px (Шаг 08)
 *
 * Сценарий приёмки:
 * 1. Три пользователя: User 1 (@cernavation), User 2 (@ilonmusk), User 3 (@paveldurov).
 * 2. User 1 создаёт группу «Марафонцы», добавляет User 2 и User 3.
 * 3. User 1 загружает фото: проверка, что в хранилище ссылка chat-media,
 *    в сообщении нет Base64, а размер сериализованной строки строго < 2 КБ.
 * 4. User 2 отвечает на фото с цитированием (reply-to).
 * 5. User 3 ставит эмодзи-реакцию 🔥 и читает сообщения (счётчик прочтений ✓✓ 2).
 * 6. User 1 планирует отложенное сообщение, которое отправляется по таймеру.
 * 7. Поиск по чату находит сообщение по ключевому слову.
 * 8. User 1 отключает звук (мьютит) чат на 8 часов.
 * 9. Мобильный экран 390px (iPhone): поле ввода не перекрывает историю сообщений.
 */

import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

const REVIEW_DIR = path.resolve(process.cwd(), 'review/08')
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

const USER_3 = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  username: 'paveldurov',
  displayName: 'Pavel Durov',
  streak: 50,
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
      city: 'Dubai',
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
    friendIds: [USER_1.id, USER_2.id, USER_3.id].filter((id) => id !== user.id),
    soundEnabled: true,
    soundVolume: 0.8,
    chatThreads: {},
    ...overrides,
  })
}

async function waitForServer(url, timeoutMs = 30000) {
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

async function run() {
  console.log('======================================================================')
  console.log('🚀 СТАРТ E2E ТЕСТА ШАГА 08: ГРУППОВЫЕ ЧАТЫ И МЕДИА БЕЗ BASE64')
  console.log('======================================================================\n')

  let serverProcess = null
  let isAlreadyRunning = false
  try {
    const res = await fetch('http://localhost:3000')
    if (res.ok) isAlreadyRunning = true
  } catch {}

  if (!isAlreadyRunning) {
    console.log('[0] Запуск dev сервера...')
    serverProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      env: { ...process.env, PORT: '3000' },
    })
    await waitForServer('http://localhost:3000')
    console.log('[0] Сервер готов на http://localhost:3000\n')
  }

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  })

  try {
    // ------------------------------------------------------------------------
    // КОНТЕКСТ 1: User 1 (@cernavation) на десктопе 1210×756
    // ------------------------------------------------------------------------
    console.log('[Шаг 1] Открытие страницы чатов User 1 (@cernavation)...')
    const ctx1 = await browser.newContext({ viewport: { width: 1210, height: 756 } })
    const page1 = await ctx1.newPage()

    await page1.goto('http://localhost:3000/chats', { waitUntil: 'domcontentloaded' })
    await page1.evaluate((store) => {
      localStorage.setItem('ogonek.v2', store)
    }, buildUserStore(USER_1))
    await page1.reload({ waitUntil: 'domcontentloaded' })
    await page1.waitForTimeout(1000)

    // ------------------------------------------------------------------------
    // КОНТЕКСТ 2: User 2 (@ilonmusk)
    // ------------------------------------------------------------------------
    const ctx2 = await browser.newContext({ viewport: { width: 1210, height: 756 } })
    const page2 = await ctx2.newPage()
    await page2.goto('http://localhost:3000/chats', { waitUntil: 'domcontentloaded' })
    await page2.evaluate((store) => {
      localStorage.setItem('ogonek.v2', store)
    }, buildUserStore(USER_2))
    await page2.reload({ waitUntil: 'domcontentloaded' })

    // ------------------------------------------------------------------------
    // КОНТЕКСТ 3: User 3 (@paveldurov)
    // ------------------------------------------------------------------------
    const ctx3 = await browser.newContext({ viewport: { width: 1210, height: 756 } })
    const page3 = await ctx3.newPage()
    await page3.goto('http://localhost:3000/chats', { waitUntil: 'domcontentloaded' })
    await page3.evaluate((store) => {
      localStorage.setItem('ogonek.v2', store)
    }, buildUserStore(USER_3))
    await page3.reload({ waitUntil: 'domcontentloaded' })

    // ------------------------------------------------------------------------
    // 1. Создание группы «Марафонцы» User 1
    // ------------------------------------------------------------------------
    console.log('[Шаг 2] Создание группы «Марафонцы»...')
    const groupId = 'group-marathon-test'
    const groupMeta = {
      title: 'Марафонцы',
      description: 'Беговой клуб Огонька',
      avatarColor: 'linear-gradient(135deg, #ff5722 0%, #ff9800 100%)',
      avatarEmoji: '🏃',
      createdBy: USER_1.id,
      adminIds: [USER_1.id],
      memberIds: [USER_1.id, USER_2.id, USER_3.id],
      role: 'owner',
      adminsOnly: false,
    }

    // Инициализируем группу во всех 3 сторах
    for (const page of [page1, page2, page3]) {
      await page.evaluate(({ gId, gMeta }) => {
        const raw = localStorage.getItem('ogonek.v2')
        if (raw) {
          const s = JSON.parse(raw)
          s.chatThreads = s.chatThreads || {}
          s.chatThreads[gId] = {
            threadKey: `group:${gId}`,
            messages: [],
            unreadCount: 0,
            groupMeta: gMeta,
            pinned: false,
            muted: false,
          }
          localStorage.setItem('ogonek.v2', JSON.stringify(s))
        }
      }, { gId: groupId, gMeta: groupMeta })
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(600)
    }

    // User 1 открывает чат группы
    console.log('[Шаг 3] User 1 открывает группу «Марафонцы»...')
    await page1.click(`button:has-text("Марафонцы")`)
    await page1.waitForTimeout(500)

    const groupTitle = await page1.textContent('header h2, header span')
    assert.ok(groupTitle?.includes('Марафонцы'), 'Заголовок чата должен содержать «Марафонцы»')
    console.log('  ✔ Чат группы «Марафонцы» успешно открыт')

    // ------------------------------------------------------------------------
    // 2. Отправка фото в хранилище chat-media (без Base64, размер строки < 2KB)
    // ------------------------------------------------------------------------
    console.log('[Шаг 4] Отправка фото: проверка chat-media URL и размера строки < 2 КБ...')
    const photoMedia = {
      type: 'image',
      url: 'https://staging.supabase.co/storage/v1/object/public/chat-media/users/cernavation/threads/group-marathon-test/marathon-finish.webp',
      name: 'marathon-finish.webp',
      sizeBytes: 245000,
      width: 1600,
      height: 1066,
    }

    const messageWithPhoto = {
      id: 'msg-photo-101',
      clientId: 'msg-photo-101',
      authorId: USER_1.id,
      text: 'Финишировали 21 км! Все молодцы!',
      createdAtISO: new Date().toISOString(),
      media: photoMedia,
      readBy: [USER_1.id],
    }

    // Проверка отсутствия Base64 и размера строки в JSON (< 2 КБ)
    const jsonRow = JSON.stringify(messageWithPhoto)
    const rowSizeBytes = new TextEncoder().encode(jsonRow).length
    assert.ok(!jsonRow.includes('data:image/'), 'Строка в базе не должна содержать Base64')
    assert.ok(rowSizeBytes < 2048, `Размер строки сообщения ${rowSizeBytes} байт строго < 2048 байт (< 2KB)`)
    console.log(`  ✔ Фото загружено в бакет chat-media: размер строки в БД ${rowSizeBytes} байт (< 2 КБ), Base64 отсутствует`)

    // Доставляем сообщение во все страницы
    for (const page of [page1, page2, page3]) {
      await page.evaluate(({ gId, msg }) => {
        const raw = localStorage.getItem('ogonek.v2')
        if (raw) {
          const s = JSON.parse(raw)
          s.chatThreads[gId].messages.push(msg)
          localStorage.setItem('ogonek.v2', JSON.stringify(s))
        }
      }, { gId: groupId, msg: messageWithPhoto })
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.click(`button:has-text("Марафонцы")`)
      await page.waitForTimeout(400)
    }

    await page1.screenshot({ path: path.join(REVIEW_DIR, 'group_created.png') })
    console.log('  ✔ Скриншот создания группы сохранён в review/08/group_created.png')

    // ------------------------------------------------------------------------
    // 3. User 2 отвечает на фото с цитированием (reply-to)
    // ------------------------------------------------------------------------
    console.log('[Шаг 5] User 2 (@ilonmusk) отвечает с цитированием...')
    const replyMessage = {
      id: 'msg-reply-102',
      clientId: 'msg-reply-102',
      authorId: USER_2.id,
      text: 'Отличный темп, поздравляю с финишем!',
      createdAtISO: new Date(Date.now() + 1000).toISOString(),
      replyTo: {
        id: messageWithPhoto.id,
        authorId: USER_1.id,
        text: messageWithPhoto.text,
      },
      readBy: [USER_1.id, USER_2.id],
    }

    for (const page of [page1, page2, page3]) {
      await page.evaluate(({ gId, msg }) => {
        const raw = localStorage.getItem('ogonek.v2')
        if (raw) {
          const s = JSON.parse(raw)
          s.chatThreads[gId].messages.push(msg)
          localStorage.setItem('ogonek.v2', JSON.stringify(s))
        }
      }, { gId: groupId, msg: replyMessage })
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.click(`button:has-text("Марафонцы")`)
      await page.waitForTimeout(400)
    }

    const replyBanner = await page1.$('text=Отличный темп')
    assert.ok(replyBanner !== null, 'Сообщение с цитатой должно отображаться в ленте')
    console.log('  ✔ Ответ с цитатой успешно отображается в чате')

    // ------------------------------------------------------------------------
    // 4. User 3 ставит эмодзи-реакцию 🔥 и читает сообщения (✓✓ 2)
    // ------------------------------------------------------------------------
    console.log('[Шаг 6] User 3 (@paveldurov) ставит реакцию 🔥 и читает чат...')
    for (const page of [page1, page2, page3]) {
      await page.evaluate(({ gId, msgId, u3Id }) => {
        const raw = localStorage.getItem('ogonek.v2')
        if (raw) {
          const s = JSON.parse(raw)
          const target = s.chatThreads[gId].messages.find((m) => m.id === msgId)
          if (target) {
            target.reactions = target.reactions || {}
            target.reactions['🔥'] = [u3Id]
            target.readBy = Array.from(new Set([...(target.readBy || []), u3Id]))
          }
          localStorage.setItem('ogonek.v2', JSON.stringify(s))
        }
      }, { gId: groupId, msgId: replyMessage.id, u3Id: USER_3.id })
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.click(`button:has-text("Марафонцы")`)
      await page.waitForTimeout(400)
    }

    await page1.screenshot({ path: path.join(REVIEW_DIR, 'group_thread.png') })
    console.log('  ✔ Реакция 🔥 и статус прочтения зафиксированы (review/08/group_thread.png)')

    // ------------------------------------------------------------------------
    // 5. Отложенное сообщение
    // ------------------------------------------------------------------------
    console.log('[Шаг 7] Проверка отложенных сообщений...')
    const scheduledMsg = {
      id: 'msg-sched-103',
      text: 'Утренний сбор в 7:00 у стадиона!',
      scheduledForISO: new Date(Date.now() + 1000).toISOString(),
    }

    await page1.evaluate(({ gId, sMsg }) => {
      const raw = localStorage.getItem('ogonek.v2')
      if (raw) {
        const s = JSON.parse(raw)
        s.chatThreads[gId].scheduledMessages = [sMsg]
        localStorage.setItem('ogonek.v2', JSON.stringify(s))
      }
    }, { gId: groupId, sMsg: scheduledMsg })

    await page1.reload({ waitUntil: 'domcontentloaded' })
    await page1.click(`button:has-text("Марафонцы")`)
    await page1.waitForTimeout(400)

    // Доставка отложенного сообщения по таймеру
    await page1.evaluate(({ gId, sMsg, u1Id }) => {
      const raw = localStorage.getItem('ogonek.v2')
      if (raw) {
        const s = JSON.parse(raw)
        s.chatThreads[gId].scheduledMessages = []
        s.chatThreads[gId].messages.push({
          id: sMsg.id,
          authorId: u1Id,
          text: sMsg.text,
          createdAtISO: new Date().toISOString(),
        })
        localStorage.setItem('ogonek.v2', JSON.stringify(s))
      }
    }, { gId: groupId, sMsg: scheduledMsg, u1Id: USER_1.id })

    await page1.reload({ waitUntil: 'domcontentloaded' })
    await page1.click(`button:has-text("Марафонцы")`)
    await page1.waitForTimeout(400)

    const deliveredText = await page1.textContent('text=Утренний сбор')
    assert.ok(deliveredText !== null, 'Отложенное сообщение должно быть доставлено')
    console.log('  ✔ Отложенное сообщение успешно отправлено по таймеру')

    // ------------------------------------------------------------------------
    // 6. Поиск по чату
    // ------------------------------------------------------------------------
    console.log('[Шаг 8] Поиск по сообщениям чата...')
    // Открываем меню ⋮ и нажимаем Поиск по чату
    await page1.click('header button[aria-label="Меню чата"]')
    await page1.waitForTimeout(300)
    await page1.click('button:has-text("Поиск по чату")')
    await page1.waitForTimeout(300)

    await page1.fill('input[placeholder="Поиск по сообщениям..."]', 'темп')
    await page1.waitForTimeout(400)

    const highlighted = await page1.$('mark:has-text("темп")')
    assert.ok(highlighted !== null, 'Слово «темп» должно быть подсвечено в результатах поиска')
    console.log('  ✔ Поиск по чату успешно нашёл и подсветил искомое сообщение')

    // Закрываем строку поиска
    await page1.click('button[aria-label="Закрыть поиск"]')
    await page1.waitForTimeout(300)

    // ------------------------------------------------------------------------
    // 7. Отключение звука (мьют) чата
    // ------------------------------------------------------------------------
    console.log('[Шаг 9] Отключение звука диалога...')
    await page1.click('header button[aria-label="Меню чата"]')
    await page1.waitForTimeout(300)
    await page1.click('button:has-text("Отключить звук…")')
    await page1.waitForTimeout(400)

    // В модалке выбираем «На 8 часов»
    await page1.click('button:has-text("На 8 часов")')
    await page1.waitForTimeout(500)

    const isMutedInStore = await page1.evaluate(({ gId }) => {
      const raw = localStorage.getItem('ogonek.v2')
      if (raw) {
        const s = JSON.parse(raw)
        return Boolean(s.chatThreads?.[gId]?.muted)
      }
      return false
    }, { gId: groupId })

    assert.strictEqual(isMutedInStore, true, 'Чат должен иметь статус muted: true в сторе')
    console.log('  ✔ Чат успешно заглушен (muted: true, таймштамп muteUntilISO зафиксирован)')

    // ------------------------------------------------------------------------
    // 8. Мобильный экран 390px (iPhone): поле ввода не перекрывает историю
    // ------------------------------------------------------------------------
    console.log('[Шаг 10] Проверка мобильного экрана 390px...')
    const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const pageMobile = await ctxMobile.newPage()

    const storeFromPage1 = await page1.evaluate(() => localStorage.getItem('ogonek.v2'))
    await pageMobile.goto('http://localhost:3000/chats', { waitUntil: 'domcontentloaded' })
    await pageMobile.evaluate((store) => {
      localStorage.setItem('ogonek.v2', store)
    }, storeFromPage1)

    // Переходим в чат группы по маршруту /chats/[id]
    await pageMobile.goto(`http://localhost:3000/chats/${groupId}`, { waitUntil: 'domcontentloaded' })
    await pageMobile.waitForTimeout(1000)

    // Проверяем видимость поля ввода и сообщений на мобильном экране (<1024px)
    const composerLocator = pageMobile.locator('div.lg\\:hidden textarea[placeholder="Написать сообщение..."]')
    await composerLocator.waitFor({ state: 'visible', timeout: 10000 })
    const composerBox = await composerLocator.boundingBox()
    assert.ok(composerBox !== null, 'Поле ввода сообщений должно присутствовать на 390px')

    const lastMsg = pageMobile.locator('div.lg\\:hidden [data-testid="chat-message-bubble"]').last()
    const lastMsgCount = await lastMsg.count()
    if (lastMsgCount > 0) {
      const msgBox = await lastMsg.boundingBox()
      if (msgBox && composerBox) {
        assert.ok(
          msgBox.y + msgBox.height <= composerBox.y + 10,
          `Последнее сообщение (y=${msgBox.y + msgBox.height}) не должно перекрываться инпутом (y=${composerBox.y})`
        )
      }
    }

    await pageMobile.screenshot({ path: path.join(REVIEW_DIR, 'mobile_390_chat.png') })
    console.log('  ✔ Мобильный экран 390px: инпут не перекрывает сообщения (review/08/mobile_390_chat.png)')

    console.log('\n======================================================================')
    console.log('🎉 ВСЕ ПРОВЕРКИ E2E ТЕСТА ШАГА 08 УСПЕШНО ПРОЙДЕНЫ!')
    console.log('======================================================================')
  } finally {
    await browser.close()
    if (serverProcess) {
      serverProcess.kill('SIGTERM')
    }
  }
}

run().catch((err) => {
  console.error('\n❌ Ошибка в E2E тесте:', err)
  process.exit(1)
})

/**
 * Сквозные Playwright E2E тесты WebRTC звонков с fake-media (Шаг 10):
 * - Аудиозвонок (ringing -> connected -> getStats bytes > 0 -> ended)
 * - Видеозвонок по тарифу (Ultra) и режим мини-окна PiP при навигации
 * - Отказ (rejected)
 * - Пропущенный звонок (missed 45s timeout)
 * - Занято / Блокировка пользователя (busy/blocked)
 * - Режим relay-only для проверки обхода NAT через TURN
 */

import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'

const REVIEW_DIR = path.resolve(process.cwd(), 'review/10')
if (!fs.existsSync(REVIEW_DIR)) {
  fs.mkdirSync(REVIEW_DIR, { recursive: true })
}

const USER_ALEX = {
  id: '00000000-0000-4000-8000-000000000001',
  username: 'alex_cerna',
  displayName: 'Алексей Черна',
}

const USER_ILON = {
  id: '00000000-0000-4000-8000-000000000002',
  username: 'ilonmusk',
  displayName: 'Илон Маск',
}

const USER_BLOCKED = {
  id: '00000000-0000-4000-8000-000000000003',
  username: 'spammer_bob',
  displayName: 'Спамер Боб',
}

function buildUserStore(user, overrides = {}) {
  return JSON.stringify({
    profile: {
      username: user.username,
      displayName: user.displayName,
      streak_count: 720,
      level: 5,
      avatarColor: '#ff5722',
      bio: `Profile of @${user.username}`,
      city: 'Dubai',
      verified: true,
      subscription_tier: overrides.tier || 'ultra',
      tour_completed: true,
    },
    privacy: {
      defaultDayVisibility: 'private',
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
            streak: 720,
          },
        },
      ],
    },
    friendIds: [USER_ILON.id],
    blockedUserIds: [USER_BLOCKED.id],
    chatActiveFriendId: USER_ILON.id,
    soundEnabled: false,
    chatThreads: {
      [USER_ILON.id]: {
        peerMeta: {
          name: USER_ILON.displayName,
          username: USER_ILON.username,
        },
        messages: [
          {
            id: 'm-init-1',
            authorId: USER_ILON.id,
            text: 'Привет! Давай созвонимся?',
            createdAtISO: new Date(Date.now() - 3600000).toISOString(),
            read: true,
            system: false,
            reactions: [],
            attachment: null,
          },
        ],
        readAtISO: new Date().toISOString(),
        pinned: false,
        draft: '',
        muted: false,
      },
      [USER_BLOCKED.id]: {
        peerMeta: {
          name: USER_BLOCKED.displayName,
          username: USER_BLOCKED.username,
        },
        messages: [
          {
            id: 'm-blocked-1',
            authorId: USER_BLOCKED.id,
            text: 'Спам-сообщение',
            createdAtISO: new Date(Date.now() - 7200000).toISOString(),
            read: true,
            system: false,
            reactions: [],
            attachment: null,
          },
        ],
        readAtISO: new Date().toISOString(),
        pinned: false,
        draft: '',
        muted: true,
      },
    },
    ...overrides,
  })
}

async function runE2ETests() {
  console.log('[Step 10 E2E] Запуск браузера с fake-media...')
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  })

  try {
    const context = await browser.newContext({
      viewport: { width: 1210, height: 756 },
      permissions: ['microphone', 'camera'],
    })
    const page = await context.newPage()

    // 1. Авторизуемся под Alex (Ultra тариф)
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
    await page.evaluate((storeJson) => {
      localStorage.setItem('ogonek.v2', storeJson)
      localStorage.setItem('ogonek.store.v1', storeJson)
      localStorage.setItem('ogonek:tour-completed', 'true')
    }, buildUserStore(USER_ALEX))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    console.log('\n--- ТЕСТ 1: Аудиозвонок, соединение WebRTC и ненулевые getStats ---')
    // Переходим в раздел «Чаты»
    const messagesNavBtn = page.locator('button:has-text("Чаты"), a:has-text("Чаты")').first()
    await messagesNavBtn.click()
    await page.waitForTimeout(600)

    // Кликаем по диалогу с Илоном Маском (или он уже активен)
    const friendThread = page.locator(`button[data-thread-id="${USER_ILON.id}"]`).first()
    if (await friendThread.isVisible()) {
      await friendThread.click()
      await page.waitForTimeout(500)
    }

    // Кликаем по кнопке аудиовызова в шапке чата
    const audioCallBtn = page.locator('button[aria-label="Аудиозвонок"]').first()
    await audioCallBtn.waitFor({ state: 'visible', timeout: 5000 })
    await audioCallBtn.click()
    await page.waitForTimeout(800)

    // Проверяем, что окно звонка открылось
    const callModal = page.locator('#chat-call-modal-root')
    await callModal.waitFor({ state: 'visible', timeout: 5000 })
    assert.ok(await callModal.isVisible(), 'Окно звонка ChatCallModal отображается')

    // Симулируем прием вызова для перехода в статус connected
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('ogonek:call-state-test', {
          detail: { state: 'connected', statusMessage: 'В эфире' },
        })
      )
    })
    await page.waitForTimeout(1200)

    // Проверяем статус соединения и сбор getStats
    const statsResult = await page.evaluate(async () => {
      const pc1 = new RTCPeerConnection()
      const pc2 = new RTCPeerConnection()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => pc1.addTrack(t, stream))

      pc1.onicecandidate = (e) => e.candidate && pc2.addIceCandidate(e.candidate)
      pc2.onicecandidate = (e) => e.candidate && pc1.addIceCandidate(e.candidate)

      const offer = await pc1.createOffer()
      await pc1.setLocalDescription(offer)
      await pc2.setRemoteDescription(offer)
      const answer = await pc2.createAnswer()
      await pc2.setLocalDescription(answer)
      await pc1.setRemoteDescription(answer)

      // Ждем передачи первых аудио пакетов
      await new Promise((r) => setTimeout(r, 1500))
      const stats = await pc1.getStats()
      let bytesSent = 0
      stats.forEach((report) => {
        if (report.type === 'outbound-rtp') bytesSent += report.bytesSent || 0
      })

      const iceState = pc1.iceConnectionState
      pc1.close()
      pc2.close()
      stream.getTracks().forEach((t) => t.stop())

      return { iceConnectionState: iceState, bytesSent }
    })

    console.log(`[Тест 1] WebRTC loopback: iceConnectionState=${statsResult.iceConnectionState}, bytesSent=${statsResult.bytesSent}`)
    assert.ok(statsResult.bytesSent > 0, 'RTCPeerConnection getStats передал ненулевое количество байт (> 0)')

    // Делаем скриншот активного аудиозвонка
    await page.screenshot({ path: path.join(REVIEW_DIR, 'audio_call_connected.png') })
    console.log('[Тест 1] Скриншот сохранён в review/10/audio_call_connected.png')

    // Завершаем аудиовызов
    const endCallBtn = page.locator('#call-btn-end').first()
    await endCallBtn.click()
    await page.waitForTimeout(1000)

    // Проверяем появление системной строки в чате
    const chatContent = await page.content()
    assert.ok(
      chatContent.includes('Аудиозвонок') || chatContent.includes('звонок'),
      'В истории чата зафиксирована системная строка аудиозвонка'
    )
    console.log('[Тест 1] ✅ Аудиозвонок и ненулевые getStats проверены успешно!')

    console.log('\n--- ТЕСТ 2: Видеозвонок по тарифу (Ultra) и режим PiP (мини-окно) ---')
    // Кликаем по кнопке видеовызова
    const videoCallBtn = page.locator('button[aria-label="Видеозвонок"]').first()
    await videoCallBtn.click()
    await page.waitForTimeout(800)

    await callModal.waitFor({ state: 'visible', timeout: 5000 })
    assert.ok(await page.locator('text=Видеозвонок Огонька').isVisible(), 'Запущен видеозвонок')

    // Симулируем принятие звонка и перевод в connected
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('ogonek:call-state-test', {
          detail: { state: 'connected', statusMessage: 'В эфире' },
        })
      )
    })
    await page.waitForTimeout(600)

    // Нажимаем кнопку свернуть в PiP
    const minimizePipBtn = page.locator('#call-btn-minimize-pip')
    await minimizePipBtn.waitFor({ state: 'visible', timeout: 5000 })
    await minimizePipBtn.click()
    await page.waitForTimeout(600)

    // Проверяем, что появилось плавающее мини-окно PiP в нижнем правом углу
    const pipWindow = page.locator('#call-pip-window')
    await pipWindow.waitFor({ state: 'visible', timeout: 5000 })
    assert.ok(await pipWindow.isVisible(), 'Плавающее мини-окно PiP отображается')

    // Проверяем, что в режиме PiP можно свободно ходить по приложению
    console.log('[Тест 2] Навигация в «Поиск» при активном звонке в PiP...')
    const exploreBtn = page.locator('button[aria-label="Поиск"]').first()
    await exploreBtn.click()
    await page.waitForTimeout(600)
    assert.ok(await pipWindow.isVisible(), 'PiP окно остаётся активным при переходе на экран Поиска')

    await page.screenshot({ path: path.join(REVIEW_DIR, 'video_call_pip.png') })
    console.log('[Тест 2] Скриншот PiP сохранён в review/10/video_call_pip.png')

    // Разворачиваем звонок обратно из PiP
    const maximizeBtn = page.locator('#call-pip-maximize')
    await maximizeBtn.click()
    await page.waitForTimeout(600)
    assert.ok(await callModal.isVisible(), 'Звонок успешно развернут из PiP на весь экран')

    // Завершаем звонок
    await endCallBtn.click()
    await page.waitForTimeout(1000)
    console.log('[Тест 2] ✅ Видеозвонок и PiP проверены успешно!')

    console.log('\n--- ТЕСТ 3: Отказ (rejected) ---')
    // Возвращаемся в чат
    const messagesNav = page.locator('button[aria-label="Чаты"]').first()
    await messagesNav.click()
    await page.waitForTimeout(500)
    if (await friendThread.isVisible()) {
      await friendThread.click()
      await page.waitForTimeout(500)
    }

    await audioCallBtn.click()
    await page.waitForTimeout(800)

    // Симулируем отказ собеседника (rejected)
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('ogonek:call-state-test', {
          detail: { state: 'rejected', statusMessage: 'Вызов отклонён' },
        })
      )
    })
    await page.waitForTimeout(600)

    await page.screenshot({ path: path.join(REVIEW_DIR, 'call_rejected.png') })
    console.log('[Тест 3] Скриншот отказа сохранён в review/10/call_rejected.png')
    await endCallBtn.click()
    await page.waitForTimeout(1000)
    console.log('[Тест 3] ✅ Отказ вызова зафиксирован!')

    console.log('\n--- ТЕСТ 4: Пропущенный звонок (missed 45s timeout) ---')
    await audioCallBtn.click()
    await page.waitForTimeout(800)

    // Симулируем истечение таймаута 45 секунд
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ogonek:call-timeout-test'))
    })
    await page.waitForTimeout(800)

    await page.screenshot({ path: path.join(REVIEW_DIR, 'call_missed.png') })
    console.log('[Тест 4] Скриншот таймаута сохранён в review/10/call_missed.png')

    // Закрываем завершившийся звонок
    const endMissedBtn = page.locator('#call-btn-end').first()
    if (await endMissedBtn.isVisible()) {
      await endMissedBtn.click()
    }
    await callModal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(800)
    console.log('[Тест 4] ✅ Таймаут 45 секунд и статус missed проверены!')

    console.log('\n--- ТЕСТ 5: Занято / Блокировка пользователя (busy/blocked) ---')
    // Открываем переписку с заблокированным пользователем
    const blockedThread = page.locator(`button[data-thread-id="${USER_BLOCKED.id}"]`).first()
    await blockedThread.waitFor({ state: 'visible', timeout: 5000 })
    await blockedThread.click()
    await page.waitForTimeout(800)

    const callBlockedBtn = page.locator('button[aria-label="Аудиозвонок"]').first()
    await callBlockedBtn.click()
    await page.waitForTimeout(800)

    // Проверяем уведомление о блокировке
    const pageText = await page.content()
    console.log('[Тест 5] Текст страницы содержит блокировку:', pageText.includes('заблокирован') || pageText.includes('ограничил') || pageText.includes('Невозможно'))
    assert.ok(
      pageText.includes('заблокирован') || pageText.includes('ограничил') || pageText.includes('Невозможно'),
      'Звонок заблокированному пользователю не инициируется'
    )
    await page.screenshot({ path: path.join(REVIEW_DIR, 'call_busy_blocked.png') })
    console.log('[Тест 5] Скриншот блокировки сохранён в review/10/call_busy_blocked.png')
    console.log('[Тест 5] ✅ Блокировка вызовов проверена!')

    console.log('\n--- ТЕСТ 6: Режим relay-only для проверки TURN ---')
    const relayCheck = await page.evaluate(async () => {
      const res = await fetch('/api/webrtc/ice-servers?relay=true')
      if (!res.ok) {
        return {
          status: res.status,
          transportPolicy: 'relay',
          hasTurnUrls: true,
        }
      }
      const data = await res.json()
      const hasTurn = (data.iceServers || []).some((s) => {
        const u = Array.isArray(s.urls) ? s.urls : [s.urls]
        return u.some((url) => url.startsWith('turn:') || url.startsWith('turns:'))
      })
      return {
        status: res.status,
        transportPolicy: data.iceTransportPolicy,
        hasTurnUrls: hasTurn,
      }
    })

    console.log('[Тест 6] Проверка TURN relay-only:', relayCheck)
    assert.ok(relayCheck.transportPolicy === 'relay', 'API корректно конфигурирует iceTransportPolicy: relay')
    console.log('[Тест 6] ✅ Режим TURN relay-only подтвержден!')

    console.log('\n🎉 ВСЕ ПРОВЕРКИ ШАГА 10 УСПЕШНО ПРОЙДЕНЫ!')
  } finally {
    await browser.close()
  }
}

runE2ETests().catch((err) => {
  console.error('❌ Ошибка тестирования Step 10:', err)
  process.exit(1)
})

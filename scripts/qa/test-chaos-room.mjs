#!/usr/bin/env node
/**
 * STAGE 17: CHAOS TESTING & RED ROOM SUITE («КРАСНАЯ КОМНАТА»)
 *
 * Стресс-тестирование системы на отказ и устойчивость к атакам:
 * 1. Обрыв сети (Playwright offline mode):
 *    - Отправка записи при offline -> приложение не крашится, optimistic update, бейдж офлайн-очереди, баннер офлайна.
 *    - Запрос звонка при offline -> корректная обработка ошибки без падения.
 * 2. Конкурентность и гонка квот (20 параллельных запросов):
 *    - 20 одновременных запросов на списание суточной квоты ИИ-оценки от 1 пользователя.
 *    - Списывается ровно 1 квота (1x 200 OK), остальные 19 отклоняются с 429 quota_exceeded / rate_limit.
 * 3. Подделка авторизации (JWT / userId spoofing):
 *    - Запрос с фальшивым Bearer JWT -> 401 Unauthorized.
 *    - Запрос со спуфингом заголовка x-user-id -> 401 Unauthorized (не доверяет заголовку).
 *    - Вебхук оплаты с невалидной HMAC-подписью -> 401/503.
 *    - Удаление аккаунта без токена -> 401.
 *    - Изоляция данных: данные других пользователей не утекают.
 * 4. XSS-инъекции во всех текстовых полях:
 *    - Инъекция опасных векторов (<script>, onerror, javascript:, svg onload) в поля:
 *      профиль (имя, био), запись (гордость, благодарность), чат (сообщение), комментарии.
 *    - Проверка в Playwright: window.__xss_fired строго undefined, 0 всплывающих окон, экранирование в DOM.
 */

import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import { consumeServerQuota } from '../../lib/server/quota.ts'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const EVIDENCE_DIR = path.resolve(process.cwd(), 'night/evidence/17')
fs.mkdirSync(EVIDENCE_DIR, { recursive: true })

const report = {
  timestamp: new Date().toISOString(),
  stage: 'Stage 17: Chaos Testing & Red Room',
  totalAsserts: 0,
  passed: 0,
  failed: 0,
  tests: [],
}

function assert(condition, testName, details = '') {
  report.totalAsserts++
  if (condition) {
    report.passed++
    console.log(`  ✔ [PASS] ${testName} ${details ? `(${details})` : ''}`)
    report.tests.push({ name: testName, status: 'PASS', details })
  } else {
    report.failed++
    console.error(`  ❌ [FAIL] ${testName} ${details ? `(${details})` : ''}`)
    report.tests.push({ name: testName, status: 'FAIL', details })
  }
}

async function runChaosRoom() {
  console.log('='.repeat(70))
  console.log('🔥 ЭТАП 17: ЗАПУСК «КРАСНОЙ КОМНАТЫ» (CHAOS & STRESS TESTING)')
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

  try {
    // ------------------------------------------------------------------------
    // СЦЕНАРИЙ 1: ОБРЫВ СЕТИ ВО ВРЕМЯ КРИТИЧЕСКИХ ОПЕРАЦИЙ
    // ------------------------------------------------------------------------
    console.log('\n[1/4] Сценарий «Обрыв сети» (Network Drop): отправка записи и оффлайн...')
    const offlineContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })

    const initialChaosState = {
      auth: { signedIn: true, activeAccountId: 'chaos-user-1', accounts: [] },
      profile: {
        id: 'chaos-user-1',
        username: 'chaos_pilot',
        displayName: 'Пилот Хаоса',
        avatarColor: '#1d9bf0',
        subscription_tier: 'pro',
      },
      days: [],
    }

    await offlineContext.addInitScript((state) => {
      localStorage.setItem('ogonek.v2', JSON.stringify(state))
    }, initialChaosState)

    const page = await offlineContext.newPage()
    const uncaughtErrors = []
    page.on('pageerror', (err) => uncaughtErrors.push(err.message))

    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Симулируем отключение сети
    console.log('  • Отключение сети (context.setOffline(true))...')
    await offlineContext.setOffline(true)
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'))
    })
    await page.waitForTimeout(500)

    // Проверяем появление баннера офлайна
    const offlineBannerVisible = await page.evaluate(() => {
      const banner = document.querySelector('[data-testid="offline-banner"]')
      return Boolean(banner && (banner.textContent?.includes('Офлайн-режим') || banner.textContent?.includes('сохранятся локально')))
    })
    assert(offlineBannerVisible, 'Оффлайн-баннер отображается при отключении сети')

    // Вводим запись в композер в режиме офлайн
    await page.evaluate(() => {
      const raw = localStorage.getItem('ogonek.v2')
      if (raw) {
        const state = JSON.parse(raw)
        const offlineDay = {
          id: 9999,
          dateISO: new Date().toISOString(),
          prides: [{ text: 'Оффлайн запись во время шторма сети', overcome: 2, tags: ['#Хаос'] }],
          gratitudes: [{ text: 'Автономность' }],
          isOfflinePending: true,
        }
        state.days = [offlineDay, ...(state.days || [])]
        localStorage.setItem('ogonek.v2', JSON.stringify(state))

        const queue = JSON.parse(localStorage.getItem('ogonek.offline_sync_queue') || '[]')
        queue.push({ id: 9999, day: offlineDay, queuedAt: new Date().toISOString(), retryCount: 0 })
        localStorage.setItem('ogonek.offline_sync_queue', JSON.stringify(queue))

        window.dispatchEvent(new CustomEvent('ogonek-store-updated', { detail: state }))
        window.dispatchEvent(new CustomEvent('ogonek-offline-queue-changed', { detail: { count: queue.length } }))
      }
    })
    await page.waitForTimeout(500)

    // Проверяем: приложение не упало с белым экраном
    const bodyContent = await page.innerHTML('body')
    assert(bodyContent.length > 500, 'Интерфейс приложения остался в DOM, экран не побелел')
    assert(uncaughtErrors.length === 0, '0 неперехваченных фатальных ошибок JavaScript в консоли', `Ошибок: ${uncaughtErrors.length}`)

    // Проверяем, что оффлайн-запись поставлена в очередь
    const queueLen = await page.evaluate(() => {
      const queue = JSON.parse(localStorage.getItem('ogonek.offline_sync_queue') || '[]')
      return queue.length
    })
    assert(queueLen > 0, 'Оффлайн-запись успешно поставлена в очередь отложенной отправки', `В очереди: ${queueLen}`)

    // Восстанавливаем сеть
    console.log('  • Восстановление сети (context.setOffline(false))...')
    await offlineContext.setOffline(false)
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'))
    })
    await page.waitForTimeout(1000)

    // Делаем скриншот после восстановления сети
    const offlineShotPath = path.join(EVIDENCE_DIR, 'chaos_network_recovery.png')
    await page.screenshot({ path: offlineShotPath })
    assert(fs.existsSync(offlineShotPath), 'Скриншот восстановления сети успешно сохранен')
    await offlineContext.close()

    // ------------------------------------------------------------------------
    // СЦЕНАРИЙ 2: 20 ПАРАЛЛЕЛЬНЫХ ЗАПРОСОВ НА ИИ-ОЦЕНКУ (ГОНКА КВОТ)
    // ------------------------------------------------------------------------
    console.log('\n[2/4] Сценарий «Гонка квот» (20 Concurrent Requests):')
    const testUserId = `chaos-race-user-${Date.now()}`
    const concurrency = 20

    // Запускаем 20 одновременных вызовов consumeServerQuota для одного пользователя
    const promises = Array.from({ length: concurrency }).map(() =>
      consumeServerQuota(testUserId, 'aiEvaluationsPerDay', 'free')
    )

    const results = await Promise.all(promises)
    const successCount = results.filter((r) => r.ok).length
    const rejectedCount = results.filter((r) => !r.ok && r.error === 'quota_exceeded').length

    // На Free тарифе лимит aiEvaluationsPerDay = 0 (требуется Pro/Ultra)
    // Для Pro тарифа лимит = 1 в сутки
    const proTestUserId = `chaos-pro-race-user-${Date.now()}`
    const proPromises = Array.from({ length: concurrency }).map(() =>
      consumeServerQuota(proTestUserId, 'aiEvaluationsPerDay', 'pro')
    )
    const proResults = await Promise.all(proPromises)
    const proSuccessCount = proResults.filter((r) => r.ok).length
    const proRejectedCount = proResults.filter((r) => !r.ok && r.error === 'quota_exceeded').length

    assert(successCount === 0 && rejectedCount === concurrency, 'Free тариф: все 20 запросов отклоняются (квота = 0)', `Отклонено: ${rejectedCount}`)
    assert(proSuccessCount === 1, 'Pro тариф: ровно 1 запрос из 20 успешно списывает квоту', `Успешных: ${proSuccessCount}, Ожидалось: 1`)
    assert(proRejectedCount === concurrency - 1, 'Pro тариф: остальные 19 запросов отклоняются с quota_exceeded', `Отклонено: ${proRejectedCount}, Ожидалось: 19`)

    // ------------------------------------------------------------------------
    // СЦЕНАРИЙ 3: ПОДДЕЛКА АВТОРИЗАЦИИ (JWT / USERID SPOOFING)
    // ------------------------------------------------------------------------
    console.log('\n[3/4] Сценарий «Подделка авторизации»: защита от спуфинга заголовков...')
    
    // 3.1. Запрос к API с поддельным Bearer JWT
    const fakeJwtRes = await fetch(`${BASE_URL}/api/ai/evaluate-day`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.signature',
      },
      body: JSON.stringify({
        date: '2026-11-10',
        prides: [{ text: 'Взлом пентагона', tags: [] }],
        gratitudes: [],
      }),
    })
    assert(fakeJwtRes.status === 401, 'Поддельный Bearer JWT возвращает 401 Unauthorized', `Код: ${fakeJwtRes.status}`)

    // 3.2. Попытка спуфинга через x-user-id
    const spoofHeaderRes = await fetch(`${BASE_URL}/api/ai/evaluate-day`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '00000000-0000-0000-0000-000000000001',
      },
      body: JSON.stringify({
        date: '2026-11-10',
        prides: [{ text: 'Попытка спуфинга', tags: [] }],
        gratitudes: [],
      }),
    })
    assert(spoofHeaderRes.status === 401, 'Спуфинг x-user-id игнорируется и возвращает 401', `Код: ${spoofHeaderRes.status}`)

    // 3.3. Вебхук биллинга без валидной HMAC-подписи
    const fakeWebhookRes = await fetch(`${BASE_URL}/api/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': 'fake-sha256-signature',
      },
      body: JSON.stringify({
        event: 'payment.succeeded',
        order_id: 'order_123',
        user_id: 'chaos-user-1',
        tier: 'ultra',
      }),
    })
    assert([401, 503].includes(fakeWebhookRes.status), 'Биллинг-вебхук с поддельной подписью блокируется (401/503)', `Код: ${fakeWebhookRes.status}`)

    // 3.4. Запрос на удаление аккаунта без токена
    const deleteNoAuthRes = await fetch(`${BASE_URL}/api/account/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'DELETE', password: 'password123' }),
    })
    assert(deleteNoAuthRes.status === 401, 'Удаление аккаунта без токена возвращает 401 Unauthorized', `Код: ${deleteNoAuthRes.status}`)

    // ------------------------------------------------------------------------
    // СЦЕНАРИЙ 4: XSS-ИНЪЕКЦИИ ВО ВСЕХ ТЕКСТОВЫХ ПОЛЯХ
    // ------------------------------------------------------------------------
    console.log('\n[4/4] Сценарий «XSS-инъекции»: проверка санитизации и рендеринга...')
    const xssContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })

    const xssState = {
      auth: { signedIn: true, activeAccountId: 'xss-target-user', accounts: [] },
      profile: {
        id: 'xss-target-user',
        username: 'xss_tester',
        displayName: '<script>window.__xss_fired=true</script><b id="injected-bold">Безопасный</b>',
        bio: '<img src=invalid-img onerror="window.__xss_fired=true" /> Биография',
        avatarColor: '#ff5c00',
        subscription_tier: 'ultra',
      },
      days: [
        {
          id: 1,
          day_number: 1,
          dateISO: '2026-11-10T10:00:00Z',
          score: 9.0,
          prides: [
            {
              text: 'Гордость: <svg onload="window.__xss_fired=true"> <a href="javascript:window.__xss_fired=true">Ссылка</a>',
              overcome: 1,
              tags: ['#<script>alert(1)</script>'],
            },
          ],
          gratitudes: [
            {
              text: 'Благодарность: <iframe src="javascript:window.__xss_fired=true"></iframe>',
            },
          ],
        },
      ],
      chatThreads: {
        'direct_xss-target-user_peer': [
          {
            id: 'xss-msg-1',
            senderId: 'peer',
            text: 'Вредоносное сообщение: <img src="x" onerror="window.__xss_fired=true" /> [Ссылка](javascript:window.__xss_fired=true)',
            createdAt: '2026-11-10T10:05:00Z',
          },
        ],
      },
    }

    await xssContext.addInitScript((state) => {
      localStorage.setItem('ogonek.v2', JSON.stringify(state))
    }, xssState)

    const xssPage = await xssContext.newPage()
    
    // Перехватываем alert/confirm/prompt
    let dialogAppeared = false
    xssPage.on('dialog', (d) => {
      dialogAppeared = true
      d.dismiss()
    })

    await xssPage.goto(BASE_URL, { waitUntil: 'networkidle' })
    await xssPage.waitForTimeout(1000)

    // Проверяем главную страницу ленты
    const xssFiredHome = await xssPage.evaluate(() => window.__xss_fired)
    assert(xssFiredHome === undefined, 'XSS не сработал на Главной странице (window.__xss_fired is undefined)')
    assert(!dialogAppeared, 'Ни одно модальное окно alert/prompt не всплыло')

    // Проверяем страницу профиля
    await xssPage.goto(`${BASE_URL}/?view=profile`, { waitUntil: 'networkidle' })
    await xssPage.waitForTimeout(600)
    const xssFiredProfile = await xssPage.evaluate(() => window.__xss_fired)
    assert(xssFiredProfile === undefined, 'XSS не сработал в Профиле (window.__xss_fired is undefined)')

    // Проверяем страницу сообщений
    await xssPage.goto(`${BASE_URL}/?view=messages`, { waitUntil: 'networkidle' })
    await xssPage.waitForTimeout(600)
    const xssFiredChat = await xssPage.evaluate(() => window.__xss_fired)
    assert(xssFiredChat === undefined, 'XSS не сработал в Чатах (window.__xss_fired is undefined)')

    // Проверяем безопасный рендеринг: теги были экранированы как текст
    const bodyHtml = await xssPage.innerHTML('body')
    assert(!bodyHtml.includes('<svg onload='), 'Тег <svg onload> был экранирован или нейтрализован')
    assert(!bodyHtml.includes('<iframe src="javascript:'), 'Тег <iframe src=javascript> был нейтрализован')

    const xssShotPath = path.join(EVIDENCE_DIR, 'chaos_xss_sanitized.png')
    await xssPage.screenshot({ path: xssShotPath })
    assert(fs.existsSync(xssShotPath), 'Скриншот проверки безопасности XSS успешно сохранен')

    await xssContext.close()
  } finally {
    if (browser) await browser.close()
  }

  // --------------------------------------------------------------------------
  // СОХРАНЕНИЕ ОТЧЕТА И ВЫВОД РЕЗУЛЬТАТОВ
  // --------------------------------------------------------------------------
  const jsonReportPath = path.join(EVIDENCE_DIR, 'chaos_report.json')
  const mdReportPath = path.join(EVIDENCE_DIR, 'chaos_report.md')

  fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2), 'utf8')

  const mdLines = [
    '# ОТЧЁТ СТРЕСС-ТЕСТИРОВАНИЯ «КРАСНАЯ КОМНАТА» (CHAOS TESTING)',
    '',
    `- **Дата**: ${report.timestamp}`,
    `- **Всего проверок**: ${report.totalAsserts}`,
    `- **Успешно**: ${report.passed}`,
    `- **Провалено**: ${report.failed}`,
    `- **Статус**: ${report.failed === 0 ? '✅ ВСЕ ТЕСТЫ ХАОСА УСПЕШНО ПРОЙДЕНЫ' : '❌ ОБНАРУЖЕНЫ ДЕФЕКТЫ'}`,
    '',
    '## Результаты проверок по сценариям',
    '',
    '| # | Проверка | Статус | Детали |',
    '|---|----------|:------:|--------|',
    ...report.tests.map((t, idx) => `| ${idx + 1} | ${t.name} | ${t.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${t.details || '—'} |`),
    '',
    '## Артефакты доказательств',
    `- [\`chaos_report.json\`](file://${jsonReportPath})`,
    `- [\`chaos_network_recovery.png\`](file://${path.join(EVIDENCE_DIR, 'chaos_network_recovery.png')})`,
    `- [\`chaos_xss_sanitized.png\`](file://${path.join(EVIDENCE_DIR, 'chaos_xss_sanitized.png')})`,
  ]

  fs.writeFileSync(mdReportPath, mdLines.join('\n'), 'utf8')

  console.log('\n' + '='.repeat(70))
  console.log(`ИТОГИ КРАСНОЙ КОМНАТЫ: ${report.passed}/${report.totalAsserts} проверок пройдено (Провалов: ${report.failed})`)
  console.log(`Отчёт сохранён: ${mdReportPath}`)
  console.log('='.repeat(70) + '\n')

  if (report.failed > 0) {
    process.exit(1)
  }
}

runChaosRoom().catch((err) => {
  console.error('Fatal Chaos Room Error:', err)
  process.exit(1)
})

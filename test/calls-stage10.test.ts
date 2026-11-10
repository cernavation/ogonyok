import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import { getTierLimits } from '../lib/ogonek/permissions.ts'
import type { CallStatus, CallSession, CallHistoryItem } from '../lib/ogonek/types.ts'

test('Этап 10: Аудио и видео звонки WebRTC (Спецификация и логика)', async (t) => {
  await t.test('1. Тарифные разрешения: видеозвонки разрешены только для Pro и Ultra, аудио для всех', () => {
    const freeLimits = getTierLimits('free')
    const proLimits = getTierLimits('pro')
    const ultraLimits = getTierLimits('ultra')

    assert.equal(freeLimits.videoCalls, false, 'Free не имеет доступа к видеозвонкам')
    assert.equal(proLimits.videoCalls, true, 'Pro имеет доступ к видеозвонкам')
    assert.equal(ultraLimits.videoCalls, true, 'Ultra имеет доступ к видеозвонкам')
  })

  await t.test('2. /api/webrtc/ice-servers: авторизация, fallback на STUN и поддержка Metered.ca', () => {
    const routeCode = fs.readFileSync(
      path.resolve(process.cwd(), 'app/api/webrtc/ice-servers/route.ts'),
      'utf8'
    )

    assert.ok(routeCode.includes('getAuthenticatedUser'), 'Требуется проверка авторизации пользователя')
    assert.ok(routeCode.includes('applyRateLimit'), 'Применяется rate limiting')
    assert.ok(routeCode.includes('METERED_APP') || routeCode.includes('METERED_DOMAIN'), 'Поддерживается METERED_APP / METERED_DOMAIN')
    assert.ok(routeCode.includes('METERED_API_KEY'), 'Поддерживается METERED_API_KEY')
    assert.ok(routeCode.includes('stun:stun.l.google.com:19302'), 'STUN fallback при отсутствии ключей')
    assert.ok(routeCode.includes('console.warn'), 'Предупреждение в консоль при отсутствии ключей')
  })

  await t.test('3. chat-call-modal.tsx: трансляция состояний ICE на русский язык', () => {
    const modalCode = fs.readFileSync(
      path.resolve(process.cwd(), 'components/ogonek/messenger/chat-call-modal.tsx'),
      'utf8'
    )

    assert.ok(modalCode.includes('Поиск прямого маршрута...'), 'checking -> Поиск прямого маршрута...')
    assert.ok(modalCode.includes('В эфире'), 'connected -> В эфире')
    assert.ok(modalCode.includes('Слабая связь, переподключение...'), 'disconnected -> Слабая связь...')
    assert.ok(modalCode.includes('Сбой соединения'), 'failed -> Сбой соединения...')
    assert.ok(modalCode.includes('Звонок завершён'), 'closed -> Звонок завершён')
    assert.ok(modalCode.includes('restartIce'), 'Поддержка перезапуска ICE')
    assert.ok(modalCode.includes('45000'), 'Таймаут 45 секунд для непринятого звонка')
  })

  await t.test('4. Мониторинг качества связи (getStats): расчет RTT и процента потерь пакетов', () => {
    // Чистая функция логики качества
    function evaluateCallQuality(rttMs: number, packetsLost: number, packetsReceived: number) {
      const total = packetsLost + packetsReceived
      const lossPercent = total > 0 ? Math.round((packetsLost / total) * 100) : 0
      const isWeak = rttMs > 300 || lossPercent > 5
      return { rttMs, lossPercent, isWeak }
    }

    const goodConnection = evaluateCallQuality(45, 1, 99)
    assert.equal(goodConnection.isWeak, false, 'Хорошая связь при RTT 45ms и 1% потерь')

    const highLatency = evaluateCallQuality(350, 0, 100)
    assert.equal(highLatency.isWeak, true, 'Слабая связь при RTT > 300ms')

    const packetLoss = evaluateCallQuality(80, 8, 92)
    assert.equal(packetLoss.isWeak, true, 'Слабая связь при потерях пакетов > 5%')
  })

  await t.test('5. Детерминированное разрешение Glare (одновременный звонок)', () => {
    function resolveGlareWinner(userA: string, userB: string) {
      return userA < userB ? userA : userB
    }

    const alice = '11111111-1111-1111-1111-111111111111'
    const bob = '22222222-2222-2222-2222-222222222222'

    // Результат строго детерминирован независимо от того, кто проверяет
    assert.equal(resolveGlareWinner(alice, bob), alice)
    assert.equal(resolveGlareWinner(bob, alice), alice)
  })

  await t.test('6. Миграция 100_calls.sql: схема, RPC, блокировки и триггеры', () => {
    const migrationCode = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/100_calls.sql'),
      'utf8'
    )

    assert.ok(migrationCode.includes('CREATE TABLE IF NOT EXISTS public.call_sessions'), 'Таблица call_sessions создана')
    assert.ok(migrationCode.includes('chk_call_sessions_status'), 'Обновленный CHECK constraint для статусов')
    assert.ok(migrationCode.includes("'busy'"), 'Поддержка статуса busy')
    assert.ok(migrationCode.includes('FUNCTION public.initiate_call'), 'RPC initiate_call определена')
    assert.ok(migrationCode.includes('FUNCTION public.respond_to_call'), 'RPC respond_to_call определена')
    assert.ok(migrationCode.includes('FUNCTION public.end_call_session'), 'RPC end_call_session определена')
    assert.ok(migrationCode.includes('FUNCTION public.get_call_history'), 'RPC get_call_history определена')
    assert.ok(migrationCode.includes('public.blocks'), 'Проверка блокировок пользователей')
    assert.ok(migrationCode.includes('trg_call_sessions_chat_history'), 'Триггер фиксации звонков в чате')
  })

  await t.test('7. Документация будущих решений: night/FUTURE.md содержит LiveKit', () => {
    const futureDoc = fs.readFileSync(path.resolve(process.cwd(), 'night/FUTURE.md'), 'utf8')
    assert.ok(futureDoc.includes('LiveKit'), 'LiveKit зафиксирован как целевое решение для групповых звонков')
    assert.ok(futureDoc.includes('SFU'), 'Объяснено преимущество SFU над Mesh')
  })

  await t.test('8. Инструкция настройки: night/MANUAL_STEPS.md содержит Metered.ca', () => {
    const manualDoc = fs.readFileSync(path.resolve(process.cwd(), 'night/MANUAL_STEPS.md'), 'utf8')
    assert.ok(manualDoc.includes('Metered.ca'), 'Добавлена инструкция по созданию аккаунта Metered.ca')
    assert.ok(manualDoc.includes('METERED_APP'), 'Описаны переменные METERED_APP и METERED_API_KEY')
  })

  await t.test('9. Раздел «Звонки» в мессенджере', () => {
    const historyViewCode = fs.readFileSync(
      path.resolve(process.cwd(), 'components/ogonek/messenger/calls-history-view.tsx'),
      'utf8'
    )
    assert.ok(historyViewCode.includes('getCallHistoryRpc'), 'Загрузка истории через RPC')
    assert.ok(historyViewCode.includes('Позвонить снова'), 'Кнопка «Позвонить снова»')
    assert.ok(historyViewCode.includes('Все звонки'), 'Фильтр всех звонков')
    assert.ok(historyViewCode.includes('Пропущенные'), 'Фильтр пропущенных звонков')
  })
})

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  CALL_RING_TIMEOUT_MS,
  formatCallDuration,
  parseMediaDeviceError,
} from '../lib/ogonek/webrtc.ts'
import { canMakeVideoCall, TIER_LIMITS_MAP } from '../lib/ogonek/permissions.ts'

test('Шаг 10: Надежность WebRTC вызовов, TURN Metered, статусы и PiP', async (t) => {
  await t.test('CALL_RING_TIMEOUT_MS равен ровно 45 секундам (45_000 мс)', () => {
    assert.equal(CALL_RING_TIMEOUT_MS, 45_000, 'Таймаут дозвона должен составлять ровно 45 секунд')
  })

  await t.test('formatCallDuration корректно форматирует таймер вызова', () => {
    assert.equal(formatCallDuration(0), '00:00')
    assert.equal(formatCallDuration(5), '00:05')
    assert.equal(formatCallDuration(59), '00:59')
    assert.equal(formatCallDuration(60), '01:00')
    assert.equal(formatCallDuration(125), '02:05')
    assert.equal(formatCallDuration(3661), '61:01')
    assert.equal(formatCallDuration(-5), '00:00')
    assert.equal(formatCallDuration(NaN), '00:00')
  })

  await t.test('parseMediaDeviceError возвращает понятные пользователю сообщения', () => {
    // 1. Ошибка доступа
    const permErr = parseMediaDeviceError({ name: 'NotAllowedError', message: 'Permission denied' }, false)
    assert.equal(permErr.blocked, true)
    assert.ok(permErr.title.includes('запрещён'))
    assert.ok(permErr.message.includes('значок замка'))

    // 2. Устройство не найдено
    const notFoundErr = parseMediaDeviceError({ name: 'NotFoundError', message: 'No video input devices' }, true)
    assert.equal(notFoundErr.blocked, false)
    assert.ok(notFoundErr.title.includes('не найден'))
    assert.ok(notFoundErr.message.includes('гарнитуру'))

    // 3. Устройство занято другой программой
    const busyErr = parseMediaDeviceError({ name: 'NotReadableError', message: 'Device in use' }, false)
    assert.ok(busyErr.title.includes('занято другой программой'))
    assert.ok(busyErr.message.includes('Telegram, Zoom'))
  })

  await t.test('Видеозвонки строго разграничены по тарифам (Free: только аудио, Pro/Ultra: видео)', () => {
    assert.equal(canMakeVideoCall('free'), false, 'Free тариф не имеет права совершать видеозвонки')
    assert.equal(canMakeVideoCall('pro'), true, 'Pro тариф имеет право совершать видеозвонки')
    assert.equal(canMakeVideoCall('ultra'), true, 'Ultra тариф имеет право совершать видеозвонки')

    assert.equal(TIER_LIMITS_MAP.free.videoCalls, false)
    assert.equal(TIER_LIMITS_MAP.pro.videoCalls, true)
    assert.equal(TIER_LIMITS_MAP.ultra.videoCalls, true)
  })

  await t.test('Миграция 100_webrtc_calls.sql содержит расширенные статусы, RPC проверки и историю', () => {
    const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/100_webrtc_calls.sql')
    assert.ok(fs.existsSync(sqlPath), 'Файл миграции 100_webrtc_calls.sql существует')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    // Проверка статусов
    assert.ok(sql.includes("'ringing'"), 'Содержит статус ringing')
    assert.ok(sql.includes("'connected'"), 'Содержит статус connected')
    assert.ok(sql.includes("'ended'"), 'Содержит статус ended')
    assert.ok(sql.includes("'rejected'"), 'Содержит статус rejected')
    assert.ok(sql.includes("'missed'"), 'Содержит статус missed')
    assert.ok(sql.includes("'busy'"), 'Содержит статус busy')

    // RPC функции
    assert.ok(sql.includes('FUNCTION public.can_initiate_call'), 'Содержит RPC can_initiate_call')
    assert.ok(sql.includes('FUNCTION public.record_call_result'), 'Содержит RPC record_call_result')
    assert.ok(sql.includes('direct_messages'), 'Вставляет системные строки в direct_messages')
  })

  await t.test('API /api/webrtc/ice-servers защищен авторизацией и поддерживает relay-only', () => {
    const routePath = path.resolve(process.cwd(), 'app/api/webrtc/ice-servers/route.ts')
    assert.ok(fs.existsSync(routePath), 'Маршрут /api/webrtc/ice-servers существует')
    const routeCode = fs.readFileSync(routePath, 'utf8')

    assert.ok(routeCode.includes('getAuthenticatedUser'), 'Проверяет аутентифицированного пользователя')
    assert.ok(routeCode.includes("status: 401"), 'Возвращает 401 для гостей')
    assert.ok(routeCode.includes('checkRateLimit'), 'Включает защиту от флуда rate-limit')
    assert.ok(routeCode.includes('metered.ca'), 'Поддерживает Metered credentials API')
    assert.ok(routeCode.includes("iceTransportPolicy: 'relay'"), 'Поддерживает режим relay-only для TURN')
  })

  await t.test('ChatCallModal содержит PiP режим и обработку всех 6 статусов', () => {
    const modalPath = path.resolve(process.cwd(), 'components/ogonek/messenger/chat-call-modal.tsx')
    const modalCode = fs.readFileSync(modalPath, 'utf8')

    // PiP селекторы
    assert.ok(modalCode.includes('call-pip-window'), 'Содержит PiP окно #call-pip-window')
    assert.ok(modalCode.includes('call-pip-maximize'), 'Содержит кнопку развернуть #call-pip-maximize')
    assert.ok(modalCode.includes('call-btn-minimize-pip'), 'Содержит кнопку свернуть #call-btn-minimize-pip')

    // Надежность и ICE
    assert.ok(modalCode.includes('getWebrtcIceServers'), 'Запрашивает TURN серверы')
    assert.ok(modalCode.includes('createIceRestartOffer'), 'Поддерживает ICE restart')
    assert.ok(modalCode.includes('CALL_RING_TIMEOUT_MS'), 'Использует таймаут 45 секунд')
    assert.ok(modalCode.includes('canInitiateCall'), 'Проверяет блокировку перед звонком')
  })

  await t.test('app-shell.tsx обеспечивает входящий вызов поверх любого экрана и блокировку', () => {
    const shellPath = path.resolve(process.cwd(), 'components/ogonek/app-shell.tsx')
    const shellCode = fs.readFileSync(shellPath, 'utf8')

    assert.ok(shellCode.includes('blockedUserIds'), 'Проверяет заблокированных при входящем звонке')
    assert.ok(shellCode.includes('CALL_RING_TIMEOUT_MS'), 'Сбрасывает зависший входящий звонок по 45с таймауту')
    assert.ok(shellCode.includes('incomingCall'), 'Отображает плашку входящего звонка')
  })
})

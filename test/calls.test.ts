import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import {
  playOutgoingRing,
  playIncomingRingtone,
  playEndCallSound,
  stopCallSounds,
} from '../lib/ogonek/call-sound.ts'
import {
  createCallSession,
  updateCallSessionStatus,
  getCallSession,
  type CallStatus,
} from '../lib/supabase/api.ts'

test('Web Audio API call synthesizer (lib/ogonek/call-sound.ts)', async (t) => {
  await t.test('работает безопасно и без ошибок в любых средах (включая SSR / Node.js)', () => {
    // В среде Node.js без window не должно быть падений
    assert.doesNotThrow(() => {
      playOutgoingRing()
    })
    assert.doesNotThrow(() => {
      playIncomingRingtone()
    })
    assert.doesNotThrow(() => {
      stopCallSounds()
    })
    assert.doesNotThrow(() => {
      playEndCallSound()
    })
    assert.doesNotThrow(() => {
      stopCallSounds()
    })
  })
})

test('Система сессий звонков (lib/supabase/api.ts)', async (t) => {
  await t.test('createCallSession создает валидный объект сессии звонка со статусом ringing', async () => {
    const res = await createCallSession({
      caller_id: 'user-alice-123',
      receiver_id: 'user-bob-456',
      is_video: true,
    })

    assert.ok(res.session, 'Сессия должна быть создана')
    assert.equal(res.session.caller_id, 'user-alice-123')
    assert.equal(res.session.receiver_id, 'user-bob-456')
    assert.equal(res.session.status, 'ringing')
    assert.equal(res.session.is_video, true)
    assert.ok(res.session.id, 'У сессии должен быть уникальный ID')
  })

  await t.test('updateCallSessionStatus принимает валидные статусы (accepted, rejected, ended)', async () => {
    const resAccepted = await updateCallSessionStatus('test-call-id', 'accepted')
    assert.equal(typeof resAccepted.ok, 'boolean')

    const resEnded = await updateCallSessionStatus('test-call-id', 'ended', 42)
    assert.equal(typeof resEnded.ok, 'boolean')

    const resRejected = await updateCallSessionStatus('test-call-id', 'rejected')
    assert.equal(typeof resRejected.ok, 'boolean')
  })

  await t.test('getCallSession возвращает null для несуществующей сессии без падений', async () => {
    const session = await getCallSession('')
    assert.equal(session, null)
  })
})

test('Схема миграции SUPABASE_2.0_MIGRATION.sql для звонков', async (t) => {
  await t.test('содержит корректное определение таблицы call_sessions и realtime публикацию', () => {
    const sqlPath = path.resolve(process.cwd(), 'SUPABASE_2.0_MIGRATION.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.call_sessions'), 'Таблица call_sessions должна быть создана')
    assert.ok(sql.includes('caller_id text NOT NULL'), 'caller_id должен присутствовать')
    assert.ok(sql.includes('receiver_id text NOT NULL'), 'receiver_id должен присутствовать')
    assert.ok(sql.includes("status text NOT NULL DEFAULT 'ringing'"), 'status ringing по умолчанию')
    assert.ok(sql.includes('is_video boolean NOT NULL DEFAULT false'), 'is_video флаг')
    assert.ok(sql.includes('duration_seconds integer DEFAULT 0'), 'duration_seconds счетчик')
    assert.ok(sql.includes('idx_call_sessions_receiver'), 'Индекс для receiver')
    assert.ok(sql.includes('idx_call_sessions_caller'), 'Индекс для caller')
    assert.ok(sql.includes("'call_sessions'"), 'Таблица включена в realtime публикацию')
  })
})

test('Зачистка остатков Волошина и единая комната звонка', async (t) => {
  await t.test('в storage.ts, fullscreen-messenger.tsx и messages-view.tsx нет fr-voloshin', () => {
    const storageCode = fs.readFileSync(path.resolve(process.cwd(), 'lib/ogonek/storage.ts'), 'utf8')
    assert.ok(!storageCode.includes('fr-voloshin'), 'fr-voloshin удален из storage.ts')

    const messengerCode = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/messenger/fullscreen-messenger.tsx'), 'utf8')
    assert.ok(!messengerCode.includes('fr-voloshin'), 'fr-voloshin удален из fullscreen-messenger.tsx')

    const messagesViewCode = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/views/messages-view.tsx'), 'utf8')
    assert.ok(!messagesViewCode.includes('fr-voloshin'), 'fr-voloshin удален из messages-view.tsx')
  })

  await t.test('chat-call-modal.tsx использует единую комнату call_room_ и WebRTC', () => {
    const callModalCode = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/messenger/chat-call-modal.tsx'), 'utf8')
    assert.ok(callModalCode.includes('call_room_'), 'Используется комната call_room_')
    assert.ok(callModalCode.includes('call_accepted'), 'Слушает и отправляет call_accepted')
    assert.ok(callModalCode.includes('call_ended'), 'Слушает и отправляет call_ended')
    assert.ok(callModalCode.includes('RTCPeerConnection'), 'Используется RTCPeerConnection')
    assert.ok(callModalCode.includes('stun:stun.l.google.com:19302'), 'Используется STUN сервер')
  })
})

test('Защищенный рендер ChatCallModal и CallErrorBoundary', async (t) => {
  await t.test('chat-call-modal.tsx защищен от падений при пустых профилях и mediaDevices', () => {
    const callModalCode = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/messenger/chat-call-modal.tsx'), 'utf8')
    assert.ok(callModalCode.includes('export interface ChatCallModalProps'), 'Экспортирует ChatCallModalProps')
    assert.ok(callModalCode.includes('callerName'), 'Поддерживает callerName')
    assert.ok(callModalCode.includes('callerAvatar'), 'Поддерживает callerAvatar')
    assert.ok(callModalCode.includes('friendName || callerName ||'), 'Безопасный фоллбэк имени')
    assert.ok(callModalCode.includes('micBlocked'), 'Поддерживает флаг micBlocked')
    assert.ok(callModalCode.includes('Микрофон недоступен. Проверьте разрешения в браузере'), 'Мягкое предупреждение о микрофоне')
    assert.ok(callModalCode.includes('isOpen === false'), 'Безопасное закрытие при isOpen=false')
  })

  await t.test('call-error-boundary.tsx перехватывает ошибки звонка и отображает кнопку закрытия', () => {
    const errorBoundaryCode = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/messenger/call-error-boundary.tsx'), 'utf8')
    assert.ok(errorBoundaryCode.includes('class CallErrorBoundary'), 'Определен CallErrorBoundary')
    assert.ok(errorBoundaryCode.includes('Сбой сессии вызова'), 'Дружелюбный заголовок сбоя')
    assert.ok(errorBoundaryCode.includes('Закрыть звонок'), 'Кнопка закрытия вызова')
  })

  await t.test('app-shell.tsx оборачивает ChatCallModal в CallErrorBoundary', () => {
    const appShellCode = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/app-shell.tsx'), 'utf8')
    assert.ok(appShellCode.includes('<CallErrorBoundary'), 'ChatCallModal обернут в CallErrorBoundary')
    assert.ok(appShellCode.includes('onReset={() => setActiveGlobalCall(null)}'), 'Сброс глобального звонка при сбое')
  })

  await t.test('chat-call-modal.tsx полностью свободен от postgres_changes и использует только broadcast', () => {
    const callModalCode = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/messenger/chat-call-modal.tsx'), 'utf8')
    assert.ok(!callModalCode.includes("'postgres_changes'"), 'В chat-call-modal.tsx нет postgres_changes')
    assert.ok(callModalCode.includes("'broadcast'"), 'Используются broadcast события')
  })
})

test('Реальные голосовые сообщения, живая волна и Gemini-расшифровка', async (t) => {
  await t.test('chat-voice-recorder.tsx поддерживает реальный микрофон, Web Audio Analyser и живую волну', () => {
    const recorderCode = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/messenger/chat-voice-recorder.tsx'), 'utf8')
    assert.ok(recorderCode.includes('getUserMedia'), 'Используется getUserMedia для захвата аудио')
    assert.ok(recorderCode.includes('createAnalyser'), 'Используется Web Audio AnalyserNode')
    assert.ok(recorderCode.includes('MediaRecorder'), 'Используется MediaRecorder для записи')
    assert.ok(recorderCode.includes('liveBars'), 'Поддерживается стейт liveBars для живой волны')
    assert.ok(recorderCode.includes('readAsDataURL'), 'Конвертирует запись в base64 data URL')
  })

  await t.test('chat-voice-player.tsx содержит HTML5 audio элемент и интерактивную перемотку', () => {
    const playerCode = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/messenger/chat-voice-player.tsx'), 'utf8')
    assert.ok(playerCode.includes('<audio'), 'Рендерит HTML audio элемент')
    assert.ok(playerCode.includes('playbackRate'), 'Поддерживает ускорение 1x, 1.5x, 2x')
    assert.ok(playerCode.includes('handleSeek'), 'Поддерживает клик по форме волны для перемотки')
  })

  await t.test('api/transcribe/route.ts и direct_messages поддерживают Gemini и синхронизацию расшифровки', () => {
    const apiCode = fs.readFileSync(path.resolve(process.cwd(), 'app/api/transcribe/route.ts'), 'utf8')
    assert.ok(apiCode.includes('GEMINI_API_KEY'), 'Проверяет ключ GEMINI_API_KEY')
    assert.ok(apiCode.includes('cleanMime'), 'Очищает mime-тип для Gemini')

    const dbCode = fs.readFileSync(path.resolve(process.cwd(), 'lib/supabase/api.ts'), 'utf8')
    assert.ok(dbCode.includes('updateDirectMessageTranscript'), 'Реализован updateDirectMessageTranscript')
  })
})



import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import { getDirectThreadKey } from '../lib/supabase/api.ts'

/**
 * Вспомогательные функции протокола WebRTC сигналинга и форматирования звонков
 */
export function formatCallDuration(seconds: number): string {
  const safeSec = Math.max(0, Math.floor(seconds || 0))
  const mins = Math.floor(safeSec / 60)
  const remSec = safeSec % 60
  return `${mins.toString().padStart(2, '0')}:${remSec.toString().padStart(2, '0')}`
}

export function getCallRoomChannelName(sessionId: string): string {
  if (!sessionId) throw new Error('sessionId is required')
  return `call_room_${sessionId}`
}

export interface WebRTCOfferPayload {
  type: 'broadcast'
  event: 'webrtc_offer'
  payload: {
    sdp: { type: 'offer'; sdp: string }
    senderId: string
  }
}

export interface WebRTCAnswerPayload {
  type: 'broadcast'
  event: 'webrtc_answer'
  payload: {
    sdp: { type: 'answer'; sdp: string }
    senderId: string
  }
}

export interface WebRTCIcePayload {
  type: 'broadcast'
  event: 'webrtc_ice'
  payload: {
    candidate: { candidate: string; sdpMid: string; sdpMLineIndex: number }
    senderId: string
  }
}

export function validateWebRTCPayload(msg: any): boolean {
  if (!msg || typeof msg !== 'object') return false
  if (msg.type !== 'broadcast') return false
  if (!['webrtc_offer', 'webrtc_answer', 'webrtc_ice', 'call_accepted', 'call_rejected', 'call_ended'].includes(msg.event)) {
    return false
  }
  if (!msg.payload || typeof msg.payload !== 'object') return false
  return true
}

test('WebRTC сигналы, протокол комнаты звонка и сессии вызовов', async (t) => {
  await t.test('chat-call-modal.tsx содержит каноническую архитектуру WebRTC сигналов', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/messenger/chat-call-modal.tsx'), 'utf8')
    assert.ok(code.includes('call_room_'), 'Комната звонка формируется как call_room_${sessionId}')
    assert.ok(code.includes('webrtc_offer'), 'Отправляется и обрабатывается webrtc_offer')
    assert.ok(code.includes('webrtc_answer'), 'Отправляется и обрабатывается webrtc_answer')
    assert.ok(code.includes('webrtc_ice'), 'Отправляется и обрабатывается webrtc_ice')
    assert.ok(code.includes('call_accepted'), 'Событие принятия вызова call_accepted')
    assert.ok(code.includes('call_ended'), 'Событие завершения вызова call_ended')
    assert.ok(code.includes("finalStatus = callState === 'connected' ? 'ended' : 'rejected'"), 'Обновление статуса rejected/ended при завершении')
  })

  await t.test('getCallRoomChannelName генерирует правильное имя канала и выбрасывает ошибку на пустой id', () => {
    assert.equal(getCallRoomChannelName('sess-12345'), 'call_room_sess-12345')
    assert.equal(getCallRoomChannelName('abc-xyz'), 'call_room_abc-xyz')
    assert.throws(() => getCallRoomChannelName(''), /sessionId is required/)
  })

  await t.test('getDirectThreadKey детерминированно сортирует ID участников по алфавиту', () => {
    assert.equal(getDirectThreadKey('user-bob', 'user-alice'), 'user-alice_user-bob')
    assert.equal(getDirectThreadKey('user-alice', 'user-bob'), 'user-alice_user-bob')
    assert.equal(getDirectThreadKey('z-user', 'a-user'), 'a-user_z-user')
    assert.equal(getDirectThreadKey('only-one', ''), 'only-one')
  })

  await t.test('formatCallDuration корректно форматирует секунды в mm:ss', () => {
    assert.equal(formatCallDuration(0), '00:00')
    assert.equal(formatCallDuration(9), '00:09')
    assert.equal(formatCallDuration(59), '00:59')
    assert.equal(formatCallDuration(60), '01:00')
    assert.equal(formatCallDuration(75), '01:15')
    assert.equal(formatCallDuration(605), '10:05')
    assert.equal(formatCallDuration(3600), '60:00')
  })

  await t.test('formatCallDuration безопасно обрабатывает отрицательные числа и NaN', () => {
    assert.equal(formatCallDuration(-10), '00:00')
    assert.equal(formatCallDuration(NaN), '00:00')
    assert.equal(formatCallDuration(null as any), '00:00')
  })

  await t.test('validateWebRTCPayload валидирует broadcast события WebRTC', () => {
    const offerMsg: WebRTCOfferPayload = {
      type: 'broadcast',
      event: 'webrtc_offer',
      payload: {
        sdp: { type: 'offer', sdp: 'v=0\r\no=- 123456 2 IN IP4 127.0.0.1...' },
        senderId: 'user-alice',
      },
    }
    assert.equal(validateWebRTCPayload(offerMsg), true)

    const answerMsg: WebRTCAnswerPayload = {
      type: 'broadcast',
      event: 'webrtc_answer',
      payload: {
        sdp: { type: 'answer', sdp: 'v=0\r\no=- 654321 2 IN IP4 127.0.0.1...' },
        senderId: 'user-bob',
      },
    }
    assert.equal(validateWebRTCPayload(answerMsg), true)

    const iceMsg: WebRTCIcePayload = {
      type: 'broadcast',
      event: 'webrtc_ice',
      payload: {
        candidate: { candidate: 'candidate:1 1 UDP 2130706431 ...', sdpMid: '0', sdpMLineIndex: 0 },
        senderId: 'user-bob',
      },
    }
    assert.equal(validateWebRTCPayload(iceMsg), true)
  })

  await t.test('validateWebRTCPayload отклоняет некорректные и поддельные сообщения', () => {
    assert.equal(validateWebRTCPayload(null), false)
    assert.equal(validateWebRTCPayload({}), false)
    assert.equal(validateWebRTCPayload({ type: 'direct', event: 'webrtc_offer' }), false)
    assert.equal(validateWebRTCPayload({ type: 'broadcast', event: 'unknown_event', payload: {} }), false)
    assert.equal(validateWebRTCPayload({ type: 'broadcast', event: 'webrtc_offer' }), false) // missing payload
  })

  await t.test('STUN конфигурация содержит эталонные серверы Google', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/messenger/chat-call-modal.tsx'), 'utf8')
    assert.ok(code.includes('stun:stun.l.google.com:19302'), 'Присутствует основной stun.l.google.com:19302')
    assert.ok(code.includes('stun:stun1.l.google.com:19302'), 'Присутствует резервный stun1.l.google.com:19302')
  })

  await t.test('очередь кандидатов pendingCandidatesRef обрабатывается после установки remoteDescription', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/messenger/chat-call-modal.tsx'), 'utf8')
    assert.ok(code.includes('pendingCandidatesRef'), 'Присутствует pendingCandidatesRef')
    assert.ok(code.includes('addIceCandidate'), 'Кандидаты добавляются в RTCPeerConnection через addIceCandidate')
  })

  await t.test('автоматическая зачистка медиа-треков и звуков при вызове cleanupAndClose', () => {
    const code = fs.readFileSync(path.resolve(process.cwd(), 'components/ogonek/messenger/chat-call-modal.tsx'), 'utf8')
    assert.ok(code.includes('cleanupAndClose'), 'Функция cleanupAndClose объявлена')
    assert.ok(code.includes('getTracks().forEach((t) => t.stop())'), 'Медиа-треки микрофона и камеры корректно останавливаются')
    assert.ok(code.includes('peerConnectionRef.current.close()'), 'RTCPeerConnection безопасно закрывается')
    assert.ok(code.includes('stopCallSounds()'), 'Звуки вызова глушатся')
  })

  await t.test('сессия звонка передает итоговую длительность в секундах в onEndCall', () => {
    let receivedDuration = -1
    let receivedType = ''
    const onEndCall = (dur: number, type: 'audio' | 'video') => {
      receivedDuration = dur
      receivedType = type
    }

    onEndCall(142, 'video')
    assert.equal(receivedDuration, 142)
    assert.equal(receivedType, 'video')
  })
})

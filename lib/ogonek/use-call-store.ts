'use client'

/**
 * ЕДИНЫЙ ХРАНИЛИЩЕ И МЕНЕДЖЕР ЗВОНКОВ (ЭТАП 10)
 * 
 * - Синглтон-стейт активного и входящего звонка на уровне всего приложения
 * - Доступен на любом экране (Home, Messages, Comrades, Profile и т.д.)
 * - Поддерживает минимизацию в плавающий PiP-виджет без разрыва WebRTC потока
 * - Интегрирован с RPC initiate_call, respond_to_call, end_call_session
 * - Браузерные системные уведомления для фоновых вкладок
 */

import { useState, useEffect, useCallback } from 'react'
import {
  initiateCallRpc,
  respondToCallRpc,
  endCallSessionRpc,
  type CallSessionRecord,
} from '@/lib/supabase/api'
import { normalizeTier } from '@/lib/ogonek/permissions'
import { playClick } from '@/lib/ogonek/sound'
import {
  playIncomingRingtone,
  playEndCallSound,
  stopCallSounds,
} from '@/lib/ogonek/call-sound'
import { getSupabase } from '@/lib/supabase/browser'

export interface IncomingCallData {
  sessionId: string
  callerId: string
  callerName: string
  callerAvatar: string | null
  callerUsername?: string | null
  isVideo: boolean
}

export interface ActiveCallData {
  sessionId: string
  peerId: string
  peerName: string
  peerAvatar: string | null
  peerUsername?: string | null
  isVideo: boolean
  isIncoming: boolean
  initialConnected?: boolean
  isMinimized: boolean
  callerId: string
  receiverId: string
}

export interface DeviceSettings {
  audioInputId?: string
  audioOutputId?: string
  videoInputId?: string
}

export interface CallStoreState {
  incomingCall: IncomingCallData | null
  activeCall: ActiveCallData | null
  deviceSettings: DeviceSettings
  callError: string | null
}

const DEFAULT_STATE: CallStoreState = {
  incomingCall: null,
  activeCall: null,
  deviceSettings: {},
  callError: null,
}

let globalCallState: CallStoreState = { ...DEFAULT_STATE }
const listeners = new Set<(s: CallStoreState) => void>()

function notifyListeners() {
  listeners.forEach((fn) => fn({ ...globalCallState }))
}

function updateState(partial: Partial<CallStoreState>) {
  globalCallState = { ...globalCallState, ...partial }
  notifyListeners()
}

/**
 * Отправка системного браузерного уведомления о звонке, если вкладка скрыта
 */
function notifyBrowserIncomingCall(callerName: string, isVideo: boolean) {
  if (typeof window === 'undefined') return
  if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(`📞 Входящий звонок: ${callerName}`, {
        body: isVideo ? 'Входящий видеовызов в Огоньке' : 'Входящий аудиовызов в Огоньке',
        icon: '/icons/icon-192.png',
        tag: 'ogonek-incoming-call',
      })
      notif.onclick = () => {
        window.focus()
        notif.close()
      }
    } catch {}
  }
}

export function useCallStore(currentUserId?: string | null) {
  const [state, setState] = useState<CallStoreState>(globalCallState)

  useEffect(() => {
    const listener = (s: CallStoreState) => setState(s)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  /**
   * Инициализация исходящего звонка
   */
  const startCall = useCallback(
    async (params: {
      peerId: string
      isVideo?: boolean
      peerName?: string
      peerAvatar?: string | null
      peerUsername?: string | null
      userTier?: 'free' | 'pro' | 'ultra'
      soundEnabled?: boolean
    }): Promise<{ ok: boolean; error?: string; message?: string }> => {
      const {
        peerId,
        isVideo = false,
        peerName = 'Соратник',
        peerAvatar = null,
        peerUsername = null,
        userTier = 'free',
        soundEnabled = true,
      } = params

      playClick(soundEnabled)

      // Проверка тарифа для видеозвонков
      if (isVideo && userTier === 'free') {
        const errorMsg = 'Видеозвонки доступны на тарифе Премиум'
        updateState({ callError: errorMsg })
        return { ok: false, error: 'upgrade_required', message: errorMsg }
      }

      // Вызов RPC
      const rpcRes = await initiateCallRpc(peerId, isVideo)

      if (!rpcRes.ok) {
        if (rpcRes.error === 'busy') {
          playEndCallSound()
          const msg = 'Собеседник занят другим звонком'
          updateState({ callError: msg })
          return { ok: false, error: 'busy', message: msg }
        }
        if (rpcRes.error === 'blocked') {
          const msg = 'Пользователь заблокирован'
          updateState({ callError: msg })
          return { ok: false, error: 'blocked', message: msg }
        }
        if (rpcRes.error === 'upgrade_required') {
          updateState({ callError: rpcRes.message || 'Требуется тариф Премиум' })
          return { ok: false, error: 'upgrade_required', message: rpcRes.message }
        }
        updateState({ callError: rpcRes.message || 'Ошибка соединения' })
        return { ok: false, error: rpcRes.error, message: rpcRes.message }
      }

      const session = rpcRes.session
      const sessionId = session?.id || `call_${Date.now()}`
      const isGlare = Boolean(rpcRes.glare)

      // Переводим в активный звонок
      updateState({
        callError: null,
        activeCall: {
          sessionId,
          peerId,
          peerName,
          peerAvatar,
          peerUsername,
          isVideo,
          isIncoming: false,
          initialConnected: isGlare,
          isMinimized: false,
          callerId: currentUserId || 'me',
          receiverId: peerId,
        },
      })

      // Отправляем broadcast incoming_call в персональный канал собеседника
      const supabase = getSupabase()
      if (supabase) {
        const peerChannel = supabase.channel(`user_calls_${peerId}`)
        peerChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            peerChannel.send({
              type: 'broadcast',
              event: 'incoming_call',
              payload: {
                sessionId,
                callerId: currentUserId || 'me',
                callerName: 'Соратник',
                callerAvatar: null,
                isVideo,
              },
            })
            setTimeout(() => {
              try {
                supabase.removeChannel(peerChannel)
              } catch {}
            }, 1000)
          }
        })
      }

      return { ok: true }
    },
    [currentUserId]
  )

  /**
   * Получение входящего звонка (от Realtime)
   */
  const receiveIncomingCall = useCallback(
    (data: IncomingCallData, soundEnabled: boolean = true) => {
      // Игнорируем звонки самому себе
      if (currentUserId && data.callerId === currentUserId) return

      // Если уже идет звонок, можем ответить busy
      if (globalCallState.activeCall) {
        void respondToCallRpc(data.sessionId, 'busy')
        return
      }

      updateState({
        incomingCall: data,
        callError: null,
      })

      if (soundEnabled) {
        playIncomingRingtone()
      }

      notifyBrowserIncomingCall(data.callerName, data.isVideo)
    },
    [currentUserId]
  )

  /**
   * Принятие входящего звонка
   */
  const acceptIncomingCall = useCallback(async () => {
    stopCallSounds()
    const inc = globalCallState.incomingCall
    if (!inc) return

    updateState({
      incomingCall: null,
      activeCall: {
        sessionId: inc.sessionId,
        peerId: inc.callerId,
        peerName: inc.callerName,
        peerAvatar: inc.callerAvatar,
        peerUsername: inc.callerUsername,
        isVideo: inc.isVideo,
        isIncoming: true,
        initialConnected: true,
        isMinimized: false,
        callerId: inc.callerId,
        receiverId: currentUserId || 'me',
      },
    })

    // 1. Отправляем broadcast call_accepted в комнату звонка
    const supabase = getSupabase()
    if (supabase) {
      const roomChannel = supabase.channel(`call_room_${inc.sessionId}`)
      roomChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          roomChannel.send({
            type: 'broadcast',
            event: 'call_accepted',
            payload: { sessionId: inc.sessionId },
          })
        }
      })

      // 2. Также отправляем на персональный канал звонящего
      const callerChan = supabase.channel(`user_calls_${inc.callerId}`)
      callerChan.subscribe((st) => {
        if (st === 'SUBSCRIBED') {
          callerChan.send({
            type: 'broadcast',
            event: 'call_accepted',
            payload: { sessionId: inc.sessionId },
          })
          setTimeout(() => {
            try {
              supabase.removeChannel(callerChan)
            } catch {}
          }, 1000)
        }
      })
    }

    // 3. Обновляем статус в БД
    await respondToCallRpc(inc.sessionId, 'accept')
  }, [currentUserId])

  /**
   * Отклонение входящего звонка
   */
  const rejectIncomingCall = useCallback(async () => {
    stopCallSounds()
    playEndCallSound()
    const inc = globalCallState.incomingCall
    if (!inc) return

    updateState({ incomingCall: null })

    const supabase = getSupabase()
    if (supabase) {
      // Broadcast call_ended
      const roomChan = supabase.channel(`call_room_${inc.sessionId}`)
      roomChan.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          roomChan.send({
            type: 'broadcast',
            event: 'call_ended',
            payload: { sessionId: inc.sessionId, reason: 'rejected' },
          })
          setTimeout(() => {
            try {
              supabase.removeChannel(roomChan)
            } catch {}
          }, 500)
        }
      })

      const callerChan = supabase.channel(`user_calls_${inc.callerId}`)
      callerChan.subscribe((st) => {
        if (st === 'SUBSCRIBED') {
          callerChan.send({
            type: 'broadcast',
            event: 'call_ended',
            payload: { sessionId: inc.sessionId, reason: 'rejected' },
          })
          setTimeout(() => {
            try {
              supabase.removeChannel(callerChan)
            } catch {}
          }, 500)
        }
      })
    }

    await respondToCallRpc(inc.sessionId, 'reject')
  }, [])

  /**
   * Отклонение с быстрым текстовым ответом в чат
   */
  const replyWithQuickMessage = useCallback(
    async (text: string) => {
      const inc = globalCallState.incomingCall
      if (!inc) return
      await rejectIncomingCall()

      // Отправляем сообщение в чат
      const supabase = getSupabase()
      if (supabase && currentUserId) {
        const threadKey =
          currentUserId < inc.callerId
            ? `${currentUserId}:${inc.callerId}`
            : `${inc.callerId}:${currentUserId}`

        await supabase.from('direct_messages').insert({
          thread_key: threadKey,
          author_id: currentUserId,
          recipient_id: inc.callerId,
          body: text,
          is_system: false,
          is_read: false,
          sent_at: new Date().toISOString(),
        })
      }
    },
    [currentUserId, rejectIncomingCall]
  )

  /**
   * Завершение активного звонка
   */
  const endActiveCall = useCallback(
    async (durationSeconds: number = 0, reason: string = 'normal') => {
      stopCallSounds()
      playEndCallSound()
      const active = globalCallState.activeCall
      if (!active) return

      updateState({ activeCall: null })

      const supabase = getSupabase()
      if (supabase) {
        const roomChan = supabase.channel(`call_room_${active.sessionId}`)
        roomChan.subscribe((st) => {
          if (st === 'SUBSCRIBED') {
            roomChan.send({
              type: 'broadcast',
              event: 'call_ended',
              payload: { sessionId: active.sessionId, duration: durationSeconds, reason },
            })
            setTimeout(() => {
              try {
                supabase.removeChannel(roomChan)
              } catch {}
            }, 500)
          }
        })

        const peerChan = supabase.channel(`user_calls_${active.peerId}`)
        peerChan.subscribe((st) => {
          if (st === 'SUBSCRIBED') {
            peerChan.send({
              type: 'broadcast',
              event: 'call_ended',
              payload: { sessionId: active.sessionId, duration: durationSeconds, reason },
            })
            setTimeout(() => {
              try {
                supabase.removeChannel(peerChan)
              } catch {}
            }, 500)
          }
        })
      }

      await endCallSessionRpc(active.sessionId, durationSeconds, reason)
    },
    []
  )

  /**
   * Переключение PiP мини-режима
   */
  const toggleMinimize = useCallback(() => {
    if (!globalCallState.activeCall) return
    updateState({
      activeCall: {
        ...globalCallState.activeCall,
        isMinimized: !globalCallState.activeCall.isMinimized,
      },
    })
  }, [])

  const clearCallError = useCallback(() => {
    updateState({ callError: null })
  }, [])

  const setDeviceSettings = useCallback((dev: DeviceSettings) => {
    updateState({
      deviceSettings: { ...globalCallState.deviceSettings, ...dev },
    })
  }, [])

  return {
    incomingCall: state.incomingCall,
    activeCall: state.activeCall,
    deviceSettings: state.deviceSettings,
    callError: state.callError,
    startCall,
    receiveIncomingCall,
    acceptIncomingCall,
    rejectIncomingCall,
    replyWithQuickMessage,
    endActiveCall,
    toggleMinimize,
    clearCallError,
    setDeviceSettings,
  }
}

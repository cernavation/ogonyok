'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { playClick } from '@/lib/ogonek/sound'
import {
  playOutgoingRing,
  playIncomingRingtone,
  playEndCallSound,
  stopCallSounds,
} from '@/lib/ogonek/call-sound'
import { getSupabase } from '@/lib/supabase/client'
import {
  recordCallResult,
  canInitiateCall,
  type CallStatus,
} from '@/lib/supabase/api'
import {
  getWebrtcIceServers,
  parseMediaDeviceError,
  createIceRestartOffer,
  CALL_RING_TIMEOUT_MS,
  formatCallDuration,
  type MediaDeviceErrorInfo,
} from '@/lib/ogonek/webrtc'
import { canMakeVideoCall } from '@/lib/ogonek/permissions'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { ChatAvatar } from './chat-avatar'

export interface ChatCallModalProps {
  friendId: string
  isOpen?: boolean
  onClose?: () => void
  onEndCall?: (durationSeconds: number, callType: 'audio' | 'video', finalStatus?: CallStatus) => void
  isVideo?: boolean
  isIncoming?: boolean
  sessionId?: string
  callerName?: string
  callerAvatar?: string | null
  callerUsername?: string | null
  friendName?: string
  friendAvatar?: string | null
  friendUsername?: string | null
  callerId?: string
  receiverId?: string
  initialConnected?: boolean
  soundEnabled?: boolean
  relayOnly?: boolean
}

export function ChatCallModal({
  sessionId,
  callerId,
  receiverId,
  friendId,
  friendName,
  friendUsername,
  friendAvatar,
  callerName,
  callerAvatar,
  callerUsername,
  isVideo = false,
  isIncoming = false,
  initialConnected = false,
  isOpen = true,
  onClose,
  onEndCall,
  soundEnabled = true,
  relayOnly = false,
}: ChatCallModalProps) {
  const { state } = useOgonekStore()

  // Проверка тарифа для видеозвонков
  const userTier = state?.profile?.subscription_tier || 'free'
  const userTierValidUntil = state?.profile?.subscription_valid_until
  const isVideoAllowedByTier = canMakeVideoCall(userTier, userTierValidUntil)
  const initialEffectiveVideo = isVideo && isVideoAllowedByTier

  const [callState, setCallState] = useState<CallStatus>(
    initialConnected ? 'connected' : isIncoming ? 'ringing' : 'ringing'
  )
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [effectiveVideo, setEffectiveVideo] = useState(initialEffectiveVideo)
  const [tierWarning, setTierWarning] = useState<string | null>(
    isVideo && !isVideoAllowedByTier
      ? 'Видеозвонки доступны на тарифах Pro и Ultra. Звонок запущен в аудио-режиме.'
      : null
  )

  const [micMuted, setMicMuted] = useState(false)
  const [micBlocked, setMicBlocked] = useState(false)
  const [cameraOff, setCameraOff] = useState(!initialEffectiveVideo)
  const [speakerMuted, setSpeakerMuted] = useState(false)
  const [duration, setDuration] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<string>('Инициализация...')
  const [isPip, setIsPip] = useState(false)
  const [mediaError, setMediaError] = useState<MediaDeviceErrorInfo | null>(null)
  const [reconnectCount, setReconnectCount] = useState(0)
  const [iceStats, setIceStats] = useState<{ bytesReceived: number; bytesSent: number; candidateType?: string }>({
    bytesReceived: 0,
    bytesSent: 0,
  })

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const roomChannelRef = useRef<any>(null)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const ringTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const currentUserId = isIncoming ? receiverId : callerId
  const durationRef = useRef(0)
  durationRef.current = duration

  // Безопасное определение отображаемых имен (защита от сырых UUID и undefined)
  const isFriendIdUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(friendId || '')
  const displayName = (friendName || callerName || 'Собеседник').trim() || 'Собеседник'
  const effectiveAvatar = friendAvatar || callerAvatar || null
  const rawUsername = friendUsername || callerUsername
  const handleName = rawUsername
    ? `@${rawUsername.replace(/^@/, '')}`
    : (friendId && !isFriendIdUuid ? `@${friendId}` : '@друг')

  // Очистка и безопасное завершение вызова
  const cleanupAndClose = useCallback(
    (dur?: number, finalStatus: CallStatus = 'ended') => {
      stopCallSounds()
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current)
        ringTimeoutRef.current = null
      }

      if (localStreamRef.current) {
        try {
          localStreamRef.current.getTracks().forEach((t) => t.stop())
        } catch {}
        localStreamRef.current = null
      }

      if (peerConnectionRef.current) {
        try {
          peerConnectionRef.current.close()
        } catch {}
        peerConnectionRef.current = null
      }

      const finalDuration = dur ?? durationRef.current
      const callType = effectiveVideo ? 'video' : 'audio'

      if (onEndCall) {
        try {
          onEndCall(finalDuration, callType, finalStatus)
        } catch (e) {
          console.warn('[ChatCallModal] onEndCall error:', e)
        }
      }

      if (onClose) {
        try {
          onClose()
        } catch (e) {
          console.warn('[ChatCallModal] onClose error:', e)
        }
      }
    },
    [effectiveVideo, onEndCall, onClose]
  )

  // 1. Управление звуками вызова
  useEffect(() => {
    if (!soundEnabled) return

    if (callState === 'ringing') {
      if (isIncoming) {
        playIncomingRingtone()
      } else {
        playOutgoingRing()
      }
    } else if (callState === 'connected') {
      stopCallSounds()
    } else {
      stopCallSounds()
    }

    return () => {
      stopCallSounds()
    }
  }, [callState, isIncoming, soundEnabled])

  // 2. Таймер 45 секунд для фиксации missed (CONTRACT Шаг 10)
  useEffect(() => {
    if (callState === 'ringing') {
      ringTimeoutRef.current = setTimeout(() => {
        handleMissedTimeout()
      }, CALL_RING_TIMEOUT_MS)

      return () => {
        if (ringTimeoutRef.current) {
          clearTimeout(ringTimeoutRef.current)
          ringTimeoutRef.current = null
        }
      }
    }
  }, [callState])

  // 3. Таймер активного разговора
  useEffect(() => {
    if (callState !== 'connected') return
    const interval = setInterval(() => {
      setDuration((d) => d + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [callState])

  // Тестовые события для автоматизированных проверок
  useEffect(() => {
    const handleTimeout = () => {
      handleMissedTimeout()
    }
    const handleState = (e: any) => {
      if (e?.detail?.state) {
        if (ringTimeoutRef.current) {
          clearTimeout(ringTimeoutRef.current)
          ringTimeoutRef.current = null
        }
        setCallState(e.detail.state)
        if (e.detail.state === 'connected') {
          setConnectionStatus('В эфире')
        }
        if (e.detail.statusMessage) {
          setStatusMessage(e.detail.statusMessage)
        }
      }
    }
    window.addEventListener('ogonek:call-timeout-test', handleTimeout)
    window.addEventListener('ogonek:call-state-test', handleState)
    return () => {
      window.removeEventListener('ogonek:call-timeout-test', handleTimeout)
      window.removeEventListener('ogonek:call-state-test', handleState)
    }
  }, [])

  // 4. Проверка взаимных блокировок перед набором номера
  useEffect(() => {
    if (!isIncoming && callState === 'ringing' && friendId) {
      if (state.blockedUserIds?.includes(friendId)) {
        setCallState('busy')
        setStatusMessage('Пользователь заблокирован')
        playEndCallSound()
        setTimeout(() => cleanupAndClose(0, 'busy'), 2200)
        return
      }

      canInitiateCall({
        callerId: currentUserId || 'me',
        receiverId: friendId,
      }).then((res) => {
        if (!res.allowed) {
          const finalSt: CallStatus = res.reason === 'busy' ? 'busy' : 'rejected'
          setCallState(finalSt)
          setStatusMessage(res.message || 'Пользователь ограничил входящие вызовы')
          playEndCallSound()
          setTimeout(() => cleanupAndClose(0, finalSt), 2200)
        }
      })
    }
  }, [isIncoming, friendId, currentUserId, state.blockedUserIds, cleanupAndClose])

  // 5. Инициализация WebRTC с TURN-серверами Metered
  const initWebRTCPeer = useCallback(async () => {
    if (typeof window === 'undefined') return null

    try {
      setConnectionStatus('Подключение медиа...')

      // А. Захват микрофона и камеры
      let localStream: MediaStream | null = null
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
          localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: effectiveVideo,
          }).catch(async (primaryErr) => {
            const parsedErr = parseMediaDeviceError(primaryErr, effectiveVideo)
            setMediaError(parsedErr)
            setMicBlocked(true)

            // Если камера недоступна, пробуем аудио
            if (effectiveVideo) {
              setEffectiveVideo(false)
              setCameraOff(true)
              return await navigator.mediaDevices.getUserMedia({ audio: true, video: false }).catch(() => null)
            }
            return null
          })
        }
      } catch (mediaErr) {
        const parsed = parseMediaDeviceError(mediaErr, effectiveVideo)
        setMediaError(parsed)
        setMicBlocked(true)
        localStream = null
      }

      if (localStream) {
        setMicBlocked(false)
      } else {
        setMicBlocked(true)
      }

      localStreamRef.current = localStream
      if (localStream && localVideoRef.current && effectiveVideo) {
        try {
          localVideoRef.current.srcObject = localStream
        } catch {}
      }

      if (typeof RTCPeerConnection === 'undefined') {
        setConnectionStatus('WebRTC недоступен')
        return null
      }

      // Б. Запрос ICE/TURN серверов через Metered API (/api/webrtc/ice-servers)
      // Включает эталонные STUN серверы: stun:stun.l.google.com:19302 и stun:stun1.l.google.com:19302
      const iceConfig = await getWebrtcIceServers({ relayOnly })
      const fallbackIceServers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
      const effectiveIceServers =
        iceConfig.iceServers && iceConfig.iceServers.length > 0
          ? iceConfig.iceServers
          : fallbackIceServers

      const pc = new RTCPeerConnection({
        iceServers: effectiveIceServers,
        iceTransportPolicy: relayOnly ? 'relay' : (iceConfig.iceTransportPolicy || 'all'),
      })

      peerConnectionRef.current = pc

      // В. Добавление медиа-треков
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          try {
            pc.addTrack(track, localStream!)
          } catch {}
        })
      }

      // Г. Прием удаленных треков
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams
        if (remoteStream) {
          if (remoteAudioRef.current) {
            try {
              remoteAudioRef.current.srcObject = remoteStream
              remoteAudioRef.current.play().catch(() => {})
            } catch {}
          }
          if (remoteVideoRef.current && effectiveVideo) {
            try {
              remoteVideoRef.current.srcObject = remoteStream
              remoteVideoRef.current.play().catch(() => {})
            } catch {}
          }
          setConnectionStatus('В эфире')
          setCallState('connected')
        }
      }

      // Д. Мониторинг качества соединения и ICE Restart при смене сети / обрыве
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState
        if (state === 'connected' || state === 'completed') {
          setConnectionStatus('В эфире')
          setCallState('connected')
        } else if (state === 'disconnected') {
          setConnectionStatus('Сеть потеряна, переподключение...')
          handleTriggerIceRestart()
        } else if (state === 'failed') {
          setConnectionStatus('Сбой ICE, повторная попытка...')
          handleTriggerIceRestart()
        }
      }

      // Е. Кандидаты ICE
      pc.onicecandidate = (event) => {
        if (event.candidate && roomChannelRef.current) {
          try {
            roomChannelRef.current.send({
              type: 'broadcast',
              event: 'webrtc_ice',
              payload: {
                candidate: event.candidate.toJSON(),
                senderId: currentUserId || 'me',
              },
            })
          } catch {}
        }
      }

      return pc
    } catch (err) {
      console.warn('[WebRTC] initWebRTCPeer error:', err)
      return null
    }
  }, [currentUserId, effectiveVideo, relayOnly])

  // Создать и отправить WebRTC Offer (содержит iceRestart при необходимости)
  const sendWebRTCOffer = useCallback(
    async (isIceRestart = false) => {
      let pc = peerConnectionRef.current
      if (!pc) {
        pc = await initWebRTCPeer()
      }
      if (!pc || !roomChannelRef.current) return

      try {
        const offer = isIceRestart
          ? await createIceRestartOffer(pc, effectiveVideo)
          : await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: effectiveVideo,
            })

        if (!offer) return
        if (!isIceRestart) {
          await pc.setLocalDescription(offer)
        }

        roomChannelRef.current.send({
          type: 'broadcast',
          event: 'webrtc_offer',
          payload: {
            sdp: offer,
            senderId: currentUserId || 'me',
            isIceRestart,
          },
        })
      } catch (offerErr) {
        console.warn('[WebRTC] sendWebRTCOffer error:', offerErr)
      }
    },
    [currentUserId, initWebRTCPeer, effectiveVideo]
  )

  // ICE Restart при смене сети (Wi-Fi ↔ LTE)
  const handleTriggerIceRestart = useCallback(() => {
    setReconnectCount((c) => c + 1)
    void sendWebRTCOffer(true)
  }, [sendWebRTCOffer])

  // Слушатель событий смены сети в браузере
  useEffect(() => {
    const handleOnline = () => {
      if (callState === 'connected') {
        handleTriggerIceRestart()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
      return () => window.removeEventListener('online', handleOnline)
    }
  }, [callState, handleTriggerIceRestart])

  // 6. Сбор статистики getStats (байты и тип кандидата relay/host) для приёмки
  useEffect(() => {
    if (callState !== 'connected') return

    const interval = setInterval(async () => {
      const pc = peerConnectionRef.current
      if (!pc) return

      try {
        const stats = await pc.getStats()
        let inBytes = 0
        let outBytes = 0
        let candType = 'host'

        stats.forEach((report: any) => {
          if (report.type === 'inbound-rtp') {
            inBytes += report.bytesReceived || 0
          }
          if (report.type === 'outbound-rtp') {
            outBytes += report.bytesSent || 0
          }
          if (report.type === 'candidate-pair' && report.nominated) {
            candType = report.remoteCandidateType || report.localCandidateType || 'host'
          }
        })

        setIceStats({ bytesReceived: inBytes, bytesSent: outBytes, candidateType: candType })

        if (typeof window !== 'undefined') {
          ;(window as any).__lastWebRtcStats = {
            bytesReceived: inBytes,
            bytesSent: outBytes,
            iceConnectionState: pc.iceConnectionState,
            candidateType: candType,
          }
        }
      } catch {}
    }, 1500)

    return () => clearInterval(interval)
  }, [callState])

  // 7. Подключение к комнате звонка
  useEffect(() => {
    if (!sessionId) return
    const supabase = getSupabase()
    if (!supabase) return

    const roomChannelName = `call_room_${sessionId}`
    const existingRoom = supabase.getChannels().find((c) => c.topic === `realtime:${roomChannelName}`)
    if (existingRoom) {
      try {
        supabase.removeChannel(existingRoom)
      } catch {}
    }

    const roomChannel = supabase.channel(roomChannelName)
    roomChannelRef.current = roomChannel

    roomChannel
      .on('broadcast', { event: 'call_accepted' }, async () => {
        stopCallSounds()
        setCallState('connected')
        if (ringTimeoutRef.current) {
          clearTimeout(ringTimeoutRef.current)
          ringTimeoutRef.current = null
        }
        if (!isIncoming) {
          await sendWebRTCOffer(false)
        }
      })
      .on('broadcast', { event: 'call_ended' }, ({ payload }) => {
        stopCallSounds()
        playEndCallSound()
        const status = (payload?.reason as CallStatus) || 'ended'
        setCallState(status)
        setStatusMessage(
          status === 'missed'
            ? 'Абонент не отвечает (45 с)'
            : status === 'rejected'
            ? 'Вызов отклонён'
            : status === 'busy'
            ? 'Линия занята'
            : 'Вызов завершён'
        )
        setTimeout(() => cleanupAndClose(durationRef.current, status), 1800)
      })
      .on('broadcast', { event: 'webrtc_offer' }, async ({ payload }) => {
        if (!payload || payload.senderId === (currentUserId || 'me')) return

        try {
          let pc = peerConnectionRef.current
          if (!pc) {
            pc = await initWebRTCPeer()
          }
          if (!pc) return

          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)

          roomChannel.send({
            type: 'broadcast',
            event: 'webrtc_answer',
            payload: {
              sdp: answer,
              senderId: currentUserId || 'me',
            },
          })

          while (pendingCandidatesRef.current.length > 0) {
            const cand = pendingCandidatesRef.current.shift()
            if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand))
          }
        } catch (err) {
          console.warn('[WebRTC] Error handling offer:', err)
        }
      })
      .on('broadcast', { event: 'webrtc_answer' }, async ({ payload }) => {
        if (!payload || payload.senderId === (currentUserId || 'me')) return

        try {
          const pc = peerConnectionRef.current
          if (!pc) return

          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          while (pendingCandidatesRef.current.length > 0) {
            const cand = pendingCandidatesRef.current.shift()
            if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand))
          }
        } catch (err) {
          console.warn('[WebRTC] Error handling answer:', err)
        }
      })
      .on('broadcast', { event: 'webrtc_ice' }, async ({ payload }) => {
        if (!payload || payload.senderId === (currentUserId || 'me')) return

        try {
          const pc = peerConnectionRef.current
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
          } else {
            pendingCandidatesRef.current.push(payload.candidate)
          }
        } catch (err) {
          console.warn('[WebRTC] Error adding ICE candidate:', err)
        }
      })

    roomChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (isIncoming && initialConnected) {
          try {
            roomChannel.send({
              type: 'broadcast',
              event: 'call_accepted',
              payload: { sessionId },
            })
          } catch {}
          void initWebRTCPeer()
        }
      }
    })

    return () => {
      try {
        supabase.removeChannel(roomChannel)
      } catch {}
    }
  }, [sessionId, isIncoming, initialConnected, currentUserId, sendWebRTCOffer, initWebRTCPeer, cleanupAndClose])

  // Таймаут 45 секунд: перевод в missed
  const handleMissedTimeout = async () => {
    stopCallSounds()
    playEndCallSound()
    setCallState('missed')
    setStatusMessage('Абонент не отвечает (45 с)')

    if (roomChannelRef.current) {
      try {
        roomChannelRef.current.send({
          type: 'broadcast',
          event: 'call_ended',
          payload: { sessionId, reason: 'missed' },
        })
      } catch {}
    }

    if (sessionId) {
      await recordCallResult({
        sessionId,
        finalStatus: 'missed',
        durationSeconds: 0,
        isVideo: effectiveVideo,
      })
    }

    setTimeout(() => {
      cleanupAndClose(0, 'missed')
    }, 2000)
  }

  // Принятие входящего вызова
  const handleAccept = async () => {
    playClick(soundEnabled)
    stopCallSounds()
    setCallState('connected')
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current)
      ringTimeoutRef.current = null
    }

    if (roomChannelRef.current) {
      try {
        roomChannelRef.current.send({
          type: 'broadcast',
          event: 'call_accepted',
          payload: { sessionId },
        })
      } catch {}
    }

    if (sessionId) {
      try {
        await recordCallResult({
          sessionId,
          finalStatus: 'ended', // Начало активной сессии
          durationSeconds: 0,
          isVideo: effectiveVideo,
        })
      } catch {}
    }

    await initWebRTCPeer()
  }

  // Завершение или отклонение
  const handleDeclineOrEnd = async () => {
    playClick(soundEnabled)
    stopCallSounds()
    playEndCallSound()

    const finalStatus = callState === 'connected' ? 'ended' : 'rejected'
    setCallState(finalStatus)
    setStatusMessage(finalStatus === 'rejected' ? 'Вызов отклонён' : 'Вызов завершён')

    if (roomChannelRef.current) {
      try {
        roomChannelRef.current.send({
          type: 'broadcast',
          event: 'call_ended',
          payload: { sessionId, reason: finalStatus },
        })
      } catch {}
    }

    if (sessionId) {
      await recordCallResult({
        sessionId,
        finalStatus,
        durationSeconds: duration,
        isVideo: effectiveVideo,
      })
    }

    setTimeout(() => {
      cleanupAndClose(duration, finalStatus)
    }, 800)
  }

  const toggleMic = () => {
    playClick(soundEnabled)
    setMicMuted((prev) => {
      const next = !prev
      if (localStreamRef.current) {
        try {
          localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next))
        } catch {}
      }
      return next
    })
  }

  const toggleCamera = () => {
    playClick(soundEnabled)
    setCameraOff((prev) => {
      const next = !prev
      if (localStreamRef.current) {
        try {
          localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !next))
        } catch {}
      }
      return next
    })
  }

  const toggleSpeaker = () => {
    playClick(soundEnabled)
    setSpeakerMuted((prev) => {
      const next = !prev
      if (remoteAudioRef.current) remoteAudioRef.current.muted = next
      if (remoteVideoRef.current) remoteVideoRef.current.muted = next
      return next
    })
  }

  if (isOpen === false) return null

  // ==========================================================================
  // РЕЖИМ 1: МИНИ-ОКНО (Picture-in-Picture)
  // Позволяет свободно ходить по приложению (лента, чаты, профиль) без обрыва звонка
  // ==========================================================================
  if (isPip) {
    return (
      <div
        id="call-pip-window"
        className="fixed bottom-6 right-6 z-[9999] w-72 sm:w-80 rounded-2xl bg-[#16181c]/95 backdrop-blur-xl border border-[var(--line,#2f3336)] shadow-2xl p-3 flex flex-col gap-2.5 select-none animate-in fade-in zoom-in-95"
      >
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* Шапка PiP: статус и кнопка развернуть */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-mono text-[var(--accent)] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#00ba7c] animate-pulse" />
            <span>{formatCallDuration(duration)}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              id="call-pip-maximize"
              onClick={() => {
                playClick(soundEnabled)
                setIsPip(false)
              }}
              className="p-1 rounded-lg text-[var(--muted,#71767b)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Развернуть звонок на весь экран"
              title="Развернуть на весь экран"
            >
              <Maximize2 size={15} />
            </button>
          </div>
        </div>

        {/* Тело PiP */}
        <div
          className="flex items-center gap-3 cursor-pointer py-1"
          onClick={() => {
            playClick(soundEnabled)
            setIsPip(false)
          }}
        >
          {effectiveVideo && !cameraOff ? (
            <div className="relative w-20 h-14 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>
          ) : (
            <ChatAvatar
              friendId={friendId}
              size={40}
              ringColor="var(--accent)"
              fallbackAvatar={effectiveAvatar}
              fallbackName={displayName}
            />
          )}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">{displayName}</p>
            <p className="text-[11px] text-[var(--muted,#71767b)] truncate">{handleName}</p>
          </div>
        </div>

        {/* Нижние мини-кнопки */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--line,#2f3336)]">
          <button
            type="button"
            onClick={toggleMic}
            className={`p-2 rounded-full text-xs transition-colors cursor-pointer ${
              micMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            aria-label={micMuted ? 'Включить микрофон' : 'Выключить микрофон'}
          >
            {micMuted ? <MicOff size={14} /> : <Mic size={14} />}
          </button>

          <button
            type="button"
            id="call-pip-end"
            onClick={handleDeclineOrEnd}
            className="p-2 rounded-full bg-[#f4212e] text-white hover:bg-[#dc1e29] transition-all shadow-md cursor-pointer"
            aria-label="Завершить вызов"
            title="Завершить звонок"
          >
            <PhoneOff size={14} />
          </button>
        </div>
      </div>
    )
  }

  // ==========================================================================
  // РЕЖИМ 2: ПОЛНОРАЗМЕРНЫЙ ЭКРАН ВЫЗОВА
  // ==========================================================================
  return (
    <div
      id="chat-call-modal-root"
      className="fixed inset-0 z-50 bg-black/92 backdrop-blur-2xl flex flex-col items-center justify-between p-6 select-none animate-in fade-in duration-200"
    >
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Верхний статус и кнопка PiP */}
      <div className="w-full max-w-xl flex items-center justify-between mt-2 z-20">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold tracking-wide uppercase">
          {effectiveVideo ? (
            <Video size={13} className="text-[#1d9bf0]" />
          ) : (
            <Phone size={13} className="text-[#00ba7c]" />
          )}
          <span>{effectiveVideo ? 'Видеозвонок Priday' : 'Аудиозвонок Priday'}</span>
        </div>

        {/* Кнопка сворачивания в мини-окно (PiP) */}
        {callState === 'connected' && (
          <button
            type="button"
            id="call-btn-minimize-pip"
            onClick={() => {
              playClick(soundEnabled)
              setIsPip(true)
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-medium hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Свернуть в мини-окно"
            title="Свернуть звонок в мини-окно (PiP)"
          >
            <Minimize2 size={14} />
            <span className="hidden sm:inline">Свернуть (PiP)</span>
          </button>
        )}
      </div>

      {/* Индикатор статуса и ошибок */}
      <div className="flex flex-col items-center gap-1 mt-4 z-10 text-center">
        <span className="text-[14px] text-white/80 font-mono">
          {statusMessage
            ? statusMessage
            : callState === 'ringing'
            ? isIncoming
              ? 'Входящий вызов...'
              : `Звоним ${handleName}...`
            : callState === 'connected'
            ? formatCallDuration(duration)
            : 'Завершение разговора...'}
        </span>

        {callState === 'connected' && (
          <div className="flex items-center gap-2 text-[11px] text-[#00ba7c] font-medium tracking-wide">
            <span>● {connectionStatus}</span>
            {iceStats.candidateType === 'relay' && (
              <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px]">
                TURN Relay
              </span>
            )}
            {reconnectCount > 0 && (
              <span className="text-amber-400 text-[10px]">
                (ICE restart #{reconnectCount})
              </span>
            )}
          </div>
        )}

        {/* Предупреждение о видео по тарифу */}
        {tierWarning && (
          <div className="mx-auto max-w-sm px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-medium flex items-center gap-2 mt-2 shadow-lg">
            <Sparkles size={14} className="text-amber-400 shrink-0" />
            <span>{tierWarning}</span>
          </div>
        )}

        {/* Человекопонятная ошибка медиаустройств */}
        {mediaError && (
          <div className="mx-auto max-w-md px-3.5 py-2 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-medium flex items-start gap-2.5 mt-2 shadow-lg text-left">
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{mediaError.title}</p>
              <p className="text-[11px] text-red-200/80 mt-0.5 leading-snug">{mediaError.message}</p>
            </div>
          </div>
        )}

        {/* Мягкое уведомление при отсутствии разрешений на микрофон (не крашит интерфейс) */}
        {micBlocked && (
          <div className="mx-auto max-w-sm px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-medium flex items-center gap-2 mt-2 shadow-lg animate-in fade-in">
            <MicOff size={14} className="text-amber-400 shrink-0" />
            <span>Микрофон недоступен. Проверьте разрешения в браузере</span>
          </div>
        )}
      </div>

      {/* Центр: Видео трансляция или Аватар */}
      <div className="relative w-full max-w-xl flex-1 flex flex-col items-center justify-center my-6">
        {effectiveVideo && callState === 'connected' ? (
          <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-black/60 border border-white/10 shadow-2xl flex items-center justify-center">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none -z-0">
              <ChatAvatar
                friendId={friendId}
                size={84}
                ringColor="rgba(255,255,255,0.2)"
                fallbackAvatar={effectiveAvatar}
                fallbackName={displayName}
              />
              <p className="text-white text-lg font-bold mt-3">{displayName}</p>
              <p className="text-white/60 text-xs mt-0.5">{handleName}</p>
            </div>

            {!cameraOff && (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute right-4 bottom-4 w-36 aspect-video rounded-2xl object-cover border-2 border-white/30 shadow-2xl z-10"
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6 flex items-center justify-center">
              {callState === 'ringing' && (
                <>
                  <div className="absolute inset-[-14px] rounded-full border-2 border-[var(--accent)] animate-ping opacity-35" />
                  <div className="absolute inset-[-6px] rounded-full bg-[var(--accent)]/15 animate-pulse" />
                </>
              )}
              <ChatAvatar
                friendId={friendId}
                size={128}
                ringColor="var(--accent)"
                fallbackAvatar={effectiveAvatar}
                fallbackName={displayName}
              />
            </div>

            <h2 className="text-2xl sm:text-3xl font-[900] text-white tracking-tight">{displayName}</h2>
            <p className="text-sm font-medium text-[var(--accent)] mt-1">{handleName}</p>
            <p className="text-xs text-white/50 mt-1">
              {callState === 'ringing'
                ? isIncoming
                  ? 'Входящий звонок'
                  : 'Ожидание ответа собеседника...'
                : callState === 'connected'
                ? 'Защищённый WebRTC голосовой поток Priday'
                : statusMessage || 'Вызов завершён'}
            </p>
          </div>
        )}
      </div>

      {/* Нижняя панель действий */}
      <div className="w-full max-w-md pb-6 flex items-center justify-center gap-5 z-10">
        {callState === 'ringing' && isIncoming ? (
          <>
            <button
              type="button"
              id="call-btn-decline"
              onClick={handleDeclineOrEnd}
              className="w-16 h-16 rounded-full bg-[#f4212e] hover:bg-[#dc1e29] text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
              aria-label="Отклонить"
            >
              <PhoneOff size={28} />
            </button>

            <button
              type="button"
              id="call-btn-accept"
              onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-[#00ba7c] hover:bg-[#00a36d] text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all animate-bounce cursor-pointer"
              aria-label="Принять"
            >
              <Phone size={28} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              id="call-btn-toggle-mic"
              onClick={toggleMic}
              className={`w-13 h-13 rounded-full flex items-center justify-center transition-all p-3.5 cursor-pointer ${
                micMuted
                  ? 'bg-red-500/25 text-red-400 border border-red-500/40 ring-2 ring-red-500/20'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              aria-label={micMuted ? 'Включить микрофон' : 'Выключить микрофон'}
              title={micMuted ? 'Микрофон выключен' : 'Микрофон включен'}
            >
              {micMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            {effectiveVideo && (
              <button
                type="button"
                id="call-btn-toggle-camera"
                onClick={toggleCamera}
                className={`w-13 h-13 rounded-full flex items-center justify-center transition-all p-3.5 cursor-pointer ${
                  cameraOff ? 'bg-red-500/25 text-red-400 border border-red-500/40' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                aria-label={cameraOff ? 'Включить камеру' : 'Выключить камеру'}
                title={cameraOff ? 'Камера выключена' : 'Камера включена'}
              >
                {cameraOff ? <VideoOff size={22} /> : <Video size={22} />}
              </button>
            )}

            <button
              type="button"
              id="call-btn-toggle-speaker"
              onClick={toggleSpeaker}
              className={`w-13 h-13 rounded-full flex items-center justify-center transition-all p-3.5 cursor-pointer ${
                speakerMuted ? 'bg-red-500/25 text-red-400 border border-red-500/40' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              aria-label={speakerMuted ? 'Включить звук' : 'Выключить звук'}
              title={speakerMuted ? 'Звук выключен' : 'Звук включен'}
            >
              {speakerMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
            </button>

            <button
              type="button"
              id="call-btn-end"
              onClick={handleDeclineOrEnd}
              className="w-16 h-16 rounded-full bg-[#f4212e] hover:bg-[#dc1e29] text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
              aria-label="Завершить вызов"
            >
              <PhoneOff size={28} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

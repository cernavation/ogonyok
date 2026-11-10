'use client'

import React, { useEffect, useRef, useState, useCallback, useId } from 'react'
import {
  Camera,
  Check,
  FlipHorizontal,
  Mic,
  MicOff,
  Minimize2,
  Maximize2,
  Monitor,
  Phone,
  PhoneOff,
  Settings,
  Sparkles,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  X,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react'
import { playClick } from '@/lib/ogonek/sound'
import {
  playOutgoingRing,
  playIncomingRingtone,
  playEndCallSound,
  stopCallSounds,
} from '@/lib/ogonek/call-sound'
import { getSupabase } from '@/lib/supabase/browser'
import {
  updateCallSessionStatus,
  respondToCallRpc,
  endCallSessionRpc,
  type CallSessionRecord,
} from '@/lib/supabase/api'
import { ChatAvatar } from './chat-avatar'

export interface ChatCallModalProps {
  friendId: string
  isOpen?: boolean
  onClose?: () => void
  onEndCall?: (durationSeconds: number, callType: 'audio' | 'video') => void
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
  forceRelay?: boolean
  isMinimized?: boolean
  onToggleMinimize?: () => void
  onQuickReply?: (text: string) => void
}

interface CallQualityStats {
  rttMs: number
  packetLossPercent: number
  isWeak: boolean
}

interface MediaDeviceInfoList {
  audioInputs: MediaDeviceInfo[]
  audioOutputs: MediaDeviceInfo[]
  videoInputs: MediaDeviceInfo[]
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

let cachedIceServers: RTCIceServer[] | null = null
let iceServersCacheTime = 0

async function fetchIceServers(): Promise<RTCIceServer[]> {
  const now = Date.now()
  if (cachedIceServers && now - iceServersCacheTime < 10 * 60 * 1000) {
    return cachedIceServers
  }
  try {
    const res = await fetch('/api/webrtc/ice-servers')
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
        cachedIceServers = data.iceServers
        iceServersCacheTime = now
        return data.iceServers
      }
    }
  } catch (err) {
    console.warn('[WebRTC] Error fetching ICE servers, using STUN default:', err)
  }
  return DEFAULT_ICE_SERVERS
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
  forceRelay = false,
  isMinimized = false,
  onToggleMinimize,
  onQuickReply,
}: ChatCallModalProps) {
  const [callState, setCallState] = useState<'incoming' | 'calling' | 'connected'>(
    initialConnected ? 'connected' : isIncoming ? 'incoming' : 'calling'
  )
  const [micBlocked, setMicBlocked] = useState(false)
  const [cameraBlocked, setCameraBlocked] = useState(false)
  const [permissionErrorGuide, setPermissionErrorGuide] = useState(false)
  const [micMuted, setMicMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(!isVideo)
  const [speakerMuted, setSpeakerMuted] = useState(false)
  const [duration, setDuration] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<string>('Инициализация...')
  const [localMinimized, setLocalMinimized] = useState(isMinimized)

  // Качество связи
  const [stats, setStats] = useState<CallQualityStats>({
    rttMs: 0,
    packetLossPercent: 0,
    isWeak: false,
  })

  // Демонстрация экрана и устройства
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [devicesModalOpen, setDevicesModalOpen] = useState(false)
  const [deviceList, setDeviceList] = useState<MediaDeviceInfoList>({
    audioInputs: [],
    audioOutputs: [],
    videoInputs: [],
  })
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('')
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('')
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('')

  // Быстрый ответ сообщением
  const [quickReplyOpen, setQuickReplyOpen] = useState(false)
  const [customReplyText, setCustomReplyText] = useState('')

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null)
  const roomChannelRef = useRef<any>(null)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const iceRestartAttemptsRef = useRef(0)
  const durationRef = useRef(0)
  durationRef.current = duration

  const currentUserId = isIncoming ? receiverId : callerId
  const effectiveMinimized = onToggleMinimize ? isMinimized : localMinimized

  // Имена
  const isFriendIdUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(friendId || '')
  const displayName = (friendName || callerName || 'Собеседник').trim() || 'Собеседник'
  const effectiveAvatar = friendAvatar || callerAvatar || null
  const rawUsername = friendUsername || callerUsername
  const handleName = rawUsername
    ? `@${rawUsername.replace(/^@/, '')}`
    : (friendId && !isFriendIdUuid ? `@${friendId}` : '@соратник')

  // Очистка вызова
  const cleanupAndClose = useCallback(
    (dur?: number) => {
      stopCallSounds()

      if (screenStreamRef.current) {
        try {
          screenStreamRef.current.getTracks().forEach((t) => t.stop())
        } catch {}
        screenStreamRef.current = null
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
      const callType = isVideo ? 'video' : 'audio'
      if (onEndCall) {
        try {
          onEndCall(finalDuration, callType)
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
    [isVideo, onEndCall, onClose]
  )

  // 1. Управление звуками вызова
  useEffect(() => {
    if (!soundEnabled) return

    if (callState === 'calling') {
      playOutgoingRing()
    } else if (callState === 'incoming') {
      playIncomingRingtone()
    } else if (callState === 'connected') {
      stopCallSounds()
    }

    return () => {
      stopCallSounds()
    }
  }, [callState, soundEnabled])

  // 2. Таймер активного разговора
  useEffect(() => {
    if (callState !== 'connected') return
    const interval = setInterval(() => {
      setDuration((d) => d + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [callState])

  // 3. Таймаут 45 секунд «не отвечает» при звонке
  useEffect(() => {
    if (callState !== 'calling') return

    const timeoutTimer = setTimeout(async () => {
      setConnectionStatus('Соратник не отвечает')
      stopCallSounds()
      playEndCallSound()

      if (sessionId) {
        try {
          await endCallSessionRpc(sessionId, 0, 'timeout')
        } catch {}
      }

      setTimeout(() => {
        cleanupAndClose(0)
      }, 1500)
    }, 45000)

    return () => clearTimeout(timeoutTimer)
  }, [callState, sessionId, cleanupAndClose])

  // 4. Защита от закрытия вкладки (beforeunload): отменяем звонок
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (roomChannelRef.current) {
        try {
          roomChannelRef.current.send({
            type: 'broadcast',
            event: 'call_ended',
            payload: { sessionId, reason: 'caller_disconnected' },
          })
        } catch {}
      }
      if (sessionId) {
        try {
          // navigator.sendBeacon для синхронной отправки при закрытии
          const endpoint = '/api/billing/webhook' // fallback beacon
        } catch {}
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [sessionId])

  // 5. Перечисление аудио/видео устройств
  const refreshDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      setDeviceList({
        audioInputs: devices.filter((d) => d.kind === 'audioinput'),
        audioOutputs: devices.filter((d) => d.kind === 'audiooutput'),
        videoInputs: devices.filter((d) => d.kind === 'videoinput'),
      })
    } catch (e) {
      console.warn('[WebRTC] enumerateDevices error:', e)
    }
  }, [])

  // 6. Инициализация WebRTC PeerConnection
  const initWebRTCPeer = useCallback(async () => {
    if (typeof window === 'undefined') return null

    try {
      setConnectionStatus('Поиск прямого маршрута...')

      // 1. Получение ICE-серверов с REST-эндпоинта (Metered STUN + TURN)
      const iceServers = await fetchIceServers()

      // 2. Захват микрофона и камеры
      let localStream: MediaStream | null = null
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
          const audioConstraint: boolean | MediaTrackConstraints = selectedAudioInput
            ? { deviceId: { exact: selectedAudioInput } }
            : true
          const videoConstraint: boolean | MediaTrackConstraints = isVideo
            ? selectedVideoInput
              ? { deviceId: { exact: selectedVideoInput } }
              : { facingMode }
            : false

          localStream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraint,
            video: videoConstraint,
          }).catch(async (primaryErr) => {
            console.warn('[WebRTC] Primary getUserMedia failed:', primaryErr)
            if (primaryErr?.name === 'NotAllowedError' || primaryErr?.name === 'PermissionDeniedError') {
              setPermissionErrorGuide(true)
            }
            if (isVideo) {
              setCameraBlocked(true)
              return await navigator.mediaDevices.getUserMedia({ audio: true, video: false }).catch((secErr) => {
                if (secErr?.name === 'NotAllowedError') setPermissionErrorGuide(true)
                return null
              })
            }
            return null
          })
        }
      } catch (mediaErr: any) {
        console.warn('[WebRTC] getUserMedia caught error:', mediaErr)
        if (mediaErr?.name === 'NotAllowedError') {
          setPermissionErrorGuide(true)
        }
        localStream = null
      }

      if (!localStream) {
        setMicBlocked(true)
      } else {
        setMicBlocked(false)
        setPermissionErrorGuide(false)
      }

      localStreamRef.current = localStream
      if (localStream && localVideoRef.current && isVideo) {
        try {
          localVideoRef.current.srcObject = localStream
        } catch {}
      }

      // Сохраняем оригинальный видео-трек для возможности возврата после screen-share
      if (localStream) {
        const vTrack = localStream.getVideoTracks()[0]
        if (vTrack) originalVideoTrackRef.current = vTrack
      }

      if (typeof RTCPeerConnection === 'undefined') {
        setConnectionStatus('WebRTC недоступен')
        return null
      }

      // 3. Создание RTCPeerConnection с переданными ICE-серверами и пулом кандидатов
      const shouldRelay = forceRelay || (typeof window !== 'undefined' && window.location.search.includes('forceRelay=1'))
      const rtcConfig: RTCConfiguration = {
        iceServers,
        iceCandidatePoolSize: 10,
        iceTransportPolicy: shouldRelay ? 'relay' : 'all',
      }

      const pc = new RTCPeerConnection(rtcConfig)
      peerConnectionRef.current = pc

      // 4. Добавление локальных медиа-треков
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          try {
            pc.addTrack(track, localStream!)
          } catch {}
        })
      }

      // 5. Прием удаленных треков собеседника
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams
        if (remoteStream) {
          if (remoteAudioRef.current) {
            try {
              remoteAudioRef.current.srcObject = remoteStream
              remoteAudioRef.current.play().catch((e) => console.warn('Audio play prevented:', e))
            } catch {}
          }
          if (remoteVideoRef.current && isVideo) {
            try {
              remoteVideoRef.current.srcObject = remoteStream
              remoteVideoRef.current.play().catch((e) => console.warn('Video play prevented:', e))
            } catch {}
          }
          setConnectionStatus('В эфире')
        }
      }

      // 6. Трансляция состояния ICE в UI понятными словами на русском
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState
        if (state === 'new') {
          setConnectionStatus('Подготовка...')
        } else if (state === 'checking') {
          setConnectionStatus('Поиск прямого маршрута...')
        } else if (state === 'connected' || state === 'completed') {
          setConnectionStatus('В эфире')
          iceRestartAttemptsRef.current = 0
        } else if (state === 'disconnected') {
          setConnectionStatus('Слабая связь, переподключение...')
          void triggerIceRestart()
        } else if (state === 'failed') {
          setConnectionStatus('Сбой соединения, перезапуск ICE...')
          void triggerIceRestart()
        } else if (state === 'closed') {
          setConnectionStatus('Звонок завершён')
        }
      }

      // 7. Отправка ICE-кандидатов в комнату звонка
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

      void refreshDevices()
      return pc
    } catch (err) {
      console.warn('[WebRTC] initWebRTCPeer error:', err)
      return null
    }
  }, [
    currentUserId,
    isVideo,
    forceRelay,
    facingMode,
    selectedAudioInput,
    selectedVideoInput,
    refreshDevices,
  ])

  // Перезапуск ICE при сбоях (до 3 попыток)
  const triggerIceRestart = useCallback(async () => {
    if (iceRestartAttemptsRef.current >= 3) {
      setConnectionStatus('Сбой соединения (3 попытки исчерпаны)')
      return
    }
    iceRestartAttemptsRef.current += 1
    setConnectionStatus(`Переподключение (попытка ${iceRestartAttemptsRef.current}/3)...`)

    const pc = peerConnectionRef.current
    if (!pc) return

    try {
      if (typeof pc.restartIce === 'function') {
        pc.restartIce()
      }
      if (!isIncoming && roomChannelRef.current) {
        const offer = await pc.createOffer({ iceRestart: true })
        await pc.setLocalDescription(offer)
        roomChannelRef.current.send({
          type: 'broadcast',
          event: 'webrtc_offer',
          payload: { sdp: offer, senderId: currentUserId || 'me' },
        })
      }
    } catch (e) {
      console.warn('[WebRTC] ICE restart failed:', e)
    }
  }, [isIncoming, currentUserId])

  // 7. Слушатель сетевых изменений (online/offline) для перезапуска ICE
  useEffect(() => {
    const handleOnline = () => {
      setConnectionStatus('Сеть восстановлена, перезапуск связи...')
      void triggerIceRestart()
    }
    const handleOffline = () => {
      setConnectionStatus('Нет соединения с интернетом')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [triggerIceRestart])

  // 8. Сбор статистики качества (getStats раз в 5 сек)
  useEffect(() => {
    if (callState !== 'connected') return

    const statsInterval = setInterval(async () => {
      const pc = peerConnectionRef.current
      if (!pc) return

      try {
        const reports = await pc.getStats()
        let rtt = 0
        let packetsLost = 0
        let packetsReceived = 0

        reports.forEach((report) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            if (typeof report.currentRoundTripTime === 'number') {
              rtt = Math.round(report.currentRoundTripTime * 1000)
            }
          }
          if (report.type === 'inbound-rtp') {
            if (typeof report.packetsLost === 'number') {
              packetsLost += report.packetsLost
            }
            if (typeof report.packetsReceived === 'number') {
              packetsReceived += report.packetsReceived
            }
          }
        })

        const total = packetsLost + packetsReceived
        const lossPercent = total > 0 ? Math.round((packetsLost / total) * 100) : 0
        const isWeak = rtt > 300 || lossPercent > 5

        setStats({
          rttMs: rtt,
          packetLossPercent: lossPercent,
          isWeak,
        })
      } catch {}
    }, 5000)

    return () => clearInterval(statsInterval)
  }, [callState])

  // Создать и отправить WebRTC Offer (выполняет звонящий)
  const sendWebRTCOffer = useCallback(async () => {
    let pc = peerConnectionRef.current
    if (!pc) {
      pc = await initWebRTCPeer()
    }
    if (!pc || !roomChannelRef.current) return

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo,
      })
      await pc.setLocalDescription(offer)
      roomChannelRef.current.send({
        type: 'broadcast',
        event: 'webrtc_offer',
        payload: {
          sdp: offer,
          senderId: currentUserId || 'me',
        },
      })
    } catch (offerErr) {
      console.warn('[WebRTC] sendWebRTCOffer error:', offerErr)
    }
  }, [currentUserId, initWebRTCPeer, isVideo])

  // 9. ДВУХСТОРОННЯЯ СЕССИОННАЯ КОМНАТА ЗВОНКА (call_room_${sessionId})
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
        if (!isIncoming) {
          await sendWebRTCOffer()
        }
      })
      .on('broadcast', { event: 'call_ended' }, ({ payload }) => {
        stopCallSounds()
        playEndCallSound()
        if (payload?.reason === 'caller_disconnected') {
          setConnectionStatus('Собеседник закрыл страницу')
        }
        cleanupAndClose()
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
  }, [
    sessionId,
    isIncoming,
    initialConnected,
    currentUserId,
    sendWebRTCOffer,
    initWebRTCPeer,
    cleanupAndClose,
  ])

  // Автозапуск WebRTC при connected
  useEffect(() => {
    if (callState === 'connected' && !peerConnectionRef.current) {
      void initWebRTCPeer()
    }
  }, [callState, initWebRTCPeer])

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  // Принятие вызова
  const handleAccept = async () => {
    playClick(soundEnabled)
    stopCallSounds()
    setCallState('connected')

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
      await respondToCallRpc(sessionId, 'accept')
    }

    await initWebRTCPeer()
  }

  // Завершение или отклонение вызова
  const handleDeclineOrEnd = async () => {
    playClick(soundEnabled)
    stopCallSounds()
    playEndCallSound()

    if (roomChannelRef.current) {
      try {
        roomChannelRef.current.send({
          type: 'broadcast',
          event: 'call_ended',
          payload: { sessionId, duration },
        })
      } catch {}
    }

    if (sessionId) {
      const finalStatus = callState === 'connected' ? 'ended' : 'rejected'
      const finalAction = finalStatus === 'ended' ? 'end' : 'reject'
      await respondToCallRpc(sessionId, finalAction)
    }

    cleanupAndClose(duration)
  }

  // Быстрый ответ текстом
  const handleSendQuickReply = async (text: string) => {
    playClick(soundEnabled)
    stopCallSounds()
    playEndCallSound()

    if (onQuickReply) {
      onQuickReply(text)
    }
    if (sessionId) {
      await respondToCallRpc(sessionId, 'reject')
    }

    cleanupAndClose(0)
  }

  // Mute / Unmute микрофон
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

  // Камера Toggle
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

  // Динамик Toggle
  const toggleSpeaker = () => {
    playClick(soundEnabled)
    setSpeakerMuted((prev) => {
      const next = !prev
      if (remoteAudioRef.current) remoteAudioRef.current.muted = next
      if (remoteVideoRef.current) remoteVideoRef.current.muted = next
      return next
    })
  }

  // Демонстрация экрана (Desktop)
  const toggleScreenShare = async () => {
    playClick(soundEnabled)
    const pc = peerConnectionRef.current
    if (!pc) return

    if (isScreenSharing) {
      // Останавливаем демонстрацию и возвращаем камеру
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop())
        screenStreamRef.current = null
      }
      if (originalVideoTrackRef.current) {
        const senders = pc.getSenders()
        const videoSender = senders.find((s) => s.track?.kind === 'video')
        if (videoSender) {
          await videoSender.replaceTrack(originalVideoTrackRef.current)
        }
      }
      setIsScreenSharing(false)
    } else {
      // Запускаем getDisplayMedia
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          alert('Демонстрация экрана не поддерживается на данном устройстве')
          return
        }
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        screenStreamRef.current = screenStream
        const screenTrack = screenStream.getVideoTracks()[0]

        screenTrack.onended = () => {
          void toggleScreenShare()
        }

        const senders = pc.getSenders()
        const videoSender = senders.find((s) => s.track?.kind === 'video')
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack)
        } else {
          pc.addTrack(screenTrack, screenStream)
        }

        setIsScreenSharing(true)
      } catch (err) {
        console.warn('[WebRTC] getDisplayMedia error:', err)
      }
    }
  }

  // Переворот камеры (Mobile)
  const flipCamera = async () => {
    playClick(soundEnabled)
    const nextFacing = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(nextFacing)

    if (localStreamRef.current && isVideo) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextFacing },
        })
        const newTrack = newStream.getVideoTracks()[0]
        const pc = peerConnectionRef.current

        if (pc) {
          const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video')
          if (videoSender) {
            await videoSender.replaceTrack(newTrack)
          }
        }

        // Останавливаем старый видео-трек
        localStreamRef.current.getVideoTracks().forEach((t) => t.stop())
        localStreamRef.current.removeTrack(localStreamRef.current.getVideoTracks()[0])
        localStreamRef.current.addTrack(newTrack)
        originalVideoTrackRef.current = newTrack

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current
        }
      } catch (e) {
        console.warn('[WebRTC] Flip camera failed:', e)
      }
    }
  }

  // Переключение PiP мини-режима
  const handleToggleMinimize = () => {
    playClick(soundEnabled)
    if (onToggleMinimize) {
      onToggleMinimize()
    } else {
      setLocalMinimized((prev) => !prev)
    }
  }

  if (isOpen === false) return null

  // ==========================================================================
  // РЕЖИМ 1: ПЛАВАЮЩИЙ PiP-МИНИ-ВИДЖЕТ (В СВЕРНУТОМ СОСТОЯНИИ)
  // ==========================================================================
  if (effectiveMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-72 sm:w-80 rounded-2xl bg-black/92 backdrop-blur-xl border border-white/20 shadow-2xl p-3 flex flex-col gap-2 select-none animate-in fade-in slide-in-from-bottom-4 duration-200">
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* Верхняя строка: Собеседник + кнопка развернуть */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ChatAvatar
              friendId={friendId}
              size={32}
              fallbackAvatar={effectiveAvatar}
              fallbackName={displayName}
            />
            <div className="min-w-0">
              <p className="text-white text-xs font-bold truncate">{displayName}</p>
              <p className="text-white/60 text-[11px] font-mono">{formatTimer(duration)}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleToggleMinimize}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Развернуть звонок"
              aria-label="Развернуть звонок"
            >
              <Maximize2 size={15} />
            </button>
            <button
              type="button"
              onClick={handleDeclineOrEnd}
              className="p-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
              title="Завершить вызов"
              aria-label="Завершить вызов"
            >
              <PhoneOff size={15} />
            </button>
          </div>
        </div>

        {/* Мини-видео если видеозвонок */}
        {isVideo && callState === 'connected' && (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/60 border border-white/10">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            {!cameraOff && (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute right-2 bottom-2 w-20 aspect-video rounded-lg object-cover border border-white/30"
              />
            )}
          </div>
        )}

        {/* Нижние мини-кнопки управления */}
        <div className="flex items-center justify-around pt-1 border-t border-white/10">
          <button
            type="button"
            onClick={toggleMic}
            className={`p-2 rounded-full transition-colors ${
              micMuted ? 'bg-red-500/25 text-red-400' : 'text-white hover:bg-white/10'
            }`}
            title={micMuted ? 'Включить микрофон' : 'Выключить микрофон'}
          >
            {micMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          {isVideo && (
            <button
              type="button"
              onClick={toggleCamera}
              className={`p-2 rounded-full transition-colors ${
                cameraOff ? 'bg-red-500/25 text-red-400' : 'text-white hover:bg-white/10'
              }`}
              title={cameraOff ? 'Включить камеру' : 'Выключить камеру'}
            >
              {cameraOff ? <VideoOff size={16} /> : <Video size={16} />}
            </button>
          )}

          <button
            type="button"
            onClick={toggleSpeaker}
            className={`p-2 rounded-full transition-colors ${
              speakerMuted ? 'bg-red-500/25 text-red-400' : 'text-white hover:bg-white/10'
            }`}
            title={speakerMuted ? 'Включить звук' : 'Выключить звук'}
          >
            {speakerMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>
    )
  }

  // ==========================================================================
  // РЕЖИМ 2: ПОЛНОЭКРАННОЕ ОКНО ЗВОНКА
  // ==========================================================================
  return (
    <div className="fixed inset-0 z-50 bg-black/92 backdrop-blur-2xl flex flex-col items-center justify-between p-4 sm:p-6 select-none animate-in fade-in duration-200">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Верхняя панель: статус, кнопка свернуть в PiP, настройки устройств */}
      <div className="w-full max-w-xl flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleMinimize}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Свернуть в мини-окно (PiP)"
            aria-label="Свернуть в мини-окно"
          >
            <Minimize2 size={18} />
          </button>

          <button
            type="button"
            onClick={() => {
              void refreshDevices()
              setDevicesModalOpen((p) => !p)
            }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Настройки микрофона и камеры"
            aria-label="Настройки микрофона и камеры"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Статус качества связи (getStats) */}
        {callState === 'connected' && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs">
            {stats.isWeak ? (
              <span className="flex items-center gap-1 text-amber-400 font-medium animate-pulse">
                <AlertTriangle size={12} />
                <span>Слабая связь ({stats.rttMs} мс, {stats.packetLossPercent}%)</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                <span>Связь стабильная</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Центральный заголовок статуса */}
      <div className="flex flex-col items-center gap-1.5 mt-2 z-10 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold tracking-wide uppercase">
          {isVideo ? <Video size={13} className="text-[#1d9bf0]" /> : <Phone size={13} className="text-[#00ba7c]" />}
          <span>{isVideo ? 'Видеозвонок Огонька' : 'Аудиозвонок Огонька'}</span>
        </div>

        <span className="text-[14px] text-white/80 font-mono mt-1">
          {callState === 'incoming'
            ? 'Входящий вызов...'
            : callState === 'calling'
            ? `Звоним ${handleName}...`
            : formatTimer(duration)}
        </span>

        {callState === 'connected' && (
          <span className="text-[11px] text-[#00ba7c] font-medium tracking-wide">
            ● {connectionStatus}
          </span>
        )}

        {/* Подробная инструкция при отказе в разрешениях */}
        {(micBlocked || cameraBlocked || permissionErrorGuide) && (
          <div className="mx-auto max-w-md px-4 py-3 rounded-2xl bg-amber-500/15 border border-amber-500/35 text-amber-200 text-xs text-left mt-2 shadow-xl animate-in fade-in">
            <div className="flex items-center gap-2 font-bold mb-1 text-amber-300">
              <MicOff size={15} />
              <span>Микрофон недоступен. Проверьте разрешения в браузере</span>
            </div>
            <p className="text-white/80 leading-relaxed text-[11px]">
              1. Нажмите на значок замка / настроек слева от адресной строки браузера.
              <br />
              2. Переключите «Микрофон» и «Камера» в положение «Разрешить».
              <br />
              3. Перезагрузите страницу для применения изменений.
            </p>
          </div>
        )}
      </div>

      {/* Центр: Видео или Аватар */}
      <div className="relative w-full max-w-xl flex-1 flex flex-col items-center justify-center my-4">
        {isVideo && callState === 'connected' ? (
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

            {/* Локальное превью камеры */}
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
              {(callState === 'calling' || callState === 'incoming') && (
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

            <h2 className="text-2xl sm:text-3xl font-[900] text-white tracking-tight">
              {displayName}
            </h2>
            <p className="text-sm font-medium text-[var(--accent)] mt-1">
              {handleName}
            </p>
            <p className="text-xs text-white/50 mt-1">
              {callState === 'calling'
                ? 'Ожидание ответа соратника (до 45 сек)...'
                : callState === 'incoming'
                ? 'Входящий звонок'
                : 'Защищённый WebRTC голосовой поток Огонька'}
            </p>
          </div>
        )}
      </div>

      {/* Модальное окно выбора устройств */}
      {devicesModalOpen && (
        <div className="absolute top-16 left-6 z-30 w-72 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] p-4 shadow-2xl text-[var(--text)]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider">Выбор устройств</h4>
            <button
              type="button"
              onClick={() => setDevicesModalOpen(false)}
              className="text-[var(--text-2)] hover:text-[var(--text)]"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex flex-col gap-3 text-xs">
            <div>
              <label className="text-white/60 block mb-1">Микрофон:</label>
              <select
                value={selectedAudioInput}
                onChange={(e) => setSelectedAudioInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-1.5 text-xs text-white"
              >
                <option value="">По умолчанию</option>
                {deviceList.audioInputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Микрофон ${d.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>

            {isVideo && (
              <div>
                <label className="text-white/60 block mb-1">Камера:</label>
                <select
                  value={selectedVideoInput}
                  onChange={(e) => setSelectedVideoInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                >
                  <option value="">По умолчанию</option>
                  {deviceList.videoInputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Камера ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Модалка быстрого ответа сообщением при входящем вызове */}
      {quickReplyOpen && (
        <div className="absolute inset-x-4 bottom-28 max-w-sm mx-auto z-30 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] p-4 shadow-2xl animate-in zoom-in-95">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white">Ответить сообщением:</span>
            <button type="button" onClick={() => setQuickReplyOpen(false)} className="text-white/60 hover:text-white">
              <X size={15} />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {[
              'Перезвоню позже ⏳',
              'Сейчас на встрече 💼',
              'Пиши здесь в чате ✍️',
              'Не могу говорить 🤫',
            ].map((msg) => (
              <button
                key={msg}
                type="button"
                onClick={() => handleSendQuickReply(msg)}
                className="text-left px-3 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-xs text-white transition-colors"
              >
                {msg}
              </button>
            ))}

            <div className="flex items-center gap-1.5 mt-2">
              <input
                type="text"
                placeholder="Свой ответ..."
                value={customReplyText}
                onChange={(e) => setCustomReplyText(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none"
              />
              <button
                type="button"
                disabled={!customReplyText.trim()}
                onClick={() => handleSendQuickReply(customReplyText.trim())}
                className="px-3 py-1.5 rounded-xl bg-[var(--accent)] text-white text-xs font-bold disabled:opacity-40"
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Нижняя панель действий */}
      <div className="w-full max-w-md pb-6 flex items-center justify-center gap-4 sm:gap-5 z-10">
        {callState === 'incoming' ? (
          <>
            {/* Отклонить */}
            <button
              type="button"
              onClick={handleDeclineOrEnd}
              className="w-16 h-16 rounded-full bg-[#f4212e] hover:bg-[#dc1e29] text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"
              aria-label="Отклонить"
              title="Отклонить вызов"
            >
              <PhoneOff size={28} />
            </button>

            {/* Ответить сообщением */}
            <button
              type="button"
              onClick={() => setQuickReplyOpen((p) => !p)}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shadow-lg transition-all"
              aria-label="Ответить сообщением"
              title="Ответить сообщением"
            >
              <MessageSquare size={20} />
            </button>

            {/* Принять */}
            <button
              type="button"
              onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-[#00ba7c] hover:bg-[#00a36d] text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all animate-bounce"
              aria-label="Принять"
              title="Принять вызов"
            >
              <Phone size={28} />
            </button>
          </>
        ) : (
          <>
            {/* Микрофон Mute */}
            <button
              type="button"
              onClick={toggleMic}
              className={`w-13 h-13 rounded-full flex items-center justify-center transition-all p-3.5 ${
                micMuted
                  ? 'bg-red-500/25 text-red-400 border border-red-500/40 ring-2 ring-red-500/20'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              aria-label={micMuted ? 'Включить микрофон' : 'Выключить микрофон'}
              title={micMuted ? 'Микрофон выключен' : 'Микрофон включен'}
            >
              {micMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            {/* Камера Toggle */}
            {isVideo && (
              <button
                type="button"
                onClick={toggleCamera}
                className={`w-13 h-13 rounded-full flex items-center justify-center transition-all p-3.5 ${
                  cameraOff
                    ? 'bg-red-500/25 text-red-400 border border-red-500/40'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                aria-label={cameraOff ? 'Включить камеру' : 'Выключить камеру'}
                title={cameraOff ? 'Камера выключена' : 'Камера включена'}
              >
                {cameraOff ? <VideoOff size={22} /> : <Video size={22} />}
              </button>
            )}

            {/* Демонстрация экрана (Desktop) */}
            {isVideo && (
              <button
                type="button"
                onClick={toggleScreenShare}
                className={`w-13 h-13 rounded-full flex items-center justify-center transition-all p-3.5 hidden sm:flex ${
                  isScreenSharing
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                aria-label={isScreenSharing ? 'Остановить демонстрацию экрана' : 'Демонстрация экрана'}
                title={isScreenSharing ? 'Остановить экран' : 'Поделиться экраном'}
              >
                <Monitor size={22} />
              </button>
            )}

            {/* Переворот камеры (Mobile) */}
            {isVideo && (
              <button
                type="button"
                onClick={flipCamera}
                className="w-13 h-13 rounded-full flex sm:hidden items-center justify-center transition-all p-3.5 bg-white/10 text-white hover:bg-white/20"
                aria-label="Перевернуть камеру"
                title="Перевернуть камеру"
              >
                <FlipHorizontal size={22} />
              </button>
            )}

            {/* Динамик / Звук Toggle */}
            <button
              type="button"
              onClick={toggleSpeaker}
              className={`w-13 h-13 rounded-full flex items-center justify-center transition-all p-3.5 ${
                speakerMuted
                  ? 'bg-red-500/25 text-red-400 border border-red-500/40'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              aria-label={speakerMuted ? 'Включить звук' : 'Выключить звук'}
              title={speakerMuted ? 'Звук выключен' : 'Звук включен'}
            >
              {speakerMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
            </button>

            {/* Завершить звонок (красная кнопка) */}
            <button
              type="button"
              onClick={handleDeclineOrEnd}
              className="w-16 h-16 rounded-full bg-[#f4212e] hover:bg-[#dc1e29] text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"
              aria-label="Завершить вызов"
              title="Завершить вызов"
            >
              <PhoneOff size={28} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

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
} from 'lucide-react'
import { playClick } from '@/lib/ogonek/sound'
import {
  playOutgoingRing,
  playIncomingRingtone,
  playEndCallSound,
  stopCallSounds,
} from '@/lib/ogonek/call-sound'
import { getSupabase } from '@/lib/supabase/client'
import { updateCallSessionStatus, type CallSessionRecord } from '@/lib/supabase/api'
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
}: ChatCallModalProps) {
  const [callState, setCallState] = useState<'incoming' | 'calling' | 'connected'>(
    initialConnected ? 'connected' : isIncoming ? 'incoming' : 'calling'
  )
  const [micBlocked, setMicBlocked] = useState(false)
  const [micMuted, setMicMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(!isVideo)
  const [speakerMuted, setSpeakerMuted] = useState(false)
  const [duration, setDuration] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<string>('Инициализация...')

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const roomChannelRef = useRef<any>(null)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])

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
    : (friendId && !isFriendIdUuid ? `@${friendId}` : '@соратник')

  // Очистка и безопасное завершение вызова
  const cleanupAndClose = useCallback(
    (dur?: number) => {
      stopCallSounds()
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

  // 3. Инициализация WebRTC PeerConnection с безопасным try/catch
  const initWebRTCPeer = useCallback(async () => {
    if (typeof window === 'undefined') return null

    try {
      setConnectionStatus('Подключение медиа...')

      // 1. Захват микрофона (и камеры если видео) с мягким try/catch
      let localStream: MediaStream | null = null
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
          localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: isVideo,
          }).catch(async (primaryErr) => {
            console.warn('[WebRTC] Primary getUserMedia failed:', primaryErr)
            if (isVideo) {
              return await navigator.mediaDevices.getUserMedia({ audio: true, video: false }).catch(() => null)
            }
            return null
          })
        }
      } catch (mediaErr) {
        console.warn('[WebRTC] getUserMedia caught error:', mediaErr)
        localStream = null
      }

      if (!localStream) {
        setMicBlocked(true)
      } else {
        setMicBlocked(false)
      }

      localStreamRef.current = localStream
      if (localStream && localVideoRef.current && isVideo) {
        try {
          localVideoRef.current.srcObject = localStream
        } catch {}
      }

      if (typeof RTCPeerConnection === 'undefined') {
        setConnectionStatus('WebRTC недоступен')
        return null
      }

      // 2. Инициализация RTCPeerConnection со STUN сервером
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      })

      peerConnectionRef.current = pc

      // 3. Добавление локальных медиа-треков
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          try {
            pc.addTrack(track, localStream!)
          } catch {}
        })
      }

      // 4. Прием удаленных треков собеседника
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

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setConnectionStatus('В эфире')
        } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          setConnectionStatus('Переподключение...')
        }
      }

      // 5. Отправка ICE кандидатов в комнату звонка
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
  }, [currentUserId, isVideo])

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

  // 4. ДВУХСТОРОННЯЯ СЕССИОННАЯ КОМНАТА ЗВОНКА (call_room_${sessionId})
  // Используются ТОЛЬКО скоростные broadcast-события. Никаких postgres_changes!
  useEffect(() => {
    if (!sessionId) return
    const supabase = getSupabase()
    if (!supabase) return

    // ЕДИНЫЙ канал комнаты для обоих участников
    const roomChannelName = `call_room_${sessionId}`
    
    // Предварительно удаляем старый зависший инстанс канала с таким именем, если он был
    const existingRoom = supabase.getChannels().find((c) => c.topic === `realtime:${roomChannelName}`)
    if (existingRoom) {
      try {
        supabase.removeChannel(existingRoom)
      } catch {}
    }

    const roomChannel = supabase.channel(roomChannelName)
    roomChannelRef.current = roomChannel

    // СТРОГО СНАЧАЛА ВСЕ ОБРАБОТЧИКИ .on():
    // А. Звонящий слушает call_accepted
    roomChannel
      .on('broadcast', { event: 'call_accepted' }, async () => {
        stopCallSounds()
        setCallState('connected')
        // Если звонящий — отправляем WebRTC offer
        if (!isIncoming) {
          await sendWebRTCOffer()
        }
      })
      // В. Синхронный отбой: любой участник нажал красную кнопку
      .on('broadcast', { event: 'call_ended' }, () => {
        stopCallSounds()
        playEndCallSound()
        cleanupAndClose()
      })
      // WebRTC сигналинг внутри комнаты
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

          // Дренаж отложенных ICE кандидатов
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

    // И ТОЛЬКО В КОНЦЕ subscribe()
    roomChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Если получатель уже принял вызов, гарантируем отправку call_accepted в комнату
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

    // Также слушаем персональный канал пользователя на предмет call_accepted / call_ended
    let userChannel: any = null
    if (currentUserId) {
      const userChannelName = `user_calls_${currentUserId}`
      const existingUser = supabase.getChannels().find((c) => c.topic === `realtime:${userChannelName}`)
      if (existingUser) {
        try {
          supabase.removeChannel(existingUser)
        } catch {}
      }
      userChannel = supabase.channel(userChannelName)
      userChannel
        .on('broadcast', { event: 'call_accepted' }, async () => {
          stopCallSounds()
          setCallState('connected')
          if (!isIncoming) {
            await sendWebRTCOffer()
          }
        })
        .on('broadcast', { event: 'call_ended' }, () => {
          stopCallSounds()
          playEndCallSound()
          cleanupAndClose()
        })
        .subscribe()
    }

    return () => {
      try {
        supabase.removeChannel(roomChannel)
      } catch {}
      if (userChannel) {
        try {
          supabase.removeChannel(userChannel)
        } catch {}
      }
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

  // Если уже в статусе connected (например, после клика «Принять») — запускаем аудио WebRTC
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

  // Получатель нажимает «Принять»
  const handleAccept = async () => {
    playClick(soundEnabled)
    stopCallSounds()
    setCallState('connected')

    // 1. Отправляем broadcast call_accepted в комнату звонка
    if (roomChannelRef.current) {
      try {
        roomChannelRef.current.send({
          type: 'broadcast',
          event: 'call_accepted',
          payload: { sessionId },
        })
      } catch (e) {
        console.warn('[ChatCallModal] roomChannel broadcast error:', e)
      }
    }

    // 2. Отправляем в персональный канал звонящего
    const supabase = getSupabase()
    const targetCallerId = callerId || friendId
    if (supabase && targetCallerId) {
      try {
        const callerChan = supabase.channel(`user_calls_${targetCallerId}`)
        callerChan.subscribe((st) => {
          if (st === 'SUBSCRIBED') {
            callerChan.send({
              type: 'broadcast',
              event: 'call_accepted',
              payload: { sessionId },
            })
            setTimeout(() => {
              try {
                supabase.removeChannel(callerChan)
              } catch {}
            }, 1000)
          }
        })
      } catch (e) {
        console.warn('[ChatCallModal] callerChan broadcast error:', e)
      }
    }

    // 3. Обновляем статус в базе
    if (sessionId) {
      try {
        await updateCallSessionStatus(sessionId, 'accepted')
      } catch (e) {
        console.warn('[ChatCallModal] updateCallSessionStatus error:', e)
      }
    }

    // 4. Инициализируем аудио поток
    await initWebRTCPeer()
  }

  // СИНХРОННЫЙ ОТБОЙ (когда любой нажимает красную кнопку)
  const handleDeclineOrEnd = async () => {
    playClick(soundEnabled)
    stopCallSounds()
    playEndCallSound()

    // 1. Отправляем broadcast call_ended в единую комнату звонка
    if (roomChannelRef.current) {
      try {
        roomChannelRef.current.send({
          type: 'broadcast',
          event: 'call_ended',
          payload: { sessionId },
        })
      } catch (e) {
        console.warn('[ChatCallModal] send call_ended error:', e)
      }
    }

    // 2. Отправляем также в персональный канал собеседника
    const targetPeerId = isIncoming ? callerId : (receiverId || friendId)
    const supabase = getSupabase()
    if (supabase && targetPeerId) {
      try {
        const peerChannel = supabase.channel(`user_calls_${targetPeerId}`)
        peerChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            peerChannel.send({
              type: 'broadcast',
              event: 'call_ended',
              payload: { sessionId },
            })
            setTimeout(() => {
              try {
                supabase.removeChannel(peerChannel)
              } catch {}
            }, 500)
          }
        })
      } catch (e) {
        console.warn('[ChatCallModal] peerChannel send error:', e)
      }
    }

    // 3. Обновляем статус в Supabase
    if (sessionId) {
      try {
        const finalStatus = callState === 'connected' ? 'ended' : 'rejected'
        await updateCallSessionStatus(sessionId, finalStatus, duration)
      } catch (e) {
        console.warn('[ChatCallModal] update final status error:', e)
      }
    }

    cleanupAndClose(duration)
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
      if (remoteAudioRef.current) {
        remoteAudioRef.current.muted = next
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.muted = next
      }
      return next
    })
  }

  if (isOpen === false) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/92 backdrop-blur-2xl flex flex-col items-center justify-between p-6 select-none animate-in fade-in duration-200">
      {/* Скрытый аудио-элемент для воспроизведения голоса собеседника по WebRTC */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Верхний статус звонка */}
      <div className="flex flex-col items-center gap-1.5 mt-6 z-10 text-center">
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

        {/* Мягкое уведомление при отсутствии разрешений на микрофон (не крашит интерфейс) */}
        {micBlocked && (
          <div className="mx-auto max-w-sm px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-medium flex items-center gap-2 mt-2 shadow-lg animate-in fade-in">
            <MicOff size={14} className="text-amber-400 shrink-0" />
            <span>Микрофон недоступен. Проверьте разрешения в браузере</span>
          </div>
        )}
      </div>

      {/* Центр: Видео трансляция или Аватар с неоновым пульсом */}
      <div className="relative w-full max-w-xl flex-1 flex flex-col items-center justify-center my-6">
        {isVideo && callState === 'connected' ? (
          <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-black/60 border border-white/10 shadow-2xl flex items-center justify-center">
            {/* Видео собеседника */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Если удаленное видео еще не пошло или выключено */}
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

            {/* Локальное превью камеры в правом нижнем углу */}
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
            {/* Аватар с пульсирующим неоновым кольцом при вызове */}
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
                ? 'Ожидание ответа соратника...'
                : callState === 'incoming'
                ? 'Входящий звонок'
                : 'Защищённый голосовой поток Огонька'}
            </p>
          </div>
        )}
      </div>

      {/* Нижняя панель действий */}
      <div className="w-full max-w-md pb-6 flex items-center justify-center gap-5 z-10">
        {callState === 'incoming' ? (
          <>
            {/* Отклонить (красная кнопка с трубкой) */}
            <button
              type="button"
              onClick={handleDeclineOrEnd}
              className="w-16 h-16 rounded-full bg-[#f4212e] hover:bg-[#dc1e29] text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"
              aria-label="Отклонить"
            >
              <PhoneOff size={28} />
            </button>

            {/* Принять (зелёная кнопка с трубкой) */}
            <button
              type="button"
              onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-[#00ba7c] hover:bg-[#00a36d] text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all animate-bounce"
              aria-label="Принять"
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

            {/* Камера Toggle (если видеозвонок) */}
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
            >
              <PhoneOff size={28} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

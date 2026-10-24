'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Volume2,
} from 'lucide-react'
import { playClick } from '@/lib/ogonek/sound'
import { ChatAvatar } from './chat-avatar'

type Props = {
  friendId: string
  friendName: string
  isVideo?: boolean
  isIncoming?: boolean
  onEndCall: (durationSeconds: number, callType: 'audio' | 'video') => void
  soundEnabled?: boolean
}

export function ChatCallModal({
  friendId,
  friendName,
  isVideo = false,
  isIncoming = false,
  onEndCall,
  soundEnabled = true,
}: Props) {
  const [callState, setCallState] = useState<'incoming' | 'calling' | 'connected'>(
    isIncoming ? 'incoming' : 'calling'
  )
  const [micMuted, setMicMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(!isVideo)
  const [duration, setDuration] = useState(0)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Симуляция ответа собеседника через 2.5 сек при исходящем звонке
  useEffect(() => {
    if (callState === 'calling') {
      const timer = setTimeout(() => {
        setCallState('connected')
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [callState])

  // Таймер длительности активного звонка
  useEffect(() => {
    if (callState !== 'connected') return
    const interval = setInterval(() => {
      setDuration((d) => d + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [callState])

  // Подключение медиа-потока (камера / микрофон)
  useEffect(() => {
    let active = true

    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices?.getUserMedia({
          audio: true,
          video: isVideo,
        })
        if (!active) return
        streamRef.current = stream
        if (localVideoRef.current && isVideo) {
          localVideoRef.current.srcObject = stream
        }
      } catch {
        // Fallback for browsers or devices without permissions
      }
    }

    if (callState === 'connected' || !isIncoming) {
      void setupMedia()
    }

    return () => {
      active = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [callState, isIncoming, isVideo])

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const handleAccept = () => {
    playClick(soundEnabled)
    setCallState('connected')
  }

  const handleDeclineOrEnd = () => {
    playClick(soundEnabled)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
    onEndCall(duration, isVideo ? 'video' : 'audio')
  }

  const toggleMic = () => {
    playClick(soundEnabled)
    setMicMuted((v) => {
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach((t) => (t.enabled = v))
      }
      return !v
    })
  }

  const toggleCamera = () => {
    playClick(soundEnabled)
    setCameraOff((v) => {
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach((t) => (t.enabled = v))
      }
      return !v
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-between p-6 select-none animate-in fade-in">
      {/* Верхний статус */}
      <div className="flex flex-col items-center gap-2 mt-8 z-10">
        <span className="text-[13px] font-bold uppercase tracking-wider text-[var(--accent)]">
          {isVideo ? 'Видеозвонок Огонька' : 'Аудиозвонок Огонька'}
        </span>
        <span className="text-[14px] text-white/70 font-mono">
          {callState === 'incoming'
            ? 'Входящий вызов...'
            : callState === 'calling'
            ? 'Вызов соратника...'
            : formatTimer(duration)}
        </span>
      </div>

      {/* Центр: Видео или Аватар */}
      <div className="relative w-full max-w-xl flex-1 flex flex-col items-center justify-center my-6">
        {isVideo && callState === 'connected' ? (
          <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-white/5 border border-white/10 shadow-2xl flex items-center justify-center">
            {/* Видео собеседника */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              <ChatAvatar friendId={friendId} size={96} ringColor="#000" />
              <p className="text-white text-lg font-bold mt-4">{friendName}</p>
              <p className="text-white/60 text-xs mt-1">Трансляция видео по WebRTC активна</p>
            </div>

            {/* Моё маленькое превью в углу */}
            {!cameraOff && (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute right-4 bottom-4 w-36 aspect-video rounded-xl object-cover border-2 border-white/20 shadow-lg"
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-[var(--accent)]/20 animate-ping" />
              <ChatAvatar friendId={friendId} size={128} ringColor="var(--accent)" />
            </div>
            <h2 className="text-2xl font-black text-white">{friendName}</h2>
            <p className="text-sm text-white/60 mt-1">Соратник дневника</p>
          </div>
        )}
      </div>

      {/* Нижняя панель действий */}
      <div className="w-full max-w-md pb-6 flex items-center justify-center gap-6 z-10">
        {callState === 'incoming' ? (
          <>
            {/* Отклонить (красная кнопка) */}
            <button
              type="button"
              onClick={handleDeclineOrEnd}
              className="w-16 h-16 rounded-full bg-[#f4212e] text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all"
              aria-label="Отклонить"
            >
              <PhoneOff size={28} />
            </button>

            {/* Принять (зелёная кнопка) */}
            <button
              type="button"
              onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-[#00ba7c] text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all animate-bounce"
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
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                micMuted
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              aria-label={micMuted ? 'Включить микрофон' : 'Выключить микрофон'}
            >
              {micMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            {/* Камера Toggle */}
            {isVideo && (
              <button
                type="button"
                onClick={toggleCamera}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  cameraOff
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                aria-label={cameraOff ? 'Включить камеру' : 'Выключить камеру'}
              >
                {cameraOff ? <VideoOff size={22} /> : <Video size={22} />}
              </button>
            )}

            {/* Завершить звонок (красная кнопка) */}
            <button
              type="button"
              onClick={handleDeclineOrEnd}
              className="w-16 h-16 rounded-full bg-[#f4212e] text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all"
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

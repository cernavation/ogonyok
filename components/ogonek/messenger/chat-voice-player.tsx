'use client'

import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { playClick } from '@/lib/ogonek/sound'
import type { ChatMessageMedia } from '@/lib/ogonek/types'

type Props = {
  media: ChatMessageMedia
  isMine: boolean
  soundEnabled?: boolean
}

export function ChatVoicePlayer({ media, isMine, soundEnabled = true }: Props) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0 to 1
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1)
  const [hasRealAudio, setHasRealAudio] = useState(true)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const duration = media.durationSec || 6
  const waveform = media.waveform?.length
    ? media.waveform
    : [30, 45, 60, 80, 55, 40, 70, 90, 85, 60, 40, 30, 50, 75, 95, 60, 40, 50, 65, 80, 50, 35, 45, 60]

  // Синхронизация скорости с реальным audio элементом
  useEffect(() => {
    if (audioRef.current) {
      try {
        audioRef.current.playbackRate = speed
      } catch {}
    }
  }, [speed])

  // Резервный таймер прогресса, если аудио не поддерживается или является моком
  useEffect(() => {
    if (!hasRealAudio && isPlaying) {
      const stepMs = 100
      const totalMs = (duration * 1000) / speed
      const stepInc = stepMs / totalMs

      timerRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 1) {
            setIsPlaying(false)
            return 0
          }
          return Math.min(1, p + stepInc)
        })
      }, stepMs)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [hasRealAudio, isPlaying, duration, speed])

  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    const cur = audioRef.current.currentTime
    const total = audioRef.current.duration || duration || 1
    if (isFinite(total) && total > 0) {
      setProgress(Math.min(1, Math.max(0, cur / total)))
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setProgress(0)
  }

  const handleAudioError = () => {
    // Если аудиофайл не может быть воспроизведен (например, mock-audio.webm), переключаемся на программную симуляцию
    setHasRealAudio(false)
  }

  const togglePlay = () => {
    playClick(soundEnabled)

    if (isPlaying) {
      if (audioRef.current && hasRealAudio) {
        try {
          audioRef.current.pause()
        } catch {}
      }
      setIsPlaying(false)
    } else {
      if (progress >= 1) {
        setProgress(0)
        if (audioRef.current && hasRealAudio) {
          try {
            audioRef.current.currentTime = 0
          } catch {}
        }
      }

      if (audioRef.current && hasRealAudio && media.url && !media.url.endsWith('.webm') && media.url.startsWith('data:')) {
        audioRef.current.playbackRate = speed
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true)
          })
          .catch((err) => {
            console.warn('[VoicePlayer] Real audio play prevented, falling back to simulated timer:', err)
            setHasRealAudio(false)
            setIsPlaying(true)
          })
      } else if (audioRef.current && hasRealAudio && media.url && !media.url.includes('mock')) {
        audioRef.current.playbackRate = speed
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true)
          })
          .catch(() => {
            setHasRealAudio(false)
            setIsPlaying(true)
          })
      } else {
        // Симуляция таймера
        setHasRealAudio(false)
        setIsPlaying(true)
      }
    }
  }

  const cycleSpeed = () => {
    playClick(soundEnabled)
    const nextSpeed: 1 | 1.5 | 2 = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1
    setSpeed(nextSpeed)
    if (audioRef.current) {
      try {
        audioRef.current.playbackRate = nextSpeed
      } catch {}
    }
  }

  const handleSeek = (barFraction: number) => {
    playClick(soundEnabled)
    const targetFraction = Math.max(0, Math.min(1, barFraction))
    setProgress(targetFraction)

    if (audioRef.current && hasRealAudio) {
      try {
        const total = audioRef.current.duration || duration
        if (isFinite(total) && total > 0) {
          audioRef.current.currentTime = targetFraction * total
        }
      } catch {}
    }
  }

  const formatTime = (secs: number) => {
    const s = Math.round(secs)
    const mins = Math.floor(s / 60)
    const rem = s % 60
    return `${mins}:${rem.toString().padStart(2, '0')}`
  }

  const currentDuration = audioRef.current?.duration && isFinite(audioRef.current.duration)
    ? audioRef.current.duration
    : duration

  const currentTime = currentDuration * progress
  const displayTime = isPlaying ? formatTime(currentTime) : formatTime(currentDuration)

  return (
    <div className="flex items-center gap-3 py-1">
      {/* Скрытый HTML5 аудио элемент для реального воспроизведения звука */}
      {media.url && (
        <audio
          ref={audioRef}
          src={media.url}
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={handleAudioError}
        />
      )}

      {/* Кнопка Play / Pause */}
      <button
        type="button"
        onClick={togglePlay}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 shadow-sm ${
          isMine
            ? 'bg-white text-[#1d9bf0] hover:bg-white/90'
            : 'bg-[#ff7a18] text-white hover:bg-[#ff8a3d]'
        }`}
        aria-label={isPlaying ? 'Пауза' : 'Слушать голосовое'}
      >
        {isPlaying ? (
          <Pause size={18} fill="currentColor" />
        ) : (
          <Play size={18} fill="currentColor" className="ml-0.5" />
        )}
      </button>

      {/* Интерактивная форма волны звука */}
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex h-7 items-center gap-[2px]">
          {waveform.map((bar, idx) => {
            const barFraction = idx / waveform.length
            const isPlayed = barFraction <= progress
            const heightPx = Math.max(4, Math.round((bar / 100) * 26))

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSeek(barFraction)}
                className="flex-1 group py-2 focus:outline-none cursor-pointer"
                title={`Перемотать на ${formatTime(currentDuration * barFraction)}`}
              >
                <div
                  className={`w-full rounded-full transition-all ${
                    isPlayed
                      ? isMine
                        ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.4)]'
                        : 'bg-[#ffad5a] shadow-[0_0_6px_rgba(255,173,90,0.5)]'
                      : isMine
                      ? 'bg-white/35 hover:bg-white/60'
                      : 'bg-white/20 hover:bg-white/40'
                  }`}
                  style={{ height: `${heightPx}px` }}
                />
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono leading-none">
          <span className={isMine ? 'text-white/80' : 'text-[#71767b]'}>{displayTime}</span>
          <button
            type="button"
            onClick={cycleSpeed}
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
              isMine
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-white/10 text-[#ffad5a] hover:bg-white/20'
            }`}
          >
            {speed}x
          </button>
        </div>
      </div>
    </div>
  )
}

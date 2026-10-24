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
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const duration = media.durationSec || 8
  const waveform = media.waveform?.length
    ? media.waveform
    : [30, 45, 60, 80, 55, 40, 70, 90, 85, 60, 40, 30, 50, 75, 95, 60, 40, 50, 65, 80, 50, 35, 45, 60]

  useEffect(() => {
    if (isPlaying) {
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
  }, [isPlaying, duration, speed])

  const togglePlay = () => {
    playClick(soundEnabled)
    if (progress >= 1) setProgress(0)
    setIsPlaying((v) => !v)
  }

  const cycleSpeed = () => {
    playClick(soundEnabled)
    setSpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1))
  }

  const formatTime = (secs: number) => {
    const s = Math.round(secs)
    const mins = Math.floor(s / 60)
    const rem = s % 60
    return `${mins}:${rem.toString().padStart(2, '0')}`
  }

  const currentTime = duration * progress
  const displayTime = isPlaying ? formatTime(currentTime) : formatTime(duration)

  return (
    <div className="flex items-center gap-3 py-1">
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
        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
      </button>

      {/* Волна звука */}
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
                onClick={() => setProgress(barFraction)}
                className="flex-1 group py-2 focus:outline-none"
                title={`Перемотать на ${formatTime(duration * barFraction)}`}
              >
                <div
                  className={`w-full rounded-full transition-colors ${
                    isPlayed
                      ? isMine
                        ? 'bg-white'
                        : 'bg-[#ffad5a]'
                      : isMine
                      ? 'bg-white/35'
                      : 'bg-white/20'
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
            className={`rounded px-1 text-[10px] font-semibold transition-colors ${
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

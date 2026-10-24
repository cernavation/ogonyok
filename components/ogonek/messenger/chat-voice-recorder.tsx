'use client'

import { Check, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { playClick } from '@/lib/ogonek/sound'
import type { ChatMessageMedia } from '@/lib/ogonek/types'

type Props = {
  onSendVoice: (media: ChatMessageMedia) => void
  onCancel: () => void
  soundEnabled?: boolean
}

export function ChatVoiceRecorder({ onSendVoice, onCancel, soundEnabled = true }: Props) {
  const [seconds, setSeconds] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSeconds((s) => s + 1)
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSend = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    playClick(soundEnabled)
    const dur = Math.max(1, seconds)
    // Generate realistic voice waveform bars [10..100]
    const barsCount = 28
    const waveform: number[] = Array.from({ length: barsCount }).map(() =>
      Math.floor(20 + Math.random() * 80)
    )

    onSendVoice({
      type: 'audio',
      url: 'mock-audio.webm',
      durationSec: dur,
      waveform,
      name: `Голосовое (${formatTimer(dur)})`,
    })
  }

  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    playClick(soundEnabled)
    onCancel()
  }

  return (
    <div className="flex flex-1 items-center justify-between rounded-xl border border-red-500/30 bg-red-950/20 px-3 py-1.5 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-3">
        {/* Пульсирующая красная точка записи */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
          <span className="font-mono text-xs font-semibold text-red-400">
            {formatTimer(seconds)}
          </span>
        </div>

        {/* Анимированная звуковая волна */}
        <div className="flex h-5 items-center gap-0.5 px-2">
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="w-0.5 rounded-full bg-red-400/80 animate-pulse"
              style={{
                height: `${Math.max(4, 8 + Math.sin(i + seconds * 2) * 12 + ((i * 7) % 10))}px`,
                animationDelay: `${i * 60}ms`,
                animationDuration: '600ms',
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleCancel}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71767b] hover:bg-red-500/20 hover:text-red-400 transition-colors"
          title="Отменить запись"
          aria-label="Отменить запись"
        >
          <Trash2 size={16} />
        </button>

        <button
          type="button"
          onClick={handleSend}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff7a18] text-white hover:bg-[#ff8a3d] shadow-sm transition-transform active:scale-95"
          title="Отправить голосовое"
          aria-label="Отправить голосовое"
        >
          <Check size={16} />
        </button>
      </div>
    </div>
  )
}

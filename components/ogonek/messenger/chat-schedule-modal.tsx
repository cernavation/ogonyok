'use client'

import React, { useState } from 'react'
import { Calendar, Clock, VolumeX, X } from 'lucide-react'
import { playClick } from '@/lib/ogonek/sound'

type Props = {
  onSchedule: (scheduledForISO: string, isSilent: boolean) => void
  onSendSilent: () => void
  onClose: () => void
  soundEnabled?: boolean
}

export function ChatScheduleModal({
  onSchedule,
  onSendSilent,
  onClose,
  soundEnabled = true,
}: Props) {
  // Вычисляем дефолтное время: через 2 часа
  const defaultDate = new Date(Date.now() + 2 * 3600 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const defaultDateStr = `${defaultDate.getFullYear()}-${pad(defaultDate.getMonth() + 1)}-${pad(defaultDate.getDate())}`
  const defaultTimeStr = `${pad(defaultDate.getHours())}:${pad(defaultDate.getMinutes())}`

  const [date, setDate] = useState(defaultDateStr)
  const [time, setTime] = useState(defaultTimeStr)
  const [isSilent, setIsSilent] = useState(false)

  const handleQuickPreset = (preset: 'tonight' | 'tomorrow_morning') => {
    playClick(soundEnabled)
    const now = new Date()
    if (preset === 'tonight') {
      const target = new Date(now)
      target.setHours(20, 0, 0, 0)
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1)
      }
      setDate(`${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`)
      setTime('20:00')
    } else {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(9, 0, 0, 0)
      setDate(`${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`)
      setTime('09:00')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    playClick(soundEnabled)
    const iso = new Date(`${date}T${time}:00`).toISOString()
    onSchedule(iso, isSilent)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-2xl flex flex-col animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="text-xl">⏰</span>
            <h3 className="text-base font-bold text-[var(--text)]">Параметры отправки</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {/* Быстрая отправка без звука */}
        <div className="py-3 border-b border-[var(--border)]">
          <button
            type="button"
            onClick={() => {
              playClick(soundEnabled)
              onSendSilent()
              onClose()
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                <VolumeX size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                  Отправить без звука
                </p>
                <p className="text-xs text-[var(--text-2)]">Без уведомлений и звуков у получателя</p>
              </div>
            </div>
          </button>
        </div>

        {/* Отложенная отправка */}
        <form onSubmit={handleSubmit} className="pt-3 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider">
              Запланировать отправку
            </p>
          </div>

          {/* Быстрые пресеты */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleQuickPreset('tonight')}
              className="flex-1 py-1.5 px-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-hover)] text-xs font-medium text-[var(--text)] text-center transition-colors"
            >
              Сегодня вечером (20:00)
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset('tomorrow_morning')}
              className="flex-1 py-1.5 px-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-hover)] text-xs font-medium text-[var(--text)] text-center transition-colors"
            >
              Завтра утром (09:00)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-2)] mb-1">Дата</label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-2)] mb-1">Время</label>
              <div className="relative">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
                  required
                />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-[var(--text)] cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isSilent}
              onChange={(e) => setIsSilent(e.target.checked)}
              className="rounded accent-[var(--accent)]"
            />
            <span>Доставить также без звука</span>
          </label>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full h-11 rounded-full bg-[var(--accent)] text-[var(--accent-text)] font-bold text-sm shadow-md hover:opacity-90 active:scale-98 transition-all"
            >
              Запланировать отправку
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Bell, Clock, Volume2, VolumeX, X } from 'lucide-react'
import { playClick } from '@/lib/ogonek/sound'

type Props = {
  isMuted: boolean
  muteUntilISO?: string | null
  onMute: (hours: number | null) => void // null = навсегда, 0 = включить звук
  onClose: () => void
  soundEnabled?: boolean
}

export function ChatMuteModal({
  isMuted,
  muteUntilISO,
  onMute,
  onClose,
  soundEnabled = true,
}: Props) {
  const handleSelect = (hours: number | null) => {
    playClick(soundEnabled)
    onMute(hours)
    onClose()
  }

  const formatUntil = (iso?: string | null) => {
    if (!iso) return 'навсегда'
    try {
      const d = new Date(iso)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString([], { day: 'numeric', month: 'short' })
    } catch {
      return 'навсегда'
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-sm rounded-3xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center">
              <VolumeX size={17} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text)] leading-tight">Отключить звук</h3>
              {isMuted && (
                <p className="text-[11px] text-[var(--text-2)]">
                  Сейчас без звука {muteUntilISO ? `до ${formatUntil(muteUntilISO)}` : 'навсегда'}
                </p>
              )}
            </div>
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

        <div className="py-3 space-y-2">
          {/* Варианты мута */}
          <button
            type="button"
            onClick={() => handleSelect(1)}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-[#1d9bf0]" />
              <span className="text-xs font-semibold text-[var(--text)]">На 1 час</span>
            </div>
            <span className="text-[11px] text-[var(--text-2)]">+1ч</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelect(8)}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-[#00ba7c]" />
              <span className="text-xs font-semibold text-[var(--text)]">На 8 часов</span>
            </div>
            <span className="text-[11px] text-[var(--text-2)]">+8ч</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelect(168)}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-[#ffad5a]" />
              <span className="text-xs font-semibold text-[var(--text)]">На 1 неделю</span>
            </div>
            <span className="text-[11px] text-[var(--text-2)]">7 дней</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelect(null)}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <VolumeX size={16} className="text-[var(--accent)]" />
              <span className="text-xs font-semibold text-[var(--text)]">Навсегда</span>
            </div>
            <span className="text-[11px] text-[var(--text-2)]">Бессрочно</span>
          </button>

          {/* Включить звук обратно */}
          {isMuted && (
            <button
              type="button"
              onClick={() => handleSelect(0)}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/40 hover:bg-[var(--accent)]/20 text-left transition-colors mt-2"
            >
              <div className="flex items-center gap-3">
                <Volume2 size={16} className="text-[var(--accent)]" />
                <span className="text-xs font-bold text-[var(--accent)]">Включить уведомления</span>
              </div>
              <Bell size={14} className="text-[var(--accent)]" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

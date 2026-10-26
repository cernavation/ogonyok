'use client'

import React, { useState } from 'react'
import { Flame } from 'lucide-react'
import { DifficultyLevelModal } from './difficulty-level-modal'
import { playClick } from '@/lib/ogonek/sound'

type Props = {
  level?: number
  isInteractive?: boolean
  showNumber?: boolean
  className?: string
  soundEnabled?: boolean
  onNotify?: (msg: string) => void
}

export function DifficultyLevelBadge({
  level = 2,
  isInteractive = true,
  showNumber = true,
  className = '',
  soundEnabled = true,
  onNotify,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const safeLevel = Math.min(5, Math.max(1, level))

  const handleClick = (e: React.MouseEvent) => {
    if (!isInteractive) return
    e.stopPropagation()
    playClick(soundEnabled)
    setModalOpen(true)
  }

  if (!isInteractive) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-elev)] border border-[var(--border)] text-[11px] font-bold select-none ${className}`}
        title={`Уровень сложности: ${safeLevel} из 5`}
      >
        <div className="flex items-center gap-0.5" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((idx) => (
            <Flame
              key={idx}
              className={`w-2.5 h-2.5 ${
                idx <= safeLevel
                  ? 'text-orange-500 fill-orange-500'
                  : 'text-white/20'
              }`}
            />
          ))}
        </div>
        {showNumber && (
          <span className="text-[11px] font-extrabold text-[var(--text)] tracking-tight">
            Уровень {safeLevel}
          </span>
        )}
      </span>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[32px] rounded-full bg-[var(--bg-elev)] border border-[var(--border)] text-xs font-bold transition-all shadow-sm hover:border-[var(--accent)] hover:scale-105 active:scale-95 cursor-pointer ${className}`}
        title={`Уровень сложности: ${safeLevel} из 5. Нажмите для подробностей.`}
      >
        {/* 5 mini flames */}
        <div className="flex items-center gap-0.5" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((idx) => {
            const isFilled = idx <= safeLevel
            return (
              <Flame
                key={idx}
                className={`w-3 h-3 ${
                  isFilled
                    ? 'text-orange-500 fill-orange-500 drop-shadow-[0_0_4px_rgba(255,122,24,0.5)]'
                    : 'text-white/20'
                }`}
              />
            )
          })}
        </div>

        {showNumber && (
          <span className="text-[11px] font-extrabold text-[var(--text)] tracking-tight">
            Уровень {safeLevel}
          </span>
        )}
      </button>

      {modalOpen && (
        <DifficultyLevelModal
          onClose={() => setModalOpen(false)}
          onNotify={onNotify || console.log}
          soundEnabled={soundEnabled}
        />
      )}
    </>
  )
}

'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, ChevronUp, History, Moon, Target } from 'lucide-react'
import { FocusFlame } from './focus-flame'
import {
  MORNING_FOCUS_PLACEHOLDERS,
  countActiveFocusSteps,
  countFulfilledSteps,
  type FocusFlameStats,
} from '@/lib/ogonek/morning-focus'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { MorningFocusRecord } from '@/lib/ogonek/types'

const PLACEHOLDERS = MORNING_FOCUS_PLACEHOLDERS

type Props = {
  initialFocus?: [string, string, string]
  record?: MorningFocusRecord
  stats?: FocusFlameStats
  onSave?: (focus: [string, string, string]) => void
  onOpenHistory?: () => void
  onFocusReview?: () => void
  notify: (msg: string) => void
  soundEnabled?: boolean
}

export function QuickFocus({
  initialFocus,
  record,
  stats,
  onSave,
  onOpenHistory,
  onFocusReview,
  notify,
  soundEnabled = true,
}: Props) {
  const [focus, setFocus] = useState<[string, string, string]>(() => {
    return initialFocus || ['', '', '']
  })
  const [locked, setLocked] = useState(() => {
    return Boolean(initialFocus && initialFocus.some((f) => f.trim().length > 0))
  })
  // Collapsed by default — clean single line above feed
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (initialFocus && initialFocus.some((f) => f.trim().length > 0)) {
      setFocus(initialFocus)
      setLocked(true)
    }
  }, [initialFocus])

  const handleInputChange = (index: 0 | 1 | 2, value: string) => {
    setFocus((prev) => {
      const next: [string, string, string] = [...prev]
      next[index] = value
      return next
    })
  }

  const handleSave = () => {
    setLocked(true)
    setIsExpanded(false)
    if (onSave) {
      onSave(focus)
    }
    playSuccess(soundEnabled)
    notify('Фокус дня зафиксирован!')
  }

  const activeCount = record ? countActiveFocusSteps(record.focus) : countActiveFocusSteps(focus)
  const fulfilled = record ? countFulfilledSteps(record.steps) : 0
  const percent = record ? record.completionPercent : 0
  const reviewed = Boolean(record?.reviewedAtISO)
  const hasFocus = focus.some((f) => f.trim().length > 0)

  return (
    <section
      id="focus"
      className="border-b border-[var(--border)] bg-[var(--bg)] transition-colors"
      aria-label="Утренний фокус"
    >
      {/* Тонкая сворачиваемая полоска: иконка + «Утренний фокус» + стрелка */}
      <button
        type="button"
        onClick={() => {
          playClick(soundEnabled)
          setIsExpanded((prev) => !prev)
        }}
        className="w-full flex items-center justify-between px-4 py-2.5 group text-left min-h-[40px] transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/50 flex-none">
            <Target size={14} className="stroke-[2.2]" />
          </div>
          <span className="text-[14px] font-semibold text-[var(--text)] tracking-tight flex-none">
            Утренний фокус
          </span>
          {locked && hasFocus && (
            <span className="text-[var(--text-2)] text-[13px] truncate">
              {activeCount} намерений ({percent}%)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-none pl-2">
          {locked && hasFocus && (
            <span
              className={`px-2.5 py-0.5 rounded-full text-[13px] font-semibold border ${
                percent >= 100
                  ? 'bg-white/[0.1] border-white/[0.16] text-white'
                  : 'bg-white/[0.05] border-white/[0.1] text-white/70'
              }`}
            >
              {percent}%
            </span>
          )}
          <span className="w-7 h-7 rounded-full flex items-center justify-center group-hover:bg-[var(--bg-hover)] transition-colors">
            {isExpanded ? (
              <ChevronUp size={16} className="text-[var(--text-2)]" />
            ) : (
              <ChevronDown size={16} className="text-[var(--text-2)]" />
            )}
          </span>
        </div>
      </button>

      {/* Раскрывающийся блок ввода */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 flex flex-col gap-3">
              {stats && (
                <div className="pt-1">
                  <FocusFlame stats={stats} compact onClick={onOpenHistory} title="Открыть историю утренних фокусов" />
                </div>
              )}

              <div className="flex flex-col gap-2">
                {focus.map((val, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-black border border-white/[0.1] focus-within:border-white/30 transition-colors"
                  >
                    <span className="text-xs font-mono font-semibold text-white/35 w-4 text-center">
                      {i + 1}
                    </span>
                    <input
                      disabled={locked}
                      value={val}
                      onChange={(e) => handleInputChange(i as 0 | 1 | 2, e.target.value)}
                      placeholder={PLACEHOLDERS[i]}
                      aria-label={`Фокус ${i + 1}`}
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none disabled:opacity-75"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap" role="group" aria-label="Действия с фокусом">
                <div className="flex items-center gap-2">
                  {!locked && (
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!hasFocus}
                      className="h-8 px-4 rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-40 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Check size={13} /> Сохранить
                    </button>
                  )}

                  {locked && (
                    <button
                      type="button"
                      onClick={() => setLocked(false)}
                      className="h-8 px-3.5 rounded-full bg-transparent border border-white/[0.12] text-white/80 hover:text-white hover:bg-white/[0.06] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      Изменить
                    </button>
                  )}

                  {locked && hasFocus && onFocusReview && (
                    <button
                      type="button"
                      onClick={() => {
                        playClick(soundEnabled)
                        onFocusReview()
                      }}
                      className="h-8 px-3.5 rounded-full bg-transparent border border-white/[0.12] text-white/70 hover:text-white hover:bg-white/[0.06] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Moon size={13} /> Вечерняя сверка
                    </button>
                  )}
                </div>

                {onOpenHistory && (
                  <button
                    type="button"
                    onClick={() => {
                      playClick(soundEnabled)
                      onOpenHistory()
                    }}
                    className="h-8 px-3.5 rounded-full bg-transparent border border-white/[0.12] text-white/70 hover:text-white hover:bg-white/[0.06] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <History size={13} /> История
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

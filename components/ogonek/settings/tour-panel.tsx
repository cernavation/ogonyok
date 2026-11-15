'use client'

import React from 'react'
import {
  CheckCircle2,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { TOUR_STEPS } from '@/lib/ogonek/tour-data'
import { playClick, playSuccess } from '@/lib/ogonek/sound'

type Props = {
  soundEnabled?: boolean
  onNotify: (msg: string) => void
}

export function TourPanel({ soundEnabled = true, onNotify }: Props) {
  const handleStartTour = () => {
    playClick(soundEnabled)
    window.dispatchEvent(new CustomEvent('ogonek:open-tour'))
  }

  const handleResetTour = () => {
    playClick(soundEnabled)
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ogonek.tour.completed')
      }
    } catch {}
    playSuccess(soundEnabled)
    onNotify('Статус обучающего тура сброшен')
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-5" aria-label="Обучающий тур">
      {/* ── Главный баннер тура ─────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-bold text-[var(--text)] flex items-center gap-2">
              <Sparkles size={18} className="text-[var(--accent)]" /> Интерактивный тур по возможностям
            </h3>
            <p className="text-[13px] text-[var(--text-2)] mt-1 leading-relaxed">
              Быстрое интерактивное путешествие по 13 ключевым элементам интерфейса:
              от первой записи преодоления и шкалы звёзд до Evidence Vault, ИИ-оценки и видеозвонков.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)] flex-wrap">
          <button
            type="button"
            id="settings-restart-tour-btn"
            onClick={handleStartTour}
            className="h-9 px-5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors"
          >
            <Play size={14} className="fill-current" />
            <span>Пройти тур заново</span>
          </button>

          <button
            type="button"
            onClick={handleResetTour}
            className="h-9 px-4 rounded-full border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)] text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw size={13} />
            <span>Сбросить статус онбординга</span>
          </button>
        </div>
      </div>

      {/* ── Список 13 шагов тура ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <h4 className="text-[14px] font-bold text-[var(--text)] flex items-center gap-2">
          <HelpCircle size={15} className="text-[var(--accent)]" /> 13 шагов обучающего тура
        </h4>

        <div className="flex flex-col gap-2">
          {TOUR_STEPS.map((step) => (
            <div
              key={step.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-elev)] border border-[var(--border)]"
            >
              <div className="w-6 h-6 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                {step.id}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[var(--text)] leading-snug">
                  {step.title}
                </p>
                <p className="text-[12px] text-[var(--text-2)] mt-0.5 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

'use client'

import { Check, History, Moon, Target } from 'lucide-react'
import { useEffect, useState } from 'react'
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
  /** Запись дня с вечерней сверкой (ЭТАП 10) */
  record?: MorningFocusRecord
  /** Метрики «Огонька фокуса» (ЭТАП 10) */
  stats?: FocusFlameStats
  onSave?: (focus: [string, string, string]) => void
  /** Открыть историю утренних фокусов (модальное окно) */
  onOpenHistory?: () => void
  /** Прокрутить к вечерней сверке */
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
    if (onSave) {
      onSave(focus)
    }
    playSuccess(soundEnabled)
    notify('Фокус зафиксирован и сохранён в локальном хранилище. Теперь действуй.')
  }

  const activeCount = record ? countActiveFocusSteps(record.focus) : countActiveFocusSteps(focus)
  const fulfilled = record ? countFulfilledSteps(record.steps) : 0
  const percent = record ? record.completionPercent : 0
  const reviewed = Boolean(record?.reviewedAtISO)
  const hasFocus = focus.some((f) => f.trim().length > 0)

  return (
    <section id="focus" className={`focus-card ${locked ? 'locked' : ''}`} aria-labelledby="focus-title">
      <div className="section-kicker">
        <Target size={16} /> Утренний фокус{' '}
        <span>
          {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <h2 id="focus-title">Что задумал сделать сегодня великого?</h2>

      {/* Огонёк фокуса — собственный счётчик выполнения утренних обещаний */}
      {stats && (
        <div className="mb-3.5">
          <FocusFlame stats={stats} compact onClick={onOpenHistory} title="Открыть историю утренних фокусов" />
        </div>
      )}

      <div className="focus-grid">
        {focus.map((val, i) => (
          <div className="focus-input" key={i}>
            <span>{i + 1}</span>
            <input
              disabled={locked}
              value={val}
              onChange={(e) => handleInputChange(i as 0 | 1 | 2, e.target.value)}
              placeholder={PLACEHOLDERS[i]}
              aria-label={`Фокус ${i + 1}: ${PLACEHOLDERS[i]}`}
            />
          </div>
        ))}
      </div>

      {/* Прогресс выполнения обещаний, когда фокус уже зафиксирован */}
      {locked && hasFocus && (
        <div className="mt-3.5 flex items-center gap-2 flex-wrap text-[12px]" style={{ color: 'var(--muted, #71767b)' }}>
          <span
            className="font-bold px-2 py-0.5 rounded-full"
            style={{
              color: percent >= 66 ? '#00ba7c' : percent >= 34 ? '#ffad5a' : '#1d9bf0',
              background: 'rgba(255,255,255,0.05)',
            }}
          >
            {percent}% обещаний
          </span>
          <span>
            {reviewed
              ? `Сверено: ${fulfilled} из ${activeCount}`
              : 'Вечерняя сверка открыта'}
          </span>
        </div>
      )}

      <div className="flex items-center gap-4 flex-wrap">
        <button
          type="button"
          className="small-action"
          onClick={handleSave}
          disabled={locked || !hasFocus}
          style={{ opacity: locked || !hasFocus ? 0.5 : 1 }}
        >
          {locked ? (
            <>
              <Check size={16} /> Фокус зафиксирован
            </>
          ) : (
            <>
              <Check size={16} /> Сохранить фокус
            </>
          )}
        </button>

        {locked && hasFocus && onFocusReview && (
          <button
            type="button"
            className="small-action"
            onClick={() => { playClick(soundEnabled); onFocusReview() }}
            style={{ marginTop: 15 }}
          >
            <Moon size={15} /> Вечерняя сверка
          </button>
        )}

        {onOpenHistory && (
          <button
            type="button"
            className="small-action"
            onClick={() => { playClick(soundEnabled); onOpenHistory() }}
            style={{ marginTop: 15 }}
          >
            <History size={15} /> История фокусов
          </button>
        )}
      </div>
    </section>
  )
}

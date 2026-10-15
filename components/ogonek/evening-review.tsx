'use client'

import { Check, Moon, RotateCcw, Sparkles, X } from 'lucide-react'
import { useMemo } from 'react'
import {
  MORNING_FOCUS_STEP_LABELS,
  activeFocusIndexes,
  countActiveFocusSteps,
  focusVerdict,
} from '@/lib/ogonek/morning-focus'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { MorningFocusRecord, MorningFocusStepStatus } from '@/lib/ogonek/types'

const TONE_COLORS: Record<ReturnType<typeof focusVerdict>['tone'], string> = {
  elite: '#00ba7c',
  good: '#1d9bf0',
  mid: '#ffad5a',
  low: '#f91880',
}

const STEP_STATUS_META: Record<
  MorningFocusStepStatus,
  { label: string; color: string; bg: string }
> = {
  done: { label: 'Выполнил', color: '#00ba7c', bg: 'rgba(0,186,124,0.12)' },
  missed: { label: 'Не выполнил', color: '#f91880', bg: 'rgba(249,24,128,0.12)' },
  pending: { label: 'Не сверено', color: '#71767b', bg: 'rgba(113,118,123,0.12)' },
}

type Props = {
  dateKey: string
  record: MorningFocusRecord
  notify: (msg: string) => void
  soundEnabled?: boolean
  onMarkDone: (dateKey: string, index: 0 | 1 | 2) => boolean
  onMarkMissed: (dateKey: string, index: 0 | 1 | 2) => boolean
  onComplete: (dateKey: string) => number
  onReopen: (dateKey: string) => void
}

/**
 * ЭТАП 10 — ВЕЧЕРНЯЯ СВЕРКА.
 * Галочки «Выполнил / Не выполнил» для трёх шагов дня и автоматический
 * расчёт процента выполнения обещаний перед сном.
 */
export function EveningReview({
  dateKey,
  record,
  notify,
  soundEnabled = true,
  onMarkDone,
  onMarkMissed,
  onComplete,
  onReopen,
}: Props) {
  const active = useMemo(() => activeFocusIndexes(record.focus), [record.focus])
  const activeCount = countActiveFocusSteps(record.focus)
  const percent = record.completionPercent
  const reviewed = Boolean(record.reviewedAtISO)
  const verdict = focusVerdict(percent)
  const toneColor = TONE_COLORS[verdict.tone]

  const hour = new Date().getHours()
  const isEvening = hour >= 18 || hour < 5

  if (activeCount === 0) return null

  const handleDone = (index: 0 | 1 | 2) => {
    const isNowDone = onMarkDone(dateKey, index)
    playClick(soundEnabled)
    notify(isNowDone ? `✓ Шаг ${index + 1} отмечен как выполненный` : `Шаг ${index + 1} снова не сверен`)
  }

  const handleMissed = (index: 0 | 1 | 2) => {
    const isNowMissed = onMarkMissed(dateKey, index)
    playClick(soundEnabled)
    notify(
      isNowMissed
        ? `Шаг ${index + 1} отмечен как невыполненный`
        : `Шаг ${index + 1} снова не сверен`
    )
  }

  const handleComplete = () => {
    const finalizedPercent = onComplete(dateKey)
    playSuccess(soundEnabled)
    const finalizedVerdict = focusVerdict(finalizedPercent)
    notify(`🌙 Сверка завершена: ${finalizedPercent}% обещаний сдержано. ${finalizedVerdict.label}.`)
  }

  return (
    <section
      id="evening-review"
      className="focus-card"
      aria-labelledby="evening-review-title"
      style={{ display: 'block' }}
    >
      <div className="section-kicker">
        <Moon size={16} /> Вечерняя сверка
        <span>{isEvening ? 'Перед сном' : 'Считаем на лету'}</span>
      </div>

      <div className="flex items-center gap-4 mt-3.5 mb-4">
        {/* Процентный индикатор */}
        <div className="relative w-[62px] h-[62px] flex-none" aria-hidden="true">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(${toneColor} ${percent * 3.6}deg, #2f3336 0deg)`,
            }}
          />
          <div
            className="absolute inset-[5px] rounded-full flex items-center justify-center"
            style={{ background: 'var(--surface, #16181c)' }}
          >
            <span className="text-[14px] font-extrabold tabular-nums" style={{ color: toneColor }}>
              {percent}%
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <h3 id="evening-review-title" className="text-[16px] font-bold leading-tight" style={{ color: 'var(--text)' }}>
            {reviewed ? verdict.label : 'Сколько обещаний сдержано?'}
          </h3>
          <p className="text-[13px] leading-snug mt-0.5" style={{ color: 'var(--muted)' }}>
            {reviewed
              ? `Сверено ${record.reviewedAtISO ? new Date(record.reviewedAtISO as string).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''} · ${record.steps.filter((s) => s === 'done').length} из ${activeCount} сдержано`
              : isEvening
                ? 'Отметь «Выполнил / Не выполнил» — процент посчитается сам.'
                : 'Можно отмечать по ходу дня, а вечером — закрыть сверку.'}
          </p>
        </div>
      </div>

      {/* Три шага дня */}
      <div className="flex flex-col gap-2">
        {record.focus.map((text, i) => {
          const stepIndex = i as 0 | 1 | 2
          const isEmpty = text.trim().length === 0
          const status: MorningFocusStepStatus = record.steps[stepIndex]
          const meta = STEP_STATUS_META[status]

          return (
            <div
              key={i}
              className="flex items-center gap-2.5 border rounded-2xl px-3 py-2.5"
              style={{
                borderColor: status === 'done' ? 'rgba(0,186,124,0.35)' : status === 'missed' ? 'rgba(249,24,128,0.3)' : 'var(--line, #2f3336)',
                background: status === 'pending' ? 'rgba(255,255,255,0.015)' : meta.bg,
                opacity: isEmpty ? 0.45 : 1,
              }}
            >
              <span
                className="text-[12px] font-extrabold flex-none w-4 text-center"
                style={{ color: 'var(--blue, #1d9bf0)' }}
              >
                {i + 1}
              </span>
              <span className="flex-1 min-w-0 text-[14px] leading-snug truncate" style={{ color: 'var(--text)' }}>
                {isEmpty ? 'Обещание не записано' : text}
              </span>

              {!isEmpty && !reviewed && (
                <div className="flex items-center gap-1.5 flex-none">
                  <button
                    type="button"
                    onClick={() => handleDone(stepIndex)}
                    aria-pressed={status === 'done'}
                    aria-label={`Шаг ${i + 1}: выполнено`}
                    title="Выполнил"
                    className="w-8 h-8 rounded-full flex items-center justify-center border transition-colors"
                    style={{
                      borderColor: status === 'done' ? '#00ba7c' : 'var(--line, #2f3336)',
                      background: status === 'done' ? 'rgba(0,186,124,0.18)' : 'transparent',
                      color: status === 'done' ? '#00ba7c' : 'var(--muted, #71767b)',
                    }}
                  >
                    <Check size={16} strokeWidth={2.6} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMissed(stepIndex)}
                    aria-pressed={status === 'missed'}
                    aria-label={`Шаг ${i + 1}: не выполнено`}
                    title="Не выполнил"
                    className="w-8 h-8 rounded-full flex items-center justify-center border transition-colors"
                    style={{
                      borderColor: status === 'missed' ? '#f91880' : 'var(--line, #2f3336)',
                      background: status === 'missed' ? 'rgba(249,24,128,0.18)' : 'transparent',
                      color: status === 'missed' ? '#f91880' : 'var(--muted, #71767b)',
                    }}
                  >
                    <X size={16} strokeWidth={2.6} />
                  </button>
                </div>
              )}

              {!isEmpty && reviewed && (
                <span
                  className="text-[11px] font-bold flex-none px-2 py-1 rounded-full"
                  style={{ color: meta.color, background: meta.bg }}
                >
                  {meta.label}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Прогресс-полоса */}
      <div className="mt-4" aria-hidden="true">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--line, #2f3336)' }}>
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${toneColor}, ${tierAccent(percent)})` }}
          />
        </div>
      </div>

      {/* Управление сверкой */}
      <div className="flex items-center flex-wrap gap-2 mt-4">
        {!reviewed ? (
          <button type="button" className="small-action" onClick={handleComplete} style={{ marginTop: 0 }}>
            <Sparkles size={16} /> Завершить сверку перед сном
          </button>
        ) : (
          <button type="button" className="small-action" onClick={() => { onReopen(dateKey); playClick(soundEnabled); notify('Сверка открыта заново — поправь галочки.') }} style={{ marginTop: 0 }}>
            <RotateCcw size={15} /> Изменить отметки
          </button>
        )}
        <span className="text-[12px]" style={{ color: 'var(--muted)' }}>
          {MORNING_FOCUS_STEP_LABELS.join(' · ')}
        </span>
      </div>
    </section>
  )
}

function tierAccent(percent: number): string {
  if (percent >= 66) return '#ffa600'
  if (percent >= 34) return '#ffad5a'
  return '#f91880'
}

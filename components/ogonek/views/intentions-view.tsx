'use client'

import { ArrowLeft, Check, ChevronRight, Target, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  countActiveFocusSteps,
  countFulfilledSteps,
  computeFocusFlame,
  focusVerdict,
} from '@/lib/ogonek/morning-focus'
import { FocusFlame } from '@/components/ogonek/focus-flame'
import type { MorningFocusRecord, MorningFocusStepStatus, ViewId } from '@/lib/ogonek/types'

type Props = {
  morningIntentions: Record<string, [string, string, string]>
  morningFocusHistory?: Record<string, MorningFocusRecord>
  onNavigate: (view: ViewId) => void
  onSave?: (dateKey: string, focus: [string, string, string]) => void
  notify?: (msg: string) => void
  soundEnabled?: boolean
}

function formatDateRu(isoKey: string): string {
  try {
    return new Date(`${isoKey}T12:00:00`).toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return isoKey
  }
}

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0]
}

const STEP_STATUS_META: Record<MorningFocusStepStatus, { label: string; color: string }> = {
  done: { label: 'Выполнил', color: 'var(--success)' },
  missed: { label: 'Не выполнил', color: '#f91880' },
  pending: { label: 'Не сверено', color: 'var(--text-3)' },
}

export function IntentionsView({
  morningIntentions,
  morningFocusHistory,
  onNavigate,
  onSave,
  notify,
}: Props) {
  const todayKey = getTodayKey()
  const history = morningFocusHistory ?? {}
  const todayRecord = history[todayKey]
  const todayFocus: [string, string, string] =
    todayRecord?.focus || morningIntentions[todayKey] || ['', '', '']
  const [draftFocus, setDraftFocus] = useState<[string, string, string]>(todayFocus)
  const [saved, setSaved] = useState(Boolean(todayFocus.some((f) => f.trim().length > 0)))

  const stats = useMemo(() => computeFocusFlame(history, todayKey), [history, todayKey])

  const pastEntries = Object.entries(morningIntentions)
    .filter(([key]) => key !== todayKey)
    .sort(([a], [b]) => b.localeCompare(a))

  const handleSaveToday = () => {
    if (!draftFocus.some((f) => f.trim().length > 0)) return
    onSave?.(todayKey, draftFocus)
    setSaved(true)
    notify?.('✦ Утренний фокус сохранён. Теперь действуй!')
  }

  const PLACEHOLDERS = ['Главный шаг дня', 'Для себя', 'Если останется время'] as const

  return (
    <div className="view-intentions min-h-screen pb-20">
      {/* Sticky Header */}
      <header className="flex items-center gap-4 px-4 py-3 sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-md">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors flex-none"
          aria-label="Назад"
        >
          <ArrowLeft size={19} />
        </button>
        <div>
          <h1 className="text-[19px] font-extrabold text-[var(--text)] tracking-[-0.02em] leading-tight">
            Утренние намерения
          </h1>
          <p className="text-[12px] text-[var(--text-2)]">
            {Object.keys(morningIntentions).length} записей
          </p>
        </div>
      </header>

      <div className="max-w-[700px] mx-auto">
        {/* Огонёк фокуса — счётчик выполнения обещаний */}
        {stats.hasHistory && (
          <section
            className="px-4 py-4 border-b border-[var(--border)] flex items-center gap-4"
            aria-label="Огонёк фокуса"
          >
            <FocusFlame stats={stats} />
            <div className="min-w-0 ml-auto text-right">
              <p className="text-[var(--text-2)] text-[12px] uppercase tracking-[0.05em] font-semibold">Средний результат</p>
              <p className="text-[var(--success)] text-[22px] font-extrabold tabular-nums leading-tight">
                {stats.avgPercent}%
              </p>
              <p className="text-[var(--text-2)] text-[12px]">
                {stats.totalFulfilled} из {stats.totalPromises} обещаний
              </p>
            </div>
          </section>
        )}

        {/* Today's intentions card */}
        <section className="px-4 py-4 border-b border-[var(--border)]" aria-labelledby="today-focus-title">
          <div className="flex items-center gap-2 mb-3">
            <Target size={17} className="text-[var(--accent)] flex-none" aria-hidden="true" />
            <h2
              id="today-focus-title"
              className="text-[var(--text)] text-[16px] font-bold leading-tight"
            >
              Сегодня
            </h2>
            {todayRecord && (
              <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text)] dark:text-[var(--accent)]">
                {todayRecord.completionPercent}% обещаний
              </span>
            )}
            <span className="text-[var(--text-2)] text-[13px] ml-auto">
              {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </span>
          </div>

          <div className="flex flex-col gap-2.5 mb-4">
            {draftFocus.map((val, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border border-[var(--border)] rounded-2xl px-4 py-3 bg-[var(--surface)] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/30 transition-all"
              >
                <span className="text-[var(--accent)] font-bold text-[14px] flex-none w-4">{i + 1}</span>
                <input
                  type="text"
                  value={val}
                  disabled={saved}
                  onChange={(e) => {
                    const next: [string, string, string] = [...draftFocus]
                    next[i] = e.target.value
                    setDraftFocus(next)
                  }}
                  placeholder={PLACEHOLDERS[i]}
                  className="flex-1 min-w-0 bg-transparent text-[var(--text)] text-[15px] font-medium outline-none placeholder:text-[var(--text-2)] disabled:opacity-75"
                  aria-label={`Намерение ${i + 1}: ${PLACEHOLDERS[i]}`}
                />
                {saved && val.trim().length > 0 && (
                  <Check size={16} className="text-[var(--accent)] flex-none" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>

          {!saved ? (
            <button
              type="button"
              onClick={handleSaveToday}
              disabled={!draftFocus.some((f) => f.trim().length > 0)}
              className="min-h-[42px] px-6 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-[14px] font-extrabold transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <Check size={16} />
              <span>Сохранить фокус</span>
            </button>
          ) : (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-[var(--accent)] text-[14px] font-bold">
                <Check size={16} />
                <span>Фокус сохранён — действуй!</span>
              </div>
              <button
                type="button"
                onClick={() => setSaved(false)}
                className="text-[13px] font-semibold text-[var(--text-2)] hover:text-[var(--text)] underline transition-colors"
              >
                Изменить
              </button>
            </div>
          )}
        </section>

        {/* Past intentions history */}
        {pastEntries.length > 0 ? (
          <section aria-labelledby="past-focus-title">
            <div className="px-4 py-2.5 border-b border-[var(--border)]">
              <h3
                id="past-focus-title"
                className="text-[var(--text-2)] text-[12px] font-bold uppercase tracking-[0.05em]"
              >
                История намерений
              </h3>
            </div>
            {pastEntries.map(([key, focus]) => {
              const record = history[key]
              const percent = record?.completionPercent ?? 0
              const activeCount = record ? countActiveFocusSteps(record.focus) : 0
              const fulfilled = record ? countFulfilledSteps(record.steps) : 0
              const reviewed = Boolean(record?.reviewedAtISO)
              const verdict = focusVerdict(percent)

              return (
                <article
                  key={key}
                  className="px-4 py-3.5 border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-[var(--text-2)] text-[12px] font-medium capitalize">
                      {formatDateRu(key)}
                    </p>
                    {reviewed && (
                      <span className="text-[12px] font-extrabold tabular-nums flex-none text-[var(--accent)]">
                        {percent}%
                      </span>
                    )}
                    <ChevronRight size={14} className="text-[var(--text-3)] flex-none" aria-hidden="true" />
                  </div>

                  {reviewed && (
                    <div className="h-1 rounded-full overflow-hidden mb-2 bg-[var(--bg-elev)] border border-[var(--border)]" aria-hidden="true">
                      <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${percent}%` }} />
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    {focus.map((item, idx) => {
                      if (item.trim().length === 0) return null
                      const status = record?.steps[idx as 0 | 1 | 2] ?? 'pending'
                      const meta = STEP_STATUS_META[status]
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          {status === 'done' ? (
                            <Check size={13} strokeWidth={3} className="flex-none" style={{ color: meta.color }} aria-hidden="true" />
                          ) : status === 'missed' ? (
                            <X size={13} strokeWidth={3} className="flex-none" style={{ color: meta.color }} aria-hidden="true" />
                          ) : (
                            <span className="text-[var(--accent)] text-[12px] font-bold flex-none w-[13px] text-center">
                              {idx + 1}
                            </span>
                          )}
                          <span
                            className="text-[14px] leading-snug truncate"
                            style={{
                              color: status === 'missed' ? 'var(--text-3)' : 'var(--text)',
                              textDecoration: status === 'missed' ? 'line-through' : 'none',
                            }}
                          >
                            {item}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {reviewed && (
                    <p className="text-[11px] mt-2 text-[var(--text-2)]">
                      {verdict.label} · {fulfilled} из {activeCount} сдержано
                    </p>
                  )}
                </article>
              )
            })}
          </section>
        ) : (
          /* Empty state: Icon + 1 line + Button */
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-elev)] border border-[var(--border)] flex items-center justify-center text-[var(--text-2)] mb-3">
              <Target size={20} />
            </div>
            <p className="text-[16px] font-bold text-[var(--text)] mb-3">
              История намерений пуста
            </p>
            <button
              type="button"
              onClick={() => {
                const el = document.querySelector<HTMLInputElement>('input[aria-label^="Намерение 1"]')
                el?.focus()
              }}
              className="h-9 px-5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-[14px] font-extrabold transition-colors"
            >
              Задать фокус на сегодня
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

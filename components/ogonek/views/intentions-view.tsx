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
  /** ЭТАП 10: история фокусов с вечерней сверкой */
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

const STEP_STATUS_META: Record<MorningFocusStepStatus, { label: string; color: string; bg: string }> = {
  done: { label: 'Выполнил', color: '#00ba7c', bg: 'rgba(0,186,124,0.12)' },
  missed: { label: 'Не выполнил', color: '#f91880', bg: 'rgba(249,24,128,0.12)' },
  pending: { label: 'Не сверено', color: '#71767b', bg: 'rgba(113,118,123,0.12)' },
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

  // Past intentions sorted newest-first (exclude today)
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
    <div className="view-intentions">
      {/* Header */}
      <header
        className="flex items-center gap-4 px-4 py-3 sticky top-0 z-10 border-b border-[#2f3336]"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(14px)' }}
      >
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="w-9 h-9 rounded-full flex items-center justify-center text-[#e7e9ea] hover:bg-white/[0.08] transition-colors flex-none"
          aria-label="Назад"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="text-[#e7e9ea] text-[20px] font-bold leading-[24px] tracking-[-0.02em]">
            Утренние намерения
          </p>
          <p className="text-[#71767b] text-[13px] leading-[16px]">
            {Object.keys(morningIntentions).length} записей
          </p>
        </div>
      </header>

      <div className="max-w-[700px] mx-auto">
        {/* Огонёк фокуса — счётчик выполнения обещаний */}
        {stats.hasHistory && (
          <section
            className="px-4 py-4 border-b border-[#2f3336] flex items-center gap-4"
            aria-label="Огонёк фокуса"
          >
            <FocusFlame stats={stats} />
            <div className="min-w-0 ml-auto text-right">
              <p className="text-[#71767b] text-[11px] uppercase tracking-[0.05em]">Средний результат</p>
              <p className="text-[#00ba7c] text-[22px] font-extrabold tabular-nums leading-tight">
                {stats.avgPercent}%
              </p>
              <p className="text-[#71767b] text-[11px]">
                {stats.totalFulfilled} из {stats.totalPromises} обещаний
              </p>
            </div>
          </section>
        )}

        {/* Today's intentions card */}
        <section className="px-4 py-5 border-b border-[#2f3336]" aria-labelledby="today-focus-title">
          <div className="flex items-center gap-2 mb-3">
            <Target size={18} className="text-[#1d9bf0] flex-none" aria-hidden="true" />
            <h2
              id="today-focus-title"
              className="text-[#e7e9ea] text-[17px] font-bold leading-[22px] tracking-[-0.015em]"
            >
              Сегодня
            </h2>
            {todayRecord && (
              <span
                className="text-[12px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  color: todayRecord.completionPercent >= 66 ? '#00ba7c' : '#ffad5a',
                  background: 'rgba(255,255,255,0.05)',
                }}
              >
                {todayRecord.completionPercent}% обещаний
              </span>
            )}
            <span className="text-[#71767b] text-[13px] leading-[16px] ml-auto">
              {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </span>
          </div>

          <div className="flex flex-col gap-2 mb-3">
            {draftFocus.map((val, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border border-[#2f3336] rounded-2xl px-4 py-3 bg-[#16181c] focus-within:border-[#1d9bf0] transition-colors"
              >
                <span className="text-[#1d9bf0] font-bold text-[13px] flex-none w-4">{i + 1}</span>
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
                  className="flex-1 min-w-0 bg-transparent text-[#e7e9ea] text-[15px] leading-[23px] tracking-[-0.015em] outline-none placeholder-[#71767b] disabled:opacity-60"
                  aria-label={`Намерение ${i + 1}: ${PLACEHOLDERS[i]}`}
                />
                {saved && val.trim().length > 0 && (
                  <Check size={15} className="text-[#1d9bf0] flex-none" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>

          {!saved ? (
            <button
              type="button"
              onClick={handleSaveToday}
              disabled={!draftFocus.some((f) => f.trim().length > 0)}
              className="flex items-center gap-2 h-10 px-5 rounded-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white text-[14px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check size={15} />
              Зафиксировать фокус
            </button>
          ) : (
            <div className="flex items-center gap-2 text-[#1d9bf0] text-[14px] font-bold">
              <Check size={15} />
              Фокус зафиксирован — действуй!
            </div>
          )}
        </section>

        {/* Past intentions history */}
        {pastEntries.length > 0 ? (
          <section aria-labelledby="past-focus-title">
            <div className="px-4 py-3 border-b border-[#2f3336]">
              <h3
                id="past-focus-title"
                className="text-[#71767b] text-[13px] leading-[16px] font-bold uppercase tracking-[0.05em]"
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
              const barColor =
                verdict.tone === 'elite'
                  ? '#00ba7c'
                  : verdict.tone === 'good'
                    ? '#1d9bf0'
                    : verdict.tone === 'mid'
                      ? '#ffad5a'
                      : '#f91880'

              return (
                <article
                  key={key}
                  className="px-4 py-4 border-b border-[#2f3336] hover:bg-white/[0.02] transition-colors duration-150"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-[#71767b] text-[12px] leading-[16px] capitalize">
                      {formatDateRu(key)}
                    </p>
                    {reviewed && (
                      <span
                        className="text-[12px] font-extrabold tabular-nums flex-none"
                        style={{ color: barColor }}
                      >
                        {percent}%
                      </span>
                    )}
                    <ChevronRight size={14} className="text-[#2f3336] flex-none" aria-hidden="true" />
                  </div>

                  {reviewed && (
                    <div className="h-1 rounded-full overflow-hidden mb-2.5" style={{ background: '#2f3336' }} aria-hidden="true">
                      <div className="h-full rounded-full" style={{ width: `${percent}%`, background: barColor }} />
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
                            <span className="text-[#1d9bf0] text-[12px] font-bold flex-none w-[13px] text-center">
                              {idx + 1}
                            </span>
                          )}
                          <span
                            className="text-[15px] leading-[23px] tracking-[-0.015em] truncate"
                            style={{
                              color: status === 'missed' ? '#71767b' : '#e7e9ea',
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
                    <p className="text-[11px] mt-2 text-[#71767b]">
                      {verdict.label} · {fulfilled} из {activeCount} сдержано
                    </p>
                  )}
                </article>
              )
            })}
          </section>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-[#1d9bf0]/10 flex items-center justify-center mb-4">
              <Target size={28} className="text-[#1d9bf0]" aria-hidden="true" />
            </div>
            <p className="text-[#e7e9ea] text-[23px] font-bold tracking-[-0.02em] mb-2">
              История пуста
            </p>
            <p className="text-[#71767b] text-[15px] leading-[23px] max-w-[280px]">
              Начни фиксировать ежедневный фокус — и здесь появится история твоих намерений.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

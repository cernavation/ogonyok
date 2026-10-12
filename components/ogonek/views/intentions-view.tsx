'use client'

import { ArrowLeft, Check, ChevronRight, Target } from 'lucide-react'
import { useState } from 'react'
import type { ViewId } from '@/lib/ogonek/types'

type Props = {
  morningIntentions: Record<string, [string, string, string]>
  onNavigate: (view: ViewId) => void
  onSave?: (dateKey: string, focus: [string, string, string]) => void
  notify?: (msg: string) => void
  soundEnabled?: boolean
}

function formatDateRu(isoKey: string): string {
  try {
    return new Date(isoKey).toLocaleDateString('ru-RU', {
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

export function IntentionsView({
  morningIntentions,
  onNavigate,
  onSave,
  notify,
}: Props) {
  const todayKey = getTodayKey()
  const todayFocus: [string, string, string] = morningIntentions[todayKey] || ['', '', '']
  const [draftFocus, setDraftFocus] = useState<[string, string, string]>(todayFocus)
  const [saved, setSaved] = useState(Boolean(todayFocus.some((f) => f.trim().length > 0)))

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
            {pastEntries.map(([key, focus]) => (
              <article
                key={key}
                className="px-4 py-4 border-b border-[#2f3336] hover:bg-white/[0.02] transition-colors duration-150"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-[#71767b] text-[12px] leading-[16px] capitalize">
                    {formatDateRu(key)}
                  </p>
                  <ChevronRight size={14} className="text-[#2f3336] flex-none mt-0.5" aria-hidden="true" />
                </div>
                <div className="flex flex-col gap-1.5">
                  {focus.map((item, idx) => (
                    item.trim().length > 0 && (
                      <div key={idx} className="flex items-baseline gap-2">
                        <span className="text-[#1d9bf0] text-[12px] font-bold flex-none">{idx + 1}</span>
                        <span className="text-[#e7e9ea] text-[15px] leading-[23px] tracking-[-0.015em]">
                          {item}
                        </span>
                      </div>
                    )
                  ))}
                </div>
              </article>
            ))}
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

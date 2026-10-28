'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { BookmarkPlus, Flame, Forward, Heart, Send, Sparkles, Loader2, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useId, useState, memo } from 'react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import {
  getGratitudeText,
  type GratitudeEntry,
  type Mode,
  type PrideEntry,
  type VisibilityLevel,
} from '@/lib/ogonek/types'
import { gratitudeTarget, prideTarget } from '@/lib/ogonek/reactions'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { normalizeVisibility } from '@/lib/ogonek/visibility'
import { CommentsThread } from './comments-thread'
import { ReactionBar } from './reaction-bar'
import { StarRating } from './star-rating'
import { Tooltip } from './tooltip'
import { VaultSpark } from './vault-spark'
import { VisibilitySwitcher } from './visibility-switcher'
import { IconButton } from './ui'

const TABS = [
  { id: 'pride', label: '5 Гордостей', icon: Flame },
  { id: 'gratitude', label: '5 Благодарностей', icon: Heart },
] as const

type Props = {
  prides: PrideEntry[]
  gratitudes: (string | GratitudeEntry)[]
  /** ID дня — включает живое оценивание и реакции под записями */
  dayId?: number
  soundEnabled?: boolean
  onPinToVault?: (fact: string) => void
  onNotify?: (msg: string) => void
  /** ЭТАП 9 — приватность дня (наследуется гордостями без своей настройки) */
  dayVisibility?: VisibilityLevel
  /** ЭТАП 9 — смена приватности конкретной гордости */
  onSetPrideVisibility?: (index: number, level: VisibilityLevel) => void
  /** ЭТАП 9 — публикация гордости в Сторис */
  onPublishPrideStory?: (index: number) => void
  /** ЭТАП 13 — переслать эту гордость другу в чат */
  onForwardPride?: (index: number) => void
  /** Переслать благодарность другу в чат */
  onForwardGratitude?: (index: number) => void
}

/** Оценка благодарности: 0 — не оценена */
function gratitudeRating(g: string | GratitudeEntry): number {
  if (typeof g === 'object' && typeof g.rating === 'number' && g.rating > 0) {
    return Math.min(10, Math.round(g.rating))
  }
  return 0
}

function PrideStars({ rating }: { rating: number | null | undefined }) {
  if (rating === null || rating === undefined || rating <= 0 || isNaN(rating)) {
    return null
  }
  const clamped = Math.min(10, Math.max(1, Math.round(rating)))
  return (
    <div className="inline-flex items-center gap-1 flex-none px-2 py-0.5 rounded-full bg-amber-400/10" title={`Оценка: ${clamped}/10`}>
      <span className="text-[13px] font-bold text-amber-400 select-none">
        {clamped}
      </span>
      <span className="text-amber-400 text-[13px] select-none">★</span>
    </div>
  )
}

function DayEntriesComponent({
  prides,
  gratitudes,
  dayId,
  soundEnabled = true,
  onPinToVault,
  onNotify,
  dayVisibility = 'public',
  onSetPrideVisibility,
  onPublishPrideStory,
  onForwardPride,
  onForwardGratitude,
}: Props) {
  const [mode, setMode] = useState<Mode>('pride')
  const [sparkingNum, setSparkingNum] = useState<string | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [daySummary, setDaySummary] = useState<string | null>(null)
  const [activePrideIndex, setActivePrideIndex] = useState<number | null>(null)
  const [activeGratitudeIndex, setActiveGratitudeIndex] = useState<number | null>(null)
  const reduce = useReducedMotion()
  const uid = useId()
  const { ratePride, rateGratitude, clearPrideRating, clearGratitudeRating } = useOgonekStore()

  const interactive = typeof dayId === 'number'
  const canReact = interactive

  const handleTabClick = (id: Mode) => {
    playClick(soundEnabled)
    setMode(id)
  }

  const handleAiEvaluateCurrentTab = async () => {
    if (isEvaluating) return
    setIsEvaluating(true)
    playClick(soundEnabled)
    try {
      const itemsToEval =
        mode === 'pride'
          ? prides.map((p) => p.text).filter((t) => t && t !== '—')
          : gratitudes
              .map((g) => getGratitudeText(g))
              .filter((t) => t && t !== '—')

      if (itemsToEval.length === 0) {
        onNotify?.('Нет записей для оценки')
        setIsEvaluating(false)
        return
      }

      const res = await fetch('/api/ai/evaluate-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          items: itemsToEval,
          dayId,
        }),
      })

      const data = await res.json()
      if (res.ok && data.evaluations) {
        playSuccess(soundEnabled)
        if (mode === 'pride') {
          data.evaluations.forEach((ev: { index: number; score: number }) => {
            if (typeof ev.score === 'number' && typeof dayId === 'number') {
              ratePride(dayId, ev.index, ev.score)
            }
          })
        } else {
          data.evaluations.forEach((ev: { index: number; score: number }) => {
            if (typeof ev.score === 'number' && typeof dayId === 'number') {
              rateGratitude(dayId, ev.index, ev.score)
            }
          })
        }
        if (data.summary) {
          setDaySummary(data.summary)
        }
        onNotify?.(`ИИ оценил ${mode === 'pride' ? 'гордости' : 'благодарности'}!`)
      } else {
        onNotify?.(data.error || 'Оценка сохранена!')
      }
    } catch {
      onNotify?.('Оценка сохранена локально')
    } finally {
      setIsEvaluating(false)
    }
  }

  const handleSaveToVault = (num: string, text: string) => {
    playSuccess(soundEnabled)
    setSparkingNum(num)
    onPinToVault?.(text)
    onNotify?.('Факт сохранён в Сейф доказательств!')
    setTimeout(() => {
      setSparkingNum(null)
    }, 600)
  }

  return (
    <>
      {/* Sliding tab switcher with Framer Motion layoutId */}
      <div
        className="relative flex rounded-full bg-[var(--bg-elev)] border border-[var(--border)] p-1 mb-3"
        role="tablist"
        aria-label="Тип записей"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const selected = mode === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`${uid}-tab-${id}`}
              aria-selected={selected}
              aria-controls={`${uid}-panel-${id}`}
              className="relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-[13px] font-bold transition-colors duration-150 z-10 min-h-[38px]"
              style={{
                color: selected
                  ? id === 'pride' ? 'var(--accent)' : '#ff73ab'
                  : 'var(--text-2)',
              }}
              onClick={() => handleTabClick(id)}
            >
              {selected && (
                <motion.span
                  layoutId={`${uid}-pill`}
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'var(--bg-hover)' }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 500, damping: 38 }
                  }
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon size={15} />
                {label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Кнопка «Оценить с ИИ» */}
      {interactive && (
        <div className="flex items-center justify-between gap-2 mb-3 px-1" role="group" aria-label="ИИ Оценка">
          <button
            type="button"
            disabled={isEvaluating}
            onClick={handleAiEvaluateCurrentTab}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-bold bg-[var(--accent-soft)] hover:bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30 transition-all shadow-sm disabled:opacity-50 min-h-[36px]"
          >
            {isEvaluating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {mode === 'pride' ? 'Оценить гордости с ИИ' : 'Оценить благодарности с ИИ'}
          </button>

          <span className="text-[13px] text-[var(--text-3)] font-medium">
            {mode === 'pride' ? '1 запрос на все гордости' : '1 запрос на все благодарности'}
          </span>
        </div>
      )}

      {/* Итог дня от ИИ (если сформирован) */}
      {daySummary && (
        <div className="mb-3 p-3 rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent)]/30 text-[13px] text-[var(--text)]">
          <div className="flex items-center gap-1.5 font-bold text-[var(--accent)] mb-1">
            <Sparkles size={14} /> Итог дня от ИИ:
          </div>
          <p className="leading-relaxed">{daySummary}</p>
        </div>
      )}

      {/* Entry panels */}
      <div className="grid">
        {/* Prides panel */}
        <div
          role="tabpanel"
          id={`${uid}-panel-pride`}
          aria-labelledby={`${uid}-tab-pride`}
          data-active={mode === 'pride'}
          className={mode === 'pride' ? 'block' : 'hidden'}
        >
          {prides.map((p, index) => {
            const rating = typeof p.scale === 'number' && p.scale > 0 && p.text !== '—' ? p.scale : 0
            const isExpanded = activePrideIndex === index

            return (
              <div className="flex flex-col py-1.5 border-b border-[var(--border-subtle)] last:border-0" key={p.num}>
                <div className="relative flex items-start gap-2.5">
                  {sparkingNum === p.num && <VaultSpark active={true} />}
                  <span className="text-[13px] leading-[22px] font-mono font-bold text-[var(--text-3)] flex-none w-5 text-right pt-0.5">
                    {p.num}
                  </span>
                  <span className="flex-1 min-w-0 break-words text-[15px] leading-[22px] text-[var(--text)] tracking-[-0.015em]">
                    {p.text}
                  </span>

                  <div className="flex items-center gap-1.5 flex-none" role="group" aria-label={`Опции гордости #${p.num}`}>
                    {interactive ? (
                      <StarRating
                        value={rating}
                        label={`Оценка гордости #${p.num}`}
                        soundEnabled={soundEnabled}
                        onChange={(next) => {
                          ratePride(dayId as number, index, next)
                          onNotify?.(`Гордость #${p.num}: ${next}/10`)
                        }}
                        onClear={() => {
                          clearPrideRating(dayId as number, index)
                          onNotify?.(`Оценка гордости #${p.num} сброшена`)
                        }}
                      />
                    ) : (
                      <PrideStars rating={rating} />
                    )}

                    {onPinToVault && (
                      <IconButton
                        size="sm"
                        icon={<BookmarkPlus size={16} />}
                        label={`Сохранить факт #${p.num} в сейф`}
                        tooltip="В Сейф доказательств"
                        onClick={() => handleSaveToVault(p.num, p.text)}
                      />
                    )}

                    {canReact && (
                      <IconButton
                        size="sm"
                        icon={isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        label="Дополнительные действия"
                        tooltip={isExpanded ? 'Скрыть детали' : 'Реакции и обсуждение'}
                        active={isExpanded}
                        onClick={() => setActivePrideIndex((prev) => (prev === index ? null : index))}
                      />
                    )}
                  </div>
                </div>

                {/* Раскрывающийся блок реакций и опций гордости */}
                {isExpanded && canReact && (
                  <div className="mt-2 pl-7 pt-2 pb-1 border-t border-[var(--border-subtle)] flex flex-col gap-2.5 bg-[var(--bg-elev)] rounded-xl p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2" role="group" aria-label="Реакции на гордость">
                      <ReactionBar
                        target={prideTarget(dayId as number, index)}
                        compact
                        soundEnabled={soundEnabled}
                        onNotify={onNotify}
                      />

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {onForwardPride && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1 text-[13px] font-bold text-[var(--text)] transition-colors hover:bg-[var(--bg-hover)] min-h-[34px]"
                            onClick={() => onForwardPride(index)}
                            aria-label={`Переслать гордость #${p.num} в чат`}
                          >
                            <Forward size={14} className="text-sky-500" />
                            В чат
                          </button>
                        )}
                        {onPublishPrideStory && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1 text-[13px] font-bold text-[var(--text)] transition-colors hover:bg-[var(--bg-hover)] min-h-[34px]"
                            onClick={() => onPublishPrideStory(index)}
                            aria-label={`Опубликовать гордость #${p.num} в Сторис`}
                          >
                            <Send size={14} className="text-[var(--accent)]" />
                            В Сторис
                          </button>
                        )}
                      </div>
                    </div>

                    {onSetPrideVisibility && (
                      <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
                        <span className="text-[13px] text-[var(--text-2)] font-medium">Приватность:</span>
                        <VisibilitySwitcher
                          size="sm"
                          value={normalizeVisibility(p.visibility ?? dayVisibility)}
                          onChange={(level) => onSetPrideVisibility(index, level)}
                          soundEnabled={soundEnabled}
                        />
                      </div>
                    )}

                    <div className="pt-1">
                      <CommentsThread
                        target={prideTarget(dayId as number, index)}
                        variant="pride"
                        compact
                        soundEnabled={soundEnabled}
                        onNotify={onNotify}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Gratitudes panel */}
        <div
          role="tabpanel"
          id={`${uid}-panel-gratitude`}
          aria-labelledby={`${uid}-tab-gratitude`}
          data-active={mode === 'gratitude'}
          className={mode === 'gratitude' ? 'block' : 'hidden'}
        >
          {gratitudes.map((g, idx) => {
            const text = getGratitudeText(g)
            const rating = text === '—' ? 0 : gratitudeRating(g)
            const num = String(idx + 1).padStart(2, '0')
            const isExpanded = activeGratitudeIndex === idx

            return (
              <div className="flex flex-col py-1.5 border-b border-[var(--border-subtle)] last:border-0" key={`${idx}-${text.slice(0, 30)}`}>
                <div className="relative flex items-start gap-2.5">
                  <span className="text-[13px] leading-[22px] font-mono font-bold text-[#ff73ab]/80 flex-none w-5 text-right pt-0.5">
                    {num}
                  </span>
                  <span className="flex-1 min-w-0 break-words text-[15px] leading-[22px] text-[var(--text)] tracking-[-0.015em]">
                    {text}
                  </span>

                  <div className="flex items-center gap-1.5 flex-none" role="group" aria-label={`Опции благодарности #${num}`}>
                    {interactive ? (
                      <StarRating
                        value={rating}
                        label={`Оценка благодарности #${num}`}
                        soundEnabled={soundEnabled}
                        onChange={(next) => {
                          rateGratitude(dayId as number, idx, next)
                          onNotify?.(`Благодарность #${num}: ${next}/10`)
                        }}
                        onClear={() => {
                          clearGratitudeRating(dayId as number, idx)
                          onNotify?.(`Оценка благодарности #${num} сброшена`)
                        }}
                      />
                    ) : (
                      <PrideStars rating={rating} />
                    )}

                    {onForwardGratitude && (
                      <IconButton
                        size="sm"
                        icon={<Forward size={16} />}
                        label={`Переслать благодарность #${num} в чат`}
                        tooltip="В чат"
                        onClick={() => onForwardGratitude(idx)}
                      />
                    )}

                    {canReact && (
                      <IconButton
                        size="sm"
                        icon={isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        label="Реакции"
                        tooltip={isExpanded ? 'Скрыть реакции' : 'Поставить реакцию'}
                        active={isExpanded}
                        onClick={() => setActiveGratitudeIndex((prev) => (prev === idx ? null : idx))}
                      />
                    )}
                  </div>
                </div>

                {isExpanded && canReact && (
                  <div className="mt-2 pl-7 pt-2 pb-1 border-t border-[var(--border-subtle)] bg-[var(--bg-elev)] rounded-xl p-2.5">
                    <ReactionBar
                      target={gratitudeTarget(dayId as number, idx)}
                      compact
                      soundEnabled={soundEnabled}
                      onNotify={onNotify}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

import { areDayEntriesPropsEqual } from '@/lib/ogonek/feed-memo'
export { areDayEntriesPropsEqual }

export const DayEntries = memo(DayEntriesComponent, areDayEntriesPropsEqual)

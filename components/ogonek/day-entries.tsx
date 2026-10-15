'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { BookmarkPlus, Flame, Heart } from 'lucide-react'
import { useId, useState } from 'react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import {
  getGratitudeText,
  type GratitudeEntry,
  type Mode,
  type PrideEntry,
} from '@/lib/ogonek/types'
import { gratitudeTarget, prideTarget } from '@/lib/ogonek/reactions'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { CommentsThread } from './comments-thread'
import { ReactionBar } from './reaction-bar'
import { StarRating } from './star-rating'
import { Tooltip } from './tooltip'
import { VaultSpark } from './vault-spark'

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
    <div className="inline-flex items-center gap-0.5 flex-none" title={`Оценка: ${clamped}/10`}>
      <span className="text-[12px] leading-[16px] font-bold text-amber-400 tracking-[-0.01em] select-none">
        {clamped}
      </span>
      <span className="text-amber-400 text-[12px] leading-[16px] select-none">★</span>
    </div>
  )
}

export function DayEntries({
  prides,
  gratitudes,
  dayId,
  soundEnabled = true,
  onPinToVault,
  onNotify,
}: Props) {
  const [mode, setMode] = useState<Mode>('pride')
  const [sparkingNum, setSparkingNum] = useState<string | null>(null)
  const reduce = useReducedMotion()
  const uid = useId()
  const { ratePride, rateGratitude, clearPrideRating, clearGratitudeRating } = useOgonekStore()

  const interactive = typeof dayId === 'number'
  const canReact = interactive

  const handleTabClick = (id: Mode) => {
    playClick(soundEnabled)
    setMode(id)
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
        className="relative flex rounded-full bg-[#090a0b] border border-[#2f3336] p-1 mb-3"
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
              className="relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[12px] font-bold transition-colors duration-150 z-10"
              style={{
                color: selected
                  ? id === 'pride' ? '#ffad5a' : '#ff73ab'
                  : '#71767b',
              }}
              onClick={() => handleTabClick(id)}
            >
              {selected && (
                <motion.span
                  layoutId={`${uid}-pill`}
                  className="absolute inset-0 rounded-full"
                  style={{ background: '#202327' }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 500, damping: 38 }
                  }
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon size={14} />
                {label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Entry panels */}
      <div className="grid">
        {/* Prides panel */}
        <div
          role="tabpanel"
          id={`${uid}-panel-pride`}
          aria-labelledby={`${uid}-tab-pride`}
          data-active={mode === 'pride'}
          className="entries-panel"
        >
          {prides.map((p, index) => {
            const rating = typeof p.scale === 'number' && p.scale > 0 && p.text !== '—' ? p.scale : 0
            return (
              <div className="flex flex-col gap-1 py-1" key={p.num}>
                <div className="relative flex items-baseline gap-2">
                  {sparkingNum === p.num && <VaultSpark active={true} />}
                  <span className="text-[12px] leading-[16px] font-mono text-[#71767b] flex-none w-6 text-right">
                    {p.num}
                  </span>
                  <span className="flex-1 text-[15px] leading-[23px] text-[#e7e9ea] tracking-[-0.015em]">
                    {p.text}
                  </span>
                  <div className="flex items-center gap-1.5 flex-none">
                    {!interactive && <PrideStars rating={rating} />}
                    {onPinToVault && (
                      <Tooltip content="В Сейф доказательств" side="top">
                        <button
                          type="button"
                          className="p-1 text-[#71767b] hover:text-[#ff6b35] transition-colors cursor-pointer rounded-full hover:bg-[#ff6b35]/10"
                          aria-label={`Сохранить факт #${p.num} в сейф`}
                          onClick={() => handleSaveToVault(p.num, p.text)}
                        >
                          <BookmarkPlus size={13} />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>

                {/* Живые реакции под записью: оценка 1–10 и эмодзи */}
                {canReact && (
                  <div className="flex flex-wrap items-center gap-2 pl-8">
                    <StarRating
                      value={rating}
                      label="Оценка гордости"
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
                    <ReactionBar
                      target={prideTarget(dayId as number, index)}
                      compact
                      soundEnabled={soundEnabled}
                      onNotify={onNotify}
                    />
                  </div>
                )}

                {/* Комментарии поддержки под отдельной гордостью */}
                {canReact && (
                  <div className="pl-8">
                    <CommentsThread
                      target={prideTarget(dayId as number, index)}
                      variant="pride"
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

        {/* Gratitudes panel */}
        <div
          role="tabpanel"
          id={`${uid}-panel-gratitude`}
          aria-labelledby={`${uid}-tab-gratitude`}
          data-active={mode === 'gratitude'}
          className="entries-panel"
        >
          {gratitudes.map((g, idx) => {
            const text = getGratitudeText(g)
            const rating = text === '—' ? 0 : gratitudeRating(g)
            const num = String(idx + 1).padStart(2, '0')
            return (
              <div className="flex flex-col gap-1 py-1" key={`${idx}-${text.slice(0, 30)}`}>
                <div className="flex items-baseline gap-2">
                  <span className="text-[12px] leading-[16px] font-mono text-[#ff73ab]/70 flex-none w-6 text-right">
                    {num}
                  </span>
                  <span className="flex-1 text-[15px] leading-[23px] text-[#e7e9ea] tracking-[-0.015em]">
                    {text}
                  </span>
                  {!interactive && (
                    <div className="flex items-center gap-1.5 flex-none">
                      <PrideStars rating={rating} />
                    </div>
                  )}
                </div>

                {canReact && (
                  <div className="flex flex-wrap items-center gap-2 pl-8">
                    <StarRating
                      value={rating}
                      label="Оценка благодарности"
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

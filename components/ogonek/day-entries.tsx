'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { BookmarkPlus, Flame, Heart, Zap } from 'lucide-react'
import { useId, useState } from 'react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { getGratitudeRating, getGratitudeText, type GratitudeEntry, type Mode, type PrideEntry } from '@/lib/ogonek/types'
import { Tooltip } from './tooltip'
import { VaultSpark } from './vault-spark'

const TABS = [
  { id: 'pride', label: '5 Гордостей', icon: Flame },
  { id: 'gratitude', label: '5 Благодарностей', icon: Heart },
] as const

type Props = {
  prides: PrideEntry[]
  gratitudes: (string | GratitudeEntry)[]
  soundEnabled?: boolean
  onPinToVault?: (fact: string) => void
  onNotify?: (msg: string) => void
}

function StarsBar({ rating }: { rating: number | null | undefined }) {
  if (rating === null || rating === undefined || rating <= 0 || isNaN(rating)) {
    return null
  }
  const clamped = Math.min(10, Math.max(1, Math.round(rating)))
  return (
    <div className="entry-stars" title={`Оценка: ${clamped}/10`}>
      <div className="hidden sm:flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => {
          const lit = i < clamped
          return (
            <span
              key={i}
              className={`text-[11px] leading-none select-none ${
                lit ? 'text-amber-400 opacity-100 font-bold' : 'text-neutral-700 opacity-30'
              }`}
            >
              {lit ? '★' : '☆'}
            </span>
          )
        })}
      </div>
      <span className="sm:hidden text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5 select-none">
        {clamped}★
      </span>
    </div>
  )
}

export function DayEntries({
  prides,
  gratitudes,
  soundEnabled = true,
  onPinToVault,
  onNotify,
}: Props) {
  const [mode, setMode] = useState<Mode>('pride')
  const [sparkingNum, setSparkingNum] = useState<string | null>(null)
  const reduce = useReducedMotion()
  const uid = useId()

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
      <div className="segmented" role="tablist" aria-label="Тип записей">
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
              data-mode={id}
              data-selected={selected}
              className="segmented__tab"
              onClick={() => handleTabClick(id)}
            >
              {selected && (
                <motion.span
                  layoutId={`${uid}-pill`}
                  className="segmented__pill"
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <span className="segmented__label">
                <Icon size={16} /> {label}
              </span>
            </button>
          )
        })}
      </div>

      <div className="entries-stack">
        <div
          role="tabpanel"
          id={`${uid}-panel-pride`}
          aria-labelledby={`${uid}-tab-pride`}
          data-active={mode === 'pride'}
          className="entries-panel"
        >
          {prides.map((p) => {
            const rating = typeof p.scale === 'number' && p.scale > 0 && p.text !== '—' ? p.scale : null
            return (
              <div className="entry relative" key={p.num}>
                {sparkingNum === p.num && <VaultSpark active={true} />}
                <span className="entry-num">{p.num}</span>
                <span className="entry-text">{p.text}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <StarsBar rating={rating} />
                  {onPinToVault && (
                    <Tooltip content="В Сейф доказательств" side="top">
                      <button
                        type="button"
                        className="p-1 text-muted hover:text-orange-400 transition-colors cursor-pointer"
                        aria-label={`Сохранить факт #${p.num} в сейф`}
                        onClick={() => handleSaveToVault(p.num, p.text)}
                      >
                        <BookmarkPlus size={14} />
                      </button>
                    </Tooltip>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div
          role="tabpanel"
          id={`${uid}-panel-gratitude`}
          aria-labelledby={`${uid}-tab-gratitude`}
          data-active={mode === 'gratitude'}
          className="entries-panel"
        >
          {gratitudes.map((g, idx) => {
            const text = getGratitudeText(g)
            const rawRating = getGratitudeRating(g)
            const rating = text === '—' || !rawRating || rawRating <= 0 ? null : rawRating
            const num = String(idx + 1).padStart(2, '0')
            return (
              <div className="entry entry--gratitude relative" key={`${idx}-${text.slice(0, 30)}`}>
                <span className="entry-num text-pink-400/80">{num}</span>
                <span className="entry-text">{text}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <StarsBar rating={rating} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

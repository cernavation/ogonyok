'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { BookmarkPlus, Flame, Heart, Zap } from 'lucide-react'
import { useId, useState } from 'react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { Mode, PrideEntry } from '@/lib/ogonek/types'
import { Tooltip } from './tooltip'
import { VaultSpark } from './vault-spark'

const TABS = [
  { id: 'pride', label: '5 Гордостей', icon: Flame },
  { id: 'gratitude', label: '5 Благодарностей', icon: Heart },
] as const

type Props = {
  prides: PrideEntry[]
  gratitudes: string[]
  soundEnabled?: boolean
  onPinToVault?: (fact: string) => void
  onNotify?: (msg: string) => void
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
          {prides.map((p) => (
            <div className="entry relative" key={p.num}>
              {sparkingNum === p.num && <VaultSpark active={true} />}
              <span className="entry-num">{p.num}</span>
              <span className="entry-text">{p.text}</span>
              <div className="flex items-center gap-2">
                <span className="rating">
                  Масштаб: <b>{p.scale}</b> · Преодоление: <b>{p.overcome}</b>
                </span>
                {onPinToVault && (
                  <Tooltip content="В Сейф доказательств" side="top">
                    <button
                      type="button"
                      className="p-1 text-muted hover:text-orange-400 transition-colors"
                      aria-label={`Сохранить факт #${p.num} в сейф`}
                      onClick={() => handleSaveToVault(p.num, p.text)}
                    >
                      <BookmarkPlus size={14} />
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>
          ))}
        </div>
        <div
          role="tabpanel"
          id={`${uid}-panel-gratitude`}
          aria-labelledby={`${uid}-tab-gratitude`}
          data-active={mode === 'gratitude'}
          className="entries-panel"
        >
          {gratitudes.map((g, idx) => (
            <div className="entry entry--gratitude" key={`${idx}-${g}`}>
              <Heart size={15} fill="currentColor" />
              <span className="entry-text">{g}</span>
              <span className="rating">с благодарностью</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { SmilePlus } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback, useMemo, useState } from 'react'
import { playClick } from '@/lib/ogonek/sound'
import {
  BUILTIN_EMOJIS,
} from '@/lib/ogonek/reactions'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { Tooltip } from './tooltip'

const EmojiReactionPicker = dynamic(
  () => import('./emoji-constructor').then((m) => m.EmojiReactionPicker),
  { ssr: false }
)

type Props = {
  /** Цель реакции: "day:12" | "day:12:pride:0" | "day:12:grat:2" */
  target: string
  /** Компактный режим для строк внутри дня */
  compact?: boolean
  /** Скрыть некоторые встроенные реакции (например, те, что уже в панели действий) */
  excludeIds?: string[]
  soundEnabled?: boolean
  onNotify?: (msg: string) => void
}

type FloatingEmoji = { key: number; char: string }

/**
 * Живая панель реакций: кликабельные смайлики с счётчиками.
 * Активная реакция подсвечивается, при постановке всплывает анимированный эмодзи.
 * Кнопка «+» открывает конструктор собственных смайликов.
 */
export function ReactionBar({
  target,
  compact = false,
  excludeIds = [],
  soundEnabled = true,
  onNotify,
}: Props) {
  const { state, toggleReaction } = useOgonekStore()
  const [floats, setFloats] = useState<FloatingEmoji[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const reduce = useReducedMotion()

  const counts = state.dayReactions[target] ?? {}
  const mine = state.myReactions[target] ?? []
  const customEmojis = state.customEmojis

  const excluded = useMemo(() => new Set(excludeIds), [excludeIds])

  // Какие пилюли показывать
  const visible = useMemo(() => {
    const builtinAvailable = BUILTIN_EMOJIS.filter((e) => !excluded.has(e.id))

    let base = builtinAvailable
    if (compact) {
      const withActivity = builtinAvailable.filter((e) => (counts[e.id] ?? 0) > 0 || mine.includes(e.id))
      base = withActivity.length > 0 ? withActivity : builtinAvailable.slice(0, 3)
    }

    const items = base.map((e) => ({ id: e.id, char: e.char, label: e.label }))

    // Кастомные смайлики, которыми уже реагировали или которые выбраны пользователем
    for (const e of customEmojis) {
      const active = mine.includes(e.id) || (counts[e.id] ?? 0) > 0
      if (active) {
        items.push({ id: e.id, char: e.char, label: e.label })
      }
    }

    return items
  }, [compact, counts, mine, customEmojis, excluded])

  const handleToggle = useCallback(
    (emojiId: string, char: string, label: string) => {
      const becameActive = toggleReaction(target, emojiId)
      playClick(soundEnabled)
      if (becameActive) {
        const key = Date.now() + Math.random()
        setFloats((prev) => [...prev, { key, char }])
        setTimeout(() => {
          setFloats((prev) => prev.filter((f) => f.key !== key))
        }, 720)
        onNotify?.(`Реакция ${char} · ${label}`)
      } else {
        onNotify?.(`Реакция ${char} снята`)
      }
    },
    [target, toggleReaction, soundEnabled, onNotify]
  )

  return (
    <div className="relative flex flex-wrap items-center gap-2" role="group" aria-label="Реакции">
      {/* Всплывающие эмодзи */}
      <AnimatePresence>
        {floats.map((f) => (
          <motion.span
            key={f.key}
            className="pointer-events-none absolute left-2 bottom-6 z-20 text-[22px]"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.6 }}
            animate={reduce ? { opacity: 1 } : { opacity: [0, 1, 1, 0], y: -34, scale: [0.6, 1.25, 1.1, 0.9] }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.2 : 0.7, ease: 'easeOut' }}
            aria-hidden="true"
          >
            {f.char}
          </motion.span>
        ))}
      </AnimatePresence>

      {visible.map((emoji) => {
        const active = mine.includes(emoji.id)
        const count = counts[emoji.id] ?? 0
        return (
          <Tooltip key={emoji.id} content={emoji.label} side="top">
            <motion.button
              type="button"
              whileTap={reduce ? undefined : { scale: 1.25 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              onClick={() => handleToggle(emoji.id, emoji.char, emoji.label)}
              aria-pressed={active}
              aria-label={
                active
                  ? `Убрать реакцию ${emoji.label} (${count})`
                  : `Поставить реакцию ${emoji.label}`
              }
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[15px] leading-none transition-colors duration-150 min-h-[34px] min-w-[34px] ${
                active
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--border)] bg-transparent text-[var(--text-2)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <span aria-hidden="true">{emoji.char}</span>
              {count > 0 && (
                <span
                  className={`text-[13px] font-bold tabular-nums ${
                    active ? 'text-[var(--accent)]' : 'text-[var(--text-2)]'
                  }`}
                >
                  {count}
                </span>
              )}
            </motion.button>
          </Tooltip>
        )
      })}

      {/* Кнопка конструктора смайликов */}
      <Tooltip content="Свои смайлики и все реакции" side="top">
        <button
          type="button"
          onClick={() => {
            playClick(soundEnabled)
            setPickerOpen(true)
          }}
          aria-label="Открыть конструктор реакций и смайликов"
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[var(--border)] px-2.5 py-1 text-[13px] leading-none text-[var(--text-2)] hover:text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors duration-150 min-h-[34px]"
        >
          <SmilePlus size={15} />
          {!compact && <span className="text-[13px] font-bold">Свой</span>}
        </button>
      </Tooltip>

      {pickerOpen && (
        <EmojiReactionPicker
          target={target}
          onClose={() => setPickerOpen(false)}
          onNotify={onNotify}
          soundEnabled={soundEnabled}
        />
      )}
    </div>
  )
}

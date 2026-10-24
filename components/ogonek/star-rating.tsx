'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { RotateCcw, Star } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'

type Props = {
  /** Текущая оценка, 0 — без оценки */
  value: number
  /** Вызывается при выборе оценки 1..10 */
  onChange: (next: number) => void
  /** Вызывается при сбросе оценки (если задан) */
  onClear?: () => void
  /** Максимум звёзд (по умолчанию 10) */
  max?: number
  /** Подпись для доступности */
  label?: string
  /** Включён ли звук клика */
  soundEnabled?: boolean
  /** Только чтение */
  disabled?: boolean
  /** Текст подписи справа */
  title?: string
}

const SIZE = 22

/**
 * Живое оценивание от 1 до 10 звёзд.
 * Компактная кнопка-пилюля раскрывает панель со звёздами,
 * наведение подсвечивает будущую оценку, клик — сохраняет её в store.
 */
export function StarRating({
  value,
  onChange,
  onClear,
  max = 10,
  label = 'Оценка',
  soundEnabled = true,
  disabled = false,
  title,
}: Props) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const uid = useId()

  const clamped = Math.min(max, Math.max(0, Math.round(value || 0)))
  const active = hover ?? clamped
  const hasRating = clamped > 0

  // Закрытие по клику вне и по Escape
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const commit = (next: number) => {
    playSuccess(soundEnabled)
    onChange(next)
    setOpen(false)
    setHover(null)
  }

  const clear = () => {
    playClick(soundEnabled)
    onClear?.()
    setOpen(false)
    setHover(null)
  }

  return (
    <div className="relative flex-none" ref={wrapRef}>
      <button
        type="button"
        disabled={disabled}
        aria-label={hasRating ? `${label}: ${clamped} из ${max}` : `Поставить оценку ${label}`}
        aria-haspopup="true"
        aria-expanded={open}
        title={title ?? (hasRating ? `${label}: ${clamped}/${max}` : `Оценить: ${label}`)}
        onClick={() => {
          if (disabled) return
          playClick(soundEnabled)
          setOpen((v) => !v)
        }}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 min-h-[40px] sm:min-h-[34px] text-[13px] font-bold transition-colors duration-150 ${
          hasRating
            ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
            : 'text-[var(--text-2)] hover:text-amber-400 hover:bg-amber-400/10'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Star size={14} fill={hasRating ? 'currentColor' : 'none'} />
        <span>{hasRating ? `${clamped}/${max}` : 'Оценить'}</span>
      </button>

      {open && (
        <motion.div
          id={`${uid}-rating`}
          role="group"
          aria-label={`Шкала оценки ${label}`}
          initial={reduce ? { opacity: 1 } : { opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reduce ? 0 : 0.14, ease: 'easeOut' }}
          className="absolute right-0 bottom-full mb-2 z-30 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] shadow-[0_18px_50px_rgba(0,0,0,0.6)] px-3 py-2.5"
          style={{ width: 'max-content' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[13px] font-bold uppercase tracking-wider text-[var(--text-2)]">
              {label}
            </span>
            <span className="text-[13px] font-bold text-amber-400 tabular-nums">
              {active > 0 ? `${active}/${max}` : '—'}
            </span>
          </div>

          <div
            className="flex items-center gap-1"
            onMouseLeave={() => setHover(null)}
            role="radiogroup"
            aria-label={label}
          >
            {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
              const filled = n <= active
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={n === clamped}
                  aria-label={`${n} из ${max}`}
                  onMouseEnter={() => setHover(n)}
                  onFocus={() => setHover(n)}
                  onClick={() => commit(n)}
                  className="w-8 h-8 flex items-center justify-center rounded transition-transform duration-100 hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                >
                  <Star
                    size={SIZE}
                    fill={filled ? '#f5c842' : 'none'}
                    color={filled ? '#f5c842' : '#4a4f54'}
                    strokeWidth={filled ? 1.5 : 1.75}
                  />
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)] gap-3">
            <span className="text-[13px] text-[var(--text-2)]">
              {hasRating ? `Текущая: ${clamped}` : 'Оценка не поставлена'}
            </span>
            {onClear && hasRating && (
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center gap-1 text-[13px] font-bold text-[var(--text-2)] hover:text-[var(--text)] transition-colors min-h-[32px] px-2 py-1 rounded-full hover:bg-[var(--bg-hover)]"
              >
                <RotateCcw size={13} /> Сбросить
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}

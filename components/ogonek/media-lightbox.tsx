'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Plus,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState, type Touch } from 'react'
import type { PrideEntry } from '@/lib/ogonek/types'

export type MediaLightboxItem = {
  src: string
  alt?: string
  caption?: string
  /** Подпись, к какой гордости относится снимок */
  prideText?: string
  pride?: string
  prideLabel?: string
}

export type MediaLightboxProps = {
  /** Список фото: строки (URL/id) или объекты с подписями */
  photos?: (string | MediaLightboxItem)[] | null
  items?: (string | MediaLightboxItem)[] | null
  media?: (string | MediaLightboxItem)[] | null
  images?: (string | MediaLightboxItem)[] | null
  /** Совместимость с одиночным lightbox */
  src?: string | null
  url?: string | null
  image?: string | null
  photo?: string | null
  imageSrc?: string | null
  source?: string | null
  /** Подписи одним массивом */
  captions?: string[] | null
  prideTexts?: string[] | null
  prideCaptions?: string[] | null
  /** Гордости дня — используются как подписи, если явной привязки нет */
  prides?: (PrideEntry | string)[] | null
  /** Явная карта: индекс фото → индекс гордости (или -1 если без привязки) */
  photoPrideIndices?: number[] | null
  initialIndex?: number
  startIndex?: number
  open?: boolean
  isOpen?: boolean
  visible?: boolean
  onClose?: () => void
  title?: string
  soundEnabled?: boolean
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizeItems(props: MediaLightboxProps): MediaLightboxItem[] {
  const raw =
    props.photos ||
    props.items ||
    props.media ||
    props.images ||
    (props.src ||
    props.url ||
    props.image ||
    props.photo ||
    props.imageSrc ||
    props.source
      ? [
          props.src ||
            props.url ||
            props.image ||
            props.photo ||
            props.imageSrc ||
            props.source,
        ]
      : [])
  const list = Array.isArray(raw) ? raw : raw ? [raw] : []
  const items = list
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry ? { src: entry } : null
      }
      if (entry && typeof entry === 'object' && typeof entry.src === 'string' && entry.src) {
        return entry
      }
      return null
    })
    .filter(Boolean) as MediaLightboxItem[]

  const captions = props.captions || props.prideCaptions || null
  const pridesTexts = props.prideTexts || null

  return items.map((item, index) => ({
    ...item,
    caption:
      item.caption ||
      (Array.isArray(captions) ? captions[index] : undefined) ||
      item.alt ||
      `Фото ${index + 1}`,
    prideText:
      item.prideText ||
      item.pride ||
      item.prideLabel ||
      (Array.isArray(pridesTexts) ? pridesTexts[index] : undefined) ||
      (Array.isArray(captions) ? undefined : undefined),
  }))
}

function prideTextsFromPrides(prides: (PrideEntry | string)[] | null | undefined): string[] {
  if (!Array.isArray(prides)) return []
  return prides.map((p) => (typeof p === 'string' ? p : p?.text)).filter(Boolean) as string[]
}

export function MediaLightbox(props: MediaLightboxProps) {
  const {
    initialIndex = 0,
    startIndex = 0,
    open = true,
    isOpen,
    visible = true,
    onClose,
    title,
    prides,
    photoPrideIndices,
  } = props
  const initial = initialIndex ?? startIndex ?? 0
  const opened = (isOpen ?? open) && visible

  const items = normalizeItems(props)
  const prideList = prideTextsFromPrides(prides)

  // Разрешённые тексты гордостей для каждой фотографии
  const prideFor = useCallback(
    (photoIndex: number) => {
      const item = items[photoIndex]
      if (item?.prideText) return item.prideText

      if (Array.isArray(photoPrideIndices)) {
        const mapped = photoPrideIndices[photoIndex]
        if (typeof mapped === 'number') {
          if (mapped < 0) return undefined
          return prideList[mapped]?.trim() || undefined
        }
      }

      // По умолчанию: фото i ↔ гордость i; если гордостей меньше — первая гордость дня
      if (prideList.length === 0) return undefined
      if (photoIndex < prideList.length) return prideList[photoIndex]?.trim() || undefined
      return prideList[0]?.trim() || undefined
    },
    [items, photoPrideIndices, prideList]
  )

  const [index, setIndex] = useState(() =>
    clamp(initial, 0, Math.max(items.length - 1, 0))
  )
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const reduce = useReducedMotion()

  const dragStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const touchRef = useRef<{
    touches: { x: number; y: number }[]
    startDist: number
    startScale: number
    baseOffset: { x: number; y: number }
    startX: number
    startY: number
    swiping: boolean
    panning: boolean
  } | null>(null)

  const safeIndex = items.length > 0 ? clamp(index, 0, items.length - 1) : 0

  useEffect(() => {
    setIndex(clamp(initial, 0, Math.max(items.length - 1, 0)))
  }, [initial, items.length])

  useEffect(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [safeIndex])

  useEffect(() => {
    if (scale === 1) setOffset({ x: 0, y: 0 })
  }, [scale])

  const close = useCallback(() => onClose?.(), [onClose])

  const goPrev = useCallback(() => {
    if (items.length <= 1) return
    setIndex((i) => (i - 1 + items.length) % items.length)
  }, [items.length])

  const goNext = useCallback(() => {
    if (items.length <= 1) return
    setIndex((i) => (i + 1) % items.length)
  }, [items.length])

  const zoomIn = useCallback(() => setScale((s) => clamp(s + 0.25, 1, 5)), [])
  const zoomOut = useCallback(() => setScale((s) => clamp(s - 0.25, 1, 5)), [])
  const resetZoom = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  // Клавиатура
  useEffect(() => {
    if (!opened) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key === 'ArrowLeft') goPrev()
      if (event.key === 'ArrowRight') goNext()
      if (event.key === '+' || event.key === '=') zoomIn()
      if (event.key === '-' || event.key === '_') zoomOut()
      if (event.key === '0') resetZoom()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [opened, close, goPrev, goNext, zoomIn, zoomOut, resetZoom])

  // Колесо мыши для зума
  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault()
    const delta = -event.deltaY
    setScale((s) => clamp(s + (delta > 0 ? 0.25 : -0.25), 1, 5))
  }, [])

  // Перетаскивание для панорамирования при зуме
  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (scale <= 1) return
      event.preventDefault()
      setDragging(true)
      dragStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        ox: offset.x,
        oy: offset.y,
      }
    },
    [scale, offset.x, offset.y]
  )

  useEffect(() => {
    if (!dragging) return
    const handleMove = (event: MouseEvent) => {
      const start = dragStartRef.current
      if (!start) return
      setOffset({
        x: start.ox + (event.clientX - start.x),
        y: start.oy + (event.clientY - start.y),
      })
    }
    const handleUp = () => {
      setDragging(false)
      dragStartRef.current = null
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [dragging])

  // Жесты тачскрина: зум двумя пальцами, панорамирование и свайп
  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      const touches = Array.from(event.touches).map((t) => ({ x: t.clientX, y: t.clientY }))
      if (touches.length === 2) {
        const dist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y)
        touchRef.current = {
          touches,
          startDist: dist,
          startScale: scale,
          baseOffset: { ...offset },
          startX: 0,
          startY: 0,
          swiping: false,
          panning: false,
        }
      } else if (touches.length === 1) {
        touchRef.current = {
          touches,
          startDist: 0,
          startScale: scale,
          baseOffset: { ...offset },
          startX: touches[0].x,
          startY: touches[0].y,
          swiping: scale === 1,
          panning: scale > 1,
        }
      }
    },
    [scale, offset]
  )

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    const state = touchRef.current
    if (!state) return
    const touches = Array.from(event.touches).map((t) => ({ x: t.clientX, y: t.clientY }))

    if (touches.length === 2 && state.startDist > 0) {
      event.preventDefault()
      const dist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y)
      setScale(clamp(state.startScale * (dist / state.startDist), 1, 5))
    } else if (touches.length === 1 && state.panning) {
      event.preventDefault()
      const dx = touches[0].x - state.touches[0].x
      const dy = touches[0].y - state.touches[0].y
      setOffset({ x: state.baseOffset.x + dx, y: state.baseOffset.y + dy })
      touchRef.current = { ...state, touches }
    }
  }, [])

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      const state = touchRef.current
      if (!state) return

      if (state.swiping) {
        const changed = Array.from(event.changedTouches) as Touch[]
        const touch = changed[0]
        if (touch) {
          const dx = touch.clientX - state.startX
          if (Math.abs(dx) > 50) {
            if (dx < 0) goNext()
            else goPrev()
          }
        }
      }

      touchRef.current = null
    },
    [goNext, goPrev]
  )

  if (!opened || items.length === 0) return null
  if (typeof document === 'undefined') return null

  const current = items[safeIndex]
  const prideText = prideFor(safeIndex)

  const content = (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[80] flex flex-col bg-black/95 backdrop-blur-sm"
        initial={reduce ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduce ? { opacity: 1 } : { opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Просмотр фотографий'}
        onWheel={handleWheel}
      >
        {/* Шапка */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
          <div className="min-w-0">
            {title && <span className="block truncate text-sm font-bold">{title}</span>}
            <span className="block text-xs text-white/60">
              {safeIndex + 1} / {items.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={zoomOut}
              className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
              aria-label="Уменьшить"
              disabled={scale <= 1}
            >
              <ZoomOut size={18} />
            </button>
            <button
              type="button"
              onClick={zoomIn}
              className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
              aria-label="Увеличить"
            >
              <ZoomIn size={18} />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
              aria-label="Сбросить зум"
              disabled={scale === 1 && offset.x === 0 && offset.y === 0}
            >
              <RotateCcw size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof document !== 'undefined' && document.fullscreenElement) {
                  document.exitFullscreen?.()
                } else {
                  document.documentElement.requestFullscreen?.()
                }
              }}
              className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
              aria-label="Полный экран"
            >
              <Maximize2 size={18} />
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Основная область просмотра */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden">
          {/* Предыдущее */}
          {items.length > 1 && (
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-3 z-10 rounded-full bg-black/40 p-3 text-white transition hover:bg-black/60"
              aria-label="Предыдущее фото"
            >
              <ChevronLeft size={26} />
            </button>
          )}

          <div
            className="flex max-h-full max-w-full touch-none select-none items-center justify-center"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={() => (scale > 1 ? resetZoom() : setScale(2))}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img
              key={current.src}
              src={current.src}
              alt={current.alt || current.caption || `Фото ${safeIndex + 1}`}
              draggable={false}
              className="max-h-[78vh] max-w-[92vw] object-contain"
              initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reduce ? 0 : 0.18 }}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in',
              }}
            />
          </div>

          {/* Следующее */}
          {items.length > 1 && (
            <button
              type="button"
              onClick={goNext}
              className="absolute right-3 z-10 rounded-full bg-black/40 p-3 text-white transition hover:bg-black/60"
              aria-label="Следующее фото"
            >
              <ChevronRight size={26} />
            </button>
          )}
        </div>

        {/* Подпись + привязка к гордости */}
        <div className="px-4 py-4 text-center text-white">
          <div className="mx-auto max-w-3xl rounded-2xl bg-white/5 px-4 py-3">
            <p className="text-sm font-semibold text-white/90">
              {current.caption || `Фото ${safeIndex + 1} из ${items.length}`}
            </p>
            {prideText && (
              <p className="mt-1 text-sm text-orange-300">
                🔥 Относится к гордости: «{prideText}»
              </p>
            )}
            {!prideText && prideList.length > 0 && (
              <p className="mt-1 text-xs text-white/40">
                Снимок без явной привязки к гордости
              </p>
            )}
            <p className="mt-2 text-[11px] text-white/40">
              Зум: колесо мыши, +/-, двойной клик. Перемещение: перетаскивание. Стрелки: ←/→. Esc — закрыть.
            </p>
          </div>

          {/* Точки-индикаторы */}
          {items.length > 1 && (
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {items.map((item, i) => (
                <button
                  key={item.src + i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === safeIndex ? 'w-6 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Открыть фото ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}

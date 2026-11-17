'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from 'lucide-react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { ViewId } from '@/lib/ogonek/types'
import { TOUR_STEPS, type TourStep } from '@/lib/ogonek/tour-data'

export { TOUR_STEPS, type TourStep }

type TargetRect = {
  x: number
  y: number
  width: number
  height: number
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  soundEnabled?: boolean
  onRequestComposer?: (open: boolean) => void
  onRequestNavigate?: (view: ViewId) => void
  onRequestDrawer?: (open: boolean) => void
}

/**
 * Улыбающийся Priday-маскот (SVG)
 */
function SmilingFlameMascot({ size = 44 }: { size?: number }) {
  return (
    <motion.div
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      className="shrink-0 select-none pointer-events-none drop-shadow-[0_4px_12px_rgba(255,106,26,0.35)]"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="flame-body-grad" x1="24" y1="4" x2="24" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFA439" />
            <stop offset="55%" stopColor="var(--accent, #FF6A1A)" />
            <stop offset="100%" stopColor="#D93800" />
          </linearGradient>
          <radialGradient id="flame-glow-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF275" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FF7A00" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Тело пламени */}
        <path
          d="M24 4C24 4 14 15 14 26C14 34.8 19.5 41 24 41C28.5 41 34 34.8 34 26C34 15 24 4 24 4Z"
          fill="url(#flame-body-grad)"
        />
        {/* Внутреннее свечение */}
        <circle cx="24" cy="27" r="9.5" fill="url(#flame-glow-core)" />
        {/* Глазки */}
        <ellipse cx="20.5" cy="24" rx="2" ry="2.6" fill="#14171A" />
        <ellipse cx="27.5" cy="24" rx="2" ry="2.6" fill="#14171A" />
        {/* Блики в глазах */}
        <circle cx="21.2" cy="23.2" r="0.8" fill="#FFFFFF" />
        <circle cx="28.2" cy="23.2" r="0.8" fill="#FFFFFF" />
        {/* Румяные щёчки */}
        <ellipse cx="17.2" cy="27.5" rx="2.2" ry="1.3" fill="#FF4757" opacity="0.6" />
        <ellipse cx="30.8" cy="27.5" rx="2.2" ry="1.3" fill="#FF4757" opacity="0.6" />
        {/* Улыбка */}
        <path
          d="M21 28.2C21.8 30.6 26.2 30.6 27 28.2"
          stroke="#14171A"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  )
}

export function OnboardingTour({
  isOpen,
  onClose,
  onComplete,
  soundEnabled = true,
  onRequestComposer,
  onRequestNavigate,
  onRequestDrawer,
}: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
  const [measuredBubbleHeight, setMeasuredBubbleHeight] = useState(250)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const currentStep = TOUR_STEPS[stepIndex]
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)

  // Замер фактической высоты пузыря для надёжного позиционирования
  useEffect(() => {
    if (bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect()
      if (rect.height > 0 && Math.abs(rect.height - measuredBubbleHeight) > 2) {
        setMeasuredBubbleHeight(rect.height)
      }
    }
  })

  // Обеспечиваем открытие нужных контейнеров (Composer, Drawer, Home view) для текущего шага
  const syncContainersForStep = useCallback(
    (step: TourStep) => {
      if (step.requiresComposer) {
        onRequestComposer?.(true)
      } else {
        onRequestComposer?.(false)
      }

      if (step.requiredView) {
        onRequestNavigate?.(step.requiredView)
      }

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
      if (isMobile && step.requiresDrawer) {
        onRequestDrawer?.(true)
      } else if (isMobile && !step.requiresDrawer) {
        onRequestDrawer?.(false)
      }
    },
    [onRequestComposer, onRequestNavigate, onRequestDrawer]
  )

  // Замер геометрии целевого элемента с точностью до 4px и ожиданием завершения анимаций
  useEffect(() => {
    if (!isOpen) return
    syncContainersForStep(currentStep)

    let cancelled = false
    let attempts = 0
    let ro: ResizeObserver | null = null

    const updateRect = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) {
        const padding = 4
        setTargetRect({
          x: Math.max(0, r.left - padding),
          y: Math.max(0, r.top - padding),
          width: r.width + padding * 2,
          height: r.height + padding * 2,
        })
      }
    }

    const findVisibleTarget = (): HTMLElement | null => {
      const els = Array.from(
        document.querySelectorAll(`[data-tour="${currentStep.target}"]`)
      ) as HTMLElement[]
      return (
        els.find((e) => {
          const r = e.getBoundingClientRect()
          return r.width > 0 && r.height > 0
        }) ||
        els[0] ||
        null
      )
    }

    const check = () => {
      if (cancelled) return
      const el = findVisibleTarget()
      if (el) {
        updateRect(el)
        if (!ro && typeof ResizeObserver !== 'undefined') {
          ro = new ResizeObserver(() => {
            if (!cancelled) updateRect(el)
          })
          ro.observe(el)
        }
      }

      attempts++
      // Продолжаем периодически калибровать координаты во время завершения анимаций (~450ms)
      if (attempts < 9) {
        setTimeout(check, 50)
      } else if (!el) {
        console.warn(
          `[OnboardingTour] Target "${currentStep.target}" for step ${currentStep.id} (${currentStep.title}) not found on screen. Skipping step.`
        )
        if (stepIndex < TOUR_STEPS.length - 1) {
          setStepIndex((i) => i + 1)
        } else {
          onComplete()
        }
      }
    }

    const timer = setTimeout(check, 40)
    return () => {
      cancelled = true
      clearTimeout(timer)
      if (ro) ro.disconnect()
    }
  }, [isOpen, stepIndex, currentStep, syncContainersForStep, onComplete])

  // Слушаем изменение размеров окна и скролл
  useEffect(() => {
    if (!isOpen) return
    const handleUpdate = () => {
      if (!currentStep) return
      const els = Array.from(
        document.querySelectorAll(`[data-tour="${currentStep.target}"]`)
      ) as HTMLElement[]
      const el =
        els.find((e) => {
          const r = e.getBoundingClientRect()
          return r.width > 0 && r.height > 0
        }) || els[0]
      if (el) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) {
          const padding = 4
          setTargetRect({
            x: Math.max(0, r.left - padding),
            y: Math.max(0, r.top - padding),
            width: r.width + padding * 2,
            height: r.height + padding * 2,
          })
        }
      }
    }
    window.addEventListener('resize', handleUpdate, { passive: true })
    window.addEventListener('scroll', handleUpdate, { passive: true })
    return () => {
      window.removeEventListener('resize', handleUpdate)
      window.removeEventListener('scroll', handleUpdate)
    }
  }, [isOpen, currentStep])

  // Управление клавишами
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playClick(soundEnabled)
        onClose()
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrev()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  if (!isOpen) return null

  const handleNext = () => {
    playClick(soundEnabled)
    if (stepIndex < TOUR_STEPS.length - 1) {
      setStepIndex((i) => i + 1)
    } else {
      playSuccess(soundEnabled)
      onComplete()
    }
  }

  const handlePrev = () => {
    playClick(soundEnabled)
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1)
    }
  }

  const handleSkip = () => {
    playClick(soundEnabled)
    onClose()
  }

  // Расчёт позиции тултипа с защитой от вылезания за пределы экрана
  const winW = typeof window !== 'undefined' ? window.innerWidth : 1210
  const winH = typeof window !== 'undefined' ? window.innerHeight : 756
  const isMobile = winW < 600

  // Ширина пузыря: на десктопе 380px, на мобильном в пределах экрана
  const bubbleWidth = isMobile ? Math.min(366, winW - 24) : 380
  const bubbleHeight = Math.max(measuredBubbleHeight, 250)

  let bubbleX = 12
  let bubbleY = 80
  let arrowPlacement: 'top' | 'bottom' = 'top'

  if (targetRect) {
    // Горизонталь
    if (isMobile) {
      bubbleX = 12
    } else {
      const centerX = targetRect.x + targetRect.width / 2
      bubbleX = Math.max(16, Math.min(winW - bubbleWidth - 16, centerX - bubbleWidth / 2))
    }

    // Вертикаль: если снизу места достаточно, ставим под элементом, иначе над ним
    const spaceBelow = winH - (targetRect.y + targetRect.height)
    if (spaceBelow >= bubbleHeight + 20) {
      bubbleY = targetRect.y + targetRect.height + 14
      arrowPlacement = 'top'
    } else {
      bubbleY = Math.max(12, targetRect.y - bubbleHeight - 14)
      arrowPlacement = 'bottom'
    }

    // Финальный clamp по высоте с учётом реальной высоты (не вылезает за экран)
    bubbleY = Math.max(12, Math.min(winH - bubbleHeight - 16, bubbleY))
  }

  const arrowLeft = targetRect
    ? Math.max(24, Math.min(bubbleWidth - 28, targetRect.x + targetRect.width / 2 - bubbleX))
    : 40

  return (
    <div
      id="onboarding-tour-root"
      data-step={currentStep.id}
      className="fixed inset-0 z-[9990] select-none"
    >
      {/* 1. Затемнение экрана с SVG-маской «прожектора» */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <mask id="tour-spotlight-mask">
            {/* Белый фон = непрозрачная часть маски */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Чёрный вырез = прозрачный прожектор на целевом элементе */}
            {targetRect && (
              <rect
                x={targetRect.x}
                y={targetRect.y}
                width={targetRect.width}
                height={targetRect.height}
                rx={12}
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Тёмная вуаль поверх всего экрана */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.78)"
          mask="url(#tour-spotlight-mask)"
          className="pointer-events-auto"
          onClick={handleNext}
        />
      </svg>

      {/* 2. Рамка подсветки вокруг элемента с акцентным свечением */}
      {targetRect && (
        <motion.div
          id="tour-spotlight-highlight"
          initial={false}
          animate={{
            x: targetRect.x,
            y: targetRect.y,
            width: targetRect.width,
            height: targetRect.height,
          }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed pointer-events-none rounded-xl z-[9992]"
          style={{
            border: '2px solid var(--accent, #FF6A1A)',
            boxShadow:
              '0 0 0 1px rgba(0,0,0,0.5), 0 0 24px rgba(255, 106, 26, 0.45), inset 0 0 12px rgba(255, 106, 26, 0.25)',
          }}
        />
      )}

      {/* 3. Пузырь с текстом, стрелкой и плавно переезжающим маскотом */}
      <motion.div
        ref={bubbleRef}
        id="tour-tooltip-bubble"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{
          opacity: 1,
          scale: 1,
          x: bubbleX,
          y: bubbleY,
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{
          width: bubbleWidth,
          maxWidth: 'calc(100vw - 24px)',
        }}
        className="fixed z-[9995] rounded-3xl p-5 bg-[var(--surface,#16181c)] border border-[var(--border,#2f3336)] shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-[var(--text,#ffffff)] pointer-events-auto backdrop-blur-xl"
        role="dialog"
        aria-labelledby="tour-step-title"
        aria-describedby="tour-step-desc"
      >
        {/* Стрелочка к элементу */}
        {targetRect && (
          <div
            className={`absolute w-3 h-3 bg-[var(--surface,#16181c)] border-t border-l border-[var(--border,#2f3336)] rotate-45 pointer-events-none ${
              arrowPlacement === 'top'
                ? '-top-1.5'
                : '-bottom-1.5 rotate-[225deg]'
            }`}
            style={{ left: `${arrowLeft}px` }}
          />
        )}

        {/* Хедер карточки: Маскот + Шаг + Кнопка «Пропустить» */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5">
            <SmilingFlameMascot size={36} />
            <div>
              <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-[var(--accent,#FF6A1A)]">
                Шаг {currentStep.id} из {TOUR_STEPS.length}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                {TOUR_STEPS.map((s, idx) => (
                  <div
                    key={s.id}
                    className={`h-1 rounded-full transition-all duration-200 ${
                      idx === stepIndex
                        ? 'w-4 bg-[var(--accent,#FF6A1A)]'
                        : idx < stepIndex
                        ? 'w-1.5 bg-[var(--accent,#FF6A1A)]/60'
                        : 'w-1.5 bg-white/15'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            id="tour-skip-btn"
            onClick={handleSkip}
            className="text-[12px] text-[var(--muted,#71767b)] hover:text-[var(--text,#ffffff)] transition-colors px-2 py-1 rounded-full hover:bg-white/5 active:scale-95"
            title="Пропустить обучение"
          >
            Пропустить
          </button>
        </div>

        {/* Заголовок шага */}
        <h3
          id="tour-step-title"
          className="text-[17px] font-bold tracking-tight text-[var(--text,#ffffff)] leading-snug mb-1.5"
        >
          {currentStep.title}
        </h3>

        {/* Текст шага (не режется, ширина строго >= 28 символов) */}
        <p
          id="tour-step-desc"
          className="text-[13px] text-[var(--text-2,#cfd9de)] leading-relaxed mb-4 break-words"
        >
          {currentStep.description}
        </p>

        {/* Кнопки навигации */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--line,#2f3336)]/40">
          <button
            type="button"
            id="tour-prev-btn"
            onClick={handlePrev}
            disabled={stepIndex === 0}
            className="px-3.5 py-1.5 rounded-full text-[13px] font-medium text-[var(--muted,#71767b)] hover:text-[var(--text,#ffffff)] disabled:opacity-30 disabled:pointer-events-none hover:bg-white/5 transition-colors flex items-center gap-1.5 min-h-[34px]"
          >
            <ArrowLeft size={14} /> Назад
          </button>

          <button
            type="button"
            id="tour-next-btn"
            onClick={handleNext}
            className="x-primary-btn px-4 py-1.5 rounded-full text-[13px] font-bold flex items-center gap-1.5 min-h-[34px] shadow-sm hover:opacity-95 active:scale-95 transition-transform"
          >
            {stepIndex === TOUR_STEPS.length - 1 ? (
              <>
                <span>Начать путь!</span>
                <Sparkles size={14} />
              </>
            ) : (
              <>
                <span>Далее</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

'use client'

import { safeImageSrc } from '@/lib/ogonek/safe-url'
import { AlertCircle, Check, Flame, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

export type ToastVariant = 'default' | 'success' | 'error'

type Props = {
  message: string
  variant?: ToastVariant
  durationMs?: number
  toastKey?: string | number
  imageUrl?: string | null
  mediaUrl?: string | null
  onClose?: () => void
  actionLabel?: string
  onAction?: () => void
  id?: string
  actionId?: string
}

const ERROR_PATTERN =
  /ошибк|не удалось|сбой|запрещ|огранич|недоступ|некоррект|превышен|слишком много|error|failed/i
const FLAME_PATTERN = /огон[её]к|стрик|сери[яи]/i

export function inferToastVariant(message: string): ToastVariant {
  if (!message) return 'default'
  return ERROR_PATTERN.test(message) ? 'error' : 'default'
}

export function Toast({
  message,
  variant,
  durationMs,
  toastKey,
  imageUrl,
  mediaUrl,
  onClose,
  actionLabel,
  onAction,
  id,
  actionId,
}: Props) {
  const [dismissed, setDismissed] = useState(false)
  const [paused, setPaused] = useState(false)

  const resolvedVariant: ToastVariant = variant ?? inferToastVariant(message)
  const isError = resolvedVariant === 'error'
  const minDuration = isError ? 6000 : 4500
  const totalDurationMs = Math.max(minDuration, durationMs ?? minDuration)
  const resolvedImageUrl = safeImageSrc(imageUrl || mediaUrl)

  const remainingRef = useRef<number>(totalDurationMs)
  const lastTickRef = useRef<number>(0)
  const barRef = useRef<HTMLDivElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!message) return
    setDismissed(false)
    setPaused(false)
    remainingRef.current = totalDurationMs
    lastTickRef.current = performance.now()
    if (barRef.current) {
      barRef.current.style.transform = 'scaleX(1)'
    }
  }, [message, toastKey, totalDurationMs])

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    onCloseRef.current?.()
  }, [])

  useEffect(() => {
    if (!message || dismissed) return

    let rafId = 0
    lastTickRef.current = performance.now()

    const tick = (now: number) => {
      const dt = Math.max(0, now - lastTickRef.current)
      lastTickRef.current = now

      if (!paused) {
        remainingRef.current = Math.max(0, remainingRef.current - dt)
      }

      const ratio =
        totalDurationMs > 0
          ? Math.max(0, Math.min(1, remainingRef.current / totalDurationMs))
          : 0
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${ratio})`
      }

      if (remainingRef.current <= 0) {
        setDismissed(true)
        onCloseRef.current?.()
        return
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [message, dismissed, paused, toastKey, totalDurationMs])

  if (!message || dismissed) return null

  const useFlameIcon = !isError && FLAME_PATTERN.test(message)

  return (
    <div
      className="fixed bottom-6 max-sm:bottom-[calc(56px+env(safe-area-inset-bottom)+14px)] left-1/2 -translate-x-1/2 z-[90] flex flex-col-reverse items-end pointer-events-none w-auto max-w-[min(92vw,440px)]"
    >
      <div
        id={id}
        role={isError ? 'alert' : 'status'}
        aria-live={isError ? 'assertive' : 'polite'}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className={`toast-winlog pointer-events-auto w-full overflow-hidden rounded-2xl bg-[#0a0a0c]/95 backdrop-blur-xl text-white shadow-[0_20px_60px_rgba(0,0,0,0.9)] select-none transition-all ${
          isError ? 'border border-red-500/40' : 'border border-white/[0.14]'
        }`}
      >
        {resolvedImageUrl && (
          <div className="px-3.5 pt-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolvedImageUrl}
              alt=""
              className="rounded-xl object-cover max-h-44 w-full border border-white/[0.08]"
            />
          </div>
        )}

        <div className="flex items-start gap-3 px-3.5 py-3 pr-2.5">
          <span
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border ${
              isError
                ? 'border-red-500/30 bg-red-500/15 text-red-400'
                : 'border-[#d76737]/30 bg-[#d76737]/15 text-[#d76737]'
            }`}
            aria-hidden="true"
          >
            {isError ? (
              <AlertCircle size={15} strokeWidth={2.2} />
            ) : useFlameIcon ? (
              <Flame size={15} strokeWidth={2.2} />
            ) : (
              <Check size={15} strokeWidth={2.4} />
            )}
          </span>

          <span className="flex-1 min-w-0 text-[13px] font-medium leading-snug text-white/95 whitespace-pre-wrap break-words">
            {message}
          </span>

          {actionLabel && onAction && (
            <button
              type="button"
              id={actionId}
              onClick={() => {
                onAction()
                handleDismiss()
              }}
              className="shrink-0 rounded-lg border border-white/[0.12] bg-white/[0.06] px-2.5 py-1 text-[12px] font-semibold text-[#d76737] hover:bg-white/[0.12] transition-colors cursor-pointer"
            >
              {actionLabel}
            </button>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Закрыть уведомление"
            className="ml-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/50 hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Живая 2px полоса таймера снизу (замирает при наведении курсора) */}
        <div className="h-[2px] w-full bg-white/[0.06]">
          <div
            ref={barRef}
            className={`h-full w-full origin-left ${isError ? 'bg-red-500' : 'bg-[#d76737]'}`}
            style={{ transform: 'scaleX(1)' }}
          />
        </div>
      </div>
    </div>
  )
}

'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useBodyScrollLock } from '@/lib/ogonek/use-body-scroll-lock'
import { resolvePhotoUrl } from '@/lib/ogonek/photos'
import {
  Sparkles,
  Pencil,
  Share2,
  Shield,
  Trash2,
  AlertTriangle,
  X,
  Loader2,
} from 'lucide-react'
import { VisibilitySwitcher } from './visibility-switcher'
import { normalizeVisibility, visibilityMeta } from '@/lib/ogonek/visibility'
import { playClick } from '@/lib/ogonek/sound'
import type { Day, VisibilityLevel } from '@/lib/ogonek/types'
import { useOgonekStore, syncDayToSupabase } from '@/lib/ogonek/use-ogonek-store'

export type DayOptionsModalProps = {
  isOpen: boolean
  day: Day
  onClose: () => void
  onEdit?: (day: Day) => void
  onShare?: (day: Day) => void
  onAiEvaluate?: (day: Day) => void
  onNotify?: (msg: string) => void
  soundEnabled?: boolean
}

export function DayOptionsModal({
  isOpen,
  day,
  onClose,
  onEdit,
  onShare,
  onAiEvaluate,
  onNotify,
  soundEnabled = true,
}: DayOptionsModalProps) {
  useBodyScrollLock(isOpen)
  const {
    state,
    setDayVisibility,
    setAllPridesVisibility,
    deleteDay,
    updateDay,
  } = useOgonekStore()

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  const handleAiEvaluate = async () => {
    playClick(soundEnabled)
    setIsEvaluating(true)
    onNotify?.('⚡ Gemini анализирует масштаб побед...')

    const prides = (day.prides || [])
      .map((p) => p.text)
      .filter((t): t is string => Boolean(t && t !== '—'))
    const gratitudes = (day.gratitudes || [])
      .map((g) => (typeof g === 'string' ? g : g.text))
      .filter((t): t is string => Boolean(t && t !== '—'))

    if (prides.length === 0 && gratitudes.length === 0) {
      setIsEvaluating(false)
      onNotify?.('Нет записей для оценки в этом дне')
      return
    }

    const startTime = Date.now()

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prides, gratitudes, dayId: day.id }),
      })

      const elapsed = Date.now() - startTime
      if (elapsed < 1600) {
        await new Promise((r) => setTimeout(r, 1600 - elapsed))
      }

      const data = await res.json().catch(() => ({}))

      if (!res.ok || data.success === false) {
        throw new Error(data.error || `Ошибка сервера (${res.status})`)
      }

      const score = typeof data.score === 'number' ? data.score : 8
      const updatedDay: Day = {
        ...day,
        prides: (day.prides || []).map((p, idx) => {
          const itemScore = data.prideEvaluations?.[idx]?.score ?? score
          return { ...p, scale: Math.max(1, Math.min(10, Math.round(itemScore))) }
        }),
        aiScore: score,
        aiVerdict: data.verdict,
        aiBreakdown: data.breakdown,
      }

      updateDay(updatedDay)
      await syncDayToSupabase(updatedDay).catch((err) => {
        console.warn('Supabase syncDayToSupabase background error:', err)
      })

      onNotify?.(`⚡ Gemini оценил день #${day.id}: ${score.toFixed(1)}/10 ★ — ${data.verdict || 'Отличный результат!'}`)
      onAiEvaluate?.(updatedDay)
      onClose()
    } catch (err: any) {
      console.error('Gemini evaluation error:', err)
      onNotify?.(`❌ Ошибка Gemini: ${err.message || 'Не удалось оценить'}`)
    } finally {
      setIsEvaluating(false)
    }
  }

  const photoCandidate =
    (day as any)?.media_url ||
    (day as any)?.mediaUrl ||
    (day as any)?.item?.media_url ||
    (Array.isArray(day?.photos) && day.photos.length > 0 ? day.photos[0] : null) ||
    (Array.isArray(day?.prides)
      ? (day.prides.find((p: any) => p?.media_url || p?.photos?.[0]) as any)?.media_url ||
        (day.prides.find((p: any) => p?.photos?.[0]) as any)?.photos?.[0]
      : null)

  useEffect(() => {
    if (photoCandidate) {
      let cancelled = false
      resolvePhotoUrl(photoCandidate).then((url) => {
        if (!cancelled && url) setPhotoUrl(url)
      })
      return () => {
        cancelled = true
      }
    } else {
      setPhotoUrl(null)
    }
  }, [photoCandidate])

  if (!isOpen) return null

  const dayVisibility = normalizeVisibility(day.visibility)

  const handleDeleteConfirm = async () => {
    playClick(soundEnabled)
    setIsDeleting(true)
    try {
      await deleteDay(day.id)
      onNotify?.(`День #${day.id} удалён из летописи`)
      setConfirmDeleteOpen(false)
      onClose()
    } catch (e) {
      console.error('Failed to delete day:', e)
      onNotify?.('Ошибка при удалении дня')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {/* Главное меню опций дня */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-sm rounded-3xl p-5 shadow-2xl flex flex-col gap-4"
          style={{ background: '#16181c', border: '1px solid #2f3336' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid #2f3336' }}>
            <h3 className="font-bold text-[var(--text)] text-base">
              Опции дня #{day.id}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-[var(--text-2)] hover:text-[var(--text)] p-1 rounded-full"
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>
          </div>

          {photoUrl && (
            <div className="relative w-full max-h-[350px] my-1 rounded-2xl overflow-hidden bg-black/50 border border-[#2f3336] flex items-center justify-center">
              <img
                src={photoUrl}
                className="max-h-[350px] w-auto object-contain rounded-xl"
                alt="Фото дня"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            {isEvaluating ? (
              <div className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Loader2 size={16} className="animate-spin text-amber-500 shrink-0" />
                <span className="text-sm font-medium">⚡ Gemini анализирует масштаб побед...</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAiEvaluate}
                className="flex items-center gap-3 w-full p-2.5 rounded-xl text-left text-sm font-medium text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <Sparkles size={16} className="text-amber-500" />
                <span>Оценить с ИИ</span>
              </button>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  playClick(soundEnabled)
                  onClose()
                  onEdit(day)
                }}
                className="flex items-center gap-3 w-full p-2.5 rounded-xl text-left text-sm font-medium text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <Pencil size={16} className="text-[var(--accent)]" />
                <span>Редактировать день</span>
              </button>
            )}

            {onShare && (
              <button
                type="button"
                onClick={() => {
                  playClick(soundEnabled)
                  onClose()
                  onShare(day)
                }}
                className="flex items-center gap-3 w-full p-2.5 rounded-xl text-left text-sm font-medium text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <Share2 size={16} className="text-emerald-500" />
                <span>Экспорт карточки (SVG / PNG)</span>
              </button>
            )}

            {/* Пункт «Удалить этот день» с красной иконкой */}
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                setConfirmDeleteOpen(true)
              }}
              className="flex items-center gap-3 w-full p-2.5 rounded-xl text-left text-sm font-medium text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 size={16} className="text-rose-500" />
              <span className="font-semibold">Удалить этот день</span>
            </button>
          </div>

          {/* Блок приватности дня */}
          <div className="p-3 rounded-2xl flex flex-col gap-2" style={{ background: '#0d0e10', border: '1px solid #2f3336' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-2)] flex items-center gap-1.5">
                <Shield size={13} className="text-[#FF5C00]" /> Приватность дня
              </span>
              <span
                className="text-xs font-bold"
                style={{ color: visibilityMeta(dayVisibility).color }}
              >
                {visibilityMeta(dayVisibility).shortLabel}
              </span>
            </div>
            <div className="pt-1">
              <VisibilitySwitcher
                value={dayVisibility}
                onChange={(level) => {
                  setDayVisibility(day.id, level)
                  onNotify?.(`Приватность дня: ${visibilityMeta(level).shortLabel}`)
                }}
                soundEnabled={soundEnabled}
              />
            </div>
            <button
              type="button"
              className="mt-1 text-xs text-[var(--text-3)] hover:text-[var(--text)] underline text-left"
              onClick={() => {
                playClick(soundEnabled)
                setAllPridesVisibility(day.id, dayVisibility)
                onNotify?.('Приватность применена ко всем гордостям')
                onClose()
              }}
            >
              Применить ко всем гордостям дня
            </button>
            <button
              type="button"
              className="mt-1 text-xs text-rose-400 hover:text-rose-300 underline text-left"
              onClick={async () => {
                playClick(soundEnabled)
                const { getSupabase } = await import('@/lib/ogonek/supabase-client')
                const supabase = getSupabase()
                if (supabase && state.auth?.activeAccountId) {
                  await supabase
                    .from('days')
                    .update({ visibility: dayVisibility })
                    .eq('user_id', state.auth.activeAccountId)
                }
                for (const d of state.days ?? []) {
                  setDayVisibility(d.id, dayVisibility)
                }
                onNotify?.(`Приватность "${visibilityMeta(dayVisibility).shortLabel}" применена ко всем дням`)
                onClose()
              }}
            >
              Применить ко всем дням
            </button>
          </div>
        </motion.div>
      </div>

      {/* Стильная модалка подтверждения удаления */}
      {confirmDeleteOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => !isDeleting && setConfirmDeleteOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col gap-4 border border-[#2f3336] bg-[#16181c] text-center items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>

            <div className="flex flex-col gap-1.5">
              <h4 className="text-lg font-bold text-[var(--text)] leading-snug">
                Удалить День #{day.id} из летописи?
              </h4>
              <p className="text-sm text-[var(--text-2)] leading-relaxed">
                Это действие нельзя отменить. Записи гордостей, благодарностей и прогресс стрика будут обновлены.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full mt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setConfirmDeleteOpen(false)}
                className="flex-1 py-2.5 rounded-full border border-[var(--border)] text-sm font-semibold text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <Trash2 size={16} />
                <span>{isDeleting ? 'Удаление…' : 'Удалить'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}

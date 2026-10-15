'use client'

import { BookmarkCheck, CalendarDays, Check, Flame, Heart, ImagePlus, ListPlus, Loader2, Mic, Send, Shield, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { createPortal } from 'react-dom'
import { evaluatePridesHeuristic, type PrideEvaluation } from '@/lib/ogonek/evaluate-heuristic'
import { savePhoto } from '@/lib/ogonek/photos'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { ComposerDraft, ComposerPayload, Day, Mode, OvercomeLevel, VisibilityLevel } from '@/lib/ogonek/types'
import { usePhotoUrl } from '@/lib/ogonek/use-photo-url'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { normalizeVisibility } from '@/lib/ogonek/visibility'
import { ModalShell } from './modal-shell'
import { PublishPrideStoryModal } from './publish-pride-story-modal'
import { Tooltip } from './tooltip'
import { VisibilitySwitcher } from './visibility-switcher'

type Props = {
  initialDraft?: ComposerDraft | null
  editingDay?: Day | null
  /** Next new day id (for display in title) */
  nextDayId?: number
  /** Next new day date ISO string (auto-populated from last day + 1) */
  nextDayDateISO?: string
  onSaveDraft?: (draft: ComposerDraft) => void
  onClearDraft?: () => void
  onClose: () => void
  onSaved: (payload: ComposerPayload, editingDayId?: number, dateISO?: string) => void
  soundEnabled?: boolean
  /** Уведомление пользователя (тосты) — для публикации в Сторис */
  onNotify?: (message: string) => void
}

export function Composer({
  initialDraft,
  editingDay,
  nextDayId,
  nextDayDateISO,
  onSaveDraft,
  onClearDraft,
  onClose,
  onSaved,
  soundEnabled = true,
  onNotify,
}: Props) {
  const [tab, setTab] = useState<Mode>(() => initialDraft?.tab || 'pride')
  const [extra, setExtra] = useState(() => {
    if (editingDay) {
      return (editingDay.prides?.length || 0) > 5 || (editingDay.gratitudes?.length || 0) > 5
    }
    return initialDraft?.extra || false
  })
  const [recording, setRecording] = useState<number | null>(null)
  const [prides, setPrides] = useState<string[]>(() => {
    if (editingDay && Array.isArray(editingDay.prides)) {
      const texts = editingDay.prides.map((p) => (p.text === '—' ? '' : p.text))
      while (texts.length < 6) texts.push('')
      return texts
    }
    return initialDraft?.prides || ['', '', '', '', '', '']
  })
  const [gratitudes, setGratitudes] = useState<string[]>(() => {
    if (editingDay && Array.isArray(editingDay.gratitudes)) {
      const texts = editingDay.gratitudes.map((g) => {
        const text = typeof g === 'string' ? g : g.text
        return text === '—' ? '' : text
      })
      while (texts.length < 6) texts.push('')
      return texts
    }
    return initialDraft?.gratitudes || ['', '', '', '', '', '']
  })
  const [preview, setPreview] = useState<string | null>(() => {
    if (editingDay && editingDay.photos && editingDay.photos.length > 0) {
      return editingDay.photos[0]
    }
    return initialDraft?.photo || null
  })
  const [photoId, setPhotoId] = useState<string | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evaluations, setEvaluations] = useState<Record<number, PrideEvaluation>>(() => {
    if (editingDay && Array.isArray(editingDay.prides)) {
      const evMap: Record<number, PrideEvaluation> = {}
      editingDay.prides.forEach((p, idx) => {
        evMap[idx] = {
          scale: typeof p.scale === 'number' ? p.scale : 7,
          overcome: typeof p.overcome === 'number' ? p.overcome : 0,
          tags: [],
          verdict: 'Оригинальная оценка дня',
        }
      })
      return evMap
    }
    return {}
  })
  const [isPublishing, setIsPublishing] = useState(false)
  // Whether pride ratings are still default/missing → need auto AI evaluation on publish
  const [ratingsAreDefault, setRatingsAreDefault] = useState<boolean>(() => {
    if (editingDay && Array.isArray(editingDay.prides)) {
      const filled = editingDay.prides.filter((p) => p.text && p.text !== '—')
      if (filled.length === 0) return true
      return filled.every((p) => p.scale === 8 && p.overcome === 1)
    }
    return true
  })

  // ── ЭТАП 9: приватность дня и каждой гордости отдельно ──────────────────
  const { postMyStory, state: storeState } = useOgonekStore()
  const myAvatarSrc = usePhotoUrl(storeState.profile.avatarImage)

  /** Приватность всего дня */
  const [dayVisibility, setDayVisibility] = useState<VisibilityLevel>(() => {
    if (editingDay?.visibility) return normalizeVisibility(editingDay.visibility)
    if (initialDraft?.visibility) return normalizeVisibility(initialDraft.visibility)
    return 'public'
  })

  /** Приватность каждой гордости по её индексу в форме (0..5) */
  const [prideVis, setPrideVis] = useState<Record<number, VisibilityLevel>>(() => {
    if (editingDay && Array.isArray(editingDay.prides)) {
      const map: Record<number, VisibilityLevel> = {}
      editingDay.prides.forEach((p, idx) => {
        map[idx] = normalizeVisibility(p.visibility ?? editingDay.visibility)
      })
      return map
    }
    return initialDraft?.prideVisibilities ?? {}
  })

  /** Индекс гордости, для которой открыт мастер публикации в Сторис */
  const [storyModalIndex, setStoryModalIndex] = useState<number | null>(null)

  // Date picker for new days (editable by user)
  const [dateISO, setDateISO] = useState<string>(() => {
    if (editingDay?.dateISO) return editingDay.dateISO
    if (nextDayDateISO) return nextDayDateISO
    return new Date().toISOString()
  })

  // Sync nextDayDateISO if it changes after mount (hydration)
  useEffect(() => {
    if (!editingDay && nextDayDateISO && !initialDraft) {
      setDateISO(nextDayDateISO)
    }
  }, [nextDayDateISO, editingDay, initialDraft])

  const previewRef = useRef<string | null>(preview)

  useEffect(() => {
    return () => {
      if (previewRef.current && previewRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(previewRef.current)
      }
    }
  }, [])

  // Auto-save draft in real time (only when creating a new day, not editing an archived day)
  useEffect(() => {
    if (editingDay || !onSaveDraft) return
    const hasAnyContent =
      prides.some((p) => p.trim().length > 0) ||
      gratitudes.some((g) => g.trim().length > 0) ||
      Boolean(preview)

    if (hasAnyContent) {
      onSaveDraft({
        prides,
        gratitudes,
        photo: preview,
        tab,
        extra,
        lastSavedISO: new Date().toISOString(),
        visibility: dayVisibility,
        prideVisibilities: prideVis,
      })
    }
  }, [prides, gratitudes, preview, tab, extra, onSaveDraft, editingDay, dayVisibility, prideVis])

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (previewRef.current && previewRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(previewRef.current)
      }
      const url = URL.createObjectURL(file)
      previewRef.current = url
      setPreview(url)

      try {
        const id = await savePhoto(file)
        setPhotoId(id)
        // Update preview with the saved photo id so it persists
        setPreview(id)
        previewRef.current = id
      } catch {
        // Fallback to transient blob url
      }
    }
  }

  const handleInputChange = (index: number, val: string) => {
    if (tab === 'pride') {
      setPrides((prev) => prev.map((item, i) => (i === index ? val : item)))
    } else {
      setGratitudes((prev) => prev.map((item, i) => (i === index ? val : item)))
    }
  }

  const currentValues = tab === 'pride' ? prides : gratitudes
  const visibleValues = currentValues.slice(0, extra ? 6 : 5)

  const filledPrides = prides.filter((p) => p.trim().length > 0)
  const filledGratitudes = gratitudes.filter((g) => g.trim().length > 0)
  const totalFilled = filledPrides.length + filledGratitudes.length

  // Validation: require at least 5 pride entries to publish
  const canPublish = filledPrides.length >= 5
  // Can save as draft with any content
  const canDraft = totalFilled > 0

  /**
   * Requests evaluations from /api/evaluate (Gemini).
   * Never throws: on offline / missing key / any error it silently falls back
   * to the local heuristic, so the caller can always save the day.
   */
  const computeEvaluations = async (): Promise<Record<number, PrideEvaluation>> => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

    let evList: PrideEvaluation[]
    if (!isOnline) {
      evList = evaluatePridesHeuristic(filledPrides)
    } else {
      try {
        const res = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: filledPrides }),
        })
        if (res.ok) {
          const data = (await res.json()) as { evaluations?: PrideEvaluation[] }
          evList =
            data.evaluations && data.evaluations.length > 0
              ? data.evaluations
              : evaluatePridesHeuristic(filledPrides)
        } else {
          evList = evaluatePridesHeuristic(filledPrides)
        }
      } catch {
        // Offline, timeout or server error → local heuristic, no error surfaced
        evList = evaluatePridesHeuristic(filledPrides)
      }
    }

    // Map evaluations back to original pride indices (for display)
    const nextEvalMap: Record<number, PrideEvaluation> = {}
    let filledIdx = 0
    prides.forEach((p, origIdx) => {
      if (p.trim().length > 0 && evList[filledIdx]) {
        nextEvalMap[origIdx] = evList[filledIdx]
        filledIdx++
      }
    })
    return nextEvalMap
  }

  const handleEvaluateAi = async () => {
    if (filledPrides.length === 0 || isEvaluating) return

    playClick(soundEnabled)
    setIsEvaluating(true)

    try {
      const nextEvalMap = await computeEvaluations()
      setEvaluations(nextEvalMap)
      setRatingsAreDefault(false)
      playSuccess(soundEnabled)
    } finally {
      setIsEvaluating(false)
    }
  }

  const buildPayload = (
    evalMap: Record<number, PrideEvaluation> = evaluations
  ): ComposerPayload => {
    // Ratings must be keyed by the compacted index (payload.prides has blanks removed)
    const ratings: Record<number, { scale: number; overcome: OvercomeLevel }> = {}
    let filledIdx = 0
    prides.forEach((p, origIdx) => {
      if (p.trim().length === 0) return
      const ev = evalMap[origIdx]
      if (ev) {
        ratings[filledIdx] = {
          scale: ev.scale,
          overcome: (Math.min(3, Math.max(0, ev.overcome)) as OvercomeLevel) || 0,
        }
      }
      filledIdx++
    })

    const prideVisibilities: Record<number, VisibilityLevel> = {}
    let visIdx = 0
    prides.forEach((p, origIdx) => {
      if (p.trim().length === 0) return
      prideVisibilities[visIdx] = normalizeVisibility(prideVis[origIdx] ?? dayVisibility)
      visIdx++
    })

    return {
      prides: filledPrides,
      gratitudes: filledGratitudes,
      photo: photoId || preview,
      ratings,
      visibility: dayVisibility,
      prideVisibilities,
    }
  }

  const handleSaveDraft = () => {
    if (!canDraft) return
    playClick(soundEnabled)
    onSaveDraft?.({
      prides,
      gratitudes,
      photo: preview,
      tab,
      extra,
      lastSavedISO: new Date().toISOString(),
      visibility: dayVisibility,
      prideVisibilities: prideVis,
    })
    onClose()
  }

  const handlePublish = async () => {
    const publishEnabled = editingDay ? totalFilled > 0 : canPublish
    if (!publishEnabled || isPublishing || isEvaluating) return

    // Auto AI evaluation: if prides are unrated or still hold default scores,
    // evaluate silently in the background, then save the day with real scores.
    if (filledPrides.length > 0 && ratingsAreDefault) {
      setIsPublishing(true)
      try {
        const evMap = await computeEvaluations()
        setEvaluations(evMap)
        setRatingsAreDefault(false)
        playSuccess(soundEnabled)
        onSaved(buildPayload(evMap), editingDay?.id, editingDay ? undefined : dateISO)
        if (!editingDay) {
          onClearDraft?.()
        }
      } finally {
        setIsPublishing(false)
      }
      return
    }

    playSuccess(soundEnabled)
    onSaved(buildPayload(), editingDay?.id, editingDay ? undefined : dateISO)
    if (!editingDay) {
      onClearDraft?.()
    }
  }

  // Format date for the date input (yyyy-MM-dd)
  const dateValue = dateISO ? dateISO.slice(0, 10) : new Date().toISOString().slice(0, 10)

  const displayDayId = editingDay?.id ?? nextDayId

  const storyDayLabel = (() => {
    const iso = editingDay?.dateISO || dateISO
    if (!iso) return undefined
    const d = new Date(iso)
    if (!Number.isFinite(d.getTime())) return undefined
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  })()

  return (
    <ModalShell
      title={editingDay ? `Редактировать День #${editingDay.id}` : `Записать День #${displayDayId ?? '?'}`}
      onClose={onClose}
      closeOnEscape={storyModalIndex === null}
    >
      <p className="text-[13px] leading-[18px] text-[#71767b]">
        {editingDay
          ? `День #${editingDay.id} · редактируй формулировки и оценки дня.`
          : `День #${displayDayId ?? '?'} · добавь факты, которые хочется помнить.`}
      </p>

      {/* Date picker — only for new days */}
      {!editingDay && (
        <div className="mb-4 mt-3 flex items-center gap-2">
          <CalendarDays size={15} className="flex-none text-[#71767b]" />
          <label className="flex-none text-xs text-[#71767b]">Дата дня:</label>
          <input
            type="date"
            value={dateValue}
            onChange={(e) => {
              if (e.target.value) {
                setDateISO(new Date(e.target.value).toISOString())
              }
            }}
            className="cursor-pointer rounded-md border border-zinc-800/80 bg-black px-2 py-1 text-xs text-[#e7e9ea] [color-scheme:dark]"
            aria-label="Дата записи дня"
          />
        </div>
      )}

      {/* Segmented tab switcher */}
      <div
        className="mt-4 flex rounded-full border border-zinc-800/80 bg-black p-1"
        role="tablist"
        aria-label="Разделы записи"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'pride'}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[13px] font-bold transition-colors duration-150 ${
            tab === 'pride' ? 'bg-[#202327] text-[#ffad5a]' : 'text-[#71767b] hover:text-[#e7e9ea]'
          }`}
          onClick={() => {
            playClick(soundEnabled)
            setTab('pride')
          }}
        >
          <Flame size={14} /> Гордости
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'gratitude'}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[13px] font-bold transition-colors duration-150 ${
            tab === 'gratitude' ? 'bg-[#202327] text-[#ff73ab]' : 'text-[#71767b] hover:text-[#e7e9ea]'
          }`}
          onClick={() => {
            playClick(soundEnabled)
            setTab('gratitude')
          }}
        >
          <Heart size={14} /> Благодарности
        </button>
      </div>

      {/* ЭТАП 9 — Приватность всего дня */}
      <div className="mt-3 rounded-2xl border border-zinc-800/80 bg-white/[0.02] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="flex items-center gap-1.5 text-[13px] font-bold text-[#e7e9ea]">
              <Shield size={14} className="text-[#ff8a50]" /> Приватность дня
            </span>
            <span className="mt-0.5 block text-[11px] leading-[14px] text-[#71767b]">
              Кто увидит день и по умолчанию — каждую гордость
            </span>
          </div>
          <VisibilitySwitcher
            value={dayVisibility}
            onChange={setDayVisibility}
            soundEnabled={soundEnabled}
          />
        </div>
        {tab === 'pride' && (
          <button
            type="button"
            className="mt-2.5 flex items-center gap-1.5 text-[12px] font-bold text-[#1d9bf0] transition-colors hover:underline"
            onClick={() => {
              playClick(soundEnabled)
              setPrideVis(() => {
                const next: Record<number, VisibilityLevel> = {}
                prides.forEach((_, i) => {
                  next[i] = dayVisibility
                })
                return next
              })
            }}
          >
            <Check size={13} /> Применить ко всем гордостям дня
          </button>
        )}
      </div>

      {/* Fields — numbered rows with hairline dividers */}
      <div className="mt-1 flex flex-col">
        {visibleValues.map((val, i) => {
          const ev = tab === 'pride' ? evaluations[i] : null

          return (
            <div key={`${tab}-${i}`}>
              <div className="flex items-center gap-3 border-b border-zinc-800/80">
                <span
                  className={`w-5 flex-none text-center text-[13px] font-bold ${
                    tab === 'pride' ? 'text-[#ffad5a]' : 'text-[#ff73ab]'
                  }`}
                >
                  {i + 1}
                </span>
                <input
                  value={val}
                  onChange={(e) => handleInputChange(i, e.target.value)}
                  placeholder={
                    tab === 'pride'
                      ? 'Что сегодня получилось?'
                      : 'За что благодарен сегодня?'
                  }
                  aria-label={`Пункт ${i + 1} в разделе ${
                    tab === 'pride' ? 'Гордости' : 'Благодарности'
                  }`}
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] leading-[23px] text-[#e7e9ea] placeholder:text-[#71767b] focus:outline-none"
                />
                <button
                  type="button"
                  className={`grid h-8 w-8 flex-none place-items-center rounded-full transition-colors duration-150 ${
                    recording === i
                      ? 'animate-pulse bg-[#ff6b35]/15 text-[#ff6b35]'
                      : 'text-[#71767b] hover:bg-white/[0.08] hover:text-[#e7e9ea]'
                  }`}
                  onClick={() => {
                    playClick(soundEnabled)
                    setRecording(recording === i ? null : i)
                  }}
                  aria-label={`Записать голос для пункта ${i + 1}`}
                >
                  <Mic size={17} />
                </button>
              </div>

              {ev && (
                <div className="flex items-center justify-between pt-1.5 text-xs text-[#71767b]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-orange-400">Оценка: {ev.scale}/10</span>
                    <span>·</span>
                    <span className="font-semibold text-amber-400">Преодоление: {ev.overcome}/3</span>
                    <span>·</span>
                    <span className="max-w-[200px] truncate italic" title={ev.verdict}>
                      «{ev.verdict}»
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-[#71767b]">Балл:</span>
                    <select
                      value={ev.scale}
                      onChange={(e) => {
                        const newScale = parseInt(e.target.value, 10)
                        setRatingsAreDefault(false)
                        setEvaluations((prev) => ({
                          ...prev,
                          [i]: {
                            scale: newScale,
                            overcome: prev[i]?.overcome ?? 0,
                            tags: prev[i]?.tags ?? [],
                            verdict: 'Изменено пользователем',
                          },
                        }))
                      }}
                      className="cursor-pointer rounded-md border border-zinc-800/80 bg-black px-1.5 py-0.5 text-xs text-[#e7e9ea]"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <option key={num} value={num}>
                          {num}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {tab === 'pride' && (
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 pl-8 pr-1">
                  <VisibilitySwitcher
                    size="sm"
                    value={normalizeVisibility(prideVis[i] ?? dayVisibility)}
                    onChange={(level) => setPrideVis((prev) => ({ ...prev, [i]: level }))}
                    soundEnabled={soundEnabled}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#71767b]">
                      гордость #{i + 1}
                    </span>
                    <Tooltip content="Опубликовать эту гордость в Сторис" side="top">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 rounded-full border border-zinc-800/80 px-2.5 py-1 text-[11px] font-bold text-[#e7e9ea] transition-colors duration-150 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => {
                          playClick(soundEnabled)
                          setStoryModalIndex(i)
                        }}
                        disabled={!val.trim()}
                      >
                        <Send size={12} className="text-[#ff6b35]" />
                        В Сторис
                      </button>
                    </Tooltip>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!extra && (
        <button
          type="button"
          className="mt-3 flex items-center gap-1.5 text-[13px] font-bold text-[#1d9bf0] transition-colors hover:underline"
          onClick={() => {
            playClick(soundEnabled)
            setExtra(true)
          }}
        >
          <ListPlus size={16} /> Добавить 6-й пункт
        </button>
      )}

      {/* Validation hint */}
      {!editingDay && filledPrides.length < 5 && filledPrides.length > 0 && (
        <p className="mt-2 pl-1 text-xs text-amber-500">
          ⚠ Заполните минимум 5 гордостей для публикации ({filledPrides.length}/5)
        </p>
      )}

      <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-800/80 px-4 py-3 transition-colors duration-150 hover:bg-white/[0.03]">
        <ImagePlus size={22} className="flex-none text-[#1d9bf0]" />
        <div className="min-w-0">
          <b className="block text-[14px] font-bold text-[#e7e9ea]">
            {preview ? 'Фото добавлено ✓' : 'Добавить воспоминания'}
          </b>
          <small className="mt-0.5 block text-[12px] text-[#71767b]">
            Перетащи фото или выбери файл
          </small>
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Загрузить фото воспоминания"
        />
      </label>

      {preview && (
        <div className="relative mt-2">
          <img
            className="w-full rounded-2xl object-cover"
            style={{ maxHeight: 240, objectFit: 'cover' }}
            src={preview.startsWith('photo_') ? undefined : preview}
            alt="Предпросмотр загруженной фотографии"
          />
          <button
            type="button"
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
            onClick={() => {
              setPreview(null)
              setPhotoId(null)
              previewRef.current = null
            }}
            aria-label="Удалить фото"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <footer className="mt-5 flex items-center justify-between gap-3 border-t border-zinc-800/80 pt-4">
        <div className="flex items-center gap-2">
          {tab === 'pride' && filledPrides.length > 0 && (
            <Tooltip content="Оценить масштаб и преодоление через AI или эвристику" side="top">
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-full border border-zinc-800/80 px-3 py-1.5 text-xs font-bold text-[#e7e9ea] transition-colors duration-150 hover:bg-white/[0.06] disabled:opacity-50"
                onClick={handleEvaluateAi}
                disabled={isEvaluating || isPublishing}
              >
                {isEvaluating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} className="text-yellow-400" />
                )}
                <span>{isEvaluating ? 'Оцениваем...' : '⚡ Оценить через AI'}</span>
              </button>
            </Tooltip>
          )}
          <span className="text-[12px] text-[#71767b]">
            {totalFilled} {totalFilled === 1 ? 'запись' : totalFilled < 5 ? 'записи' : 'записей'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Save as draft button */}
          {!editingDay && canDraft && (
            <Tooltip content="Сохранить черновик и продолжить позже" side="top">
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-full border border-zinc-800/80 px-3 py-1.5 text-xs font-bold text-[#e7e9ea] transition-colors duration-150 hover:bg-white/[0.06]"
                onClick={handleSaveDraft}
              >
                <BookmarkCheck size={14} className="text-blue-400" />
                <span>Черновик</span>
              </button>
            </Tooltip>
          )}

          {/* Publish button */}
          <Tooltip
            content={
              !canPublish && !editingDay
                ? 'Заполните минимум 5 гордостей'
                : editingDay
                  ? 'Сохранить изменения'
                  : 'Опубликовать день'
            }
            side="top"
          >
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full bg-[#1d9bf0] px-5 py-2 text-[15px] font-bold text-white transition-colors duration-150 hover:bg-[#1a8cd8] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#1d9bf0]"
              onClick={handlePublish}
              disabled={isPublishing || (editingDay ? totalFilled === 0 : !canPublish)}
            >
              {isPublishing ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> Оцениваю...
                </>
              ) : (
                <>
                  <Check size={17} /> {editingDay ? 'Сохранить изменения' : 'Опубликовать день'}
                </>
              )}
            </button>
          </Tooltip>
        </div>
      </footer>

      {storyModalIndex !== null &&
        typeof document !== 'undefined' &&
        createPortal(
          <PublishPrideStoryModal
            prideText={prides[storyModalIndex] ?? ''}
            prideIndex={storyModalIndex}
            scale={evaluations[storyModalIndex]?.scale}
            dayId={editingDay?.id ?? null}
            dayLabel={storyDayLabel}
            displayName={storeState.profile.displayName}
            username={storeState.profile.username}
            avatarColor={storeState.profile.avatarColor}
            avatarSrc={myAvatarSrc}
            verified={storeState.profile.verified}
            defaultVisibility={normalizeVisibility(prideVis[storyModalIndex] ?? dayVisibility)}
            onPublish={postMyStory}
            onClose={() => setStoryModalIndex(null)}
            onNotify={(msg) => onNotify?.(msg)}
            soundEnabled={soundEnabled}
          />,
          document.body
        )}
    </ModalShell>
  )
}

'use client'

import { BookmarkCheck, CalendarDays, Check, ImagePlus, ListPlus, Loader2, Mic, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { evaluatePridesHeuristic, type PrideEvaluation } from '@/lib/ogonek/evaluate-heuristic'
import { savePhoto } from '@/lib/ogonek/photos'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { ComposerDraft, ComposerPayload, Day, Mode, OvercomeLevel } from '@/lib/ogonek/types'
import { ModalShell } from './modal-shell'
import { Tooltip } from './tooltip'

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
      })
    }
  }, [prides, gratitudes, preview, tab, extra, onSaveDraft, editingDay])

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

    return {
      prides: filledPrides,
      gratitudes: filledGratitudes,
      photo: photoId || preview,
      ratings,
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

  return (
    <ModalShell
      title={editingDay ? `Редактировать День #${editingDay.id}` : `Записать День #${displayDayId ?? '?'}`}
      onClose={onClose}
    >
      <p className="modal-intro">
        {editingDay
          ? `День #${editingDay.id} · редактируй формулировки и оценки дня.`
          : `День #${displayDayId ?? '?'} · добавь факты, которые хочется помнить.`}
      </p>

      {/* Date picker — only for new days */}
      {!editingDay && (
        <div className="composer-date-row flex items-center gap-2 mb-3">
          <CalendarDays size={15} className="text-muted flex-none" />
          <label className="text-xs text-muted flex-none">Дата дня:</label>
          <input
            type="date"
            value={dateValue}
            onChange={(e) => {
              if (e.target.value) {
                setDateISO(new Date(e.target.value).toISOString())
              }
            }}
            className="bg-neutral-800 text-xs text-white rounded px-2 py-1 border border-neutral-700 cursor-pointer"
            aria-label="Дата записи дня"
          />
        </div>
      )}

      <div className="composer-tabs" role="tablist" aria-label="Разделы записи">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'pride'}
          className={tab === 'pride' ? 'selected pride' : ''}
          onClick={() => {
            playClick(soundEnabled)
            setTab('pride')
          }}
        >
          🔥 Гордости
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'gratitude'}
          className={tab === 'gratitude' ? 'selected gratitude' : ''}
          onClick={() => {
            playClick(soundEnabled)
            setTab('gratitude')
          }}
        >
          ❤️ Благодарности
        </button>
      </div>

      <div className="composer-fields">
        {visibleValues.map((val, i) => {
          const ev = tab === 'pride' ? evaluations[i] : null

          return (
            <div className="composer-field-wrapper" key={`${tab}-${i}`}>
              <div className="composer-field">
                <span>{i + 1}</span>
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
                />
                <button
                  type="button"
                  className={recording === i ? 'recording' : ''}
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
                <div className="composer-eval-badge flex items-center justify-between text-xs text-muted pl-8 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400 font-semibold">Оценка: {ev.scale}/10</span>
                    <span>·</span>
                    <span className="text-amber-400 font-semibold">Преодоление: {ev.overcome}/3</span>
                    <span>·</span>
                    <span className="italic truncate max-w-[200px]" title={ev.verdict}>
                      «{ev.verdict}»
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-muted">Балл:</span>
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
                      className="bg-neutral-800 text-xs text-white rounded px-1.5 py-0.5 border border-neutral-700 cursor-pointer"
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
            </div>
          )
        })}
      </div>

      {!extra && (
        <button
          type="button"
          className="add-entry"
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
        <p className="text-xs text-amber-500 mt-2 pl-1">
          ⚠ Заполните минимум 5 гордостей для публикации ({filledPrides.length}/5)
        </p>
      )}

      <label className="upload-box">
        <ImagePlus size={23} />
        <div>
          <b>{preview ? 'Фото добавлено ✓' : 'Добавить воспоминания'}</b>
          <small>Перетащи фото или выбери файл</small>
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          aria-label="Загрузить фото воспоминания"
        />
      </label>

      {preview && (
        <div className="upload-preview-wrapper relative mt-2">
          <img
            className="upload-preview w-full rounded-2xl object-cover"
            style={{ maxHeight: 240, objectFit: 'cover' }}
            src={preview.startsWith('photo_') ? undefined : preview}
            alt="Предпросмотр загруженной фотографии"
          />
          <button
            type="button"
            className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
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

      <footer>
        <div className="flex items-center gap-2">
          {tab === 'pride' && filledPrides.length > 0 && (
            <Tooltip content="Оценить масштаб и преодоление через AI или эвристику" side="top">
              <button
                type="button"
                className="secondary-btn flex items-center gap-1.5 py-1.5 px-3 text-xs"
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
          <span className="char-count">
            {totalFilled} {totalFilled === 1 ? 'запись' : totalFilled < 5 ? 'записи' : 'записей'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Save as draft button */}
          {!editingDay && canDraft && (
            <Tooltip content="Сохранить черновик и продолжить позже" side="top">
              <button
                type="button"
                className="secondary-btn flex items-center gap-1.5 py-1.5 px-3 text-xs"
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
              className="save-button"
              onClick={handlePublish}
              disabled={isPublishing || (editingDay ? totalFilled === 0 : !canPublish)}
              style={{
                opacity: isPublishing
                  ? 1
                  : (editingDay ? totalFilled > 0 : canPublish) ? 1 : 0.5,
                cursor: isPublishing
                  ? 'progress'
                  : (editingDay ? totalFilled > 0 : canPublish) ? 'pointer' : 'not-allowed',
              }}
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
    </ModalShell>
  )
}

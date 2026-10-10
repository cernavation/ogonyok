'use client'

import { Check, ImagePlus, ListPlus, Loader2, Mic, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { CURRENT_DAY } from '@/lib/ogonek/data'
import { evaluatePridesHeuristic, type PrideEvaluation } from '@/lib/ogonek/evaluate-heuristic'
import { savePhoto } from '@/lib/ogonek/photos'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { ComposerDraft, ComposerPayload, Mode } from '@/lib/ogonek/types'
import { ModalShell } from './modal-shell'
import { Tooltip } from './tooltip'

type Props = {
  initialDraft?: ComposerDraft | null
  onSaveDraft?: (draft: ComposerDraft) => void
  onClearDraft?: () => void
  onClose: () => void
  onSaved: (payload: ComposerPayload) => void
  soundEnabled?: boolean
}

export function Composer({
  initialDraft,
  onSaveDraft,
  onClearDraft,
  onClose,
  onSaved,
  soundEnabled = true,
}: Props) {
  const [tab, setTab] = useState<Mode>(() => initialDraft?.tab || 'pride')
  const [extra, setExtra] = useState(() => initialDraft?.extra || false)
  const [recording, setRecording] = useState<number | null>(null)
  const [prides, setPrides] = useState<string[]>(() => {
    return initialDraft?.prides || ['', '', '', '', '', '']
  })
  const [gratitudes, setGratitudes] = useState<string[]>(() => {
    return initialDraft?.gratitudes || ['', '', '', '', '', '']
  })
  const [preview, setPreview] = useState<string | null>(() => initialDraft?.photo || null)
  const [photoId, setPhotoId] = useState<string | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evaluations, setEvaluations] = useState<Record<number, PrideEvaluation>>({})

  const previewRef = useRef<string | null>(preview)

  useEffect(() => {
    return () => {
      if (previewRef.current && previewRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(previewRef.current)
      }
    }
  }, [])

  // Auto-save draft in real time
  useEffect(() => {
    if (!onSaveDraft) return
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
  }, [prides, gratitudes, preview, tab, extra, onSaveDraft])

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
  const canSave = totalFilled > 0

  const handleEvaluateAi = async () => {
    if (filledPrides.length === 0) return

    playClick(soundEnabled)
    setIsEvaluating(true)

    try {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

      let evList: PrideEvaluation[]
      if (!isOnline) {
        evList = evaluatePridesHeuristic(filledPrides)
      } else {
        const res = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: filledPrides }),
        })
        if (res.ok) {
          const data = (await res.json()) as { evaluations?: PrideEvaluation[] }
          evList = data.evaluations || evaluatePridesHeuristic(filledPrides)
        } else {
          evList = evaluatePridesHeuristic(filledPrides)
        }
      }

      // Map evaluations back to original indices
      const nextEvalMap: Record<number, PrideEvaluation> = {}
      let filledIdx = 0
      prides.forEach((p, origIdx) => {
        if (p.trim().length > 0 && evList[filledIdx]) {
          nextEvalMap[origIdx] = evList[filledIdx]
          filledIdx++
        }
      })

      setEvaluations(nextEvalMap)
      playSuccess(soundEnabled)
    } catch {
      // Fallback locally
      const evList = evaluatePridesHeuristic(filledPrides)
      const nextEvalMap: Record<number, PrideEvaluation> = {}
      let filledIdx = 0
      prides.forEach((p, origIdx) => {
        if (p.trim().length > 0 && evList[filledIdx]) {
          nextEvalMap[origIdx] = evList[filledIdx]
          filledIdx++
        }
      })
      setEvaluations(nextEvalMap)
    } finally {
      setIsEvaluating(false)
    }
  }

  const handleSave = () => {
    if (!canSave) return
    playSuccess(soundEnabled)
    onSaved({
      prides: filledPrides,
      gratitudes: filledGratitudes,
      photo: photoId || preview,
    })
    onClearDraft?.()
  }

  return (
    <ModalShell title="Записать день" onClose={onClose}>
      <p className="modal-intro">
        День #{CURRENT_DAY} · добавь факты, которые хочется помнить.
      </p>

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
                <div className="composer-eval-badge flex items-center gap-2 text-xs text-muted pl-8 pt-1">
                  <span className="text-orange-400 font-semibold">Сила: {ev.scale}/10</span>
                  <span>·</span>
                  <span className="text-amber-400 font-semibold">Преодоление: {ev.overcome}/3</span>
                  <span>·</span>
                  <span className="italic truncate max-w-[280px]" title={ev.verdict}>
                    «{ev.verdict}»
                  </span>
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

      <label className="upload-box">
        <ImagePlus size={23} />
        <div>
          <b>{preview ? 'Фото добавлено' : 'Добавить воспоминания'}</b>
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
        <img
          className="upload-preview"
          src={preview}
          alt="Предпросмотр загруженной фотографии"
        />
      )}

      <footer>
        <div className="flex items-center gap-2">
          {tab === 'pride' && filledPrides.length > 0 && (
            <Tooltip content="Оценить масштаб и преодоление через AI или эвристику" side="top">
              <button
                type="button"
                className="secondary-btn flex items-center gap-1.5 py-1.5 px-3 text-xs"
                onClick={handleEvaluateAi}
                disabled={isEvaluating}
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

        <button
          type="button"
          className="save-button"
          onClick={handleSave}
          disabled={!canSave}
          style={{ opacity: canSave ? 1 : 0.5, cursor: canSave ? 'pointer' : 'not-allowed' }}
        >
          <Check size={17} /> Опубликовать день
        </button>
      </footer>
    </ModalShell>
  )
}

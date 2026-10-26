'use client'

import { BookmarkCheck, Briefcase, CalendarDays, Check, Dumbbell, Flame, Globe, GraduationCap, Heart, ImagePlus, ListPlus, Loader2, Lock, Mic, Send, Shield, Sparkles, Star, Users, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
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

type PromptSphere = {
  id: string
  label: string
  Icon: any
  questions: string[]
}

const COMPOSER_PROMPT_SPHERES: PromptSphere[] = [
  {
    id: 'sport',
    label: 'Спорт',
    Icon: Dumbbell,
    questions: [
      'Какую тренировку, прогулку или зарядку сделал сегодня?',
      'Какой спортивный прогресс или привычку заметил сегодня?',
      'Что преодолел, чтобы заняться спортом или здоровьем?',
      'За что благодарен своему телу и здоровью сегодня?',
    ],
  },
  {
    id: 'business',
    label: 'Бизнес',
    Icon: Briefcase,
    questions: [
      'Что продвинул в работе, проекте или бизнесе сегодня?',
      'Какую сложную задачу, сделку или разговор завершил?',
      'Какое решение или шаг приблизил к цели?',
      'За какой опыт/поддержку в работе благодарен сегодня?',
    ],
  },
  {
    id: 'study',
    label: 'Учеба',
    Icon: GraduationCap,
    questions: [
      'Что нового узнал, повторил или разобрал сегодня?',
      'Какая учебная задача или глава закрыта?',
      'Как применил знания на практике?',
      'За какую возможность учиться благодарен сегодня?',
    ],
  },
  {
    id: 'relations',
    label: 'Отношения',
    Icon: Users,
    questions: [
      'Кому помог или с кем тепло общался сегодня?',
      'Какой важный разговор состоялся?',
      'Как проявил заботу или внимание к близким?',
      'За какую поддержку или общение благодарен сегодня?',
    ],
  },
  {
    id: 'overcome',
    label: 'Преодоление себя',
    Icon: Flame,
    questions: [
      'Что сделал вопреки лени, страху или усталости?',
      'Какой внутренний барьер или привычку преодолел?',
      'Какой урок вынес из трудной ситуации?',
      'За какой опыт преодоления благодарен сегодня?',
    ],
  },
]

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

function getCachedComposerDraft(): ComposerDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('ogonek.draft.composer')
    return raw ? (JSON.parse(raw) as ComposerDraft) : null
  } catch {
    return null
  }
}

export function Composer({
  initialDraft: passedInitialDraft,
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
  const initialDraft = useMemo(() => {
    return passedInitialDraft || (editingDay ? null : getCachedComposerDraft())
  }, [passedInitialDraft, editingDay])

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

  // ЭТАП 22 — панель быстрых умных подсказок
  const [promptSphereId, setPromptSphereId] = useState<string>('sport')
  const [activePrompt, setActivePrompt] = useState<string | null>(null)

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

  // Auto-save draft in real time (debounce 500ms + synchronous localStorage backup)
  useEffect(() => {
    if (editingDay) return
    const hasAnyContent =
      prides.some((p) => p.trim().length > 0) ||
      gratitudes.some((g) => g.trim().length > 0) ||
      Boolean(preview)

    if (hasAnyContent) {
      const draftPayload: ComposerDraft = {
        prides,
        gratitudes,
        photo: preview,
        tab,
        extra,
        lastSavedISO: new Date().toISOString(),
        visibility: dayVisibility,
        prideVisibilities: prideVis,
      }

      // 1. Синхронное резервное сохранение
      try {
        localStorage.setItem('ogonek.draft.composer', JSON.stringify(draftPayload))
      } catch {}

      // 2. Дебаунсированная синхронизация с внешним хранилищем
      const timer = setTimeout(() => {
        onSaveDraft?.(draftPayload)
      }, 500)
      return () => clearTimeout(timer)
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

  const applyPrompt = (question: string) => {
    playClick(soundEnabled)
    setActivePrompt(question)
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(question)
      }
    } catch {
      // ignore clipboard errors
    }
    onNotify?.('Подсказка скопирована — опиши свой ответ в поле')
  }

  const currentValues = tab === 'pride' ? prides : gratitudes
  const visibleValues = currentValues.slice(0, extra ? 6 : 5)

  const filledPrides = prides.filter((p) => p.trim().length > 0)
  const filledGratitudes = gratitudes.filter((g) => g.trim().length > 0)
  const totalFilled = filledPrides.length + filledGratitudes.length

  const userLevel = storeState.profile?.level || 3
  // Validation: require at least level entries to publish (Правило 1 ТЗ)
  const canPublish = filledPrides.length >= userLevel
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
          try {
            localStorage.removeItem('ogonek.draft.composer')
          } catch {}
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
      try {
        localStorage.removeItem('ogonek.draft.composer')
      } catch {}
      onClearDraft?.()
    }
  }

  // Format date for the date input (yyyy-MM-dd)
  const dateValue = dateISO ? dateISO.slice(0, 10) : new Date().toISOString().slice(0, 10)

  const displayDayId = editingDay?.id ?? nextDayId

  const [activeSlot, setActiveSlot] = useState(0)
  const activeValue = currentValues[activeSlot] || ''
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cursorRef = useRef<number | null>(null)

  const handleActiveChange = (val: string) => {
    if (textareaRef.current) {
      cursorRef.current = textareaRef.current.selectionStart
    }
    if (tab === 'pride') {
      setPrides((prev) => {
        const next = [...prev]
        next[activeSlot] = val
        return next
      })
    } else {
      setGratitudes((prev) => {
        const next = [...prev]
        next[activeSlot] = val
        return next
      })
    }
  }

  // Защита фокуса и позиции курсора при быстром вводе
  useEffect(() => {
    if (textareaRef.current && cursorRef.current !== null && document.activeElement === textareaRef.current) {
      const pos = cursorRef.current
      try {
        textareaRef.current.setSelectionRange(pos, pos)
      } catch {}
    }
  })

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
      hideHeader
      closeOnEscape={storyModalIndex === null}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full">
      {/* ── X.COM CANONICAL COMPOSER ────────────────────────────────────────── */}
      {/* 1. Хедер: крестик слева, «Записать» справа; сверху сегменты Гордость | Благодарность и прогресс-точки «3/5» */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-[var(--border)] gap-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors min-h-[40px] min-w-[40px]"
        >
          <X size={20} />
        </button>

        {/* Сверху сегменты Гордость | Благодарность и прогресс-точки «3/5» */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-full bg-[var(--bg-elev)] p-0.5 border border-[var(--border)]" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'pride'}
              onClick={() => {
                playClick(soundEnabled)
                setTab('pride')
              }}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-all min-h-[34px] ${
                tab === 'pride'
                  ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-sm'
                  : 'text-[var(--text-2)] hover:text-[var(--text)]'
              }`}
            >
              Гордость
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'gratitude'}
              onClick={() => {
                playClick(soundEnabled)
                setTab('gratitude')
              }}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-all min-h-[34px] ${
                tab === 'gratitude'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-[var(--text-2)] hover:text-[var(--text)]'
              }`}
            >
              Благодарность
            </button>
          </div>

          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-elev)] border border-[var(--border)]"
            title={`Заполнено ${tab === 'pride' ? filledPrides.length : filledGratitudes.length} из 5`}
          >
            {Array.from({ length: 5 }).map((_, idx) => {
              const isFilled = tab === 'pride' ? idx < filledPrides.length : idx < filledGratitudes.length
              return (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all ${
                    isFilled ? 'bg-[var(--accent)] scale-110' : 'bg-[var(--text-3)]/30'
                  }`}
                />
              )
            })}
            <span className="text-[12px] font-mono font-bold text-[var(--text-2)] ml-0.5">
              {tab === 'pride' ? filledPrides.length : filledGratitudes.length}/5
            </span>
          </div>
        </div>

        {/* Кнопка «Записать» справа */}
        <button
          type="button"
          onClick={handlePublish}
          disabled={isPublishing || (editingDay ? totalFilled === 0 : !canPublish)}
          className="x-primary-btn px-4 py-1.5 rounded-full text-[14px] font-bold min-h-[34px] disabled:opacity-40 shadow-sm"
        >
          {isPublishing ? 'Запись…' : 'Записать'}
        </button>
      </div>

      {/* Переключатель слотов пунктов 1..5 */}
      <div className="flex items-center justify-between gap-2 py-1 mb-1">
        <div className="flex items-center gap-1.5" role="group" aria-label="Пункты записи">
          {[0, 1, 2, 3, 4].map((slot) => {
            const val = currentValues[slot] || ''
            const isFilled = val.trim().length > 0
            const isActive = activeSlot === slot
            const isItemPrivate = tab === 'pride' && (prideVis[slot] ?? dayVisibility) === 'private'
            return (
              <button
                key={slot}
                type="button"
                onClick={() => {
                  playClick(soundEnabled)
                  setActiveSlot(slot)
                }}
                className={`relative w-8 h-8 rounded-full font-mono text-[13px] font-bold transition-all flex items-center justify-center min-h-[34px] min-w-[34px] ${
                  isActive
                    ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-sm ring-2 ring-[var(--accent)]/30'
                    : isFilled
                    ? 'bg-[var(--bg-elev)] text-[var(--text)] border border-[var(--accent)]'
                    : 'bg-[var(--bg-elev)] text-[var(--text-2)] border border-[var(--border)] hover:bg-[var(--bg-hover)]'
                }`}
                title={`Пункт ${slot + 1}${isFilled ? ': ' + val : ' (пусто)'}${isItemPrivate ? ' (🔒 лично)' : ''}`}
              >
                <span>{slot + 1}</span>
                {isItemPrivate && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-300 text-[8px]">
                    🔒
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[var(--text-2)] font-medium">
            {tab === 'pride' ? `Гордость #${activeSlot + 1}` : `Благодарность #${activeSlot + 1}`}
          </span>
          {tab === 'pride' && (
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                const cur = prideVis[activeSlot] ?? dayVisibility
                const next: VisibilityLevel = cur === 'public' ? 'private' : 'public'
                setPrideVis((prev) => ({ ...prev, [activeSlot]: next }))
                onNotify?.(
                  next === 'public'
                    ? `Гордость #${activeSlot + 1} видна всем 🌐`
                    : `Гордость #${activeSlot + 1} скрыта (только себе) 🔒`
                )
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                (prideVis[activeSlot] ?? dayVisibility) === 'public'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
              }`}
              title="Нажмите, чтобы изменить видимость этого пункта гордости"
              aria-label="Видимость пункта гордости"
            >
              {(prideVis[activeSlot] ?? dayVisibility) === 'public' ? (
                <>
                  <Globe size={13} className="text-blue-400" />
                  <span>🌐 Публично</span>
                </>
              ) : (
                <>
                  <Lock size={13} className="text-zinc-400" />
                  <span>🔒 Лично</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 2. Большое поле 20px без рамки */}
      <textarea
        ref={textareaRef}
        id="composer-slot-textarea"
        rows={4}
        value={activeValue}
        onChange={(e) => handleActiveChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && activeValue.trim().length > 0 && activeSlot < 4) {
            e.preventDefault()
            setActiveSlot(activeSlot + 1)
          }
        }}
        placeholder={
          tab === 'pride'
            ? 'Что получилось? Чем гордишься сегодня?'
            : 'За что благодарен сегодня?'
        }
        className="w-full bg-transparent text-[20px] leading-[28px] text-[var(--text)] placeholder:text-[var(--text-3)] border-0 outline-none resize-none p-0 focus:ring-0 my-3 min-h-[130px]"
        aria-label={`Пункт ${activeSlot + 1}`}
      />

      {/* Превью фото, если прикреплено */}
      {preview && (
        <div className="relative mb-3 rounded-2xl overflow-hidden border border-[var(--border)] max-h-[160px]">
          <img src={preview} alt="Фото" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => {
              setPreview(null)
              setPhotoId(null)
              previewRef.current = null
            }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black min-h-[32px] min-w-[32px]"
            aria-label="Удалить фото"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 3. Под полем ряд иконок (оценка, приватность, эмодзи, «Нужна идея?», «Оценить с ИИ»), справа счётчик */}
      <div className="flex items-center justify-between pt-2.5 border-t border-[var(--border)]">
        <div className="flex items-center gap-1.5" role="group" aria-label="Инструменты записи">
          {/* Оценка */}
          {tab === 'pride' && (
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                const currentRating = evaluations[activeSlot]?.scale ?? 8
                const nextRating = currentRating >= 10 ? 6 : currentRating + 1
                setEvaluations((prev) => ({
                  ...prev,
                  [activeSlot]: {
                    scale: nextRating,
                    overcome: 1,
                    tags: [],
                    verdict: 'Оценка пользователя',
                  },
                }))
                setRatingsAreDefault(false)
                onNotify?.(`Оценка гордости #${activeSlot + 1}: ${nextRating}/10 ★`)
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-amber-500 hover:bg-[var(--bg-hover)] transition-colors min-h-[40px] min-w-[40px]"
              title={`Оценка: ${evaluations[activeSlot]?.scale ?? 8}/10`}
              aria-label="Задать оценку"
            >
              <Star size={18} className="fill-amber-400" />
            </button>
          )}

          {/* Приватность (для гордости — тумблер пункта; для других вкладок — дня) */}
          <button
            type="button"
            onClick={() => {
              playClick(soundEnabled)
              if (tab === 'pride') {
                const cur = prideVis[activeSlot] ?? dayVisibility
                const next: VisibilityLevel = cur === 'public' ? 'private' : 'public'
                setPrideVis((prev) => ({ ...prev, [activeSlot]: next }))
                onNotify?.(
                  next === 'public'
                    ? `Гордость #${activeSlot + 1}: 🌐 Публично (видят все)`
                    : `Гордость #${activeSlot + 1}: 🔒 Лично (видит только автор)`
                )
              } else {
                const next = dayVisibility === 'public' ? 'private' : 'public'
                setDayVisibility(next)
                onNotify?.(next === 'public' ? 'Виден в общей ленте' : 'Личная запись (только себе)')
              }
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors min-h-[40px] min-w-[40px]"
            title={
              tab === 'pride'
                ? `Видимость гордости #${activeSlot + 1}: ${(prideVis[activeSlot] ?? dayVisibility) === 'public' ? '🌐 Публично' : '🔒 Лично'}`
                : `Приватность дня: ${dayVisibility === 'public' ? 'Общая' : 'Личная'}`
            }
            aria-label="Переключить приватность"
          >
            {tab === 'pride' ? (
              (prideVis[activeSlot] ?? dayVisibility) === 'public' ? (
                <Globe size={18} className="text-blue-400" />
              ) : (
                <Lock size={18} className="text-zinc-400" />
              )
            ) : dayVisibility === 'public' ? (
              <Shield size={18} />
            ) : (
              <Lock size={18} />
            )}
          </button>

          {/* Фото / Медиа */}
          <label
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer min-h-[40px] min-w-[40px]"
            title="Прикрепить фото"
            aria-label="Прикрепить фото"
          >
            <ImagePlus size={18} />
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>

          {/* «Нужна идея?» */}
          <button
            type="button"
            onClick={() => {
              playClick(soundEnabled)
              const sphere = COMPOSER_PROMPT_SPHERES[Math.floor(Math.random() * COMPOSER_PROMPT_SPHERES.length)]
              const question = sphere.questions[Math.floor(Math.random() * sphere.questions.length)]
              handleActiveChange(question)
              onNotify?.(`💡 Подсказка: ${question}`)
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-amber-500 hover:bg-[var(--bg-hover)] transition-colors min-h-[40px] min-w-[40px]"
            title="Нужна идея?"
            aria-label="Нужна идея?"
          >
            <Sparkles size={18} />
          </button>

          {/* «Оценить с ИИ» */}
          {tab === 'pride' && (
            <button
              type="button"
              disabled={isEvaluating}
              onClick={handleEvaluateAi}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40 min-h-[40px] min-w-[40px]"
              title="Оценить с ИИ"
              aria-label="Оценить с ИИ"
            >
              {isEvaluating ? <Loader2 size={18} className="animate-spin" /> : <Flame size={18} />}
            </button>
          )}
        </div>

        {/* Справа счётчик */}
        <div className="flex items-center gap-2">
          {activeValue.length > 0 && (
            <span className="text-[12px] text-[var(--text-3)] font-mono">
              {activeValue.length} симв.
            </span>
          )}
          <span className="text-[13px] font-bold text-[var(--text-2)] font-mono">
            {activeSlot + 1}/5
          </span>
        </div>
      </div>

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
      </div>
    </ModalShell>
  )
}

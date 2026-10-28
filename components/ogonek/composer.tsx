'use client'

import { BookmarkCheck, Briefcase, CalendarDays, Check, Dumbbell, Flame, Globe, GraduationCap, Heart, HelpCircle, ImagePlus, ListPlus, Loader2, Lock, Mic, Send, Shield, Sparkles, Star, Users, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { createPortal } from 'react-dom'
import { evaluatePrideItemHeuristic, evaluatePridesHeuristic, type PrideEvaluation } from '@/lib/ogonek/evaluate-heuristic'
import { savePhoto, resolvePhotoUrl } from '@/lib/ogonek/photos'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { ComposerDraft, ComposerPayload, Day, Mode, OvercomeLevel, VisibilityLevel } from '@/lib/ogonek/types'
import { usePhotoUrl } from '@/lib/ogonek/use-photo-url'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { normalizeVisibility } from '@/lib/ogonek/visibility'
import { useBodyScrollLock } from '@/lib/ogonek/use-body-scroll-lock'
import { ModalShell } from './modal-shell'
import { PublishPrideStoryModal } from './publish-pride-story-modal'
import { EvaluationCeremonyModal } from './evaluation-ceremony-modal'
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

const HINT_QUESTIONS = [
  'Что нового узнал?',
  'Какой барьер преодолел?',
  'Чем гордишься больше всего сегодня?',
  'Что сделал вопреки лени или страху?',
  'Какое маленькое достижение заметил?',
  'Что продвинул в работе или проекте?',
  'Кому помог или с кем тепло общался?',
  'Что преодолел, чтобы заняться здоровьем?',
]

function getDayPhotoCandidate(day: Day | null | undefined): string | null {
  if (!day) return null
  if (day.media_url) return day.media_url
  if ((day as any).mediaUrl) return (day as any).mediaUrl
  if ((day as any).item?.media_url) return (day as any).item.media_url
  if (Array.isArray(day.photos) && day.photos.length > 0 && day.photos[0]) {
    return day.photos[0]
  }
  if (Array.isArray(day.prides)) {
    for (const p of day.prides) {
      if ((p as any).media_url) return (p as any).media_url
      if ((p as any).mediaUrl) return (p as any).mediaUrl
      if (Array.isArray((p as any).photos) && (p as any).photos.length > 0) return (p as any).photos[0]
    }
  }
  return null
}

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
  useBodyScrollLock(true)

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
  const candidatePhoto = getDayPhotoCandidate(editingDay)
  const [preview, setPreview] = useState<string | null>(() => {
    if (
      candidatePhoto &&
      (candidatePhoto.startsWith('http') || candidatePhoto.startsWith('data:') || candidatePhoto.startsWith('blob:'))
    ) {
      return candidatePhoto
    }
    return initialDraft?.photo || null
  })
  const [photoId, setPhotoId] = useState<string | null>(null)

  useEffect(() => {
    if (candidatePhoto) {
      let cancelled = false
      resolvePhotoUrl(candidatePhoto).then((resolved) => {
        if (!cancelled && resolved) {
          setPreview(resolved)
          previewRef.current = resolved
        }
      })
      return () => {
        cancelled = true
      }
    }
  }, [candidatePhoto])
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
  const defaultVis: VisibilityLevel = storeState.privacy?.defaultDayVisibility || 'public'

  /** Приватность всего дня */
  const [dayVisibility, setDayVisibility] = useState<VisibilityLevel>(() => {
    if (editingDay?.visibility) return normalizeVisibility(editingDay.visibility)
    if (initialDraft?.visibility) return normalizeVisibility(initialDraft.visibility)
    return defaultVis
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
    if (initialDraft?.prideVisibilities) return initialDraft.prideVisibilities
    if (defaultVis === 'private') {
      return { 0: 'private', 1: 'private', 2: 'private', 3: 'private', 4: 'private' }
    }
    if (defaultVis === 'friends') {
      return { 0: 'friends', 1: 'friends', 2: 'friends', 3: 'friends', 4: 'friends' }
    }
    return {}
  })

  /** Приватность каждой благодарности по её индексу в форме (0..5) */
  const [gratitudeVis, setGratitudeVis] = useState<Record<number, VisibilityLevel>>(() => {
    if (editingDay && Array.isArray(editingDay.gratitudes)) {
      const map: Record<number, VisibilityLevel> = {}
      editingDay.gratitudes.forEach((g, idx) => {
        const vis = typeof g === 'object' && g.visibility ? g.visibility : editingDay.visibility
        map[idx] = normalizeVisibility(vis)
      })
      return map
    }
    if (initialDraft?.gratitudeVisibilities) return initialDraft.gratitudeVisibilities
    if (defaultVis === 'private') {
      return { 0: 'private', 1: 'private', 2: 'private', 3: 'private', 4: 'private' }
    }
    if (defaultVis === 'friends') {
      return { 0: 'friends', 1: 'friends', 2: 'friends', 3: 'friends', 4: 'friends' }
    }
    return {}
  })

  /** Модалка торжественной ИИ-оценки дня */
  const [showCeremonyModal, setShowCeremonyModal] = useState(false)

  /** Индекс гордости, для которой открыт мастер публикации в Сторис */
  const [storyModalIndex, setStoryModalIndex] = useState<number | null>(null)

  // ЭТАП 22 — панель быстрых умных подсказок
  const [promptSphereId, setPromptSphereId] = useState<string>('sport')
  const [activePrompt, setActivePrompt] = useState<string | null>(null)
  const [hintIndex, setHintIndex] = useState(0)

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
        gratitudeVisibilities: gratitudeVis,
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
  }, [prides, gratitudes, preview, tab, extra, onSaveDraft, editingDay, dayVisibility, prideVis, gratitudeVis])

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
          body: JSON.stringify({ items: filledPrides, prides: filledPrides }),
        })
        if (res.ok) {
          const data = (await res.json()) as any
          const rawList = Array.isArray(data.evaluations) && data.evaluations.length > 0
            ? data.evaluations
            : Array.isArray(data.prideEvaluations) && data.prideEvaluations.length > 0
            ? data.prideEvaluations
            : null

          if (rawList) {
            evList = rawList.map((item: any) => ({
              scale: Number(item.scale ?? item.score ?? 8),
              verdict: String(item.verdict ?? item.comment ?? ''),
              overcome: (Number(item.overcome) || 0) as OvercomeLevel,
              tags: Array.isArray(item.tags) ? item.tags : [],
            }))
          } else {
            evList = evaluatePridesHeuristic(filledPrides)
          }
        } else {
          evList = evaluatePridesHeuristic(filledPrides)
        }
      } catch {
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

  /** Оценка текущего пункта через Gemini (/api/evaluate) */
  const handleEvaluateCurrentAi = async () => {
    const currentText = (tab === 'pride' ? prides[activeSlot] : '').trim()
    if (!currentText) {
      playClick(soundEnabled)
      onNotify?.('Сначала напиши текст гордости для оценки')
      return
    }

    if (isEvaluating) return

    playClick(soundEnabled)
    setIsEvaluating(true)

    try {
      let evalResult: PrideEvaluation | null = null

      try {
        const res = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [currentText], prides: [currentText] }),
        })

        if (res.ok) {
          const data = (await res.json()) as any
          const list = Array.isArray(data.evaluations) && data.evaluations.length > 0
            ? data.evaluations
            : Array.isArray(data.prideEvaluations) && data.prideEvaluations.length > 0
            ? data.prideEvaluations
            : null

          if (list && list[0]) {
            evalResult = {
              scale: Number(list[0].scale ?? list[0].score ?? 8),
              verdict: String(list[0].verdict ?? list[0].comment ?? 'Оценка Gemini'),
              overcome: (Number(list[0].overcome) || 0) as OvercomeLevel,
              tags: Array.isArray(list[0].tags) ? list[0].tags : [],
            }
          }
        }
      } catch (e) {
        console.warn('Network error during /api/evaluate:', e)
      }

      if (!evalResult) {
        evalResult = evaluatePrideItemHeuristic(currentText)
      }

      setEvaluations((prev) => ({
        ...prev,
        [activeSlot]: evalResult!,
      }))
      setRatingsAreDefault(false)
      playSuccess(soundEnabled)
      onNotify?.(`🔥 Оценка Gemini: ${evalResult.scale}/10 ★${evalResult.verdict ? ` — ${evalResult.verdict}` : ''}`)
    } finally {
      setIsEvaluating(false)
    }
  }

  /** Клик по ❓: подставляет наводящий вопрос в плейсхолдер */
  const handleHintQuestion = () => {
    playClick(soundEnabled)
    const q = HINT_QUESTIONS[hintIndex % HINT_QUESTIONS.length]
    setHintIndex((prev) => prev + 1)
    setCustomPlaceholder(q)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
    onNotify?.(`💡 Подсказка: ${q}`)
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

    const gratitudeVisibilities: Record<number, VisibilityLevel> = {}
    let gVisIdx = 0
    gratitudes.forEach((g, origIdx) => {
      if (g.trim().length === 0) return
      gratitudeVisibilities[gVisIdx] = normalizeVisibility(gratitudeVis[origIdx] ?? dayVisibility)
      gVisIdx++
    })

    return {
      prides: filledPrides,
      gratitudes: filledGratitudes,
      photo: photoId || preview,
      ratings,
      visibility: dayVisibility,
      prideVisibilities,
      gratitudeVisibilities,
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
      gratitudeVisibilities: gratitudeVis,
    })
    onClose()
  }

  const handlePublish = async () => {
    const publishEnabled = editingDay ? totalFilled > 0 : canPublish
    if (!publishEnabled || isPublishing || isEvaluating) return

    // Интерактивная AI-церемония торжественной оценки дня
    if (filledPrides.length > 0) {
      setShowCeremonyModal(true)
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

  const handleCeremonyComplete = (
    evalMap: Record<number, PrideEvaluation>,
    mentorWord: string,
    avgScore: number
  ) => {
    setShowCeremonyModal(false)
    setEvaluations(evalMap)
    setRatingsAreDefault(false)
    playSuccess(soundEnabled)
    const payload = buildPayload(evalMap)
    onSaved(payload, editingDay?.id, editingDay ? undefined : dateISO)
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
  const [customPlaceholder, setCustomPlaceholder] = useState<string | null>(null)

  useEffect(() => {
    setCustomPlaceholder(null)
  }, [tab, activeSlot])
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

  const handleSwitchTab = (nextTab: Mode) => {
    playClick(soundEnabled)
    setTab(nextTab)
    const targetList = nextTab === 'gratitude' ? gratitudes : prides
    const firstEmptyIdx = targetList.slice(0, 5).findIndex((item) => !item || item.trim().length === 0)
    setActiveSlot(firstEmptyIdx >= 0 ? firstEmptyIdx : 0)
  }

  const isCurrentTabAllPrivate = useMemo(() => {
    const visMap = tab === 'pride' ? prideVis : gratitudeVis
    return [0, 1, 2, 3, 4].every((slot) => (visMap[slot] || dayVisibility || 'public') === 'private')
  }, [tab, prideVis, gratitudeVis, dayVisibility])

  const currentSlotVis: VisibilityLevel =
    (tab === 'pride' ? prideVis[activeSlot] : gratitudeVis[activeSlot]) || dayVisibility || 'public'

  const handleSetCurrentItemVis = (level: VisibilityLevel) => {
    playClick(soundEnabled)
    if (tab === 'pride') {
      setPrideVis((prev) => ({ ...prev, [activeSlot]: level }))
    } else {
      setGratitudeVis((prev) => ({ ...prev, [activeSlot]: level }))
    }
    onNotify?.(
      level === 'public'
        ? `${tab === 'pride' ? 'Гордость' : 'Благодарность'} #${activeSlot + 1} видна всем 🌐`
        : `${tab === 'pride' ? 'Гордость' : 'Благодарность'} #${activeSlot + 1} скрыта (только себе) 🔒`
    )
  }

  const handleApplyToAll = () => {
    playClick(soundEnabled)
    const targetLevel: VisibilityLevel = currentSlotVis === 'private' ? 'private' : 'public'
    const updated: Record<number, VisibilityLevel> = {
      0: targetLevel,
      1: targetLevel,
      2: targetLevel,
      3: targetLevel,
      4: targetLevel,
    }
    if (tab === 'pride') {
      setPrideVis((prev) => ({ ...prev, ...updated }))
    } else {
      setGratitudeVis((prev) => ({ ...prev, ...updated }))
    }
    onNotify?.(
      targetLevel === 'private'
        ? `Все 5 ${tab === 'pride' ? 'гордостей' : 'благодарностей'} теперь личные 🔒`
        : `Все 5 ${tab === 'pride' ? 'гордостей' : 'благодарностей'} теперь публичные 🌐`
    )
  }

  const handleToggleAllVisibility = handleApplyToAll

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
              onClick={() => handleSwitchTab('pride')}
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
              onClick={() => handleSwitchTab('gratitude')}
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
            const slotVis: VisibilityLevel =
              (tab === 'pride' ? prideVis[slot] : gratitudeVis[slot]) || dayVisibility || 'public'
            const isItemPrivate = slotVis === 'private'
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
          {/* Пилюля выбора: [ 🌐 Публично | 🔒 Лично ] (компактный размер h-8 px-3 text-xs rounded-full) */}
          <div className="inline-flex items-center h-8 p-0.5 rounded-full bg-[var(--surface-subtle,#16181c)] border border-[var(--line)]">
            <button
              type="button"
              onClick={() => handleSetCurrentItemVis('public')}
              className={`h-7 px-2.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                currentSlotVis === 'public'
                  ? 'bg-blue-500/20 text-[#1d9bf0] font-semibold shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
              title="Сделать этот пункт публичным"
            >
              <Globe size={13} />
              <span>Публично</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetCurrentItemVis('private')}
              className={`h-7 px-2.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                currentSlotVis === 'private'
                  ? 'bg-[var(--bg-hover)] text-[var(--text)] font-semibold shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
              title="Сделать этот пункт личным"
            >
              <Lock size={13} />
              <span>Лично</span>
            </button>
          </div>

          {/* Рядом компактная кнопка-ссылка: Применить ко всем */}
          <button
            type="button"
            onClick={handleApplyToAll}
            className="text-[11px] text-[#71767b] hover:text-[#1d9bf0] transition-colors whitespace-nowrap px-1 py-1"
            title={`Применить "${currentSlotVis === 'private' ? 'Лично' : 'Публично'}" ко всем 5 пунктам`}
          >
            Применить ко всем
          </button>
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
          customPlaceholder ||
          (tab === 'pride'
            ? 'Что получилось? Чем гордишься сегодня?'
            : 'За что благодарен сегодня?')
        }
        className="w-full bg-transparent text-[20px] leading-[28px] text-[var(--text)] placeholder:text-[var(--text-3)] border-0 outline-none resize-none p-0 focus:ring-0 my-3 min-h-[130px]"
        aria-label={`Пункт ${activeSlot + 1}`}
      />

      {/* Превью фото, если прикреплено */}
      {preview && (
        <div className="relative w-full max-h-[350px] my-3 rounded-2xl overflow-hidden bg-black/50 border border-[var(--line)] flex items-center justify-center">
          <img
            src={preview}
            className="max-h-[350px] w-auto object-contain rounded-xl"
            alt="Фото дня"
          />
          <button
            type="button"
            onClick={() => {
              setPreview(null)
              setPhotoId(null)
              previewRef.current = null
            }}
            className="absolute top-3 right-3 bg-black/70 hover:bg-black p-2 rounded-full text-white transition-colors z-10"
            aria-label="Удалить фото"
          >
            ✕
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

          {/* Приватность пункта */}
          <button
            type="button"
            onClick={() => handleSetCurrentItemVis(currentSlotVis === 'public' ? 'private' : 'public')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors min-h-[40px] min-w-[40px]"
            title={
              currentSlotVis === 'public'
                ? `Видимость пункта: 🌐 Публично (клик для смены на Лично)`
                : `Видимость пункта: 🔒 Лично (клик для смены на Публично)`
            }
            aria-label="Переключить приватность"
          >
            {currentSlotVis === 'public' ? (
              <Globe size={18} className="text-blue-400" />
            ) : (
              <Lock size={18} className="text-zinc-400" />
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

          {/* «Нужна идея?» — циклично меняет плейсхолдер */}
          <Tooltip content="Нужна идея?">
            <button
              type="button"
              onClick={handleHintQuestion}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#71767b] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors min-h-[40px] min-w-[40px]"
              title="Нужна идея? (подставит вопрос в плейсхолдер)"
              aria-label="Нужна идея?"
            >
              <HelpCircle className="w-4 h-4 text-[#71767b]" />
            </button>
          </Tooltip>

          {/* «Оценить с ИИ» — реальная оценка текущей гордости через Gemini */}
          {tab === 'pride' && (
            <Tooltip content="Оценить этот пункт через Gemini (ИИ)">
              <button
                type="button"
                disabled={isEvaluating}
                onClick={handleEvaluateCurrentAi}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40 min-h-[40px] min-w-[40px]"
                title="Оценить этот пункт через Gemini (ИИ)"
                aria-label="Оценить с ИИ"
              >
                {isEvaluating ? (
                  <Loader2 size={18} className="animate-spin text-[var(--accent)]" />
                ) : (
                  <Flame size={18} className="text-[var(--accent)] fill-[var(--accent)]/30" />
                )}
              </button>
            </Tooltip>
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

      {showCeremonyModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <EvaluationCeremonyModal
            isOpen={showCeremonyModal}
            prides={filledPrides}
            gratitudes={filledGratitudes}
            dayNumber={displayDayId ?? 1}
            soundEnabled={soundEnabled}
            onClose={() => setShowCeremonyModal(false)}
            onAccept={handleCeremonyComplete}
          />,
          document.body
        )}
      </div>
    </ModalShell>
  )
}

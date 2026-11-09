'use client'

import { BookmarkCheck, Briefcase, CalendarDays, Check, Dumbbell, Flame, Globe, GraduationCap, Heart, HelpCircle, ImagePlus, ListPlus, Loader2, Lock, Mic, Send, Shield, Sparkles, Star, Users, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { createPortal } from 'react-dom'
import type { PrideEvaluation } from '@/lib/ogonek/evaluate-heuristic'
import { savePhoto, resolvePhotoUrl, uploadDayPhotoToStorage } from '@/lib/ogonek/photos'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { AttachedPhotoTarget, ComposerDraft, ComposerPayload, Day, Mode, OvercomeLevel, VisibilityLevel } from '@/lib/ogonek/types'
import { usePhotoUrl } from '@/lib/ogonek/use-photo-url'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { normalizeVisibility } from '@/lib/ogonek/visibility'
import { useBodyScrollLock } from '@/lib/ogonek/use-body-scroll-lock'
import dynamic from 'next/dynamic'
import { ModalShell } from './modal-shell'
import { Tooltip } from './tooltip'
import { VisibilitySwitcher } from './visibility-switcher'

const PublishPrideStoryModal = dynamic(
  () => import('./publish-pride-story-modal').then((m) => m.PublishPrideStoryModal),
  { ssr: false }
)
const EvaluationCeremonyModal = dynamic(
  () => import('./evaluation-ceremony-modal').then((m) => m.EvaluationCeremonyModal),
  { ssr: false }
)

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

const PRIDE_HINT_QUESTIONS = [
  'Какой барьер или лень сегодня преодолел?',
  'Какую главную победу зафиксировал в делах или спорте?',
  'Что сделал вопреки усталости или страху?',
  'Какое важное решение или действие продвинуло к цели?',
  'Чем больше всего гордишься перед собой за сегодня?',
]

const GRATITUDE_HINT_QUESTIONS = [
  'Кому из близких, друзей или коллег ты благодарен сегодня?',
  'За какую поддержку, тепло или заботу говоришь спасибо?',
  'Какое приятное событие или урок дня вызвало благодарность?',
  'За что благодарен своему телу, здоровью и силам?',
  'За какую возможность или случай в жизни признателен сегодня?',
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
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
  const [attachedTargets, setAttachedTargets] = useState<AttachedPhotoTarget[]>(() => {
    if (editingDay?.attached_targets && Array.isArray(editingDay.attached_targets)) {
      return editingDay.attached_targets
    }
    if ((editingDay as any)?.attachedTargets && Array.isArray((editingDay as any).attachedTargets)) {
      return (editingDay as any).attachedTargets
    }
    if (initialDraft?.attachedTargets && Array.isArray(initialDraft.attachedTargets)) {
      return initialDraft.attachedTargets
    }
    return []
  })

  const handleToggleTarget = (targetType: 'pride' | 'gratitude', index: number) => {
    playClick(soundEnabled)
    setAttachedTargets((prev) => {
      const current = prev.length > 0 ? prev : [{ type: tab, index: activeSlot + 1 }]
      const exists = current.some((t) => t.type === targetType && t.index === index)
      if (exists) {
        return current.filter((t) => !(t.type === targetType && t.index === index))
      } else {
        return [...current, { type: targetType, index }]
      }
    })
  }

  const isTargetActive = (targetType: 'pride' | 'gratitude', index: number) => {
    if (attachedTargets.length === 0 && preview) {
      return tab === targetType && activeSlot + 1 === index
    }
    return attachedTargets.some((t) => t.type === targetType && t.index === index)
  }

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
        attachedTargets,
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
  }, [prides, gratitudes, preview, attachedTargets, tab, extra, onSaveDraft, editingDay, dayVisibility, prideVis, gratitudeVis])

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (previewRef.current && previewRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(previewRef.current)
      }
      const url = URL.createObjectURL(file)
      previewRef.current = url
      setPreview(url)
      setSelectedFile(file)
      if (attachedTargets.length === 0) {
        setAttachedTargets([{ type: tab, index: activeSlot + 1 }])
      }

      try {
        const id = await savePhoto(file)
        setPhotoId(id)
      } catch {
        // Fallback to transient blob url
      }
    }
  }

  const handleRemovePhoto = () => {
    playClick(soundEnabled)
    if (previewRef.current && previewRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(previewRef.current)
    }
    setPreview(null)
    previewRef.current = null
    setPhotoId(null)
    setSelectedFile(null)
    setAttachedTargets([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
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
   * Оценка гордостей дня через ИИ (/api/evaluate).
   */
  const computeEvaluations = async (): Promise<Record<number, PrideEvaluation>> => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
    const nextEvalMap: Record<number, PrideEvaluation> = { ...evaluations }

    if (isOnline && filledPrides.length > 0) {
      try {
        const res = await fetch('/api/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prides: filledPrides, gratitudes: filledGratitudes }),
        })
        if (res.ok) {
          const data = (await res.json()) as any
          const list = Array.isArray(data.prideEvaluations) && data.prideEvaluations.length > 0
            ? data.prideEvaluations
            : Array.isArray(data.evaluations) && data.evaluations.length > 0
            ? data.evaluations
            : null

          if (list) {
            let filledIdx = 0
            prides.forEach((p, origIdx) => {
              if (p.trim().length > 0 && list[filledIdx]) {
                const item = list[filledIdx]
                const sc = typeof item.score === 'number' ? item.score : (typeof item.scale === 'number' ? item.scale : 8)
                if (!nextEvalMap[origIdx]) {
                  nextEvalMap[origIdx] = {
                    scale: Math.max(1, Math.min(10, Math.round(sc))),
                    verdict: String(item.verdict || item.comment || data.verdict || ''),
                    overcome: (Number(item.overcome) || 0) as OvercomeLevel,
                    tags: Array.isArray(item.tags) ? item.tags : ['#Дисциплина'],
                  }
                }
                filledIdx++
              }
            })
          }
        }
      } catch (err) {
        console.warn('Network error during computeEvaluations:', err)
      }
    }

    return nextEvalMap
  }

  /** Клик по ❓: подставляет наводящий контекстный вопрос в плейсхолдер */
  const handleHintQuestion = () => {
    playClick(soundEnabled)
    const questions = tab === 'pride' ? PRIDE_HINT_QUESTIONS : GRATITUDE_HINT_QUESTIONS
    const q = questions[hintIndex % questions.length]
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

  const uploadPhotoIfSelected = async (): Promise<string | null> => {
    if (!selectedFile) return photoId || preview
    try {
      const res = await uploadDayPhotoToStorage(selectedFile, selectedFile.name)
      if (res.ok && res.url) {
        return res.url
      }
    } catch (err) {
      console.warn('Storage upload error:', err)
    }
    return photoId || preview
  }

  const buildPayload = (
    evalMap: Record<number, PrideEvaluation> = evaluations,
    exactScore?: number,
    verdict?: string,
    photoUrlOverride?: string | null
  ): ComposerPayload => {
    // Ratings must be keyed by the compacted index (payload.prides has blanks removed)
    const ratings: Record<number, { scale: number; score?: number; overcome: OvercomeLevel; comment?: string }> = {}
    let filledIdx = 0
    prides.forEach((p, origIdx) => {
      if (p.trim().length === 0) return
      const ev = evalMap[origIdx]
      if (ev) {
        const sc = typeof ev.score === 'number' ? ev.score : ev.scale
        ratings[filledIdx] = {
          scale: Math.max(1, Math.min(10, Math.round(sc))),
          score: sc,
          overcome: (Math.min(3, Math.max(0, ev.overcome)) as OvercomeLevel) || 0,
          comment: ev.verdict,
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

    // Вычисляем точный средний балл (например 8.8) если не передан
    const prideScores = Object.values(ratings)
      .map((r) => r.score ?? r.scale)
      .filter((s): s is number => typeof s === 'number' && !isNaN(s) && s > 0)
    const computedScore = typeof exactScore === 'number' && !isNaN(exactScore)
      ? exactScore
      : (prideScores.length > 0 ? Number((prideScores.reduce((a, b) => a + b, 0) / prideScores.length).toFixed(1)) : undefined)

    const resolvedTargets = attachedTargets.length > 0
      ? attachedTargets
      : (preview ? [{ type: tab, index: activeSlot + 1 }] : [])

    return {
      prides: filledPrides,
      gratitudes: filledGratitudes,
      photo: photoUrlOverride !== undefined ? photoUrlOverride : (photoId || preview),
      attachedTargets: resolvedTargets,
      attached_targets: resolvedTargets,
      ratings,
      score: computedScore,
      aiScore: computedScore,
      aiVerdict: verdict,
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
      attachedTargets,
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

    setIsPublishing(true)
    try {
      const finalPhotoUrl = await uploadPhotoIfSelected()
      playSuccess(soundEnabled)
      onSaved(buildPayload(evaluations, undefined, undefined, finalPhotoUrl), editingDay?.id, editingDay ? undefined : dateISO)
      if (!editingDay) {
        try {
          localStorage.removeItem('ogonek.draft.composer')
        } catch {}
        onClearDraft?.()
      }
    } finally {
      setIsPublishing(false)
    }
  }

  const handleCeremonyComplete = async (
    evalMap: Record<number, PrideEvaluation>,
    mentorWord: string,
    avgScore: number
  ) => {
    setShowCeremonyModal(false)
    setEvaluations(evalMap)
    setRatingsAreDefault(false)
    playSuccess(soundEnabled)

    setIsPublishing(true)
    try {
      const finalPhotoUrl = await uploadPhotoIfSelected()
      const payload = buildPayload(evalMap, avgScore, mentorWord, finalPhotoUrl)
      onSaved(payload, editingDay?.id, editingDay ? undefined : dateISO)
      if (!editingDay) {
        try {
          localStorage.removeItem('ogonek.draft.composer')
        } catch {}
        onClearDraft?.()
      }
    } finally {
      setIsPublishing(false)
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
        <div className="relative w-full my-3 rounded-2xl overflow-hidden bg-black/60 border border-[#2f3336]">
          <div className="relative w-full min-h-[220px] max-h-[320px] flex items-center justify-center overflow-hidden bg-black/40">
            <img
              src={preview}
              className="max-h-[320px] w-full object-cover rounded-xl"
              alt="Фото дня"
            />
            {/* Аккуратный парящий крестик (✕) */}
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/70 hover:bg-black text-white/80 hover:text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition z-20"
              aria-label="Удалить фото"
            >
              ✕
            </button>

            {/* Мягкий градиент затемнения снизу фото */}
            <div className="absolute inset-x-0 bottom-0 pt-14 pb-3 px-3 bg-gradient-to-t from-black via-black/85 to-transparent z-10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#71767b] font-medium">К чему относится это фото?</span>
                <span className="text-[10px] text-zinc-400 font-mono">мультивыбор</span>
              </div>

              {/* Строка 1: Гордости */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#ff6b35] flex items-center gap-1 w-24 shrink-0">
                  🔥 Гордости:
                </span>
                <div className="flex items-center gap-1.5" role="group" aria-label="Привязка к гордостям">
                  {[1, 2, 3, 4, 5].map((num) => {
                    const active = isTargetActive('pride', num)
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleToggleTarget('pride', num)}
                        className={`w-6 h-6 rounded-full text-xs flex items-center justify-center transition ${
                          active
                            ? 'bg-[#ff6b35] text-white font-bold ring-2 ring-[#ff6b35]/40'
                            : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/10'
                        }`}
                        title={`Привязать к Гордости #${num}`}
                        aria-pressed={active}
                      >
                        {num}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Строка 2: Благодарности */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#f91880] flex items-center gap-1 w-24 shrink-0">
                  ❤️ Благ-сти:
                </span>
                <div className="flex items-center gap-1.5" role="group" aria-label="Привязка к благодарностям">
                  {[1, 2, 3, 4, 5].map((num) => {
                    const active = isTargetActive('gratitude', num)
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleToggleTarget('gratitude', num)}
                        className={`w-6 h-6 rounded-full text-xs flex items-center justify-center transition ${
                          active
                            ? 'bg-[#f91880] text-white font-bold ring-2 ring-[#f91880]/40'
                            : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/10'
                        }`}
                        title={`Привязать к Благодарности #${num}`}
                        aria-pressed={active}
                      >
                        {num}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Под полем ряд иконок: СТРОГО 2 ДЕЙСТВИЯ (Фото дня и Подсказка ❓), справа счётчик */}
      <div className="flex items-center justify-between pt-2.5 border-t border-[var(--border)]">
        <div className="flex items-center gap-1.5" role="group" aria-label="Инструменты записи">
          {/* Фото / Медиа */}
          <label
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer min-h-[40px] min-w-[40px]"
            title="Прикрепить фото дня"
            aria-label="Прикрепить фото дня"
          >
            <ImagePlus size={18} />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>

          {/* «Нужна идея?» — контекстная подсказка */}
          <Tooltip content="Нужна идея?">
            <button
              type="button"
              onClick={handleHintQuestion}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#71767b] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors min-h-[40px] min-w-[40px]"
              title="Нужна идея? (подставит контекстный вопрос в плейсхолдер)"
              aria-label="Нужна идея?"
            >
              <HelpCircle className="w-4 h-4 text-[#71767b]" />
            </button>
          </Tooltip>
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
            onNotify={onNotify}
          />,
          document.body
        )}
      </div>
    </ModalShell>
  )
}

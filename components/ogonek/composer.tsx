'use client'

import { BookmarkCheck, Briefcase, CalendarDays, Check, ChevronDown, Dumbbell, Flame, Globe, GraduationCap, Heart, HelpCircle, ImagePlus, ListPlus, Loader2, Lock, Mic, Send, Shield, Sparkles, Star, Users, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { createPortal } from 'react-dom'
import type { PrideEvaluation } from '@/lib/ogonek/evaluate-heuristic'
import { savePhoto, resolvePhotoUrl, uploadDayPhotoToStorage } from '@/lib/ogonek/photos'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { AttachedPhotoTarget, ChatGroupMeta, ComposerDraft, ComposerPayload, Day, Mode, OvercomeLevel, VisibilityLevel } from '@/lib/ogonek/types'
import { usePhotoUrl } from '@/lib/ogonek/use-photo-url'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { normalizeVisibility } from '@/lib/ogonek/visibility'
import { useBodyScrollLock } from '@/lib/ogonek/use-body-scroll-lock'
import { getTierLimits, normalizeTier } from '@/lib/ogonek/permissions'
import {
  isSingleUrl,
  parseListItems,
  distributeListItems,
  handleLargeTextPaste,
  splitRemainder,
  formatCharCount,
} from '@/lib/ogonek/smart-composer'
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

export const DRAFT_STORAGE_KEY = 'priday_draft'
export const SKIP_PUBLIC_WARNING_STORAGE_KEY = 'priday_skip_public_warning'

type Props = {
  initialDraft?: ComposerDraft | null
  editingDay?: Day | null
  /** Действие быстрого запуска с Главной ('photo' | 'date') */
  initialAction?: 'photo' | 'date' | null
  /** Next new day id (for display in title) */
  nextDayId?: number
  /** Next new day date ISO string (auto-populated from last day + 1) */
  nextDayDateISO?: string
  onSaveDraft?: (draft: ComposerDraft) => void
  onClearDraft?: () => void
  onClose: () => void
  onSaved: (payload: ComposerPayload, editingDayId?: number, dateISO?: string) => Promise<{ ok: boolean; error?: string } | void> | void
  soundEnabled?: boolean
  /** Уведомление пользователя (тосты) — для публикации в Сторис */
  onNotify?: (message: string) => void
}

function getCachedComposerDraft(): ComposerDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY) || localStorage.getItem('ogonek.draft.composer')
    return raw ? (JSON.parse(raw) as ComposerDraft) : null
  } catch {
    return null
  }
}

export function Composer({
  initialDraft: passedInitialDraft,
  editingDay,
  initialAction = null,
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
          score: typeof (p as any).score === 'number' ? (p as any).score : (typeof p.scale === 'number' ? p.scale : 7),
          overcome: typeof p.overcome === 'number' ? p.overcome : 0,
          tags: [],
          verdict: 'Оригинальная оценка дня',
        }
      })
      return evMap
    }
    if (initialDraft?.evaluations) {
      const evMap: Record<number, PrideEvaluation> = {}
      Object.entries(initialDraft.evaluations).forEach(([k, ev]) => {
        const idx = Number(k)
        if (ev) {
          evMap[idx] = {
            scale: ev.scale,
            score: ev.score,
            overcome: ev.overcome as OvercomeLevel,
            verdict: ev.verdict || '',
            tags: ev.tags || [],
          }
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
  const defaultVis: VisibilityLevel = storeState.privacy?.defaultDayVisibility || 'private'

  /** Приватность всего дня */
  const [dayVisibility, setDayVisibility] = useState<VisibilityLevel>(() => {
    if (editingDay?.visibility) return normalizeVisibility(editingDay.visibility)
    if (initialDraft?.visibility) return normalizeVisibility(initialDraft.visibility)
    return defaultVis
  })
  const [dayGroupId, setDayGroupId] = useState<string | null>(editingDay?.groupId ?? initialDraft?.groupId ?? null)
  const [dayGroupName, setDayGroupName] = useState<string | undefined>(editingDay?.groupName ?? initialDraft?.groupName)

  /** Приватность каждой гордости по её индексу в форме (0..5) */
  const [prideVis, setPrideVis] = useState<Record<number, VisibilityLevel>>(() => {
    if (editingDay && Array.isArray(editingDay.prides)) {
      const map: Record<number, VisibilityLevel> = {}
      editingDay.prides.forEach((p, idx) => {
        map[idx] = normalizeVisibility(p.visibility ?? editingDay.visibility ?? defaultVis)
      })
      return map
    }
    if (initialDraft?.prideVisibilities) return initialDraft.prideVisibilities
    return { 0: defaultVis, 1: defaultVis, 2: defaultVis, 3: defaultVis, 4: defaultVis }
  })

  const [prideGroupMap, setPrideGroupMap] = useState<Record<number, { id: string | null; name?: string }>>(() => {
    if (editingDay && Array.isArray(editingDay.prides)) {
      const map: Record<number, { id: string | null; name?: string }> = {}
      editingDay.prides.forEach((p, idx) => {
        if (p.groupId) map[idx] = { id: p.groupId, name: p.groupName }
      })
      return map
    }
    return {}
  })

  /** Приватность каждой благодарности по её индексу в форме (0..5) */
  const [gratitudeVis, setGratitudeVis] = useState<Record<number, VisibilityLevel>>(() => {
    if (editingDay && Array.isArray(editingDay.gratitudes)) {
      const map: Record<number, VisibilityLevel> = {}
      editingDay.gratitudes.forEach((g, idx) => {
        const vis = typeof g === 'object' && g.visibility ? g.visibility : (editingDay.visibility ?? defaultVis)
        map[idx] = normalizeVisibility(vis)
      })
      return map
    }
    if (initialDraft?.gratitudeVisibilities) return initialDraft.gratitudeVisibilities
    return { 0: defaultVis, 1: defaultVis, 2: defaultVis, 3: defaultVis, 4: defaultVis }
  })

  const [gratitudeGroupMap, setGratitudeGroupMap] = useState<Record<number, { id: string | null; name?: string }>>(() => {
    if (editingDay && Array.isArray(editingDay.gratitudes)) {
      const map: Record<number, { id: string | null; name?: string }> = {}
      editingDay.gratitudes.forEach((g, idx) => {
        if (typeof g === 'object' && g.groupId) map[idx] = { id: g.groupId, name: g.groupName }
      })
      return map
    }
    return {}
  })

  const [audienceMenuOpen, setAudienceMenuOpen] = useState(false)
  const audienceBtnRef = useRef<HTMLButtonElement | null>(null)
  const audienceMenuRef = useRef<HTMLDivElement | null>(null)
  const [audiencePos, setAudiencePos] = useState<{ top: number; left: number; width: number } | null>(null)
  const [showPublicWarning, setShowPublicWarning] = useState(false)
  const [dontShowPublicWarningAgain, setDontShowPublicWarningAgain] = useState(false)
  const [showHelpGuide, setShowHelpGuide] = useState(false)
  const dateInputRef = useRef<HTMLInputElement | null>(null)

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

  useEffect(() => {
    if (!audienceMenuOpen) {
      setAudiencePos(null)
      return
    }
    const updatePos = () => {
      if (!audienceBtnRef.current || typeof window === 'undefined') return
      const rect = audienceBtnRef.current.getBoundingClientRect()
      const menuWidth = 256
      const viewportW = window.innerWidth
      const viewportH = window.innerHeight
      const left = Math.max(12, Math.min(rect.right - menuWidth, viewportW - menuWidth - 12))
      const spaceBelow = viewportH - rect.bottom - 12
      const estimatedHeight = 290
      const top =
        spaceBelow >= 210 || rect.top < 240
          ? rect.bottom + 6
          : Math.max(12, rect.top - estimatedHeight - 6)
      setAudiencePos({ top, left, width: menuWidth })
    }
    updatePos()
    const onOutside = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (audienceBtnRef.current?.contains(target)) return
      if (audienceMenuRef.current?.contains(target)) return
      setAudienceMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAudienceMenuOpen(false)
      }
    }
    window.addEventListener('resize', updatePos)
    window.addEventListener('scroll', updatePos, true)
    document.addEventListener('mousedown', onOutside)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', updatePos)
      window.removeEventListener('scroll', updatePos, true)
      document.removeEventListener('mousedown', onOutside)
      window.removeEventListener('keydown', onKey)
    }
  }, [audienceMenuOpen])

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
        evaluations,
      }

      // Дебаунсированное сохранение черновика (не блокирует ввод и не сбивает стек Cmd+Z)
      const timer = setTimeout(() => {
        try {
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftPayload))
          localStorage.setItem('ogonek.draft.composer', JSON.stringify(draftPayload))
        } catch {}
        onSaveDraft?.(draftPayload)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [prides, gratitudes, preview, attachedTargets, tab, extra, onSaveDraft, editingDay, dayVisibility, prideVis, gratitudeVis, evaluations])

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (tierLimits.maxPhotosPerDay === 0) {
        playClick(soundEnabled)
        window.dispatchEvent(
          new CustomEvent('ogonek:open-upgrade', {
            detail: { feature: 'photos', force: true },
          })
        )
        onNotify?.('Прикрепление фото доступно на тарифе Премиум (на Базовом — 0 фото/день)')
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
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

  const userTier = normalizeTier(
    storeState.profile?.subscription_tier,
    storeState.profile?.subscription_expires_at
  )
  const tierLimits = getTierLimits(userTier)
  const maxChars = tierLimits.maxCharsPerEntry

  const didRunInitialActionRef = useRef(false)
  useEffect(() => {
    if (!initialAction || didRunInitialActionRef.current) return
    didRunInitialActionRef.current = true
    const timer = setTimeout(() => {
      if (initialAction === 'photo') {
        if (tierLimits.maxPhotosPerDay === 0) {
          window.dispatchEvent(
            new CustomEvent('ogonek:open-upgrade', {
              detail: { feature: 'photos', force: true },
            })
          )
          onNotify?.('Прикрепление фото доступно на тарифе Премиум (на Базовом — 0 фото/день)')
        } else {
          fileInputRef.current?.click()
        }
      } else if (initialAction === 'date') {
        const input = dateInputRef.current
        if (input) {
          input.focus()
          try {
            ;(input as any).showPicker?.()
          } catch {}
        }
      }
    }, 60)
    return () => clearTimeout(timer)
  }, [initialAction, tierLimits.maxPhotosPerDay, onNotify])

  // Validation: ensure no pride or gratitude exceeds maxChars
  const hasOverlongItem = useMemo(() => {
    return prides.some((p) => p.length > maxChars) || gratitudes.some((g) => g.length > maxChars)
  }, [prides, gratitudes, maxChars])

  // Validation: require at least level entries to publish (Правило 1 ТЗ) and within char limits
  const canPublish = filledPrides.length >= userLevel && !hasOverlongItem
  // Can save as draft with any content
  const canDraft = totalFilled > 0

  /**
   * Оценка гордостей дня через ИИ (/api/evaluate).
   */
  const computeEvaluations = async (): Promise<Record<number, PrideEvaluation>> => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
    const nextEvalMap: Record<number, PrideEvaluation> = { ...evaluations }

    if (isOnline && filledPrides.length > 0) {
      const currentUserId =
        storeState.auth.activeAccountId ||
        (storeState.profile as any)?.id ||
        storeState.profile.username ||
        '94e9eaf7-ec74-4366-9ce3-7de1e670f52b'

      try {
        const res = await fetch('/api/evaluate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUserId,
          },
          body: JSON.stringify({
            prides: filledPrides,
            gratitudes: filledGratitudes,
            userId: currentUserId,
          }),
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
    const prideGroupIds: Record<number, string | null> = {}
    const prideGroupNames: Record<number, string | undefined> = {}
    let visIdx = 0
    prides.forEach((p, origIdx) => {
      if (p.trim().length === 0) return
      prideVisibilities[visIdx] = normalizeVisibility(prideVis[origIdx] ?? dayVisibility)
      prideGroupIds[visIdx] = prideGroupMap[origIdx]?.id || null
      prideGroupNames[visIdx] = prideGroupMap[origIdx]?.name
      visIdx++
    })

    const gratitudeVisibilities: Record<number, VisibilityLevel> = {}
    const gratitudeGroupIds: Record<number, string | null> = {}
    const gratitudeGroupNames: Record<number, string | undefined> = {}
    let gVisIdx = 0
    gratitudes.forEach((g, origIdx) => {
      if (g.trim().length === 0) return
      gratitudeVisibilities[gVisIdx] = normalizeVisibility(gratitudeVis[origIdx] ?? dayVisibility)
      gratitudeGroupIds[gVisIdx] = gratitudeGroupMap[origIdx]?.id || null
      gratitudeGroupNames[gVisIdx] = gratitudeGroupMap[origIdx]?.name
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
      groupId: dayGroupId,
      groupName: dayGroupName,
      prideVisibilities,
      prideGroupIds,
      prideGroupNames,
      gratitudeVisibilities,
      gratitudeGroupIds,
      gratitudeGroupNames,
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
    if (hasOverlongItem) {
      onNotify?.(`Длина записи превышает лимит тарифа (${maxChars} симв.)`)
      return
    }
    const publishEnabled = editingDay ? totalFilled > 0 && !hasOverlongItem : canPublish
    if (!publishEnabled || isPublishing || isEvaluating) return

    // Интерактивная AI-церемония торжественной оценки дня
    if (filledPrides.length > 0) {
      setShowCeremonyModal(true)
      return
    }

    setIsPublishing(true)
    try {
      const finalPhotoUrl = await uploadPhotoIfSelected()
      const payload = buildPayload(evaluations, undefined, undefined, finalPhotoUrl)
      const res = await onSaved(payload, editingDay?.id, editingDay ? undefined : dateISO)
      if (res && typeof res === 'object' && 'ok' in res && res.ok === false) {
        onNotify?.(`❌ ${res.error || 'Ошибка при сохранении в Supabase'}`)
        setIsPublishing(false)
        return
      }
      playSuccess(soundEnabled)
      if (!editingDay) {
        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY)
          localStorage.removeItem('ogonek.draft.composer')
        } catch {}
        onClearDraft?.()
      }
      onClose()
    } catch (err: any) {
      onNotify?.(`❌ Ошибка сохранения: ${err?.message || 'Не удалось сохранить запись'}`)
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

    setIsPublishing(true)
    try {
      const finalPhotoUrl = await uploadPhotoIfSelected()
      const payload = buildPayload(evalMap, avgScore, mentorWord, finalPhotoUrl)
      const res = await onSaved(payload, editingDay?.id, editingDay ? undefined : dateISO)
      if (res && typeof res === 'object' && 'ok' in res && res.ok === false) {
        onNotify?.(`❌ ${res.error || 'Ошибка при сохранении в Supabase'}`)
        setIsPublishing(false)
        return
      }
      playSuccess(soundEnabled)
      if (!editingDay) {
        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY)
          localStorage.removeItem('ogonek.draft.composer')
        } catch {}
        onClearDraft?.()
      }
      onClose()
    } catch (err: any) {
      onNotify?.(`❌ Ошибка сохранения: ${err?.message || 'Не удалось сохранить запись'}`)
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
  const currentLength = activeValue.length
  const charRatio = maxChars > 0 ? currentLength / maxChars : 0
  const isOverLimit = currentLength > maxChars
  const showCharCounter = charRatio > 0.7 || isOverLimit
  const isCharLimitDanger = isOverLimit || charRatio >= 0.95
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cursorRef = useRef<number | null>(null)
  const pendingCursorPosRef = useRef<'start' | 'end' | null>(null)

  const [showPhotoUpsell, setShowPhotoUpsell] = useState(false)
  const [smartToast, setSmartToast] = useState<{
    id: string
    message: string
    undoAction?: () => void
  } | null>(null)
  const smartToastTimerRef = useRef<NodeJS.Timeout | null>(null)

  const showSmartToast = (message: string, undoAction?: () => void) => {
    if (smartToastTimerRef.current) {
      clearTimeout(smartToastTimerRef.current)
    }
    setSmartToast({
      id: String(Date.now()),
      message,
      undoAction,
    })
    onNotify?.(message + (undoAction ? ' · Отменить' : ''))
    smartToastTimerRef.current = setTimeout(() => {
      setSmartToast(null)
    }, 4500)
  }

  const handleImagePaste = async (file: File) => {
    if (tierLimits.maxPhotosPerDay === 0) {
      playClick(soundEnabled)
      window.dispatchEvent(
        new CustomEvent('ogonek:open-upgrade', {
          detail: { feature: 'photos', force: true },
        })
      )
      onNotify?.('Прикрепление фото доступно на тарифе Премиум (на Базовом — 0 фото/день)')
      return
    }

    playClick(soundEnabled)
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
    } catch {}
    showSmartToast('Фото прикреплено к записи')
  }

  const handleSplitRemainder = () => {
    playClick(soundEnabled)
    const activeValues = tab === 'pride' ? prides : gratitudes
    const result = splitRemainder(activeValues, activeSlot, maxChars)

    if (tab === 'pride') {
      setPrides(result.newValues)
    } else {
      setGratitudes(result.newValues)
    }

    setActiveSlot(result.remainderSlot)
    pendingCursorPosRef.current = 'start'
    const labelItem = tab === 'pride' ? 'гордость' : 'благодарность'
    showSmartToast(`Остаток перенесён в ${labelItem} №${result.remainderSlot + 1}`)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // 1. Проверяем изображение в буфере (Part 2)
    const items = e.clipboardData?.items
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            handleImagePaste(file)
          }
          return
        }
      }
    }

    // 2. Получаем вставленный текст
    const pastedText = e.clipboardData?.getData('text')
    if (!pastedText) return

    // (c) Одиночная ссылка отдельно: остаётся ссылкой, слот не переключается
    if (isSingleUrl(pastedText)) {
      return
    }

    // (b) Список (нумерация, маркеры или несколько абзацев): раскладываем по слотам (до 3)
    const listItems = parseListItems(pastedText)
    if (listItems && listItems.length >= 2) {
      e.preventDefault()
      const prevPrides = [...prides]
      const prevGratitudes = [...gratitudes]
      const prevSlot = activeSlot
      const activeValues = tab === 'pride' ? prides : gratitudes

      const distResult = distributeListItems(activeValues, activeSlot, listItems)

      if (tab === 'pride') {
        setPrides(distResult.newValues)
      } else {
        setGratitudes(distResult.newValues)
      }

      setActiveSlot(distResult.nextFocusSlot)

      const labelPlural = tab === 'pride' ? 'гордостям' : 'благодарностям'
      showSmartToast(`Разложил по ${distResult.distributedCount} ${labelPlural}`, () => {
        if (tab === 'pride') {
          setPrides(prevPrides)
        } else {
          setGratitudes(prevGratitudes)
        }
        setActiveSlot(prevSlot)
        onNotify?.('Вставка списка отменена')
      })
      return
    }

    // Для обычного текста (включая длинный) позволяем браузеру вставить текст нативно,
    // чтобы сохранить целостность нативного стека отмены (Cmd+Z / Ctrl+Z).
  }

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

  // Защита позиции курсора при смене слота клавиатурой (↑ в конец, ↓ в начало)
  useEffect(() => {
    if (textareaRef.current && pendingCursorPosRef.current) {
      const posType = pendingCursorPosRef.current
      pendingCursorPosRef.current = null
      const len = textareaRef.current.value.length
      const pos = posType === 'end' ? len : 0
      try {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(pos, pos)
      } catch {}
    }
  }, [activeSlot])

  const handleSwitchTab = (nextTab: Mode) => {
    playClick(soundEnabled)
    setTab(nextTab)
    const targetList = nextTab === 'gratitude' ? gratitudes : prides
    const firstEmptyIdx = targetList.slice(0, 5).findIndex((item) => !item || item.trim().length === 0)
    setActiveSlot(firstEmptyIdx >= 0 ? firstEmptyIdx : 0)
  }

  const userGroups = useMemo(() => {
    const threads = storeState.chatThreads ?? {}
    const list: ChatGroupMeta[] = []
    Object.values(threads).forEach((t) => {
      if (t.groupMeta) list.push(t.groupMeta)
    })
    return list
  }, [storeState.chatThreads])

  const currentSlotVis: VisibilityLevel =
    (tab === 'pride' ? prideVis[activeSlot] : gratitudeVis[activeSlot]) || defaultVis
  const currentSlotGroup =
    tab === 'pride' ? prideGroupMap[activeSlot] : gratitudeGroupMap[activeSlot]
  const currentSlotGroupId = currentSlotGroup?.id || null

  const currentSlotAudienceLabel = useMemo(() => {
    if (currentSlotVis === 'private') return 'Лично'
    if (currentSlotVis === 'friends') return 'Друзьям'
    if (currentSlotVis === 'group') {
      return currentSlotGroup?.name || 'Группе'
    }
    return 'Всем'
  }, [currentSlotVis, currentSlotGroup])

  const currentSlotScore = useMemo(() => {
    if (tab !== 'pride') return null
    const ev = evaluations[activeSlot]
    if (!ev) return null
    const sc = typeof ev.score === 'number' ? ev.score : ev.scale
    return typeof sc === 'number' && !isNaN(sc) && sc > 0 ? Number(sc.toFixed(1)) : null
  }, [tab, evaluations, activeSlot])

  const selectAudience = (level: VisibilityLevel) => {
    playClick(soundEnabled)
    if (tab === 'pride') {
      setPrideVis((prev) => ({ ...prev, [activeSlot]: level }))
      setPrideGroupMap((prev) => {
        const next = { ...prev }
        delete next[activeSlot]
        return next
      })
    } else {
      setGratitudeVis((prev) => ({ ...prev, [activeSlot]: level }))
      setGratitudeGroupMap((prev) => {
        const next = { ...prev }
        delete next[activeSlot]
        return next
      })
    }
    setAudienceMenuOpen(false)
    const label = level === 'private' ? 'Лично 🔒' : level === 'friends' ? 'Друзьям 👥' : 'Всем 🌐'
    onNotify?.(`${tab === 'pride' ? 'Гордость' : 'Благодарность'} #${activeSlot + 1}: ${label}`)
  }

  const selectGroupAudience = (groupId: string, groupName: string) => {
    playClick(soundEnabled)
    if (tab === 'pride') {
      setPrideVis((prev) => ({ ...prev, [activeSlot]: 'group' }))
      setPrideGroupMap((prev) => ({ ...prev, [activeSlot]: { id: groupId, name: groupName } }))
    } else {
      setGratitudeVis((prev) => ({ ...prev, [activeSlot]: 'group' }))
      setGratitudeGroupMap((prev) => ({ ...prev, [activeSlot]: { id: groupId, name: groupName } }))
    }
    setAudienceMenuOpen(false)
    onNotify?.(`${tab === 'pride' ? 'Гордость' : 'Благодарность'} #${activeSlot + 1} видна группе «${groupName}» 👥`)
  }

  const requestPublicAudience = () => {
    playClick(soundEnabled)
    setAudienceMenuOpen(false)
    if (typeof window !== 'undefined') {
      try {
        if (window.localStorage.getItem(SKIP_PUBLIC_WARNING_STORAGE_KEY) === '1') {
          confirmPublicAudience()
          return
        }
      } catch {}
    }
    setDontShowPublicWarningAgain(false)
    setShowPublicWarning(true)
  }

  const confirmPublicAudience = () => {
    playClick(soundEnabled)
    selectAudience('public')
  }

  const handleApplyToAll = () => {
    playClick(soundEnabled)
    const currentVis = currentSlotVis
    const currentGrp = currentSlotGroup
    const allVis = { 0: currentVis, 1: currentVis, 2: currentVis, 3: currentVis, 4: currentVis }
    const allGrp: Record<number, { id: string | null; name?: string }> = currentGrp
      ? { 0: currentGrp, 1: currentGrp, 2: currentGrp, 3: currentGrp, 4: currentGrp }
      : {}
    setPrideVis(allVis)
    setGratitudeVis(allVis)
    setPrideGroupMap(allGrp)
    setGratitudeGroupMap(allGrp)
    setDayVisibility(currentVis)
    setDayGroupId(currentGrp?.id || null)
    setDayGroupName(currentGrp?.name)
    setAudienceMenuOpen(false)
    onNotify?.(`Аудитория «${currentSlotAudienceLabel}» применена ко всем записям дня`)
  }

  const isCurrentTabAllPrivate = useMemo(() => {
    const visMap = tab === 'pride' ? prideVis : gratitudeVis
    return [0, 1, 2, 3, 4].every((slot) => (visMap[slot] || dayVisibility || 'private') === 'private')
  }, [tab, prideVis, gratitudeVis, dayVisibility])

  const handleToggleAllVisibility = () => {
    const targetLevel: VisibilityLevel = currentSlotVis === 'private' ? 'private' : 'public'
    handleApplyToAll()
  }

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
      modalClassName="!w-full !max-w-[600px] !rounded-2xl !bg-[#060608] !border !border-white/[0.14]"
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
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-all min-h-[34px] cursor-pointer ${
                tab === 'pride'
                  ? 'bg-[#d76737] text-black shadow-sm'
                  : 'text-[var(--text-2)] hover:text-[var(--text)]'
              }`}
            >
              Гордость
            </button>
            <button
              type="button"
              role="tab"
              data-tour="composer-gratitude"
              aria-selected={tab === 'gratitude'}
              onClick={() => handleSwitchTab('gratitude')}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-all min-h-[34px] cursor-pointer ${
                tab === 'gratitude'
                  ? 'bg-[#d76737] text-black shadow-sm'
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
                    isFilled ? 'bg-[#d76737] scale-110' : 'bg-[var(--text-3)]/30'
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
          id="composer-publish-btn"
          data-tour="composer-save"
          onClick={handlePublish}
          disabled={isPublishing || (editingDay ? totalFilled === 0 || hasOverlongItem : !canPublish)}
          title={
            hasOverlongItem
              ? `Длина записи превышает лимит тарифа (${maxChars} симв.)`
              : !canPublish && !editingDay
              ? `Заполните минимум ${userLevel} гордости`
              : 'Опубликовать день'
          }
          className="px-4 py-1.5 rounded-full text-[14px] font-bold min-h-[34px] bg-[#d76737] hover:bg-[#e0784b] active:bg-[#bd562b] text-black disabled:opacity-40 shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          {isPublishing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
              <span>Запись…</span>
            </>
          ) : (
            'Записать'
          )}
        </button>
      </div>

      {/* Переключатель слотов пунктов 1..5 */}
      <div className="flex items-center justify-between gap-2 py-1 mb-1 flex-wrap">
        <div
          className="flex items-center gap-1.5"
          role="group"
          aria-label="Пункты записи"
          data-tour="composer-slots"
        >
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
                className={`relative w-8 h-8 rounded-full font-mono text-[13px] font-bold transition-all flex items-center justify-center min-h-[34px] min-w-[34px] cursor-pointer ${
                  isActive
                    ? 'bg-[#d76737] text-black shadow-sm ring-2 ring-[#d76737]/30'
                    : isFilled
                    ? 'bg-white/[0.08] text-white border border-white/25 hover:bg-white/[0.12]'
                    : 'bg-white/[0.03] text-white/50 border border-white/[0.09] hover:bg-white/[0.07]'
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

        <div className="relative flex items-center gap-2">
          {/* Компактная дата дня */}
          {!editingDay && (
            <label
              className="relative h-8 px-2.5 rounded-full text-xs font-medium flex items-center gap-1.5 bg-white/[0.05] text-white/75 border border-white/[0.1] hover:border-white/25 hover:text-white transition-colors cursor-pointer"
              title="Дата записываемого дня"
            >
              <CalendarDays size={13} className="text-white/55 shrink-0" />
              <span>
                {(() => {
                  const d = new Date(dateISO)
                  return Number.isFinite(d.getTime())
                    ? d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                    : 'Сегодня'
                })()}
              </span>
              <input
                ref={dateInputRef}
                type="date"
                aria-label="Дата дня"
                value={dateISO.slice(0, 10)}
                onChange={(e) => {
                  if (e.target.value) {
                    setDateISO(new Date(`${e.target.value}T12:00:00`).toISOString())
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </label>
          )}

          {/* Маленькая чип-кнопка «Лично ▾» (аудитория рендерится в Portal поверх модалки) */}
          <button
            ref={audienceBtnRef}
            type="button"
            id="composer-audience-chip"
            data-tour="composer-audience"
            onClick={() => {
              playClick(soundEnabled)
              setAudienceMenuOpen((prev) => !prev)
            }}
            className="h-8 px-2.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors border bg-white/[0.06] text-white/85 border-white/[0.12] hover:bg-white/[0.1] hover:text-white cursor-pointer"
            title="Выбрать аудиторию для этой записи"
            aria-expanded={audienceMenuOpen}
          >
            {currentSlotVis === 'private' && <Lock size={12} className="text-white/55" />}
            {currentSlotVis === 'friends' && <Users size={12} className="text-white/75" />}
            {currentSlotVis === 'group' && <Users size={12} className="text-[#d76737]" />}
            {currentSlotVis === 'public' && <Globe size={12} className="text-white/75" />}
            <span>{currentSlotAudienceLabel}</span>
            <ChevronDown size={11} className="opacity-70 ml-0.5" />
          </button>

          {/* Рядом компактная кнопка-ссылка: Применить ко всем */}
          <button
            type="button"
            onClick={handleApplyToAll}
            className="text-[11px] text-[#71767b] hover:text-white transition-colors whitespace-nowrap px-1 py-1 cursor-pointer"
            title={`Применить "${currentSlotAudienceLabel}" ко всем записям дня`}
          >
            Применить ко всем
          </button>
        </div>
      </div>

      {/* Выпадающее меню аудитории через React Portal поверх всей модалки */}
      {audienceMenuOpen &&
        audiencePos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={audienceMenuRef}
            role="menu"
            aria-label="Выбрать аудиторию"
            className="rounded-2xl p-2 shadow-[0_24px_80px_rgba(0,0,0,0.95)] flex flex-col gap-1 border border-white/[0.14]"
            style={{
              position: 'fixed',
              top: audiencePos.top,
              left: audiencePos.left,
              width: audiencePos.width,
              zIndex: 120,
              background: '#08080a',
            }}
          >
            <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white/45">
              Кому видно эту запись:
            </div>

            {/* 1. Лично */}
            <button
              type="button"
              id="composer-audience-option-private"
              onClick={() => selectAudience('private')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                currentSlotVis === 'private'
                  ? 'bg-white/[0.1] text-white font-semibold'
                  : 'text-white/75 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Lock size={13} className="text-white/55" />
                <div>
                  <div>Лично</div>
                  <div className="text-[10px] text-white/45 font-normal">Только в моём дневнике</div>
                </div>
              </div>
              {currentSlotVis === 'private' && <Check size={14} className="text-[#d76737]" />}
            </button>

            {/* 2. Друзьям */}
            <button
              type="button"
              id="composer-audience-option-friends"
              onClick={() => selectAudience('friends')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                currentSlotVis === 'friends'
                  ? 'bg-white/[0.1] text-white font-semibold'
                  : 'text-white/75 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users size={13} className="text-white/55" />
                <div>
                  <div>Друзьям</div>
                  <div className="text-[10px] text-white/45 font-normal">Видно подтверждённым друзьям</div>
                </div>
              </div>
              {currentSlotVis === 'friends' && <Check size={14} className="text-[#d76737]" />}
            </button>

            {/* 3. Всем */}
            <button
              type="button"
              id="composer-audience-option-public"
              onClick={requestPublicAudience}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                currentSlotVis === 'public'
                  ? 'bg-white/[0.1] text-white font-semibold'
                  : 'text-white/75 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Globe size={13} className="text-white/55" />
                <div>
                  <div>Всем</div>
                  <div className="text-[10px] text-white/45 font-normal">Глобальная лента Priday</div>
                </div>
              </div>
              {currentSlotVis === 'public' && <Check size={14} className="text-[#d76737]" />}
            </button>

            {/* Разделитель и секция групп */}
            <div className="my-1 border-t border-white/[0.08]" />
            <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white/45 flex items-center justify-between">
              <span>Группы:</span>
              {userGroups.length === 0 && (
                <span className="text-[10px] font-normal normal-case text-white/35">нет созданных</span>
              )}
            </div>

            {userGroups.map((g) => {
              const isGroupSelected = currentSlotVis === 'group' && currentSlotGroupId === g.id
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => selectGroupAudience(g.id, g.title)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                    isGroupSelected
                      ? 'bg-[#d76737]/15 text-white font-semibold'
                      : 'text-white/75 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-white/[0.08] text-white">
                      {g.avatarEmoji || '👥'}
                    </span>
                    <div>
                      <div>{g.title}</div>
                      <div className="text-[10px] text-white/45 font-normal">
                        {g.memberIds.length} уч.
                      </div>
                    </div>
                  </div>
                  {isGroupSelected && <Check size={14} className="text-[#d76737]" />}
                </button>
              )
            })}
          </div>,
          document.body
        )}

      {/* 2. Большое поле 20px без рамки */}
      <textarea
        key={`${tab}-${activeSlot}`}
        ref={textareaRef}
        id="composer-slot-textarea"
        data-tour="composer-pride"
        autoFocus
        rows={4}
        value={activeValue}
        onChange={(e) => handleActiveChange(e.target.value)}
        onPaste={handlePaste}
        onKeyDown={(e) => {
          // 1. Ctrl/Cmd+Enter = Записать
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault()
            handlePublish()
            return
          }

          // 2. Tab / Shift+Tab между слотами 1..5
          if (e.key === 'Tab') {
            e.preventDefault()
            const next = e.shiftKey ? (activeSlot + 4) % 5 : (activeSlot + 1) % 5
            setActiveSlot(next)
            return
          }

          // 3. ↑ в начале поля = предыдущий слот (курсор в конец)
          if (e.key === 'ArrowUp') {
            const isAtStart = e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === 0
            if (isAtStart && activeSlot > 0) {
              e.preventDefault()
              pendingCursorPosRef.current = 'end'
              setActiveSlot(activeSlot - 1)
              return
            }
          }

          // 4. ↓ в конце поля = следующий слот (курсор в начало)
          if (e.key === 'ArrowDown') {
            const isAtEnd =
              e.currentTarget.selectionStart === activeValue.length &&
              e.currentTarget.selectionEnd === activeValue.length
            if (isAtEnd && activeSlot < 4) {
              e.preventDefault()
              pendingCursorPosRef.current = 'start'
              setActiveSlot(activeSlot + 1)
              return
            }
          }

          // 5. Enter без Shift в заполненном поле -> следующий слот
          if (e.key === 'Enter' && !e.shiftKey && activeValue.trim().length > 0 && activeSlot < 4) {
            e.preventDefault()
            setActiveSlot(activeSlot + 1)
            return
          }
        }}
        placeholder={
          customPlaceholder ||
          (tab === 'pride'
            ? 'Что получилось? Чем гордишься сегодня?'
            : 'За что благодарен сегодня?')
        }
        className="w-full bg-transparent text-[20px] leading-[28px] text-[var(--text)] placeholder:text-[var(--text-3)] border-0 outline-none resize-none p-0 focus:ring-0 my-3 min-h-[190px] sm:min-h-[210px]"
        aria-label={`Пункт ${activeSlot + 1}`}
      />

      {/* Живой счётчик символов и раскладывание остатка (CONTRACT Шаг 05 & Шаг 11) */}
      {showCharCounter && (
        <div className="flex items-center justify-between -mt-2 mb-2 px-1">
          {isOverLimit ? (
            <button
              type="button"
              id="composer-split-remainder-btn"
              onClick={handleSplitRemainder}
              className="text-[11px] text-[var(--accent)] hover:underline font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Разложить превышающий остаток в следующую запись"
            >
              <span>
                Разложить остаток в следующую {tab === 'pride' ? 'гордость' : 'благодарность'} →
              </span>
            </button>
          ) : (
            <div />
          )}
          <span
            id="composer-char-counter"
            className={`text-[11px] font-mono transition-colors ${
              isCharLimitDanger
                ? 'text-rose-500 font-bold'
                : 'text-[var(--text-3)]'
            }`}
            aria-live="polite"
            title={isOverLimit ? `Превышен лимит тарифа (${maxChars} симв.)` : undefined}
          >
            {formatCharCount(currentLength, maxChars)}
          </span>
        </div>
      )}

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
                <span className="text-[11px] font-bold text-[#d76737] flex items-center gap-1 w-24 shrink-0">
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
                            ? 'bg-[#d76737] text-black font-bold ring-2 ring-[#d76737]/40'
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
                <span className="text-[11px] font-bold text-white/75 flex items-center gap-1 w-24 shrink-0">
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
                            ? 'bg-[#d76737] text-black font-bold ring-2 ring-[#d76737]/40'
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

      {/* Короткая памятка «Как записывать гордости» при клике по ? */}
      {showHelpGuide && (
        <div
          id="composer-help-guide"
          className="mb-2.5 rounded-xl border border-white/[0.12] bg-[#0a0a0c] p-3 text-xs text-white/80 flex items-start justify-between gap-3"
        >
          <div className="space-y-1">
            <p className="font-semibold text-white">Как записывать гордости</p>
            <p className="text-white/65 leading-relaxed">
              Запиши 1–5 конкретных преодолений или побед дня и 1–5 благодарностей. Слот выбирается сверху, а видимость каждой записи можно задать кнопкой аудитории («Лично», «Друзьям» или «Всем»).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowHelpGuide(false)}
            aria-label="Скрыть подсказку"
            className="w-6 h-6 rounded-full flex items-center justify-center text-white/45 hover:text-white hover:bg-white/[0.08] shrink-0 cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* 3. Нижняя панель: слева только фото, справа компактная ?-подсказка и 1/5 */}
      <div className="flex items-center justify-between pt-2.5 border-t border-[var(--border)]">
        <div className="flex items-center gap-1.5" role="group" aria-label="Инструменты записи">
          {/* Фото / Медиа */}
          <label
            id="composer-attach-photo-btn"
            onClick={(e) => {
              if (tierLimits.maxPhotosPerDay === 0) {
                e.preventDefault()
                playClick(soundEnabled)
                window.dispatchEvent(
                  new CustomEvent('ogonek:open-upgrade', {
                    detail: { feature: 'photos', force: true },
                  })
                )
                onNotify?.('Прикрепление фото доступно на тарифе Премиум (на Базовом — 0 фото/день)')
              }
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
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
        </div>

        {/* Справа компактная подсказка ? + счётчик 1/5 */}
        <div className="flex items-center gap-2">
          <Tooltip content="Как записывать гордости">
            <button
              type="button"
              data-tour="composer-help"
              id="composer-help-btn"
              onClick={() => {
                playClick(soundEnabled)
                setShowHelpGuide((prev) => !prev)
              }}
              aria-expanded={showHelpGuide}
              aria-label="Как записывать гордости"
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                showHelpGuide
                  ? 'bg-white/[0.12] text-white'
                  : 'text-white/45 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </Tooltip>
          <span className="text-[13px] font-bold text-white/70 font-mono tabular-nums">
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
      {/* Мягкое предупреждение при выборе «Всем» (CONTRACT Шаг 09) */}
      {showPublicWarning && (
        <div
          id="composer-public-warning-modal"
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/85 backdrop-blur-[4px]"
          onClick={() => setShowPublicWarning(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 shadow-[0_24px_80px_rgba(0,0,0,0.95)] flex flex-col gap-3 border"
            style={{ background: '#060608', borderColor: 'rgba(255,255,255,0.14)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-white font-bold text-sm">
              <Globe size={18} className="text-[#d76737]" />
              <span>Публичная запись</span>
            </div>
            <p className="text-xs text-[var(--text-2)] leading-relaxed">
              Эта запись появится в общей глобальной ленте и будет видна всем пользователям сервиса.
              Убедись, что текст не содержит конфиденциальных личных данных.
            </p>
            <label className="flex items-center gap-2 text-xs text-white/75 cursor-pointer select-none pt-0.5">
              <input
                id="composer-public-warning-skip"
                type="checkbox"
                checked={dontShowPublicWarningAgain}
                onChange={(e) => setDontShowPublicWarningAgain(e.target.checked)}
                className="w-4 h-4 rounded border-white/25 bg-black accent-[#d76737] cursor-pointer"
              />
              <span>Не показывать больше</span>
            </label>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPublicWarning(false)}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium text-[var(--muted)] hover:text-white cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                id="composer-public-warning-confirm"
                onClick={() => {
                  if (dontShowPublicWarningAgain && typeof window !== 'undefined') {
                    try {
                      window.localStorage.setItem(SKIP_PUBLIC_WARNING_STORAGE_KEY, '1')
                    } catch {}
                  }
                  confirmPublicAudience()
                  setShowPublicWarning(false)
                }}
                className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#d76737] hover:bg-[#e0784b] active:bg-[#bd562b] text-black transition-colors cursor-pointer"
              >
                Понятно, открыть всем
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Интерактивный тост умной вставки (CONTRACT Шаг 11) */}
      {smartToast && (
        <div
          id="composer-smart-toast"
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-[#e7e9ea] text-[#090a0b] px-4 py-2.5 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2 border border-white/20"
        >
          <span>{smartToast.message}</span>
          {smartToast.undoAction && (
            <button
              type="button"
              id="composer-smart-toast-undo"
              onClick={() => {
                playClick(soundEnabled)
                smartToast.undoAction!()
              }}
              className="ml-1 text-[var(--accent)] font-bold hover:underline cursor-pointer"
            >
              · Отменить
            </button>
          )}
        </div>
      )}

      {/* Модальное окно предложения апгрейда при вставке фото на Free тарифе (CONTRACT Шаг 11) */}
      {showPhotoUpsell && (
        <div
          id="composer-photo-upsell-modal"
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/85 backdrop-blur-[4px]"
          onClick={() => setShowPhotoUpsell(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 shadow-[0_24px_80px_rgba(0,0,0,0.95)] flex flex-col gap-3 border"
            style={{ background: '#060608', borderColor: 'rgba(255,255,255,0.14)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
              <Sparkles size={18} className="text-amber-400" />
              <span>Прикрепление фото</span>
            </div>
            <p className="text-xs text-[var(--text-2)] leading-relaxed">
              Прикрепление фотографий к записям доступно на тарифах <strong>Премиум</strong> и <strong>Ultra</strong> (на тарифе Базовый лимит — 0 фото в день).
            </p>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Обновите тариф в профиле или настройках, чтобы добавлять фотографии к вашим победам!
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                id="composer-photo-upsell-close"
                onClick={() => setShowPhotoUpsell(false)}
                className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#d76737] hover:bg-[#e0784b] text-black transition-colors cursor-pointer"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </ModalShell>
  )
}

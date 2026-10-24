'use client'

import { useCallback, useSyncExternalStore } from 'react'
import {
  DEMO_ACCOUNT_PASSWORD,
  accountSnapshotFromProfile,
  createAccount,
  findAccountByEmail,
  isValidEmail,
  normalizeEmail,
  profilePatchFromAccount,
  sanitizeAuthState,
  takenUsernamesOf,
} from './accounts'
import { buildDemoComments, SUPPORT_PERSONAS } from './comments'
import { computeAchievementProgress } from './achievement-regulation'
import {
  MODERATION_STATUS_META,
  DEFAULT_MODERATION_INBOX,
  achievementStatusFromModeration,
  appendReviewEvent,
  buildModerationSubmissionPayload,
  createSubmissionRecord,
  isReadyForModeration,
  makeTrackingCode,
} from './achievement-moderation'
import type { ModerationEmailAttachment } from './achievement-moderation'
import {
  DEFAULT_INCOMING_FRIEND_REQUEST_IDS,
  DEFAULT_OUTGOING_FRIEND_REQUEST_IDS,
  getFriend,
} from './friends'
import { evaluatePrideItemHeuristic } from './evaluate-heuristic'
import {
  DEFAULT_MONTHLY_KPIS,
  clampKpiTarget,
  createMonthlyKpi,
  getKpiKind,
  isKpiKind,
  sanitizeMonthlyKpis,
} from './kpi'
import {
  CHAT_MESSAGE_LIMIT,
  DEFAULT_CHAT_FOLDERS,
  DEFAULT_CHAT_SETTINGS,
  MY_CHAT_ID,
  emptyThread,
  isGroupThread,
  makeChatMessage,
  pickAutoReply,
  sanitizeChatThreads,
  threadOf,
  unreadCount,
} from './messenger'
import type {
  ChatGroupMeta,
  ChatMessageForward,
  ChatMessageMedia,
  ChatMessageReply,
} from './types'
import {
  applyStepStatus,
  createMorningFocusRecord,
  finalizeEveningReview,
  migrateIntentionsToHistory,
  sanitizeMorningFocusHistory,
} from './morning-focus'
import {
  DEFAULT_STORE_STATE,
  loadStore,
  saveStore,
  STORAGE_KEY,
  sanitizeAccent,
  sanitizeChatActiveFriendId,
  sanitizeExploreFollowingIds,
  sanitizeExplorePostIds,
  sanitizeExploreRecentSearches,
  sanitizeFeedDensity,
  sanitizeFontScale,
  sanitizeMyStories,
  sanitizeTheme,
  sanitizeVerifiedAchievements,
  sanitizeViewedStoryIds,
} from './storage'
import type {
  AchievementEvidenceFile,
  AchievementRegulation,
  AchievementStatus,
  AccentId,
  AppSecurityState,
  ChatAttachment,
  ChatMessage,
  ChatMessageType,
  ChatPoll,
  ChatFolder,
  ChatTag,
  ChatSettings,
  ChatThreads,
  LevelHistoryEntry,
  Comment,
  CommentPersona,
  ComposerDraft,
  ComposerPayload,
  CustomEmoji,
  Day,
  EvidenceItem,
  FeedDensityId,
  FontScaleId,
  InteractionAudience,
  ModerationChannel,
  ModerationDelivery,
  ModerationStatus,
  MonthlyKpi,
  KpiKind,
  MyReactions,
  MyStory,
  MorningFocusStepStatus,
  OgonekProfile,
  OgonekStoreState,
  PrideEntry,
  PrivacySettings,
  ProfileVisibility,
  ReactionCounts,
  SecurityAuditKind,
  StreakSettings,
  ThemeMode,
  VerifiedAchievement,
  VisibilityLevel,
} from './types'
import { withGratitudeRating } from './reactions'
import {
  DEFAULT_SECURITY_STATE,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  PIN_LENGTH,
  appendSecurityEvent,
  attemptsLeft,
  computeLockout,
  generateSalt,
  hasAccountPassword,
  hasSecurityPin,
  hashSecret,
  isValidPassword,
  isValidPin,
  makeSecurityEvent,
  nextFailedAttemptState,
  sanitizeSecurityState,
  verifySecret,
} from './security'
import {
  sanitizeDismissedSuggestions,
  sanitizeFollowingIds,
  sanitizeFriendIds,
  sanitizeFriendRequestIds,
  sanitizeProfile,
} from './storage'
import {
  DEFAULT_PRIVACY,
  sanitizePrivacySettings,
} from './privacy'
import {
  DEFAULT_STREAK_SETTINGS,
  sanitizeStreakSettings,
} from './streak'
import { DEFAULT_VISIBILITY, normalizeVisibility } from './visibility'

let cachedState: OgonekStoreState = DEFAULT_STORE_STATE
let isInitialized = false

function getSnapshot(): OgonekStoreState {
  if (typeof window === 'undefined') {
    return DEFAULT_STORE_STATE
  }
  if (!isInitialized) {
    cachedState = loadStore()
    cachedState = migrateSplitDays(cachedState)
    cachedState = ensureDemoComments(cachedState)
    isInitialized = true
  }
  return cachedState
}

function getServerSnapshot(): OgonekStoreState {
  return DEFAULT_STORE_STATE
}

/**
 * МИГРАЦИЯ СЛИПШИХСЯ ДНЕЙ:
 * Если в любом дне обнаружено более 5 гордостей подряд — он расщепляется
 * на оригинальный день (первые 5) и новый день (следующие 5).
 * Это исправляет баг "дописывания в существующий день".
 */
function migrateSplitDays(state: OgonekStoreState): OgonekStoreState {
  const days = state.days
  let needsMigration = false

  // Check if any day has more than 5 prides (overflow from the old bug)
  for (const day of days) {
    if (day.prides.length > 5) {
      needsMigration = true
      break
    }
  }

  if (!needsMigration) return state

  const newDays: Day[] = []
  let maxId = Math.max(...days.map((d) => d.id), 0)

  for (const day of days) {
    if (day.prides.length <= 5) {
      newDays.push(day)
      continue
    }

    // Split: first 5 prides stay in original day, rest go to a new day
    const originalPrides = day.prides.slice(0, 5).map((p, i) => ({
      ...p,
      num: String(i + 1).padStart(2, '0'),
    }))
    const extraPrides = day.prides.slice(5).map((p, i) => ({
      ...p,
      num: String(i + 1).padStart(2, '0'),
    }))

    const originalGratitudes = day.gratitudes.slice(0, 5)
    const extraGratitudes = day.gratitudes.slice(5)

    // Keep original day intact with first 5
    newDays.push({
      ...day,
      prides: originalPrides,
      gratitudes: originalGratitudes,
    })

    // Create a new day for the overflow (next calendar day)
    maxId = maxId + 1
    const originalDate = day.dateISO ? new Date(day.dateISO) : new Date()
    const nextDate = new Date(originalDate)
    nextDate.setDate(nextDate.getDate() + 1)

    const splitDay: Day = {
      id: maxId,
      title: extraPrides[0]?.text || 'Продолжение дня',
      tags: ['Для тебя', '🔥 Гордости'],
      prides: extraPrides,
      gratitudes: extraGratitudes.length > 0 ? extraGratitudes : [],
      photos: day.photos,
      dateISO: nextDate.toISOString(),
      status: 'normal',
    }
    newDays.push(splitDay)
  }

  // Re-sort: newest first
  newDays.sort((a, b) => {
    const ta = a.dateISO ? new Date(a.dateISO).getTime() : a.id * 86400000
    const tb = b.dateISO ? new Date(b.dateISO).getTime() : b.id * 86400000
    return tb - ta
  })

  const migratedState = { ...state, days: newDays }
  saveStore(migratedState)
  console.info('[Ogonek] Migrated split days: ', newDays.length, 'total days after split')
  return migratedState
}

/**
 * ПЕРВИЧНАЯ ПОДДЕРЖКА:
 * В демо-режиме один раз наполняем свежий день тёплыми комментариями,
 * чтобы блок поддержки был наглядным (дерево ответов, лайки, шаблоны).
 */
function ensureDemoComments(state: OgonekStoreState): OgonekStoreState {
  if (!state.isDemo) return state
  if (state.comments && Object.keys(state.comments).length > 0) return state
  const firstDay = state.days[0]
  if (!firstDay) return state

  const nextState: OgonekStoreState = {
    ...state,
    comments: buildDemoComments(firstDay),
  }
  saveStore(nextState)
  return nextState
}

const listeners = new Set<() => void>()

function subscribe(callback: () => void): () => void {
  listeners.add(callback)

  const handleCustom = (e: Event) => {
    const customEvent = e as CustomEvent<OgonekStoreState>
    if (customEvent.detail && Array.isArray((customEvent.detail as any).days)) {
      cachedState = customEvent.detail
    } else {
      cachedState = loadStore()
    }
    callback()
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === 'ogonyok.v3.store') {
      cachedState = loadStore()
      callback()
    }
  }

  window.addEventListener('ogonek-store-updated', handleCustom)
  window.addEventListener('storage', handleStorage)

  return () => {
    listeners.delete(callback)
    window.removeEventListener('ogonek-store-updated', handleCustom)
    window.removeEventListener('storage', handleStorage)
  }
}

function emitChange() {
  listeners.forEach((listener) => listener())
}

/** Результат операции входа/регистрации/переключения аккаунта */
export type AuthResult = {
  ok: boolean
  accountId?: string
  error?: string
}

export function useOgonekStore() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const updateStore = useCallback((updater: (prev: OgonekStoreState) => OgonekStoreState) => {
    const current = getSnapshot()
    const next = updater(current)
    cachedState = next
    saveStore(next)
    emitChange()
  }, [])

  const addDay = useCallback(
    (day: Day) => {
      updateStore((prev) => ({
        ...prev,
        days: [day, ...prev.days.filter((d) => d.id !== day.id)],
      }))
    },
    [updateStore]
  )

  /**
   * КОНВЕЙЕР +1 ДЕНЬ:
   * Всегда создаёт строго новый день с id = maxId + 1.
   * Дата вычисляется как последняя дата в базе + 1 день.
   * КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО дописывать пункты в существующие дни!
   */
  const addNewDay = useCallback(
    (payload: ComposerPayload, dateISO?: string) => {
      updateStore((prev) => {
        const maxId = prev.days.reduce((max, d) => Math.max(max, d.id), 0)
        const newId = maxId + 1

        // Compute next date: last day's date + 1 calendar day
        let computedDate = dateISO
        if (!computedDate) {
          // Find the day with the highest id that has a dateISO
          const latestDay = prev.days.reduce<Day | null>((best, d) => {
            if (!d.dateISO) return best
            if (!best) return d
            return d.id > best.id ? d : best
          }, null)

          const baseDate = latestDay?.dateISO ? new Date(latestDay.dateISO) : new Date()
          const nextDate = new Date(baseDate)
          nextDate.setDate(nextDate.getDate() + 1)
          computedDate = nextDate.toISOString()
        }

        const newPrideEntries: PrideEntry[] = payload.prides.map((text, idx) => ({
          num: String(idx + 1).padStart(2, '0'),
          text,
          scale: 8,
          overcome: 1,
          visibility: normalizeVisibility(
            payload.prideVisibilities?.[idx] ?? payload.visibility ?? DEFAULT_VISIBILITY
          ),
        }))

        const newDay: Day = {
          id: newId,
          title: payload.prides[0] || payload.gratitudes[0] || 'Запись дня',
          tags: ['Для тебя', '🔥 Гордости', '❤️ Благодарности'],
          prides: newPrideEntries,
          gratitudes: payload.gratitudes,
          photos: payload.photo ? [payload.photo] : undefined,
          dateISO: computedDate,
          status: 'normal',
          visibility: normalizeVisibility(payload.visibility),
        }

        return {
          ...prev,
          // Строго по убыванию даты: свежие дни (в т.ч. 12 октября) всегда сверху
          days: [newDay, ...prev.days].sort(
            (a, b) =>
              new Date(b.dateISO!).getTime() - new Date(a.dateISO!).getTime()
          ),
          composerDraft: null,
        }
      })
    },
    [updateStore]
  )

  const updateDay = useCallback(
    (updatedDay: Day) => {
      updateStore((prev) => ({
        ...prev,
        days: prev.days.map((d) => (d.id === updatedDay.id ? updatedDay : d)),
      }))
    },
    [updateStore]
  )

  const updateDayWithPayload = useCallback(
    (dayId: number, payload: ComposerPayload) => {
      updateStore((prev) => {
        const targetDay = prev.days.find((d) => d.id === dayId)
        if (!targetDay) return prev

        const updatedPrides: PrideEntry[] = payload.prides.map((text, idx) => {
          const existingPride = targetDay.prides[idx]
          const customRating = payload.ratings?.[idx]
          const heuristic = evaluatePrideItemHeuristic(text)

          const scale =
            customRating?.scale ??
            (existingPride && typeof existingPride.scale === 'number' && existingPride.scale > 0
              ? existingPride.scale
              : heuristic.scale)

          const overcome =
            customRating?.overcome ??
            (existingPride && typeof existingPride.overcome === 'number'
              ? existingPride.overcome
              : heuristic.overcome)

          return {
            num: String(idx + 1).padStart(2, '0'),
            text,
            scale,
            overcome,
            visibility: normalizeVisibility(
              payload.prideVisibilities?.[idx] ??
                existingPride?.visibility ??
                payload.visibility ??
                DEFAULT_VISIBILITY
            ),
          }
        })

        const updatedDay: Day = {
          ...targetDay,
          title: updatedPrides[0]?.text || payload.gratitudes[0] || targetDay.title,
          prides: updatedPrides,
          gratitudes: payload.gratitudes,
          photos: payload.photo
            ? [payload.photo, ...(targetDay.photos || []).filter((p) => p !== payload.photo)]
            : targetDay.photos,
          visibility: payload.visibility
            ? normalizeVisibility(payload.visibility)
            : targetDay.visibility,
        }

        return {
          ...prev,
          days: prev.days.map((d) => (d.id === dayId ? updatedDay : d)),
        }
      })
    },
    [updateStore]
  )

  const saveMorningIntentions = useCallback(
    (dateKey: string, focus: [string, string, string]) => {
      updateStore((prev) => {
        const existing = prev.morningFocusHistory[dateKey]
        const record = createMorningFocusRecord(dateKey, focus, existing)
        return {
          ...prev,
          morningIntentions: {
            ...prev.morningIntentions,
            [dateKey]: record.focus,
          },
          morningFocusHistory: {
            ...prev.morningFocusHistory,
            [dateKey]: record,
          },
        }
      })
    },
    [updateStore]
  )

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 10 — ВЕЧЕРНЯЯ СВЕРКА УТРЕННИХ ОБЕЩАНИЙ
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Ставит статус одному шагу фокуса («Выполнил» / «Не выполнил» / сброс).
   * Автоматически пересчитывает процент и, когда сверены все обещания,
   * проставляет время вечерней сверки.
   */
  const setMorningFocusStep = useCallback(
    (dateKey: string, index: 0 | 1 | 2, status: MorningFocusStepStatus) => {
      updateStore((prev) => {
        const record = prev.morningFocusHistory[dateKey]
        if (!record) return prev
        const next = applyStepStatus(record, index, status)
        return {
          ...prev,
          morningFocusHistory: {
            ...prev.morningFocusHistory,
            [dateKey]: next,
          },
        }
      })
    },
    [updateStore]
  )

  /**
   * Переключатель галочки: pending → done → missed → pending.
   * Возвращает новый статус (для звука/уведомления в интерфейсе).
   */
  const toggleMorningFocusStep = useCallback(
    (dateKey: string, index: 0 | 1 | 2): MorningFocusStepStatus => {
      const record = getSnapshot().morningFocusHistory[dateKey]
      if (!record) return 'pending'
      const current = record.steps[index]
      const next: MorningFocusStepStatus =
        current === 'pending' ? 'done' : current === 'done' ? 'missed' : 'pending'
      setMorningFocusStep(dateKey, index, next)
      return next
    },
    [setMorningFocusStep]
  )

  /** Комплексная отметка «Выполнил» для шага (и снятие, если уже стояла) */
  const markMorningFocusStepDone = useCallback(
    (dateKey: string, index: 0 | 1 | 2): boolean => {
      const record = getSnapshot().morningFocusHistory[dateKey]
      if (!record) return false
      const nextDone = record.steps[index] !== 'done'
      setMorningFocusStep(dateKey, index, nextDone ? 'done' : 'pending')
      return nextDone
    },
    [setMorningFocusStep]
  )

  /** Отметка «Не выполнил» для шага (снятие, если уже стояла) */
  const markMorningFocusStepMissed = useCallback(
    (dateKey: string, index: 0 | 1 | 2): boolean => {
      const record = getSnapshot().morningFocusHistory[dateKey]
      if (!record) return false
      const nextMissed = record.steps[index] !== 'missed'
      setMorningFocusStep(dateKey, index, nextMissed ? 'missed' : 'pending')
      return nextMissed
    },
    [setMorningFocusStep]
  )

  /**
   * Завершает вечернюю сверку: неотмеченные обещания становятся
   * «Не выполнил», процент финализируется. Возвращает итоговый процент.
   */
  const completeEveningReview = useCallback(
    (dateKey: string): number => {
      const record = getSnapshot().morningFocusHistory[dateKey]
      if (!record) return 0
      const finalized = finalizeEveningReview(record)
      updateStore((prev) => ({
        ...prev,
        morningFocusHistory: {
          ...prev.morningFocusHistory,
          [dateKey]: finalized,
        },
      }))
      return finalized.completionPercent
    },
    [updateStore]
  )

  /** Возвращает сверку в работу — можно передумать и поменять галочки */
  const reopenEveningReview = useCallback(
    (dateKey: string) => {
      updateStore((prev) => {
        const record = prev.morningFocusHistory[dateKey]
        if (!record) return prev
        return {
          ...prev,
          morningFocusHistory: {
            ...prev.morningFocusHistory,
            [dateKey]: { ...record, reviewedAtISO: null },
          },
        }
      })
    },
    [updateStore]
  )

  /** Удаляет запись утреннего фокуса конкретного дня из истории */
  const removeMorningFocusRecord = useCallback(
    (dateKey: string) => {
      updateStore((prev) => {
        if (!prev.morningFocusHistory[dateKey] && !prev.morningIntentions[dateKey]) return prev
        const morningFocusHistory = { ...prev.morningFocusHistory }
        const morningIntentions = { ...prev.morningIntentions }
        delete morningFocusHistory[dateKey]
        delete morningIntentions[dateKey]
        return { ...prev, morningFocusHistory, morningIntentions }
      })
    },
    [updateStore]
  )

  const saveComposerDraft = useCallback(
    (draft: ComposerDraft | null) => {
      updateStore((prev) => ({
        ...prev,
        composerDraft: draft,
      }))
    },
    [updateStore]
  )

  const clearComposerDraft = useCallback(() => {
    updateStore((prev) => ({
      ...prev,
      composerDraft: null,
    }))
  }, [updateStore])

  const toggleEvidencePin = useCallback(
    (id: string) => {
      updateStore((prev) => {
        const nextItems = prev.evidenceItems.map((item) =>
          item.id === id ? { ...item, pinned: !item.pinned } : item
        )
        const isNowPinned = nextItems.find((i) => i.id === id)?.pinned
        const nextFavorites = isNowPinned
          ? Array.from(new Set([...prev.evidenceFavorites, id]))
          : prev.evidenceFavorites.filter((favId) => favId !== id)

        return {
          ...prev,
          evidenceItems: nextItems,
          evidenceFavorites: nextFavorites,
        }
      })
    },
    [updateStore]
  )

  const addEvidenceItem = useCallback(
    (newItem: Omit<EvidenceItem, 'id'>) => {
      updateStore((prev) => {
        const id = `ev-${Date.now()}`
        const itemWithId: EvidenceItem = {
          ...newItem,
          id,
        }
        return {
          ...prev,
          evidenceItems: [itemWithId, ...prev.evidenceItems],
        }
      })
    },
    [updateStore]
  )

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 5 — ВЕРИФИЦИРОВАННЫЕ АЧИВКИ ПРОФИЛЯ
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Создаёт верифицированную ачивку с уже полученным регламентом доказательств.
   * Возвращает id новой ачивки.
   */
  const addVerifiedAchievement = useCallback(
    (input: {
      categoryId: VerifiedAchievement['categoryId']
      title: string
      topic: string
      achievedAtISO?: string
      regulation: AchievementRegulation | null
      evidence?: AchievementEvidenceFile[]
      status?: AchievementStatus
    }): string => {
      const id = `va-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
      const nowISO = new Date().toISOString()
      const status: AchievementStatus = input.status === 'submitted' ? 'submitted' : 'draft'

      const achievement: VerifiedAchievement = {
        id,
        categoryId: input.categoryId,
        title: input.title.trim().slice(0, 120) || 'Ачивка',
        topic: input.topic.trim().slice(0, 300),
        achievedAtISO: input.achievedAtISO || nowISO,
        status,
        regulation: input.regulation,
        evidence: input.evidence ?? [],
        submittedAtISO: status === 'submitted' ? nowISO : null,
        verifiedAtISO: null,
        reviewerNote: null,
        submission: null,
        createdAtISO: nowISO,
      }

      updateStore((prev) => ({
        ...prev,
        verifiedAchievements: [achievement, ...prev.verifiedAchievements],
      }))

      return id
    },
    [updateStore]
  )

  /** Частичное обновление ачивки (название, тема, дата, регламент) */
  const updateVerifiedAchievement = useCallback(
    (
      id: string,
      patch: Partial<Pick<VerifiedAchievement, 'title' | 'topic' | 'achievedAtISO' | 'regulation'>>
    ) => {
      updateStore((prev) => ({
        ...prev,
        verifiedAchievements: prev.verifiedAchievements.map((a) =>
          a.id === id ? { ...a, ...patch } : a
        ),
      }))
    },
    [updateStore]
  )

  /** Прикрепляет файл-доказательство к ачивке. Возвращает id файла. */
  const attachAchievementEvidence = useCallback(
    (
      achievementId: string,
      file: Omit<AchievementEvidenceFile, 'id' | 'addedAtISO'>
    ): string | null => {
      if (!achievementId || !file.ref) return null
      const id = `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
      const evidence: AchievementEvidenceFile = {
        ...file,
        id,
        addedAtISO: new Date().toISOString(),
      }
      updateStore((prev) => ({
        ...prev,
        verifiedAchievements: prev.verifiedAchievements.map((a) =>
          a.id === achievementId ? { ...a, evidence: [...a.evidence, evidence] } : a
        ),
      }))
      return id
    },
    [updateStore]
  )

  /** Удаляет прикреплённое доказательство */
  const removeAchievementEvidence = useCallback(
    (achievementId: string, evidenceId: string) => {
      if (!achievementId || !evidenceId) return
      updateStore((prev) => ({
        ...prev,
        verifiedAchievements: prev.verifiedAchievements.map((a) =>
          a.id === achievementId
            ? { ...a, evidence: a.evidence.filter((e) => e.id !== evidenceId) }
            : a
        ),
      }))
    },
    [updateStore]
  )

  /**
   * Отправляет ачивку на верификацию.
   * Возвращает true, если комплект обязательных доказательств полон и заявка ушла.
   */
  const submitAchievementForVerification = useCallback(
    (id: string): boolean => {
      const achievement = getSnapshot().verifiedAchievements.find((a) => a.id === id)
      if (!achievement) return false
      const progress = computeAchievementProgress(achievement)
      if (!progress.complete) return false

      updateStore((prev) => ({
        ...prev,
        verifiedAchievements: prev.verifiedAchievements.map((a) =>
          a.id === id
            ? {
                ...a,
                status: 'submitted',
                submittedAtISO: new Date().toISOString(),
                verifiedAtISO: null,
                reviewerNote: null,
              }
            : a
        ),
      }))
      return true
    },
    [updateStore]
  )

  /**
   * Вердикт верификатора: подтверждение или отказ с комментарием.
   * Возвращает true, если вердикт применён.
   */
  const resolveAchievementReview = useCallback(
    (id: string, decision: 'verified' | 'rejected', note?: string): boolean => {
      const achievement = getSnapshot().verifiedAchievements.find((a) => a.id === id)
      if (!achievement || achievement.status !== 'submitted') return false

      updateStore((prev) => ({
        ...prev,
        verifiedAchievements: prev.verifiedAchievements.map((a) =>
          a.id === id
            ? {
                ...a,
                status: decision,
                verifiedAtISO: new Date().toISOString(),
                reviewerNote: (note ?? '').trim().slice(0, 600) || null,
              }
            : a
        ),
      }))
      return true
    },
    [updateStore]
  )

  /** Снимает ачивку с верификации / откатывает в черновик для правок */
  const reopenAchievement = useCallback(
    (id: string) => {
      updateStore((prev) => ({
        ...prev,
        verifiedAchievements: prev.verifiedAchievements.map((a) =>
          a.id === id
            ? {
                ...a,
                status: 'draft',
                submittedAtISO: null,
                verifiedAtISO: null,
                reviewerNote: null,
                submission: null,
              }
            : a
        ),
      }))
    },
    [updateStore]
  )

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 6 — МОДЕРАЦИЯ АЧИВОК И ОТПРАВКА ДОКАЗАТЕЛЬСТВ НА ПОЧТУ
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Формирует пакет доказательств, отправляет его модератору (email/webhook)
   * и переводит ачивку в статус «На модерации» с трек-кодом и историей.
   */
  const startAchievementSubmission = useCallback(
    async (
      id: string,
      input: {
        description: string
        contactEmail: string
        attachments?: ModerationEmailAttachment[]
      }
    ): Promise<{
      ok: boolean
      trackingCode?: string
      channel?: ModerationChannel
      delivery?: ModerationDelivery
      recipient?: string
      error?: string
    }> => {
      const current = getSnapshot()
      const achievement = current.verifiedAchievements.find((a) => a.id === id)
      if (!achievement) return { ok: false, error: 'Ачивка не найдена' }
      if (!isReadyForModeration(achievement)) {
        return { ok: false, error: 'Сначала приложи все обязательные доказательства' }
      }

      const trackingCode = makeTrackingCode(id)
      const payload = buildModerationSubmissionPayload({
        trackingCode,
        achievement,
        applicant: {
          displayName: current.profile.displayName,
          username: current.profile.username,
          contactEmail: input.contactEmail,
        },
        description: input.description,
        attachments: input.attachments ?? [],
      })

      let channel: ModerationChannel = 'outbox'
      let delivery: ModerationDelivery = 'queued'
      let recipient = DEFAULT_MODERATION_INBOX
      let error: string | undefined

      try {
        const res = await fetch('/api/achievements/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const data = (await res.json()) as {
            recipient?: string
            channel?: ModerationChannel
            delivery?: ModerationDelivery
          }
          channel = data.channel ?? channel
          delivery = data.delivery ?? delivery
          recipient = data.recipient ?? recipient
        } else {
          const data = (await res.json().catch(() => null)) as { error?: string } | null
          error = data?.error ?? `Сервер вернул ${res.status} — пакет поставлен в очередь outbox`
          channel = 'outbox'
          delivery = 'queued'
        }
      } catch {
        error = 'Нет связи с сервером — пакет поставлен в локальную очередь outbox'
        channel = 'outbox'
        delivery = 'queued'
      }

      const submission = createSubmissionRecord({
        trackingCode,
        description: input.description,
        contactEmail: input.contactEmail,
        channel,
        delivery,
        recipient,
        evidenceCount: achievement.evidence.length,
      })

      updateStore((prev) => ({
        ...prev,
        verifiedAchievements: prev.verifiedAchievements.map((a) =>
          a.id === id
            ? {
                ...a,
                status: 'submitted',
                submittedAtISO: submission.submittedAtISO,
                verifiedAtISO: null,
                reviewerNote: null,
                submission,
              }
            : a
        ),
      }))

      return { ok: true, trackingCode, channel, delivery, recipient, error }
    },
    [updateStore]
  )

  /**
   * Вердикт модератора по отправленной заявке:
   * «Подтверждено официально» / «Требует уточнения» / «На модерации».
   * Ведёт историю рассмотрения и синхронизирует статус ачивки.
   */
  const resolveModerationStatus = useCallback(
    (id: string, status: ModerationStatus, note?: string): boolean => {
      const achievement = getSnapshot().verifiedAchievements.find((a) => a.id === id)
      if (!achievement) return false

      const cleanNote = (note ?? '').trim().slice(0, 600)

      if (!achievement.submission) {
        const decision: 'verified' | 'rejected' =
          status === 'needs-clarification' ? 'rejected' : 'verified'
        return resolveAchievementReview(id, decision, cleanNote)
      }

      updateStore((prev) => ({
        ...prev,
        verifiedAchievements: prev.verifiedAchievements.map((a) => {
          if (a.id !== id || !a.submission) return a
          const history = appendReviewEvent(
            a.submission,
            status,
            cleanNote || MODERATION_STATUS_META[status].description,
            'Модератор Огонька'
          )
          const isFinal = status !== 'on-moderation'
          return {
            ...a,
            status: achievementStatusFromModeration(status),
            verifiedAtISO: status === 'officially-verified' ? new Date().toISOString() : a.verifiedAtISO,
            reviewerNote: cleanNote || null,
            submission: {
              ...a.submission,
              status,
              decidedAtISO: isFinal ? new Date().toISOString() : null,
              moderatorNote: cleanNote || null,
              history,
            },
          }
        }),
      }))
      return true
    },
    [updateStore, resolveAchievementReview]
  )

  /** Отзывает заявку: ачивка возвращается в черновик, заявка удаляется */
  const withdrawSubmission = useCallback(
    (id: string) => {
      updateStore((prev) => ({
        ...prev,
        verifiedAchievements: prev.verifiedAchievements.map((a) =>
          a.id === id
            ? {
                ...a,
                status: 'draft',
                submittedAtISO: null,
                verifiedAtISO: null,
                reviewerNote: null,
                submission: null,
              }
            : a
        ),
      }))
    },
    [updateStore]
  )

  /** Полностью удаляет верифицированную ачивку */
  const removeVerifiedAchievement = useCallback(
    (id: string) => {
      if (!id) return
      updateStore((prev) => ({
        ...prev,
        verifiedAchievements: prev.verifiedAchievements.filter((a) => a.id !== id),
      }))
    },
    [updateStore]
  )

  const setSoundEnabled = useCallback(
    (enabled: boolean) => {
      updateStore((prev) => ({
        ...prev,
        soundEnabled: enabled,
      }))
    },
    [updateStore]
  )

  const setPinEnabled = useCallback(
    (enabled: boolean) => {
      updateStore((prev) => ({
        ...prev,
        pinEnabled: enabled,
        security: sanitizeSecurityState({ ...prev.security, lockOnOpen: enabled }),
      }))
    },
    [updateStore]
  )

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 14 — СУПЕР-НАСТРОЙКИ: ТЕМА, АКЦЕНТ, ШРИФТ, ПЛОТНОСТЬ
     ══════════════════════════════════════════════════════════════════════ */

  /** Переключает режим оформления: X Black / Apple Light / Dim */
  const setTheme = useCallback(
    (theme: ThemeMode) => {
      const next = sanitizeTheme(theme)
      updateStore((prev) => (prev.theme === next ? prev : { ...prev, theme: next }))
    },
    [updateStore]
  )

  /** Меняет акцентный цвет приложения */
  const setAccent = useCallback(
    (accent: AccentId) => {
      const next = sanitizeAccent(accent)
      updateStore((prev) => (prev.accent === next ? prev : { ...prev, accent: next }))
    },
    [updateStore]
  )

  /** Меняет размер шрифта/масштаб интерфейса */
  const setFontScale = useCallback(
    (fontScale: FontScaleId) => {
      const next = sanitizeFontScale(fontScale)
      updateStore((prev) =>
        prev.fontScale === next ? prev : { ...prev, fontScale: next }
      )
    },
    [updateStore]
  )

  /** Меняет плотность ленты (просторность карточек дней) */
  const setFeedDensity = useCallback(
    (feedDensity: FeedDensityId) => {
      const next = sanitizeFeedDensity(feedDensity)
      updateStore((prev) =>
        prev.feedDensity === next ? prev : { ...prev, feedDensity: next }
      )
    },
    [updateStore]
  )

  /** Сбрасывает всё оформление к заводским значениям Огонька */
  const resetAppearance = useCallback(() => {
    updateStore((prev) => ({
      ...prev,
      theme: DEFAULT_STORE_STATE.theme,
      accent: DEFAULT_STORE_STATE.accent,
      fontScale: DEFAULT_STORE_STATE.fontScale,
      feedDensity: DEFAULT_STORE_STATE.feedDensity,
    }))
  }, [updateStore])

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 15 — БЕЗОПАСНОСТЬ И ВХОД: ПАРОЛЬ, PIN-КОД, FACE ID / TOUCH ID
     ══════════════════════════════════════════════════════════════════════ */

  /** Точечно обновляет снимок защиты с валидацией (соль/хэши сохраняются как есть) */
  const updateSecurity = useCallback(
    (patch: Partial<AppSecurityState>) => {
      updateStore((prev) => ({
        ...prev,
        security: sanitizeSecurityState({ ...prev.security, ...patch }),
      }))
    },
    [updateStore]
  )

  /** Добавляет событие в журнал безопасности */
  const recordSecurityEvent = useCallback(
    (kind: SecurityAuditKind, note: string) => {
      updateStore((prev) => ({
        ...prev,
        security: sanitizeSecurityState({
          ...prev.security,
          auditLog: appendSecurityEvent(prev.security.auditLog, makeSecurityEvent(kind, note)),
        }),
      }))
    },
    [updateStore]
  )

  /**
   * УСТАНОВКА / СМЕНА ПАРОЛЯ АККАУНТА.
   * Секрет хэшируется SHA-256 с новой солью; открытый текст нигде не хранится.
   */
  const setAccountPassword = useCallback(
    async (password: string): Promise<{ ok: boolean; error?: string }> => {
      if (!isValidPassword(password)) {
        return {
          ok: false,
          error: `Пароль должен быть от ${MIN_PASSWORD_LENGTH} до ${MAX_PASSWORD_LENGTH} символов`,
        }
      }
      const hadPassword = hasAccountPassword(getSnapshot().security)
      const salt = generateSalt()
      const hash = await hashSecret(password, salt)
      const nowISO = new Date().toISOString()
      const event = makeSecurityEvent(
        hadPassword ? 'password-changed' : 'password-set',
        hadPassword ? 'Пароль аккаунта изменён' : 'Пароль аккаунта установлен'
      )
      updateStore((prev) => ({
        ...prev,
        security: sanitizeSecurityState({
          ...prev.security,
          passwordHash: hash,
          passwordSalt: salt,
          passwordUpdatedAtISO: nowISO,
          failedAttempts: 0,
          lockedUntilISO: null,
          auditLog: appendSecurityEvent(prev.security.auditLog, event),
        }),
      }))
      return { ok: true }
    },
    [updateStore]
  )

  /** Удаляет пароль аккаунта (требуется подтверждение текущим паролем) */
  const clearAccountPassword = useCallback(
    async (currentPassword?: string): Promise<{ ok: boolean; error?: string }> => {
      const security = getSnapshot().security
      if (!hasAccountPassword(security)) return { ok: true }
      if (!currentPassword) {
        return { ok: false, error: 'Введите текущий пароль для отключения' }
      }
      const valid = await verifySecret(currentPassword, security.passwordSalt, security.passwordHash)
      if (!valid) return { ok: false, error: 'Неверный текущий пароль' }

      const event = makeSecurityEvent('password-removed', 'Пароль аккаунта удалён')
      updateStore((prev) => ({
        ...prev,
        security: sanitizeSecurityState({
          ...prev.security,
          passwordHash: null,
          passwordSalt: null,
          passwordUpdatedAtISO: null,
          auditLog: appendSecurityEvent(prev.security.auditLog, event),
        }),
      }))
      return { ok: true }
    },
    [updateStore]
  )

  /**
   * УСТАНОВКА 4-ЗНАЧНОГО PIN-КОДА.
   * Первый способ входа автоматически включает блокировку при открытии.
   */
  const setSecurityPin = useCallback(
    async (
      pin: string,
      options?: { quickUnlock?: boolean }
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!isValidPin(pin)) {
        return { ok: false, error: `PIN-код должен состоять из ${PIN_LENGTH} цифр` }
      }
      const security = getSnapshot().security
      const hadPin = hasSecurityPin(security)
      const salt = generateSalt()
      const hash = await hashSecret(pin, salt)
      const quickUnlock = options?.quickUnlock ?? security.pinQuickUnlockEnabled ?? true
      const enableLock = security.lockOnOpen || !hadPin
      const event = makeSecurityEvent(
        hadPin ? 'pin-changed' : 'pin-set',
        hadPin ? 'PIN-код изменён' : 'PIN-код установлен'
      )
      updateStore((prev) => ({
        ...prev,
        pinEnabled: enableLock,
        security: sanitizeSecurityState({
          ...prev.security,
          pinHash: hash,
          pinSalt: salt,
          pinLength: PIN_LENGTH,
          pinQuickUnlockEnabled: quickUnlock,
          lockOnOpen: enableLock,
          failedAttempts: 0,
          lockedUntilISO: null,
          auditLog: appendSecurityEvent(prev.security.auditLog, event),
        }),
      }))
      return { ok: true }
    },
    [updateStore]
  )

  /** Удаляет PIN-код (при наличии — с подтверждением текущего) */
  const clearSecurityPin = useCallback(
    async (currentPin?: string): Promise<{ ok: boolean; error?: string }> => {
      const security = getSnapshot().security
      if (!hasSecurityPin(security)) return { ok: true }
      if (currentPin !== undefined) {
        const valid = await verifySecret(currentPin, security.pinSalt, security.pinHash)
        if (!valid) return { ok: false, error: 'Неверный PIN-код' }
      }
      const event = makeSecurityEvent('pin-removed', 'PIN-код удалён')
      updateStore((prev) => ({
        ...prev,
        security: sanitizeSecurityState({
          ...prev.security,
          pinHash: null,
          pinSalt: null,
          pinQuickUnlockEnabled: false,
          auditLog: appendSecurityEvent(prev.security.auditLog, event),
        }),
      }))
      return { ok: true }
    },
    [updateStore]
  )

  /** Включает/выключает биометрический ключ WebAuthn (Touch ID / Face ID) */
  const setBiometricEnabled = useCallback(
    (enabled: boolean, credential?: { id: string; label: string }): boolean => {
      const security = getSnapshot().security
      if (enabled && !credential?.id) return false
      const event = makeSecurityEvent(
        enabled ? 'biometric-enabled' : 'biometric-disabled',
        enabled ? 'Биометрия включена' : 'Биометрия отключена'
      )
      updateStore((prev) => ({
        ...prev,
        pinEnabled: enabled ? true : prev.pinEnabled,
        security: sanitizeSecurityState({
          ...prev.security,
          biometricEnabled: enabled,
          biometricCredentialId: enabled ? credential?.id ?? null : null,
          biometricLabel: enabled ? credential?.label ?? null : null,
          biometricRegisteredAtISO: enabled ? new Date().toISOString() : null,
          lockOnOpen: enabled ? true : prev.security.lockOnOpen,
          failedAttempts: enabled ? 0 : prev.security.failedAttempts,
          lockedUntilISO: enabled ? null : prev.security.lockedUntilISO,
          auditLog: appendSecurityEvent(prev.security.auditLog, event),
        }),
      }))
      return true
    },
    [updateStore]
  )

  /** Главный тумблер «Блокировать при открытии». Без способа входа не включается. */
  const setLockOnOpen = useCallback(
    (enabled: boolean): boolean => {
      const security = getSnapshot().security
      const canLock = hasSecurityPin(security) || hasAccountPassword(security) || Boolean(security.biometricCredentialId)
      if (enabled && !canLock) return false
      const next = enabled
      const event = makeSecurityEvent(
        next ? 'lock-enabled' : 'lock-disabled',
        next ? 'Блокировка при открытии включена' : 'Блокировка при открытии выключена'
      )
      updateStore((prev) =>
        prev.security.lockOnOpen === next && prev.pinEnabled === next
          ? prev
          : {
              ...prev,
              pinEnabled: next,
              security: sanitizeSecurityState({
                ...prev.security,
                lockOnOpen: next,
                auditLog: appendSecurityEvent(prev.security.auditLog, event),
              }),
            }
      )
      return next
    },
    [updateStore]
  )

  /** Быстрый вход по PIN при открытии приложения (только если PIN задан) */
  const setPinQuickUnlock = useCallback(
    (enabled: boolean): boolean => {
      const security = getSnapshot().security
      if (enabled && !hasSecurityPin(security)) return false
      updateStore((prev) => ({
        ...prev,
        security: sanitizeSecurityState({ ...prev.security, pinQuickUnlockEnabled: enabled }),
      }))
      return enabled
    },
    [updateStore]
  )

  /** Автоблокировка при бездействии, минуты (0 — выключена) */
  const setAutoLockMinutes = useCallback(
    (minutes: number) => {
      const clean = Math.max(0, Math.min(240, Math.round(minutes || 0)))
      updateStore((prev) => ({
        ...prev,
        security: sanitizeSecurityState({ ...prev.security, autoLockMinutes: clean }),
      }))
    },
    [updateStore]
  )

  /**
   * Фиксирует неудачную попытку входа. После 5 промахов подряд вход
   * временно блокируется на 60 секунд (защита от перебора).
   */
  const registerFailedUnlock = useCallback(
    (method?: string): { locked: boolean; attemptsLeft: number } => {
      const security = getSnapshot().security
      const next = nextFailedAttemptState(security.failedAttempts)
      const locked = Boolean(next.lockedUntilISO)
      let log = appendSecurityEvent(
        security.auditLog,
        makeSecurityEvent(
          'failed-attempt',
          `Неудачная попытка входа${method ? ` (${method})` : ''}`
        )
      )
      if (locked) {
        log = appendSecurityEvent(
          log,
          makeSecurityEvent('lockout', 'Вход временно заблокирован на 60 секунд')
        )
      }
      updateStore((prev) => ({
        ...prev,
        security: sanitizeSecurityState({
          ...prev.security,
          failedAttempts: next.failedAttempts,
          lockedUntilISO: next.lockedUntilISO ?? prev.security.lockedUntilISO,
          auditLog: log,
        }),
      }))
      return { locked, attemptsLeft: attemptsLeft(next.failedAttempts) }
    },
    [updateStore]
  )

  /** Проверяет PIN-код: при успехе фиксирует вход и сбрасывает счётчик промахов */
  const verifyPin = useCallback(
    async (pin: string): Promise<boolean> => {
      const security = getSnapshot().security
      if (computeLockout(security.lockedUntilISO).isLocked) return false
      const valid = await verifySecret(pin, security.pinSalt, security.pinHash)
      if (valid) {
        updateStore((prev) => ({
          ...prev,
          security: sanitizeSecurityState({
            ...prev.security,
            failedAttempts: 0,
            lockedUntilISO: null,
            lastUnlockedAtISO: new Date().toISOString(),
            auditLog: appendSecurityEvent(
              prev.security.auditLog,
              makeSecurityEvent('unlocked', 'Вход по PIN-коду')
            ),
          }),
        }))
        return true
      }
      registerFailedUnlock('PIN')
      return false
    },
    [updateStore, registerFailedUnlock]
  )

  /** Проверяет пароль аккаунта (аварийный вход, если PIN забыт) */
  const verifyPassword = useCallback(
    async (password: string): Promise<boolean> => {
      const security = getSnapshot().security
      if (computeLockout(security.lockedUntilISO).isLocked) return false
      const valid = await verifySecret(password, security.passwordSalt, security.passwordHash)
      if (valid) {
        updateStore((prev) => ({
          ...prev,
          security: sanitizeSecurityState({
            ...prev.security,
            failedAttempts: 0,
            lockedUntilISO: null,
            lastUnlockedAtISO: new Date().toISOString(),
            auditLog: appendSecurityEvent(
              prev.security.auditLog,
              makeSecurityEvent('unlocked', 'Вход по паролю аккаунта')
            ),
          }),
        }))
        return true
      }
      registerFailedUnlock('пароль')
      return false
    },
    [updateStore, registerFailedUnlock]
  )

  /** Фиксирует успешный вход по биометрии WebAuthn (сбрасывает промахи и пишет аудит) */
  const unlockWithBiometric = useCallback(() => {
    updateStore((prev) => ({
      ...prev,
      security: sanitizeSecurityState({
        ...prev.security,
        failedAttempts: 0,
        lockedUntilISO: null,
        lastUnlockedAtISO: new Date().toISOString(),
        auditLog: appendSecurityEvent(
          prev.security.auditLog,
          makeSecurityEvent('unlocked', 'Вход по биометрии (WebAuthn)')
        ),
      }),
    }))
  }, [updateStore])

  /** Записывает факт ручной блокировки и сбрасывает таймер бездействия */
  const lockAppNow = useCallback(() => {    updateStore((prev) => ({
      ...prev,
      security: sanitizeSecurityState({
        ...prev.security,
        auditLog: appendSecurityEvent(
          prev.security.auditLog,
          makeSecurityEvent('lock-now', 'Приложение заблокировано вручную')
        ),
      }),
    }))
  }, [updateStore])

  /** Полностью снимает защиту (пароль, PIN, биометрия) и выключает блокировку */
  const resetSecurity = useCallback(() => {
    updateStore((prev) => ({
      ...prev,
      pinEnabled: false,
      security: sanitizeSecurityState({
        ...DEFAULT_SECURITY_STATE,
        auditLog: appendSecurityEvent(
          prev.security.auditLog,
          makeSecurityEvent('lock-disabled', 'Защита сброшена к заводским настройкам')
        ),
      }),
    }))
  }, [updateStore])

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 16 — СУПЕР-НАСТРОЙКИ ЧАСТЬ 3:
     ПРИВАТНОСТЬ ПРОФИЛЯ, ДЕДЛАЙН СТРИКА И БЭКАП ПАМЯТИ
     ══════════════════════════════════════════════════════════════════════ */

  /** Точечно обновляет приватность профиля с валидацией и меткой времени */
  const updatePrivacy = useCallback(
    (patch: Partial<PrivacySettings>) => {
      updateStore((prev) => ({
        ...prev,
        privacy: sanitizePrivacySettings({
          ...prev.privacy,
          ...patch,
          updatedAtISO: new Date().toISOString(),
        }),
      }))
    },
    [updateStore]
  )

  /** Переключает тип аккаунта: открытый / закрытый */
  const setProfileVisibility = useCallback(
    (profileVisibility: ProfileVisibility) => {
      updatePrivacy({ profileVisibility })
    },
    [updatePrivacy]
  )

  /** Меняет политику комментариев: все / друзья / никто */
  const setCommentPolicy = useCallback(
    (commentPolicy: InteractionAudience) => {
      updatePrivacy({ commentPolicy })
    },
    [updatePrivacy]
  )

  /** Меняет политику личных сообщений: все / друзья / никто */
  const setChatPolicy = useCallback(
    (chatPolicy: InteractionAudience) => {
      updatePrivacy({ chatPolicy })
    },
    [updatePrivacy]
  )

  /** Сбрасывает приватность к значениям по умолчанию */
  const resetPrivacy = useCallback(() => {
    updateStore((prev) => ({
      ...prev,
      privacy: sanitizePrivacySettings({
        ...DEFAULT_PRIVACY,
        updatedAtISO: new Date().toISOString(),
      }),
    }))
  }, [updateStore])

  /** Точечно обновляет настройки ночного дедлайна стрика */
  const updateStreakSettings = useCallback(
    (patch: Partial<StreakSettings>) => {
      updateStore((prev) => ({
        ...prev,
        streak: sanitizeStreakSettings({
          ...prev.streak,
          ...patch,
          updatedAtISO: new Date().toISOString(),
        }),
      }))
    },
    [updateStore]
  )

  /** Быстро меняет время дедлайна в минутах от полуночи */
  const setStreakDeadlineMinutes = useCallback(
    (deadlineMinutes: number) => {
      updateStreakSettings({ deadlineMinutes })
    },
    [updateStreakSettings]
  )

  /** Меняет часовой пояс расчёта дедлайна */
  const setStreakTimeZone = useCallback(
    (timeZone: string) => {
      updateStreakSettings({ timeZone })
    },
    [updateStreakSettings]
  )

  /** Включает/выключает дополнительный день прощения за выходные */
  const setStreakWeekendBonus = useCallback(
    (weekendBonus: boolean) => {
      updateStreakSettings({ weekendBonus })
    },
    [updateStreakSettings]
  )

  /** Сбрасывает настройки дедлайна стрика к заводским */
  const resetStreakSettings = useCallback(() => {
    updateStore((prev) => ({
      ...prev,
      streak: sanitizeStreakSettings({
        ...DEFAULT_STREAK_SETTINGS,
        updatedAtISO: new Date().toISOString(),
      }),
    }))
  }, [updateStore])

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 17 — МЕСЯЧНЫЕ KPI-ЦЕЛИ ДЛЯ ГЛУБОКОЙ АНАЛИТИКИ
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Добавляет месячную KPI-цель. Возвращает id новой цели.
   * Название и ориентир нормализуются по типу цели, дубликаты по названию
   * не создаются (возвращается id уже существующей цели).
   */
  const addMonthlyKpi = useCallback(
    (input: { title: string; kind: KpiKind; target: number }): string => {
      const kind: KpiKind = isKpiKind(input.kind) ? input.kind : 'prides'
      const title = (input.title ?? '').trim().slice(0, 120) || getKpiKind(kind).label

      const existing = getSnapshot().monthlyKpis.find(
        (k) => k.title.toLowerCase() === title.toLowerCase() && k.kind === kind
      )
      if (existing) return existing.id

      const kpi = createMonthlyKpi({
        title,
        kind,
        target: clampKpiTarget(kind, input.target),
      })
      updateStore((prev) => ({ ...prev, monthlyKpis: [kpi, ...prev.monthlyKpis] }))
      return kpi.id
    },
    [updateStore]
  )

  /** Частично обновляет цель: название, тип и/или ориентир */
  const updateMonthlyKpi = useCallback(
    (id: string, patch: Partial<Pick<MonthlyKpi, 'title' | 'kind' | 'target'>>) => {
      if (!id) return
      updateStore((prev) => ({
        ...prev,
        monthlyKpis: prev.monthlyKpis.map((k) => {
          if (k.id !== id) return k
          const kind: KpiKind = patch.kind && isKpiKind(patch.kind) ? patch.kind : k.kind
          const rawTarget =
            typeof patch.target === 'number' && Number.isFinite(patch.target) ? patch.target : k.target
          return {
            ...k,
            kind,
            title:
              patch.title !== undefined
                ? patch.title.trim().slice(0, 120) || k.title
                : k.title,
            target: clampKpiTarget(kind, rawTarget),
          }
        }),
      }))
    },
    [updateStore]
  )

  /** Удаляет месячную цель */
  const removeMonthlyKpi = useCallback(
    (id: string) => {
      if (!id) return
      updateStore((prev) => ({
        ...prev,
        monthlyKpis: prev.monthlyKpis.filter((k) => k.id !== id),
      }))
    },
    [updateStore]
  )

  /**
   * Переключает ручную отметку «выполнено» у цели.
   * Возвращает true, если цель теперь отмечена выполненной.
   */
  const toggleMonthlyKpiManual = useCallback(
    (id: string): boolean => {
      const current = getSnapshot().monthlyKpis.find((k) => k.id === id)
      const next = !current?.manualDone
      if (!id) return next
      updateStore((prev) => ({
        ...prev,
        monthlyKpis: prev.monthlyKpis.map((k) =>
          k.id === id ? { ...k, manualDone: !k.manualDone } : k
        ),
      }))
      return next
    },
    [updateStore]
  )

  /** Восстанавливает заводской набор месячных целей */
  const resetMonthlyKpis = useCallback(() => {
    updateStore((prev) => ({
      ...prev,
      monthlyKpis: DEFAULT_MONTHLY_KPIS.map((k) => ({ ...k })),
    }))
  }, [updateStore])

  /**
   * Принудительное сохранение текущего состояния в localStorage.
   * Запись в localStorage порождает событие `storage` в других вкладках,
   * поэтому соседние вкладки мгновенно подхватывают свежую базу (синхронизация).
   * Возвращает ISO-метку времени синхронизации.
   */
  const syncNow = useCallback((): string => {
    const current = getSnapshot()
    const nowISO = new Date().toISOString()
    cachedState = current
    saveStore(current)
    emitChange()
    return nowISO
  }, [])

  /**
   * ПРОФИЛЬ:
   * Мгновенно сохраняет любые поля профиля (имя, @username, био, город,
   * обложка, аватар, соцсети, цель месяца). Принимает частичный патч и
   * прогоняет результат через sanitizeProfile, чтобы данные оставались валидными.
   */
  const updateProfile = useCallback(
    (patch: Partial<OgonekProfile>) => {
      updateStore((prev) => {
        const nextProfile = sanitizeProfile({ ...prev.profile, ...patch })
        if (
          patch.monthlyGoal !== undefined &&
          patch.monthlyGoal !== prev.profile.monthlyGoal
        ) {
          nextProfile.monthlyGoalUpdatedAtISO = new Date().toISOString()
        }
        // ЭТАП 18: правки профиля пишем и в слепок активного аккаунта,
        // чтобы личность сохранялась при переключении между аккаунтами.
        const activeId = prev.auth.activeAccountId
        const accounts = activeId
          ? prev.auth.accounts.map((a) =>
              a.id === activeId ? { ...a, snapshot: accountSnapshotFromProfile(nextProfile) } : a
            )
          : prev.auth.accounts
        return {
          ...prev,
          profile: nextProfile,
          auth:
            accounts === prev.auth.accounts
              ? prev.auth
              : { ...prev.auth, accounts, updatedAtISO: new Date().toISOString() },
        }
      })
    },
    [updateStore]
  )

  /** Сбрасывает профиль к исходным значениям */
  const resetProfile = useCallback(() => {
    updateStore((prev) => ({ ...prev, profile: sanitizeProfile(DEFAULT_STORE_STATE.profile) }))
  }, [updateStore])

  /**
   * ДРУЗЬЯ:
   * Переключает подписку на друга из социального круга.
   * Возвращает true, если теперь пользователь подписан.
   */
  const toggleFollow = useCallback(
    (friendId: string): boolean => {
      if (!friendId) return false
      const current = getSnapshot().followingIds ?? []
      const willFollow = !current.includes(friendId)
      updateStore((prev) => {
        const list = prev.followingIds ?? []
        const next = willFollow
          ? Array.from(new Set([...list, friendId]))
          : list.filter((id) => id !== friendId)
        return { ...prev, followingIds: next }
      })
      return willFollow
    },
    [updateStore]
  )

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 12 — ГЛОБАЛЬНЫЙ ХАБ ИССЛЕДОВАНИЯ (EXPLORE)
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * ПОДПИСКА НА УЧАСТНИКА СООБЩЕСТВА:
   * Переключает чтение человека из глобального хаба исследования.
   * Возвращает true, если теперь пользователь читает этого человека.
   */
  const toggleExploreFollow = useCallback(
    (userId: string): boolean => {
      if (!userId) return false
      const current = getSnapshot().exploreFollowingIds ?? []
      const willFollow = !current.includes(userId)
      updateStore((prev) => {
        const list = prev.exploreFollowingIds ?? []
        const next = willFollow
          ? Array.from(new Set([...list, userId]))
          : list.filter((id) => id !== userId)
        return { ...prev, exploreFollowingIds: next }
      })
      return willFollow
    },
    [updateStore]
  )

  /**
   * ОГОНЁК ПОД ПУБЛИКАЦИЕЙ СООБЩЕСТВА:
   * Переключает лайк на фото-достижении хаба. Возвращает true, если лайк зажжён.
   */
  const toggleExplorePostLike = useCallback(
    (postId: string): boolean => {
      if (!postId) return false
      const current = getSnapshot().exploreLikedPosts ?? []
      const willLike = !current.includes(postId)
      updateStore((prev) => {
        const list = prev.exploreLikedPosts ?? []
        const next = willLike ? [...list, postId] : list.filter((id) => id !== postId)
        return { ...prev, exploreLikedPosts: Array.from(new Set(next)) }
      })
      return willLike
    },
    [updateStore]
  )

  /**
   * СОХРАНИТЬ ПУБЛИКАЦИЮ:
   * Кладёт/убирает фото-достижение в личную коллекцию хаба.
   * Возвращает true, если публикация теперь сохранена.
   */
  const toggleExplorePostSave = useCallback(
    (postId: string): boolean => {
      if (!postId) return false
      const current = getSnapshot().exploreSavedPosts ?? []
      const willSave = !current.includes(postId)
      updateStore((prev) => {
        const list = prev.exploreSavedPosts ?? []
        const next = willSave ? [postId, ...list] : list.filter((id) => id !== postId)
        return { ...prev, exploreSavedPosts: Array.from(new Set(next)) }
      })
      return willSave
    },
    [updateStore]
  )

  /** Добавляет поисковый запрос в недавние (свежие — в начале, максимум 8) */
  const addExploreSearch = useCallback(
    (query: string) => {
      const clean = (query ?? '').trim().slice(0, 60)
      if (!clean) return
      updateStore((prev) => {
        const existing = (prev.exploreRecentSearches ?? []).filter(
          (q) => q.toLowerCase() !== clean.toLowerCase()
        )
        return {
          ...prev,
          exploreRecentSearches: [clean, ...existing].slice(0, 8),
        }
      })
    },
    [updateStore]
  )

  /** Удаляет один запрос из недавних */
  const removeExploreSearch = useCallback(
    (query: string) => {
      if (!query) return
      updateStore((prev) => ({
        ...prev,
        exploreRecentSearches: (prev.exploreRecentSearches ?? []).filter((q) => q !== query),
      }))
    },
    [updateStore]
  )

  /** Полностью очищает историю поиска хаба */
  const clearExploreSearches = useCallback(() => {
    updateStore((prev) => ({ ...prev, exploreRecentSearches: [] }))
  }, [updateStore])

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 11 — СИСТЕМА ДРУЗЕЙ, ПОДПИСОК И ЗАЯВОК
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * ДОБАВЛЕНИЕ В ДРУЗЬЯ:
   * Принимает входящую заявку или добавляет человека в круг друзей напрямую.
   * Друг всегда становится и подпиской; заявка убирается из входящих/исходящих.
   * Возвращает true, если человек теперь в друзьях.
   */
  const addFriend = useCallback(
    (friendId: string): boolean => {
      if (!friendId) return false
      updateStore((prev) => {
        const friendIds = Array.from(new Set([...(prev.friendIds ?? []), friendId]))
        const followingIds = Array.from(new Set([...(prev.followingIds ?? []), friendId]))
        return {
          ...prev,
          friendIds,
          followingIds,
          incomingFriendRequests: (prev.incomingFriendRequests ?? []).filter(
            (id) => id !== friendId
          ),
          outgoingFriendRequests: (prev.outgoingFriendRequests ?? []).filter(
            (id) => id !== friendId
          ),
          dismissedSuggestions: (prev.dismissedSuggestions ?? []).filter((id) => id !== friendId),
        }
      })
      return true
    },
    [updateStore]
  )

  /** УДАЛЕНИЕ ИЗ ДРУЗЕЙ: снимает взаимную связь (подписка при этом сохраняется) */
  const removeFriend = useCallback(
    (friendId: string): boolean => {
      if (!friendId) return false
      const wasFriend = (getSnapshot().friendIds ?? []).includes(friendId)
      updateStore((prev) => ({
        ...prev,
        friendIds: (prev.friendIds ?? []).filter((id) => id !== friendId),
      }))
      return wasFriend
    },
    [updateStore]
  )

  /** ПРИНЯТЬ ВХОДЯЩУЮ ЗАЯВКУ: переводит её в друзья и подписку */
  const acceptFriendRequest = useCallback(
    (friendId: string): boolean => {
      if (!friendId) return false
      const pending = (getSnapshot().incomingFriendRequests ?? []).includes(friendId)
      if (!pending) return false
      return addFriend(friendId)
    },
    [addFriend]
  )

  /** ОТКЛОНИТЬ ВХОДЯЩУЮ ЗАЯВКУ: убирает её и скрывает человека из рекомендаций */
  const declineFriendRequest = useCallback(
    (friendId: string) => {
      if (!friendId) return
      updateStore((prev) => ({
        ...prev,
        incomingFriendRequests: (prev.incomingFriendRequests ?? []).filter(
          (id) => id !== friendId
        ),
        dismissedSuggestions: Array.from(
          new Set([...(prev.dismissedSuggestions ?? []), friendId])
        ),
      }))
    },
    [updateStore]
  )

  /**
   * ОТПРАВИТЬ ЗАЯВКУ В ДРУЗЬЯ:
   * Кладёт человека в исходящие заявки и убирает из рекомендаций.
   * Возвращает true, если заявка отправлена впервые.
   */
  const sendFriendRequest = useCallback(
    (friendId: string): boolean => {
      if (!friendId) return false
      const already =
        (getSnapshot().outgoingFriendRequests ?? []).includes(friendId) ||
        (getSnapshot().friendIds ?? []).includes(friendId)
      if (already) return false
      updateStore((prev) => ({
        ...prev,
        outgoingFriendRequests: Array.from(
          new Set([...(prev.outgoingFriendRequests ?? []), friendId])
        ),
        dismissedSuggestions: (prev.dismissedSuggestions ?? []).filter((id) => id !== friendId),
      }))
      return true
    },
    [updateStore]
  )

  /** ОТМЕНИТЬ ИСХОДЯЩУЮ ЗАЯВКУ */
  const cancelFriendRequest = useCallback(
    (friendId: string) => {
      if (!friendId) return
      updateStore((prev) => ({
        ...prev,
        outgoingFriendRequests: (prev.outgoingFriendRequests ?? []).filter(
          (id) => id !== friendId
        ),
      }))
    },
    [updateStore]
  )

  /** СКРЫТЬ РЕКОМЕНДАЦИЮ («не показывать снова») */
  const dismissSuggestion = useCallback(
    (friendId: string) => {
      if (!friendId) return
      updateStore((prev) => ({
        ...prev,
        dismissedSuggestions: Array.from(
          new Set([...(prev.dismissedSuggestions ?? []), friendId])
        ),
        outgoingFriendRequests: (prev.outgoingFriendRequests ?? []).filter(
          (id) => id !== friendId
        ),
      }))
    },
    [updateStore]
  )

  /** ВЕРНУТЬ ВСЕ СКРЫТЫЕ РЕКОМЕНДАЦИИ ОБРАТНО */
  const restoreSuggestions = useCallback(() => {
    updateStore((prev) => ({ ...prev, dismissedSuggestions: [] }))
  }, [updateStore])

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 7 — СТОРИС ДРУЗЕЙ (Instagram-кружочки)
     ══════════════════════════════════════════════════════════════════════ */

  /** Помечает сторис друга просмотренной — кружок гаснет в серый */
  const markStoryViewed = useCallback(
    (friendId: string) => {
      if (!friendId) return
      updateStore((prev) => {
        const viewed = prev.viewedStoryIds ?? []
        if (viewed.includes(friendId)) return prev
        return { ...prev, viewedStoryIds: [...viewed, friendId] }
      })
    },
    [updateStore]
  )

  /** Помечает пачку сторис просмотренными («Посмотреть всё») */
  const markStoriesViewed = useCallback(
    (friendIds: string[]) => {
      if (!friendIds || friendIds.length === 0) return
      updateStore((prev) => {
        const viewed = prev.viewedStoryIds ?? []
        const next = Array.from(new Set([...viewed, ...friendIds]))
        if (next.length === viewed.length) return prev
        return { ...prev, viewedStoryIds: next }
      })
    },
    [updateStore]
  )

  /** Сбрасывает отметки просмотра — все кружочки снова яркие */
  const resetStoryViews = useCallback(() => {
    updateStore((prev) => ({ ...prev, viewedStoryIds: [] }))
  }, [updateStore])

  /** Публикует личный кадр «Моей истории» */
  const postMyStory = useCallback(
    (story: MyStory) => {
      if (!story) return
      updateStore((prev) => ({
        ...prev,
        myStories: [story, ...(prev.myStories ?? [])].slice(0, 30),
      }))
    },
    [updateStore]
  )

  /** Удаляет личный кадр истории */
  const removeMyStory = useCallback(
    (id: string) => {
      if (!id) return
      updateStore((prev) => ({
        ...prev,
        myStories: (prev.myStories ?? []).filter((s) => s.id !== id),
      }))
    },
    [updateStore]
  )

  /** Полностью очищает «Мою историю» */
  const clearMyStories = useCallback(() => {
    updateStore((prev) => ({ ...prev, myStories: [] }))
  }, [updateStore])

  const importState = useCallback(
    (newState: OgonekStoreState) => {
      updateStore((prev) => ({
        ...newState,
        // Защита от импорта без новых полей (старые архивы / сторонние JSON)
        comments: newState.comments ?? {},
        customEmojis: newState.customEmojis ?? [],
        dayReactions: newState.dayReactions ?? {},
        myReactions: newState.myReactions ?? {},
        profile: sanitizeProfile(newState.profile),
        followingIds: sanitizeFollowingIds(newState.followingIds),
        viewedStoryIds: sanitizeViewedStoryIds(newState.viewedStoryIds),
        myStories: sanitizeMyStories(newState.myStories),
        friendIds: sanitizeFriendIds(newState.friendIds),
        incomingFriendRequests: sanitizeFriendRequestIds(
          newState.incomingFriendRequests,
          DEFAULT_INCOMING_FRIEND_REQUEST_IDS
        ),
        outgoingFriendRequests: sanitizeFriendRequestIds(
          newState.outgoingFriendRequests,
          DEFAULT_OUTGOING_FRIEND_REQUEST_IDS
        ),
        dismissedSuggestions: sanitizeDismissedSuggestions(newState.dismissedSuggestions),
        morningFocusHistory: (() => {
          const raw = sanitizeMorningFocusHistory(
            (newState as Partial<OgonekStoreState>).morningFocusHistory
          )
          if (Object.keys(raw).length > 0) return raw
          const migrated = migrateIntentionsToHistory(newState.morningIntentions)
          return Object.keys(migrated).length > 0 ? migrated : prev.morningFocusHistory
        })(),
        // Если в архиве нет поля ачивок — не теряем уже собранные данные
        verifiedAchievements: Array.isArray(newState.verifiedAchievements)
          ? sanitizeVerifiedAchievements(newState.verifiedAchievements)
          : prev.verifiedAchievements,
        exploreFollowingIds: sanitizeExploreFollowingIds(newState.exploreFollowingIds),
        exploreLikedPosts: sanitizeExplorePostIds(newState.exploreLikedPosts),
        exploreSavedPosts: sanitizeExplorePostIds(newState.exploreSavedPosts),
        exploreRecentSearches: sanitizeExploreRecentSearches(newState.exploreRecentSearches),
        // Переписки из архива — если их нет, не теряем уже начатые диалоги
        chatThreads:
          newState.chatThreads && typeof newState.chatThreads === 'object'
            ? sanitizeChatThreads(newState.chatThreads, {})
            : prev.chatThreads,
        chatActiveFriendId: sanitizeChatActiveFriendId(newState.chatActiveFriendId),
        theme: newState.theme !== undefined ? sanitizeTheme(newState.theme) : prev.theme,
        accent: newState.accent !== undefined ? sanitizeAccent(newState.accent) : prev.accent,
        fontScale: newState.fontScale !== undefined ? sanitizeFontScale(newState.fontScale) : prev.fontScale,
        feedDensity: newState.feedDensity !== undefined ? sanitizeFeedDensity(newState.feedDensity) : prev.feedDensity,
        security: sanitizeSecurityState(newState.security),
        privacy: sanitizePrivacySettings(newState.privacy),
        streak: sanitizeStreakSettings(newState.streak),
        // Если в архиве нет месячных целей — не теряем уже настроенные KPI
        monthlyKpis: Array.isArray(newState.monthlyKpis)
          ? sanitizeMonthlyKpis(newState.monthlyKpis)
          : prev.monthlyKpis,
        // ЭТАП 18: аккаунты сохраняем, если импортируемый архив их не содержит
        auth:
          newState.auth && Array.isArray(newState.auth.accounts)
            ? sanitizeAuthState(newState.auth)
            : prev.auth,
      }))
    },
    [updateStore]
  )

  /** Полностью сбрасывает хранилище к заводским значениям Огонька */
  const resetToDefaults = useCallback(() => {
    updateStore(() => DEFAULT_STORE_STATE)
  }, [updateStore])

  /**
   * ЖИВЫЕ РЕАКЦИИ:
   * Переключает реакцию пользователя на цель (день или отдельную запись).
   * target: "day:12" | "day:12:pride:0" | "day:12:grat:2"
   * Возвращает true, если реакция теперь активна.
   */
  const toggleReaction = useCallback(
    (target: string, emojiId: string): boolean => {
      if (!target || !emojiId) return false
      const current = getSnapshot()
      const mineBefore = current.myReactions[target] ?? []
      const willBeActive = !mineBefore.includes(emojiId)

      updateStore((prev) => {
        const countsForTarget: Record<string, number> = { ...(prev.dayReactions[target] ?? {}) }
        const mineForTarget = prev.myReactions[target] ?? []
        const isMine = mineForTarget.includes(emojiId)

        const dayReactions: ReactionCounts = { ...prev.dayReactions }
        const myReactions: MyReactions = { ...prev.myReactions }

        if (isMine) {
          const nextCount = (countsForTarget[emojiId] ?? 1) - 1
          if (nextCount > 0) {
            countsForTarget[emojiId] = nextCount
          } else {
            delete countsForTarget[emojiId]
          }
          if (Object.keys(countsForTarget).length > 0) {
            dayReactions[target] = countsForTarget
          } else {
            delete dayReactions[target]
          }

          const nextMine = mineForTarget.filter((id) => id !== emojiId)
          if (nextMine.length > 0) {
            myReactions[target] = nextMine
          } else {
            delete myReactions[target]
          }
        } else {
          countsForTarget[emojiId] = (countsForTarget[emojiId] ?? 0) + 1
          dayReactions[target] = countsForTarget
          myReactions[target] = [...mineForTarget, emojiId]
        }

        return { ...prev, dayReactions, myReactions }
      })

      return willBeActive
    },
    [updateStore]
  )

  /** Реакции для конкретной цели */
  const getReactionsFor = useCallback((target: string): Record<string, number> => {
    return getSnapshot().dayReactions[target] ?? {}
  }, [])

  /** Список emojiId, которые пользователь поставил на цель */
  const getMyReactionsFor = useCallback((target: string): string[] => {
    return getSnapshot().myReactions[target] ?? []
  }, [])

  /**
   * КОММЕНТАРИИ ПОДДЕРЖКИ:
   * Добавляет комментарий (или ответ) к дню/гордости.
   * target: "day:12" | "day:12:pride:0"
   */
  const addComment = useCallback(
    (
      target: string,
      text: string,
      options?: {
        parentId?: string | null
        persona?: CommentPersona
        template?: string | null
        author?: string
      }
    ): Comment | null => {
      const trimmed = (text ?? '').trim().slice(0, 600)
      if (!target || !trimmed) return null

      const persona: CommentPersona = options?.persona === 'support' ? 'support' : 'me'
      const meta = SUPPORT_PERSONAS[persona]

      const comment: Comment = {
        id: `cm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        parentId: options?.parentId ?? null,
        author: options?.author?.trim() || meta.author,
        initials: meta.initials,
        text: trimmed,
        createdAt: new Date().toISOString(),
        likes: 0,
        likedByMe: false,
        isMine: persona === 'me',
        template: options?.template ?? null,
        persona,
      }

      updateStore((prev) => {
        const list = prev.comments?.[target] ?? []
        return {
          ...prev,
          comments: { ...prev.comments, [target]: [...list, comment] },
        }
      })

      return comment
    },
    [updateStore]
  )

  /** Ответ на конкретный комментарий — строит дерево поддержки */
  const addReply = useCallback(
    (
      target: string,
      parentId: string,
      text: string,
      persona: CommentPersona = 'me',
      template?: string | null
    ): Comment | null => {
      if (!parentId) return null
      return addComment(target, text, { parentId, persona, template })
    },
    [addComment]
  )

  /** Переключает лайк на комментарии. Возвращает true, если теперь лайк стоит. */
  const toggleCommentLike = useCallback(
    (target: string, commentId: string): boolean => {
      if (!target || !commentId) return false
      const current = getSnapshot()
      const found = (current.comments?.[target] ?? []).find((c) => c.id === commentId)
      const willLike = !(found?.likedByMe ?? false)

      updateStore((prev) => {
        const list = prev.comments?.[target] ?? []
        return {
          ...prev,
          comments: {
            ...prev.comments,
            [target]: list.map((c) =>
              c.id === commentId
                ? {
                    ...c,
                    likedByMe: !c.likedByMe,
                    likes: Math.max(0, c.likes + (c.likedByMe ? -1 : 1)),
                  }
                : c
            ),
          },
        }
      })

      return willLike
    },
    [updateStore]
  )

  /** Удаляет комментарий вместе со всеми его ответами */
  const deleteComment = useCallback(
    (target: string, commentId: string) => {
      if (!target || !commentId) return
      updateStore((prev) => {
        const list = prev.comments?.[target] ?? []
        const toRemove = new Set<string>([commentId])
        let changed = true
        while (changed) {
          changed = false
          for (const c of list) {
            if (c.parentId && toRemove.has(c.parentId) && !toRemove.has(c.id)) {
              toRemove.add(c.id)
              changed = true
            }
          }
        }
        return {
          ...prev,
          comments: {
            ...prev.comments,
            [target]: list.filter((c) => !toRemove.has(c.id)),
          },
        }
      })
    },
    [updateStore]
  )

  /** Все комментарии цели (плоский список; дерево собирается на клиенте) */
  const getCommentsFor = useCallback((target: string): Comment[] => {
    return getSnapshot().comments?.[target] ?? []
  }, [])

  /** Полностью очищает обсуждение цели */
  const clearComments = useCallback(
    (target: string) => {
      if (!target) return
      updateStore((prev) => {
        const comments = { ...prev.comments }
        delete comments[target]
        return { ...prev, comments }
      })
    },
    [updateStore]
  )

  /**
   * КОНСТРУКТОР СМАЙЛИКОВ:
   * Добавляет пользовательский смайлик. Возвращает id (существующий, если дубликат).
   */
  const addCustomEmoji = useCallback(
    (char: string, label: string): string | null => {
      const trimmedChar = (char ?? '').trim().slice(0, 8)
      if (!trimmedChar) return null

      const existing = getSnapshot().customEmojis.find((e) => e.char === trimmedChar)
      if (existing) return existing.id

      const id = `emoji-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
      const emoji: CustomEmoji = {
        id,
        char: trimmedChar,
        label: (label ?? '').trim().slice(0, 40) || 'Мой смайлик',
        createdAt: new Date().toISOString(),
      }
      updateStore((prev) => {
        if (prev.customEmojis.some((e) => e.char === emoji.char)) return prev
        return { ...prev, customEmojis: [...prev.customEmojis, emoji] }
      })
      return id
    },
    [updateStore]
  )

  /** Удаляет кастомный смайлик и все связанные с ним реакции */
  const removeCustomEmoji = useCallback(
    (id: string) => {
      updateStore((prev) => {
        const customEmojis = prev.customEmojis.filter((e) => e.id !== id)

        const dayReactions: ReactionCounts = {}
        for (const [target, counts] of Object.entries(prev.dayReactions)) {
          const next: Record<string, number> = { ...counts }
          delete next[id]
          if (Object.keys(next).length > 0) dayReactions[target] = next
        }

        const myReactions: MyReactions = {}
        for (const [target, ids] of Object.entries(prev.myReactions)) {
          const next = ids.filter((x) => x !== id)
          if (next.length > 0) myReactions[target] = next
        }

        return { ...prev, customEmojis, dayReactions, myReactions }
      })
    },
    [updateStore]
  )

  /** Оценка гордости по шкале 1..10 */
  const ratePride = useCallback(
    (dayId: number, index: number, scale: number) => {
      const clamped = Math.min(10, Math.max(1, Math.round(scale)))
      updateStore((prev) => ({
        ...prev,
        days: prev.days.map((d) => {
          if (d.id !== dayId) return d
          const prides = d.prides.map((p, i) => (i === index ? { ...p, scale: clamped } : p))
          return { ...d, prides }
        }),
      }))
    },
    [updateStore]
  )

  /** Оценка благодарности по шкале 1..10 (строка превращается в объект с оценкой) */
  const rateGratitude = useCallback(
    (dayId: number, index: number, rating: number) => {
      const clamped = Math.min(10, Math.max(1, Math.round(rating)))
      updateStore((prev) => ({
        ...prev,
        days: prev.days.map((d) => {
          if (d.id !== dayId) return d
          const gratitudes = d.gratitudes.map((g, i) =>
            i === index ? withGratitudeRating(g, clamped) : g
          )
          return { ...d, gratitudes }
        }),
      }))
    },
    [updateStore]
  )

  /** Снимает оценку с гордости (обнуляет) */
  const clearPrideRating = useCallback(
    (dayId: number, index: number) => {
      updateStore((prev) => ({
        ...prev,
        days: prev.days.map((d) => {
          if (d.id !== dayId) return d
          const prides = d.prides.map((p, i) => (i === index ? { ...p, scale: 0 } : p))
          return { ...d, prides }
        }),
      }))
    },
    [updateStore]
  )

  /** Снимает оценку с благодарности */
  const clearGratitudeRating = useCallback(
    (dayId: number, index: number) => {
      updateStore((prev) => ({
        ...prev,
        days: prev.days.map((d) => {
          if (d.id !== dayId) return d
          const gratitudes = d.gratitudes.map((g, i) => {
            if (i !== index) return g
            if (typeof g === 'string') return { text: g, rating: 0 }
            return { ...g, rating: 0 }
          })
          return { ...d, gratitudes }
        }),
      }))
    },
    [updateStore]
  )

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 9 — ПРИВАТНОСТЬ ДНЯ И ГОРДОСТЕЙ
     ══════════════════════════════════════════════════════════════════════ */

  /** Меняет приватность всего дня */
  const setDayVisibility = useCallback(
    (dayId: number, level: VisibilityLevel) => {
      const next = normalizeVisibility(level)
      updateStore((prev) => ({
        ...prev,
        days: prev.days.map((d) => (d.id === dayId ? { ...d, visibility: next } : d)),
      }))
    },
    [updateStore]
  )

  /** Меняет приватность конкретной гордости дня */
  const setPrideVisibility = useCallback(
    (dayId: number, index: number, level: VisibilityLevel) => {
      const next = normalizeVisibility(level)
      updateStore((prev) => ({
        ...prev,
        days: prev.days.map((d) => {
          if (d.id !== dayId) return d
          const prides = d.prides.map((p, i) => (i === index ? { ...p, visibility: next } : p))
          return { ...d, prides }
        }),
      }))
    },
    [updateStore]
  )

  /**
   * Применяет один уровень приватности ко всему дню сразу:
   * и к самому дню, и ко всем его гордостям.
   */
  const setAllPridesVisibility = useCallback(
    (dayId: number, level: VisibilityLevel) => {
      const next = normalizeVisibility(level)
      updateStore((prev) => ({
        ...prev,
        days: prev.days.map((d) =>
          d.id === dayId
            ? { ...d, visibility: next, prides: d.prides.map((p) => ({ ...p, visibility: next })) }
            : d
        ),
      }))
    },
    [updateStore]
  )

  /** Compute the next date for a new day (last date + 1 calendar day) */
  const getNextDayDate = useCallback((): string => {
    const days = getSnapshot().days
    const latestDay = days.reduce<Day | null>((best, d) => {
      if (!d.dateISO) return best
      if (!best) return d
      return d.id > best.id ? d : best
    }, null)

    const baseDate = latestDay?.dateISO ? new Date(latestDay.dateISO) : new Date()
    const nextDate = new Date(baseDate)
    nextDate.setDate(nextDate.getDate() + 1)
    return nextDate.toISOString()
  }, [])

  /** Compute the next day id (maxId + 1) */
  const getNextDayId = useCallback((): number => {
    const days = getSnapshot().days
    const maxId = days.reduce((max, d) => Math.max(max, d.id), 0)
    return maxId + 1
  }, [])

  /* ══════════════════════════════════════════════════════════════════════
     ЭТАП 13 — ВСТРОЕННЫЙ МЕССЕНДЖЕР И БЫСТРЫЕ ЧАТЫ С ДРУЗЬЯМИ
     ══════════════════════════════════════════════════════════════════════ */

  /** Открыть/закрыть диалог в разделе «Чаты» (только реальный друг) */
  const setActiveChatFriend = useCallback(
    (friendId: string | null): string | null => {
      let next: string | null = null
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        if (!friendId) {
          return prev.chatActiveFriendId === null ? prev : { ...prev, chatActiveFriendId: null }
        }
        const exists =
          friendId === 'saved-messages' ||
          Boolean(getFriend(friendId)) ||
          Boolean(threads[friendId])
        if (!exists) return prev
        next = friendId
        const nextThreads = threads[friendId]
          ? threads
          : { ...threads, [friendId]: emptyThread() }
        return { ...prev, chatThreads: nextThreads, chatActiveFriendId: friendId }
      })
      return next
    },
    [updateStore]
  )

  /**
   * Начать (или открыть) диалог с другом: гарантирует тред в сторе и
   * делает его активным. Возвращает true, если собеседник существует.
   */
  const startChatWithFriend = useCallback(
    (friendId: string): boolean => {
      if (!friendId || !getFriend(friendId)) return false
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const nextThreads = threads[friendId]
          ? threads
          : { ...threads, [friendId]: emptyThread() }
        return { ...prev, chatThreads: nextThreads, chatActiveFriendId: friendId }
      })
      return true
    },
    [updateStore]
  )

  /**
   * Живой собеседник: через небольшую паузу друг отвечает и ставит реакцию
   * на последнее отправленное сообщение. Делает чат по-настоящему живым.
   */
  const scheduleChatAutoReply = useCallback(
    (friendId: string, userText: string, hasAttachment: boolean) => {
      // Боты и автоответы выключены в боевом режиме (Требование 3)
      if (typeof window === 'undefined' || process.env.NEXT_PUBLIC_DEMO_MODE !== '1') return
      let friend = getFriend(friendId)
      const isGroup = isGroupThread(threadOf(getSnapshot().chatThreads ?? {}, friendId), friendId)
      if (!friend && isGroup) {
        const thread = threadOf(getSnapshot().chatThreads ?? {}, friendId)
        const candidates = (thread.groupMeta?.memberIds ?? []).filter((m) => m !== MY_CHAT_ID)
        if (candidates.length > 0) {
          const pickedId = candidates[Math.floor(Math.random() * candidates.length)]
          friend = getFriend(pickedId)
        }
      }
      if (!friend) return

      const auto = pickAutoReply(friend, userText, hasAttachment)
      const delay = 1000 + Math.floor(Math.random() * 1000)

      window.setTimeout(() => {
        updateStore((prev) => {
          const threads = prev.chatThreads ?? {}
          if (!threads[friendId]) return prev
          const thread = threadOf(threads, friendId)

          // Мои сообщения «прочитаны» собеседником (галочки ✓✓)
          let messages: ChatMessage[] = thread.messages.map((m) =>
            m.authorId === MY_CHAT_ID ? { ...m, read: true, status: 'read' } : m
          )

          // Собеседник реагирует на последнее моё сообщение
          if (auto.reactionId) {
            let idx = -1
            for (let i = messages.length - 1; i >= 0; i -= 1) {
              if (messages[i].authorId === MY_CHAT_ID) {
                idx = i
                break
              }
            }
            if (idx >= 0) {
              const target = messages[idx]
              const responderId = friend!.id
              const already = target.reactions.some(
                (r) => r.by === responderId && r.emojiId === auto.reactionId
              )
              if (!already) {
                const reactionId = auto.reactionId
                messages = messages.map((m, k) =>
                  k === idx
                    ? { ...m, reactions: [...m.reactions, { emojiId: reactionId, by: responderId }] }
                    : m
                )
              }
            }
          }

          const reply = makeChatMessage({ authorId: friend!.id, text: auto.text })
          return {
            ...prev,
            chatThreads: {
              ...threads,
              [friendId]: { ...thread, messages: [...messages, reply] },
            },
          }
        })
      }, delay)
    },
    [updateStore]
  )

  /**
   * Отправить сообщение другу или в группу (с вложением, ответом, медиа или без).
   * Возвращает созданное сообщение или null, если отправлять нечего.
   */
  const sendChatMessage = useCallback(
    (
      friendId: string,
      text: string,
      attachment?: ChatAttachment | null,
      extra?: {
        replyTo?: ChatMessageReply | null
        forwardFrom?: ChatMessageForward | null
        media?: ChatMessageMedia | null
        silent?: boolean
        scheduledForISO?: string | null
        poll?: ChatPoll | null
        type?: ChatMessageType
      }
    ): ChatMessage | null => {
      const isGroup = isGroupThread(threadOf(getSnapshot().chatThreads ?? {}, friendId), friendId)
      if (!friendId || (!getFriend(friendId) && !isGroup && friendId !== 'saved-messages')) return null
      const clean = (text ?? '').trim().slice(0, CHAT_MESSAGE_LIMIT)
      if (!clean && !attachment && !extra?.media && !extra?.poll) return null

      const isScheduled = Boolean(extra?.scheduledForISO && new Date(extra.scheduledForISO).getTime() > Date.now())

      const message = makeChatMessage({
        authorId: MY_CHAT_ID,
        text: clean,
        attachment: attachment ?? null,
        replyTo: extra?.replyTo ?? null,
        forwardFrom: extra?.forwardFrom ?? null,
        media: extra?.media ?? null,
        silent: extra?.silent ?? false,
        scheduledForISO: extra?.scheduledForISO ?? null,
        poll: extra?.poll ?? null,
        type: extra?.type,
        status: isScheduled ? 'sending' : 'sent',
      })

      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        if (isScheduled) {
          const scheduled = thread.scheduledMessages ?? []
          return {
            ...prev,
            chatThreads: {
              ...threads,
              [friendId]: { ...thread, scheduledMessages: [...scheduled, message], draft: '' },
            },
          }
        }
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: { ...thread, messages: [...thread.messages, message], draft: '' },
          },
        }
      })

      if (!isScheduled && friendId !== 'saved-messages') {
        scheduleChatAutoReply(friendId, clean, Boolean(attachment || extra?.media))
      }
      return message
    },
    [updateStore, scheduleChatAutoReply]
  )

  /** Редактирование текста своего сообщения */
  const editChatMessage = useCallback(
    (friendId: string, messageId: string, newText: string): boolean => {
      if (!friendId || !messageId) return false
      const clean = (newText ?? '').trim().slice(0, CHAT_MESSAGE_LIMIT)
      if (!clean) return false

      let success = false
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        const messages = thread.messages.map((m) => {
          if (m.id === messageId && m.authorId === MY_CHAT_ID) {
            success = true
            return {
              ...m,
              text: clean,
              editedAtISO: new Date().toISOString(),
            }
          }
          return m
        })
        if (!success) return prev
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: { ...thread, messages },
          },
        }
      })
      return success
    },
    [updateStore]
  )

  /** Удаление нескольких сообщений из переписки */
  const deleteChatMessages = useCallback(
    (friendId: string, messageIds: string[]) => {
      if (!friendId || !Array.isArray(messageIds) || messageIds.length === 0) return
      const idsSet = new Set(messageIds)
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: {
              ...thread,
              messages: thread.messages.filter((m) => !idsSet.has(m.id)),
            },
          },
        }
      })
    },
    [updateStore]
  )

  /** Закрепить / открепить сообщение внутри чата (баннер в шапке) */
  const togglePinChatMessage = useCallback(
    (friendId: string, messageId: string): boolean => {
      if (!friendId || !messageId) return false
      let isPinned = false
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        const currentlyPinned = thread.pinnedMessageId === messageId
        const newPinnedId = currentlyPinned ? null : messageId
        isPinned = !currentlyPinned

        const messages = thread.messages.map((m) => {
          if (m.id === messageId) return { ...m, pinned: isPinned }
          if (currentlyPinned && m.pinned) return { ...m, pinned: false }
          return m
        })

        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: {
              ...thread,
              pinnedMessageId: newPinnedId,
              messages,
            },
          },
        }
      })
      return isPinned
    },
    [updateStore]
  )

  /** Создание новой группы */
  const createGroupChat = useCallback(
    (
      title: string,
      memberIds: string[],
      avatarColor = 'linear-gradient(135deg, #ff7a18 0%, #af002d 100%)',
      avatarEmoji = '👥',
      description = ''
    ): string => {
      const cleanTitle = (title || 'Новая группа').trim().slice(0, 100)
      const groupId = `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
      const groupMeta: ChatGroupMeta = {
        id: groupId,
        title: cleanTitle,
        avatarColor,
        avatarEmoji,
        avatarImage: null,
        memberIds: Array.from(new Set([MY_CHAT_ID, ...memberIds])),
        createdAtISO: new Date().toISOString(),
        createdBy: MY_CHAT_ID,
        description,
      }

      const initialMessage = makeChatMessage({
        authorId: MY_CHAT_ID,
        text: `Группа «${cleanTitle}» создана. Добро пожаловать! 🎉`,
        system: true,
      })

      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [groupId]: {
              messages: [initialMessage],
              readAtISO: new Date().toISOString(),
              muted: false,
              pinned: true,
              draft: '',
              groupMeta,
            },
          },
          chatActiveFriendId: groupId,
        }
      })

      return groupId
    },
    [updateStore]
  )

  /** Добавление / обновление пользовательской папки */
  const setChatFolder = useCallback(
    (folder: ChatFolder) => {
      if (!folder?.id || !folder?.title) return
      updateStore((prev) => {
        const current = prev.chatFolders ?? DEFAULT_CHAT_FOLDERS
        const exists = current.some((f) => f.id === folder.id)
        const updated = exists
          ? current.map((f) => (f.id === folder.id ? folder : f))
          : [...current, folder]
        return { ...prev, chatFolders: updated }
      })
    },
    [updateStore]
  )

  /** Удаление пользовательской папки */
  const deleteChatFolder = useCallback(
    (folderId: string) => {
      if (!folderId) return
      updateStore((prev) => {
        const current = prev.chatFolders ?? DEFAULT_CHAT_FOLDERS
        return {
          ...prev,
          chatFolders: current.filter((f) => f.id !== folderId || f.isBuiltIn),
          chatActiveFolderId:
            prev.chatActiveFolderId === folderId ? 'all' : prev.chatActiveFolderId,
        }
      })
    },
    [updateStore]
  )

  /** Переключение архива диалога */
  const toggleThreadArchive = useCallback(
    (friendId: string): boolean => {
      if (!friendId) return false
      let nowArchived = false
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        nowArchived = !thread.archived
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: { ...thread, archived: nowArchived },
          },
        }
      })
      return nowArchived
    },
    [updateStore]
  )

  /** Смена активной папки */
  const setChatActiveFolderId = useCallback(
    (folderId: string) => {
      updateStore((prev) => ({ ...prev, chatActiveFolderId: folderId }))
    },
    [updateStore]
  )

  /** Переслать карточку сразу нескольким друзьям. Возвращает число получателей. */
  const forwardToChat = useCallback(
    (friendIds: string[], attachment: ChatAttachment, note?: string): number => {
      if (!Array.isArray(friendIds) || friendIds.length === 0 || !attachment) return 0
      const clean = (note ?? '').trim().slice(0, CHAT_MESSAGE_LIMIT)
      let count = 0
      for (const id of friendIds) {
        if (sendChatMessage(id, clean, attachment)) count += 1
      }
      return count
    },
    [sendChatMessage]
  )

  /**
   * Переключает реакцию пользователя на сообщение чата.
   * Возвращает true, если реакция теперь активна.
   */
  const toggleChatReaction = useCallback(
    (friendId: string, messageId: string, emojiId: string): boolean => {
      if (!friendId || !messageId || !emojiId) return false
      const thread = threadOf(getSnapshot().chatThreads ?? {}, friendId)
      const target = thread.messages.find((m) => m.id === messageId)
      const willBeActive = !target?.reactions.some(
        (r) => r.by === MY_CHAT_ID && r.emojiId === emojiId
      )

      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const t = threadOf(threads, friendId)
        const messages = t.messages.map((m) => {
          if (m.id !== messageId) return m
          const mine = m.reactions.some((r) => r.by === MY_CHAT_ID && r.emojiId === emojiId)
          return {
            ...m,
            reactions: mine
              ? m.reactions.filter((r) => !(r.by === MY_CHAT_ID && r.emojiId === emojiId))
              : [...m.reactions, { emojiId, by: MY_CHAT_ID }],
          }
        })
        return { ...prev, chatThreads: { ...threads, [friendId]: { ...t, messages } } }
      })

      return willBeActive
    },
    [updateStore]
  )

  /** Сохраняет черновик сообщения для конкретной переписки */
  const setChatDraft = useCallback(
    (friendId: string, value: string) => {
      if (!friendId) return
      const draft = (value ?? '').slice(0, CHAT_MESSAGE_LIMIT)
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threads[friendId]
        if (!thread) {
          return { ...prev, chatThreads: { ...threads, [friendId]: { ...emptyThread(), draft } } }
        }
        if (thread.draft === draft) return prev
        return { ...prev, chatThreads: { ...threads, [friendId]: { ...thread, draft } } }
      })
    },
    [updateStore]
  )

  /** Помечает переписку прочитанной (сбрасывает счётчик непрочитанных) */
  const markThreadRead = useCallback(
    (friendId: string) => {
      if (!friendId) return
      const nowISO = new Date().toISOString()
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threads[friendId]
        if (!thread || unreadCount(thread) === 0) return prev
        return {
          ...prev,
          chatThreads: { ...threads, [friendId]: { ...thread, readAtISO: nowISO } },
        }
      })
    },
    [updateStore]
  )

  /** Помечает прочитанными сразу все переписки */
  const markAllThreadsRead = useCallback(() => {
    const nowISO = new Date().toISOString()
    updateStore((prev) => {
      const threads = prev.chatThreads ?? {}
      let changed = false
      const next: ChatThreads = {}
      for (const [id, thread] of Object.entries(threads)) {
        if (unreadCount(thread) > 0) {
          next[id] = { ...thread, readAtISO: nowISO }
          changed = true
        } else {
          next[id] = thread
        }
      }
      return changed ? { ...prev, chatThreads: next } : prev
    })
  }, [updateStore])

  /** Очищает историю переписки, оставляя сам диалог */
  const clearThreadMessages = useCallback(
    (friendId: string) => {
      if (!friendId) return
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: { ...thread, messages: [], readAtISO: new Date().toISOString() },
          },
        }
      })
    },
    [updateStore]
  )

  /** Удаляет одно сообщение из переписки (у себя или для всех) */
  const deleteChatMessage = useCallback(
    (friendId: string, messageId: string, forEveryone = false) => {
      if (!friendId || !messageId) return
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        let messages = thread.messages
        if (forEveryone) {
          messages = messages.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  deletedForAll: true,
                  text: 'Сообщение удалено',
                  media: null,
                  attachment: null,
                  poll: null,
                }
              : m
          )
        } else {
          messages = messages.filter((m) => m.id !== messageId)
        }
        const scheduled = (thread.scheduledMessages ?? []).filter((m) => m.id !== messageId)
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: {
              ...thread,
              messages,
              scheduledMessages: scheduled,
            },
          },
        }
      })
    },
    [updateStore]
  )

  /** Сохраняет перевод сообщения */
  const translateChatMessage = useCallback(
    (friendId: string, messageId: string, targetLang: string, translatedText: string) => {
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        const messages = thread.messages.map((m) => {
          if (m.id === messageId) {
            return {
              ...m,
              translations: {
                ...(m.translations ?? {}),
                [targetLang]: translatedText,
              },
            }
          }
          return m
        })
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: { ...thread, messages },
          },
        }
      })
    },
    [updateStore]
  )

  /** Сохраняет расшифровку аудиосообщения */
  const transcribeVoiceMessage = useCallback(
    (friendId: string, messageId: string, transcript: string) => {
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        const messages = thread.messages.map((m) => {
          if (m.id === messageId) {
            return { ...m, transcript }
          }
          return m
        })
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: { ...thread, messages },
          },
        }
      })
    },
    [updateStore]
  )

  /** Голосование в опросе */
  const voteInPoll = useCallback(
    (friendId: string, messageId: string, optionIndex: number) => {
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        const messages = thread.messages.map((m) => {
          if (m.id === messageId && m.poll) {
            const poll = m.poll
            const alreadyVoted = Boolean(poll.options[optionIndex]?.votedByMe)
            const newOptions = poll.options.map((opt, idx) => {
              if (idx === optionIndex) {
                return {
                  ...opt,
                  votes: alreadyVoted ? Math.max(0, opt.votes - 1) : opt.votes + 1,
                  votedByMe: !alreadyVoted,
                }
              }
              if (!poll.isMulti && !alreadyVoted && opt.votedByMe) {
                return { ...opt, votes: Math.max(0, opt.votes - 1), votedByMe: false }
              }
              return opt
            })
            const totalVotes = newOptions.reduce((s, o) => s + o.votes, 0)
            return {
              ...m,
              poll: { ...poll, options: newOptions, totalVotes },
            }
          }
          return m
        })
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: { ...thread, messages },
          },
        }
      })
    },
    [updateStore]
  )

  /** Переключение метки на сообщении («Важное», «Позже», «Идея») */
  const toggleMessageLabel = useCallback(
    (friendId: string, messageId: string, label: string) => {
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        const messages = thread.messages.map((m) => {
          if (m.id === messageId) {
            const currentLabels = m.labels ?? []
            const exists = currentLabels.includes(label)
            const updated = exists ? currentLabels.filter((l) => l !== label) : [...currentLabels, label]
            return { ...m, labels: updated }
          }
          return m
        })
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: { ...thread, messages },
          },
        }
      })
    },
    [updateStore]
  )

  /** Назначить / снять цветной тег с диалога */
  const assignChatTag = useCallback(
    (friendId: string, tagId: string) => {
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        const currentTags = thread.tagIds ?? []
        const exists = currentTags.includes(tagId)
        const updated = exists ? currentTags.filter((t) => t !== tagId) : [...currentTags, tagId]
        return {
          ...prev,
          chatThreads: {
            ...threads,
            [friendId]: { ...thread, tagIds: updated },
          },
        }
      })
    },
    [updateStore]
  )

  /** Создать / обновить пользовательский тег диалогов */
  const setChatTag = useCallback(
    (tag: ChatTag) => {
      updateStore((prev) => {
        const tags = prev.chatTags ?? []
        const exists = tags.some((t) => t.id === tag.id)
        const updated = exists ? tags.map((t) => (t.id === tag.id ? tag : t)) : [...tags, tag]
        return { ...prev, chatTags: updated }
      })
    },
    [updateStore]
  )

  /** Удалить тег диалогов */
  const deleteChatTag = useCallback(
    (tagId: string) => {
      updateStore((prev) => {
        const tags = prev.chatTags ?? []
        return { ...prev, chatTags: tags.filter((t) => t.id !== tagId) }
      })
    },
    [updateStore]
  )

  /** Обновить настройки чатов */
  const updateChatSettings = useCallback(
    (patch: Partial<ChatSettings>) => {
      updateStore((prev) => {
        const current = prev.chatSettings ?? DEFAULT_CHAT_SETTINGS
        return { ...prev, chatSettings: { ...current, ...patch } }
      })
    },
    [updateStore]
  )

  /** Доставить созревшие запланированные сообщения */
  const deliverScheduledMessages = useCallback(
    (friendId?: string) => {
      const now = Date.now()
      updateStore((prev) => {
        const threads = { ...(prev.chatThreads ?? {}) }
        let changed = false
        const targetIds = friendId ? [friendId] : Object.keys(threads)

        for (const fId of targetIds) {
          const thread = threads[fId]
          if (!thread?.scheduledMessages || thread.scheduledMessages.length === 0) continue
          const ready = thread.scheduledMessages.filter(
            (m) => m.scheduledForISO && new Date(m.scheduledForISO).getTime() <= now
          )
          if (ready.length === 0) continue

          const remaining = thread.scheduledMessages.filter(
            (m) => !m.scheduledForISO || new Date(m.scheduledForISO).getTime() > now
          )
          const sent = ready.map((m) => ({ ...m, status: 'sent' as const, scheduledForISO: null }))
          threads[fId] = {
            ...thread,
            messages: [...thread.messages, ...sent],
            scheduledMessages: remaining,
          }
          changed = true
        }

        if (!changed) return prev
        return { ...prev, chatThreads: threads }
      })
    },
    [updateStore]
  )

  /** Смена уровня сложности (1..5) с фиксацией в истории */
  const setDifficultyLevel = useCallback(
    (newLevel: number, reason?: string) => {
      if (newLevel < 1 || newLevel > 5) return
      const nowISO = new Date().toISOString()
      updateStore((prev) => {
        const currentLevel = prev.profile.difficultyLevel ?? prev.profile.level ?? 2
        const history = prev.profile.levelHistory ?? []
        const entry: LevelHistoryEntry = {
          id: `lh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          fromLevel: currentLevel,
          toLevel: newLevel,
          oldLevel: currentLevel,
          newLevel: newLevel,
          reason,
          changedAtISO: nowISO,
        }
        return {
          ...prev,
          profile: {
            ...prev.profile,
            level: newLevel,
            difficultyLevel: newLevel,
            levelChangedAtISO: nowISO,
            levelHistory: [entry, ...history],
          },
        }
      })
    },
    [updateStore]
  )

  /** Выключает/включает уведомления переписки. Возвращает новое значение mute */
  const toggleThreadMute = useCallback(
    (friendId: string): boolean => {
      if (!friendId) return false
      const current = threadOf(getSnapshot().chatThreads ?? {}, friendId)
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        return {
          ...prev,
          chatThreads: { ...threads, [friendId]: { ...thread, muted: !thread.muted } },
        }
      })
      return !current.muted
    },
    [updateStore]
  )

  /** Закрепляет/открепляет диалог сверху. Возвращает новое значение pin */
  const toggleThreadPin = useCallback(
    (friendId: string): boolean => {
      if (!friendId) return false
      const current = threadOf(getSnapshot().chatThreads ?? {}, friendId)
      updateStore((prev) => {
        const threads = prev.chatThreads ?? {}
        const thread = threadOf(threads, friendId)
        return {
          ...prev,
          chatThreads: { ...threads, [friendId]: { ...thread, pinned: !thread.pinned } },
        }
      })
      return !current.pinned
    },
    [updateStore]
  )

  /* ── ЭТАП 18 — АВТОРИЗАЦИЯ, РЕГИСТРАЦИЯ И ПЕРЕКЛЮЧЕНИЕ АККАУНТОВ ──────── */

  /**
   * Делает аккаунт активным: переносит его слепок в основной профиль,
   * поднимает счётчики входов/переключений и сбрасывает защиту от перебора.
   * Возвращает false, если аккаунт с таким id не найден.
   */
  const activateAccount = useCallback(
    (accountId: string, isSwitch = false): boolean => {
      let activated = false
      updateStore((prev) => {
        const account = prev.auth.accounts.find((a) => a.id === accountId)
        if (!account) return prev
        activated = true
        const nowISO = new Date().toISOString()
        const accounts = prev.auth.accounts.map((a) =>
          a.id === accountId
            ? { ...a, lastActiveISO: nowISO, signInCount: a.signInCount + 1 }
            : a
        )
        const activeAccount = accounts.find((a) => a.id === accountId) ?? account
        return {
          ...prev,
          profile: sanitizeProfile({ ...prev.profile, ...profilePatchFromAccount(activeAccount) }),
          auth: {
            ...prev.auth,
            accounts,
            activeAccountId: accountId,
            signedIn: true,
            switchCount: prev.auth.switchCount + (isSwitch ? 1 : 0),
            signInCount: prev.auth.signInCount + 1,
            failedAttempts: 0,
            lockedUntilISO: null,
            lastAuthAtISO: nowISO,
            updatedAtISO: nowISO,
          },
        }
      })
      return activated
    },
    [updateStore]
  )

  /** Регистрация нового аккаунта по почте и паролю (пароль хранится только хэшем) */
  const registerWithEmail = useCallback(
    async (input: { displayName: string; email: string; password: string }): Promise<AuthResult> => {
      const email = normalizeEmail(input.email)
      const displayName = (input.displayName ?? '').trim()
      if (!displayName) return { ok: false, error: 'Укажите имя или ник' }
      if (!isValidEmail(email)) return { ok: false, error: 'Введите корректный адрес почты' }
      if (!isValidPassword(input.password)) {
        return {
          ok: false,
          error: `Пароль должен быть от ${MIN_PASSWORD_LENGTH} до ${MAX_PASSWORD_LENGTH} символов`,
        }
      }

      const current = getSnapshot()
      if (findAccountByEmail(current.auth.accounts, email)) {
        return { ok: false, error: 'Аккаунт с такой почтой уже существует на устройстве' }
      }

      const salt = generateSalt()
      const hash = await hashSecret(input.password, salt)
      let createdId: string | null = null

      updateStore((prev) => {
        const nowISO = new Date().toISOString()
        const account = createAccount({
          provider: 'email',
          displayName,
          email,
          passwordHash: hash,
          passwordSalt: salt,
          existingIds: prev.auth.accounts.map((a) => a.id),
          takenUsernames: takenUsernamesOf(prev.auth.accounts),
          verified: true,
          now: new Date(nowISO),
        })
        account.signInCount = 1
        account.lastActiveISO = nowISO
        createdId = account.id
        return {
          ...prev,
          profile: sanitizeProfile({ ...prev.profile, ...profilePatchFromAccount(account) }),
          auth: {
            ...prev.auth,
            accounts: [...prev.auth.accounts, account],
            activeAccountId: account.id,
            signedIn: true,
            signInCount: prev.auth.signInCount + 1,
            failedAttempts: 0,
            lockedUntilISO: null,
            lastAuthAtISO: nowISO,
            updatedAtISO: nowISO,
          },
        }
      })

      return createdId
        ? { ok: true, accountId: createdId }
        : { ok: false, error: 'Не удалось создать аккаунт' }
    },
    [updateStore]
  )

  /** Вход по почте и паролю: проверка хэша, защита от перебора, активация аккаунта */
  const signInWithEmail = useCallback(
    async (emailInput: string, password: string): Promise<AuthResult> => {
      const email = normalizeEmail(emailInput)
      if (!isValidEmail(email)) return { ok: false, error: 'Введите корректный адрес почты' }

      const current = getSnapshot()
      const lockout = computeLockout(current.auth.lockedUntilISO)
      if (lockout.isLocked) {
        const seconds = Math.ceil(lockout.remainingMs / 1000)
        return { ok: false, error: `Вход временно заблокирован. Подождите ${seconds} с` }
      }

      const account = findAccountByEmail(current.auth.accounts, email)
      if (!account) {
        return { ok: false, error: 'Аккаунт с такой почтой не найден — зарегистрируйтесь' }
      }
      if (account.provider === 'guest') {
        return { ok: false, error: 'Это гостевой профиль — используйте гостевой вход' }
      }

      let valid: boolean
      if (account.passwordHash && account.passwordSalt) {
        valid = await verifySecret(password, account.passwordSalt, account.passwordHash)
      } else {
        // Демо-сид: пароль подставляется автоматически при первом входе
        valid = password === DEMO_ACCOUNT_PASSWORD
      }

      if (!valid) {
        const nextFail = nextFailedAttemptState(current.auth.failedAttempts)
        const nowISO = new Date().toISOString()
        updateStore((prev) => ({
          ...prev,
          auth: {
            ...prev.auth,
            failedAttempts: nextFail.failedAttempts,
            lockedUntilISO: nextFail.lockedUntilISO,
            updatedAtISO: nowISO,
          },
        }))
        if (nextFail.lockedUntilISO) {
          return { ok: false, error: 'Слишком много неверных попыток. Вход заблокирован на минуту.' }
        }
        return {
          ok: false,
          error: `Неверный пароль. Осталось попыток: ${attemptsLeft(nextFail.failedAttempts)}`,
        }
      }

      // Первый вход в демо-личность — закрепляем пароль как соль + хэш
      if (!account.passwordHash || !account.passwordSalt) {
        const salt = generateSalt()
        const hash = await hashSecret(password, salt)
        updateStore((prev) => ({
          ...prev,
          auth: {
            ...prev.auth,
            accounts: prev.auth.accounts.map((a) =>
              a.id === account.id ? { ...a, passwordHash: hash, passwordSalt: salt } : a
            ),
          },
        }))
      }

      const ok = activateAccount(account.id, true)
      return ok ? { ok: true, accountId: account.id } : { ok: false, error: 'Не удалось войти' }
    },
    [activateAccount, updateStore]
  )

  /** Вход через Google OAuth (локальная симуляция): находит или создаёт аккаунт */
  const signInWithGoogle = useCallback(
    (identity: { email: string; displayName: string }): AuthResult => {
      const email = normalizeEmail(identity.email)
      if (!isValidEmail(email)) {
        return { ok: false, error: 'Google не вернул корректный адрес почты' }
      }

      const current = getSnapshot()
      const existing = findAccountByEmail(current.auth.accounts, email)
      if (existing) {
        const ok = activateAccount(existing.id, true)
        return ok ? { ok: true, accountId: existing.id } : { ok: false, error: 'Не удалось войти' }
      }

      let createdId: string | null = null
      updateStore((prev) => {
        const nowISO = new Date().toISOString()
        const account = createAccount({
          provider: 'google',
          displayName: identity.displayName || email.split('@')[0],
          email,
          existingIds: prev.auth.accounts.map((a) => a.id),
          takenUsernames: takenUsernamesOf(prev.auth.accounts),
          verified: true,
          now: new Date(nowISO),
        })
        account.signInCount = 1
        account.lastActiveISO = nowISO
        createdId = account.id
        return {
          ...prev,
          profile: sanitizeProfile({ ...prev.profile, ...profilePatchFromAccount(account) }),
          auth: {
            ...prev.auth,
            accounts: [...prev.auth.accounts, account],
            activeAccountId: account.id,
            signedIn: true,
            signInCount: prev.auth.signInCount + 1,
            failedAttempts: 0,
            lockedUntilISO: null,
            lastAuthAtISO: nowISO,
            updatedAtISO: nowISO,
          },
        }
      })

      return createdId
        ? { ok: true, accountId: createdId }
        : { ok: false, error: 'Не удалось войти через Google' }
    },
    [activateAccount, updateStore]
  )

  /** Гостевой демо-режим: включает существующего гостя или создаёт нового */
  const continueAsGuest = useCallback((): AuthResult => {
    const current = getSnapshot()
    const existing = current.auth.accounts.find((a) => a.provider === 'guest')
    if (existing) {
      const ok = activateAccount(existing.id, true)
      return ok
        ? { ok: true, accountId: existing.id }
        : { ok: false, error: 'Не удалось войти как гость' }
    }

    let createdId: string | null = null
    updateStore((prev) => {
      const nowISO = new Date().toISOString()
      const account = createAccount({
        provider: 'guest',
        displayName: 'Гость Огонька',
        isGuest: true,
        existingIds: prev.auth.accounts.map((a) => a.id),
        takenUsernames: takenUsernamesOf(prev.auth.accounts),
        verified: false,
        now: new Date(nowISO),
      })
      account.signInCount = 1
      account.lastActiveISO = nowISO
      createdId = account.id
      return {
        ...prev,
        profile: sanitizeProfile({ ...prev.profile, ...profilePatchFromAccount(account) }),
        auth: {
          ...prev.auth,
          accounts: [...prev.auth.accounts, account],
          activeAccountId: account.id,
          signedIn: true,
          signInCount: prev.auth.signInCount + 1,
          failedAttempts: 0,
          lockedUntilISO: null,
          lastAuthAtISO: nowISO,
          updatedAtISO: nowISO,
        },
      }
    })

    return createdId
      ? { ok: true, accountId: createdId }
      : { ok: false, error: 'Не удалось войти как гость' }
  }, [activateAccount, updateStore])

  /** Быстрое переключение на другой аккаунт (без пароля — устройство доверенное) */
  const switchAccount = useCallback(
    (accountId: string): boolean => activateAccount(accountId, true),
    [activateAccount]
  )

  /** Выход из аккаунта: список аккаунтов и активный id сохраняются */
  const signOut = useCallback(() => {
    const nowISO = new Date().toISOString()
    updateStore((prev) => ({
      ...prev,
      auth: { ...prev.auth, signedIn: false, updatedAtISO: nowISO },
    }))
  }, [updateStore])

  /**
   * Удаляет аккаунт с устройства. Если удаляется активный — переключает на
   * первый оставшийся. Возвращает false, если это последний аккаунт.
   */
  const removeAccount = useCallback(
    (accountId: string): boolean => {
      const current = getSnapshot()
      if (current.auth.accounts.length <= 1) return false
      const target = current.auth.accounts.find((a) => a.id === accountId)
      if (!target) return false

      const wasActive = current.auth.activeAccountId === accountId
      const remaining = current.auth.accounts.filter((a) => a.id !== accountId)
      const nextActive = wasActive ? remaining[0] ?? null : null

      updateStore((prev) => {
        const accounts = prev.auth.accounts.filter((a) => a.id !== accountId)
        if (accounts.length === 0) return prev
        const nowISO = new Date().toISOString()
        if (!wasActive || !nextActive) {
          return {
            ...prev,
            auth: { ...prev.auth, accounts, updatedAtISO: nowISO },
          }
        }
        return {
          ...prev,
          profile: sanitizeProfile({ ...prev.profile, ...profilePatchFromAccount(nextActive) }),
          auth: {
            ...prev.auth,
            accounts,
            activeAccountId: nextActive.id,
            signedIn: true,
            switchCount: prev.auth.switchCount + 1,
            updatedAtISO: nowISO,
            lastAuthAtISO: nowISO,
          },
        }
      })
      return true
    },
    [updateStore]
  )

  /**
   * Разово готовит демо-пароли сид-аккаунтов: если у почтовых/Google-личностей
   * ещё нет соли и хэша, закрепляет пароль `DEMO_ACCOUNT_PASSWORD` как SHA-256.
   * Гостевые профили пропускаются. Вызывается один раз при старте приложения.
   */
  const provisionDemoAccountSecrets = useCallback(async () => {
    const current = getSnapshot()
    const needs = current.auth.accounts.some(
      (a) => a.provider !== 'guest' && (!a.passwordHash || !a.passwordSalt)
    )
    if (!needs) return
    const salt = generateSalt()
    const hash = await hashSecret(DEMO_ACCOUNT_PASSWORD, salt)
    updateStore((prev) => ({
      ...prev,
      auth: {
        ...prev.auth,
        accounts: prev.auth.accounts.map((a) =>
          a.provider !== 'guest' && (!a.passwordHash || !a.passwordSalt)
            ? { ...a, passwordHash: hash, passwordSalt: salt }
            : a
        ),
        updatedAtISO: new Date().toISOString(),
      },
    }))
  }, [updateStore])

  return {
    state,
    isHydrated: typeof window !== 'undefined',
    addDay,
    addNewDay,
    updateDay,
    updateDayWithPayload,
    saveMorningIntentions,
    setMorningFocusStep,
    toggleMorningFocusStep,
    markMorningFocusStepDone,
    markMorningFocusStepMissed,
    completeEveningReview,
    reopenEveningReview,
    removeMorningFocusRecord,
    saveComposerDraft,
    clearComposerDraft,
    toggleEvidencePin,
    addEvidenceItem,
    setSoundEnabled,
    setPinEnabled,
    setTheme,
    setAccent,
    setFontScale,
    setFeedDensity,
    resetAppearance,
    updateSecurity,
    recordSecurityEvent,
    setAccountPassword,
    clearAccountPassword,
    setSecurityPin,
    clearSecurityPin,
    setBiometricEnabled,
    setLockOnOpen,
    setPinQuickUnlock,
    setAutoLockMinutes,
    registerFailedUnlock,
    verifyPin,
    verifyPassword,
    unlockWithBiometric,
    lockAppNow,
    resetSecurity,
    updatePrivacy,
    setProfileVisibility,
    setCommentPolicy,
    setChatPolicy,
    resetPrivacy,
    updateStreakSettings,
    setStreakDeadlineMinutes,
    setStreakTimeZone,
    setStreakWeekendBonus,
    resetStreakSettings,
    addMonthlyKpi,
    updateMonthlyKpi,
    removeMonthlyKpi,
    toggleMonthlyKpiManual,
    resetMonthlyKpis,
    syncNow,
    addVerifiedAchievement,
    updateVerifiedAchievement,
    attachAchievementEvidence,
    removeAchievementEvidence,
    submitAchievementForVerification,
    resolveAchievementReview,
    startAchievementSubmission,
    resolveModerationStatus,
    withdrawSubmission,
    reopenAchievement,
    removeVerifiedAchievement,
    updateProfile,
    resetProfile,
    toggleFollow,
    toggleExploreFollow,
    toggleExplorePostLike,
    toggleExplorePostSave,
    addExploreSearch,
    removeExploreSearch,
    clearExploreSearches,
    addFriend,
    removeFriend,
    acceptFriendRequest,
    declineFriendRequest,
    sendFriendRequest,
    cancelFriendRequest,
    dismissSuggestion,
    restoreSuggestions,
    markStoryViewed,
    markStoriesViewed,
    resetStoryViews,
    postMyStory,
    removeMyStory,
    clearMyStories,
    importState,
    resetToDefaults,
    getNextDayDate,
    getNextDayId,
    setActiveChatFriend,
    startChatWithFriend,
    sendChatMessage,
    forwardToChat,
    toggleChatReaction,
    setChatDraft,
    markThreadRead,
    markAllThreadsRead,
    clearThreadMessages,
    deleteChatMessage,
    toggleThreadMute,
    toggleThreadPin,
    toggleThreadArchive,
    editChatMessage,
    deleteChatMessages,
    togglePinChatMessage,
    createGroupChat,
    setChatFolder,
    deleteChatFolder,
    setChatActiveFolderId,
    translateChatMessage,
    transcribeVoiceMessage,
    voteInPoll,
    toggleMessageLabel,
    assignChatTag,
    setChatTag,
    deleteChatTag,
    updateChatSettings,
    deliverScheduledMessages,
    setDifficultyLevel,
    toggleReaction,
    getReactionsFor,
    getMyReactionsFor,
    addCustomEmoji,
    removeCustomEmoji,
    ratePride,
    rateGratitude,
    clearPrideRating,
    clearGratitudeRating,
    setDayVisibility,
    setPrideVisibility,
    setAllPridesVisibility,
    addComment,
    addReply,
    toggleCommentLike,
    deleteComment,
    getCommentsFor,
    clearComments,
    registerWithEmail,
    signInWithEmail,
    signInWithGoogle,
    continueAsGuest,
    switchAccount,
    signOut,
    removeAccount,
    provisionDemoAccountSecrets,
  }
}

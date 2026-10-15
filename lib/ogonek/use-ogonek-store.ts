'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { buildDemoComments, SUPPORT_PERSONAS } from './comments'
import { evaluatePrideItemHeuristic } from './evaluate-heuristic'
import {
  DEFAULT_STORE_STATE,
  loadStore,
  saveStore,
  STORAGE_KEY,
} from './storage'
import type {
  Comment,
  CommentPersona,
  ComposerDraft,
  ComposerPayload,
  CustomEmoji,
  Day,
  EvidenceItem,
  MyReactions,
  OgonekProfile,
  OgonekStoreState,
  PrideEntry,
  ReactionCounts,
} from './types'
import { withGratitudeRating } from './reactions'
import { sanitizeFollowingIds, sanitizeProfile } from './storage'

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
    if (customEvent.detail) {
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
      updateStore((prev) => ({
        ...prev,
        morningIntentions: {
          ...prev.morningIntentions,
          [dateKey]: focus,
        },
      }))
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
      }))
    },
    [updateStore]
  )

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
        return { ...prev, profile: nextProfile }
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

  const importState = useCallback(
    (newState: OgonekStoreState) => {
      updateStore(() => ({
        ...newState,
        // Защита от импорта без новых полей (старые архивы / сторонние JSON)
        comments: newState.comments ?? {},
        customEmojis: newState.customEmojis ?? [],
        dayReactions: newState.dayReactions ?? {},
        myReactions: newState.myReactions ?? {},
        profile: sanitizeProfile(newState.profile),
        followingIds: sanitizeFollowingIds(newState.followingIds),
      }))
    },
    [updateStore]
  )

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

  return {
    state,
    isHydrated: typeof window !== 'undefined',
    addDay,
    addNewDay,
    updateDay,
    updateDayWithPayload,
    saveMorningIntentions,
    saveComposerDraft,
    clearComposerDraft,
    toggleEvidencePin,
    addEvidenceItem,
    setSoundEnabled,
    setPinEnabled,
    updateProfile,
    resetProfile,
    toggleFollow,
    importState,
    resetToDefaults,
    getNextDayDate,
    getNextDayId,
    toggleReaction,
    getReactionsFor,
    getMyReactionsFor,
    addCustomEmoji,
    removeCustomEmoji,
    ratePride,
    rateGratitude,
    clearPrideRating,
    clearGratitudeRating,
    addComment,
    addReply,
    toggleCommentLike,
    deleteComment,
    getCommentsFor,
    clearComments,
  }
}

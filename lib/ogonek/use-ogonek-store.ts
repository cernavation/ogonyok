'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { CURRENT_DAY } from './data'
import { evaluatePrideItemHeuristic } from './evaluate-heuristic'
import {
  DEFAULT_STORE_STATE,
  loadStore,
  saveStore,
  STORAGE_KEY,
} from './storage'
import type {
  ComposerDraft,
  ComposerPayload,
  Day,
  EvidenceItem,
  OgonekStoreState,
  PrideEntry,
} from './types'

let cachedState: OgonekStoreState = DEFAULT_STORE_STATE
let isInitialized = false

function getSnapshot(): OgonekStoreState {
  if (typeof window === 'undefined') {
    return DEFAULT_STORE_STATE
  }
  if (!isInitialized) {
    cachedState = loadStore()
    isInitialized = true
  }
  return cachedState
}

function getServerSnapshot(): OgonekStoreState {
  return DEFAULT_STORE_STATE
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

  const addEntryToCurrentDay = useCallback(
    (payload: ComposerPayload) => {
      updateStore((prev) => {
        const dayExists = prev.days.some((d) => d.id === CURRENT_DAY)
        let nextDays: Day[]

        if (dayExists) {
          nextDays = prev.days.map((day) => {
            if (day.id !== CURRENT_DAY) return day

            const existingCount = day.prides.length
            const newPrideEntries: PrideEntry[] = payload.prides.map((text, idx) => ({
              num: String(existingCount + idx + 1).padStart(2, '0'),
              text,
              scale: 8,
              overcome: 1,
            }))

            const updatedPhotos = payload.photo
              ? [payload.photo, ...(day.photos || [])]
              : day.photos

            return {
              ...day,
              prides: [...day.prides, ...newPrideEntries],
              gratitudes: [...day.gratitudes, ...payload.gratitudes],
              photos: updatedPhotos,
            }
          })
        } else {
          const newPrideEntries: PrideEntry[] = payload.prides.map((text, idx) => ({
            num: String(idx + 1).padStart(2, '0'),
            text,
            scale: 8,
            overcome: 1,
          }))

          const newDay: Day = {
            id: CURRENT_DAY,
            title: 'Запись дня',
            tags: ['Для тебя'],
            prides: newPrideEntries,
            gratitudes: payload.gratitudes,
            photos: payload.photo ? [payload.photo] : undefined,
            dateISO: new Date().toISOString(),
            status: 'normal',
          }
          nextDays = [newDay, ...prev.days]
        }

        return {
          ...prev,
          days: nextDays,
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

  const importState = useCallback(
    (newState: OgonekStoreState) => {
      updateStore(() => newState)
    },
    [updateStore]
  )

  const resetToDefaults = useCallback(() => {
    updateStore(() => DEFAULT_STORE_STATE)
  }, [updateStore])

  return {
    state,
    isHydrated: typeof window !== 'undefined',
    addDay,
    updateDay,
    updateDayWithPayload,
    addEntryToCurrentDay,
    saveMorningIntentions,
    saveComposerDraft,
    clearComposerDraft,
    toggleEvidencePin,
    addEvidenceItem,
    setSoundEnabled,
    setPinEnabled,
    importState,
    resetToDefaults,
  }
}

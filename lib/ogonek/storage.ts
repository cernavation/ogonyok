import { EVIDENCE_ITEMS, INITIAL_DAYS } from './data'
import type { ComposerDraft, Day, EvidenceItem, OgonekStoreState } from './types'

export const STORAGE_KEY = 'ogonek.v2'
export const CURRENT_SCHEMA_VERSION = 2

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

class BrowserLocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  }

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(key, value)
    } catch (err: unknown) {
      if (err instanceof Error && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        console.warn('Storage quota exceeded. Attempting to clear composer drafts.')
        try {
          // Attempt to strip large drafts if quota is exceeded
          const parsed = JSON.parse(value) as Partial<OgonekStoreState>
          parsed.composerDraft = null
          window.localStorage.setItem(key, JSON.stringify(parsed))
        } catch {
          // Failed fallback
        }
      }
    }
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Ignore
    }
  }
}

export const defaultStorageAdapter: StorageAdapter = new BrowserLocalStorageAdapter()

export const DEFAULT_STORE_STATE: OgonekStoreState = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  days: INITIAL_DAYS,
  morningIntentions: {},
  composerDraft: null,
  evidenceItems: EVIDENCE_ITEMS,
  evidenceFavorites: ['ev-1', 'ev-2'],
  soundEnabled: true,
  pinEnabled: false,
  isDemo: true,
}

export function loadStore(adapter: StorageAdapter = defaultStorageAdapter): OgonekStoreState {
  try {
    const raw = adapter.getItem(STORAGE_KEY)
    if (!raw) {
      // Attempt migration from legacy storage keys
      const legacyV3 = adapter.getItem('ogonyok.v3.store')
      const legacyV1 = adapter.getItem('ogonyok.v1')
      const legacyOld = adapter.getItem('pridegrat.v_final_v2')

      if (legacyV3) {
        try {
          const parsedV3 = JSON.parse(legacyV3) as Partial<OgonekStoreState>
          if (parsedV3 && Array.isArray(parsedV3.days) && parsedV3.days.length > 0) {
            const migratedState: OgonekStoreState = {
              schemaVersion: CURRENT_SCHEMA_VERSION,
              days: parsedV3.days,
              morningIntentions: parsedV3.morningIntentions || {},
              composerDraft: parsedV3.composerDraft || null,
              evidenceItems: parsedV3.evidenceItems || DEFAULT_STORE_STATE.evidenceItems,
              evidenceFavorites: parsedV3.evidenceFavorites || DEFAULT_STORE_STATE.evidenceFavorites,
              soundEnabled: typeof parsedV3.soundEnabled === 'boolean' ? parsedV3.soundEnabled : true,
              pinEnabled: typeof parsedV3.pinEnabled === 'boolean' ? parsedV3.pinEnabled : false,
              isDemo: false,
            }
            saveStore(migratedState, adapter)
            return migratedState
          }
        } catch {
          // Fall through
        }
      }

      if (legacyV1 || legacyOld) {
        try {
          const candidate = (legacyV1 || legacyOld) as string
          const parsedLegacy = JSON.parse(candidate) as { items?: unknown[] }
          if (parsedLegacy && Array.isArray(parsedLegacy.items) && parsedLegacy.items.length > 0) {
            // Legacy items exist
            const migratedState: OgonekStoreState = {
              ...DEFAULT_STORE_STATE,
              schemaVersion: CURRENT_SCHEMA_VERSION,
              isDemo: false,
            }
            saveStore(migratedState, adapter)
            return migratedState
          }
        } catch {
          // Fall through
        }
      }

      return DEFAULT_STORE_STATE
    }

    try {
      const parsed = JSON.parse(raw) as Partial<OgonekStoreState>
      if (!parsed || typeof parsed !== 'object') {
        return DEFAULT_STORE_STATE
      }

      const days: Day[] = Array.isArray(parsed.days) && parsed.days.length > 0
        ? parsed.days
        : DEFAULT_STORE_STATE.days

      const morningIntentions =
        parsed.morningIntentions && typeof parsed.morningIntentions === 'object'
          ? parsed.morningIntentions
          : {}

      const composerDraft =
        parsed.composerDraft && typeof parsed.composerDraft === 'object'
          ? parsed.composerDraft
          : null

      const evidenceItems =
        Array.isArray(parsed.evidenceItems) && parsed.evidenceItems.length > 0
          ? parsed.evidenceItems
          : DEFAULT_STORE_STATE.evidenceItems

      const evidenceFavorites =
        Array.isArray(parsed.evidenceFavorites)
          ? parsed.evidenceFavorites
          : DEFAULT_STORE_STATE.evidenceFavorites

      const soundEnabled = typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true
      const pinEnabled = typeof parsed.pinEnabled === 'boolean' ? parsed.pinEnabled : false
      const isDemo = typeof parsed.isDemo === 'boolean' ? parsed.isDemo : false

      return {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        days,
        morningIntentions,
        composerDraft,
        evidenceItems,
        evidenceFavorites,
        soundEnabled,
        pinEnabled,
        isDemo,
      }
    } catch {
      // Corrupt JSON: save recovery copy and return defaults
      const corruptKey = `${STORAGE_KEY}.corrupt.${Date.now()}`
      adapter.setItem(corruptKey, raw)
      console.warn(`Corrupt storage detected. Backup saved to ${corruptKey}`)
      return DEFAULT_STORE_STATE
    }
  } catch {
    return DEFAULT_STORE_STATE
  }
}

export function saveStore(
  state: OgonekStoreState,
  adapter: StorageAdapter = defaultStorageAdapter
): void {
  try {
    const serialized = JSON.stringify(state)
    adapter.setItem(STORAGE_KEY, serialized)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent<OgonekStoreState>('ogonek-store-updated', { detail: state })
      )
    }
  } catch (err) {
    console.error('Failed to save store:', err)
  }
}

export function exportStoreAsJson(state: OgonekStoreState): string {
  const exportPayload = {
    ...state,
    exportedAt: new Date().toISOString(),
    generator: 'Ogonek Life Journal v2',
  }
  return JSON.stringify(exportPayload, null, 2)
}

export function validateAndImportJson(
  rawJson: string
): { success: true; data: OgonekStoreState } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(rawJson) as Record<string, unknown>

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Файл не содержит корректный объект JSON' }
    }

    if (!Array.isArray(parsed.days)) {
      return { success: false, error: 'В файле отсутствует массив дней ("days")' }
    }

    const validatedDays: Day[] = (parsed.days as unknown[]).map((item, index) => {
      const d = item as Partial<Day>
      return {
        id: typeof d.id === 'number' ? d.id : index + 1,
        title: typeof d.title === 'string' ? d.title : 'Запись дня',
        tags: Array.isArray(d.tags)
          ? d.tags.filter((t): t is string => typeof t === 'string')
          : ['Для тебя'],
        prides: Array.isArray(d.prides) ? d.prides : [],
        gratitudes: Array.isArray(d.gratitudes)
          ? d.gratitudes.filter((g): g is string => typeof g === 'string')
          : [],
        photos: Array.isArray(d.photos)
          ? d.photos.filter((p): p is string => typeof p === 'string')
          : undefined,
        dateISO: typeof d.dateISO === 'string' ? d.dateISO : undefined,
        status: d.status === 'missed' ? 'missed' : 'normal',
      }
    })

    const validatedEvidence: EvidenceItem[] = Array.isArray(parsed.evidenceItems)
      ? (parsed.evidenceItems as unknown[]).map((ev, i) => {
          const e = ev as Partial<EvidenceItem>
          return {
            id: typeof e.id === 'string' ? e.id : `ev-${i + 1}`,
            date: typeof e.date === 'string' ? e.date : new Date().toLocaleDateString('ru-RU'),
            title: typeof e.title === 'string' ? e.title : 'Факт силы',
            description: typeof e.description === 'string' ? e.description : '',
            category: typeof e.category === 'string' ? e.category : 'Все',
            pinned: Boolean(e.pinned),
          }
        })
      : DEFAULT_STORE_STATE.evidenceItems

    const morningIntentions = (
      parsed.morningIntentions && typeof parsed.morningIntentions === 'object'
        ? parsed.morningIntentions
        : {}
    ) as Record<string, [string, string, string]>

    const state: OgonekStoreState = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      days: validatedDays.length > 0 ? validatedDays : DEFAULT_STORE_STATE.days,
      morningIntentions,
      composerDraft: null,
      evidenceItems: validatedEvidence,
      evidenceFavorites: Array.isArray(parsed.evidenceFavorites)
        ? (parsed.evidenceFavorites as string[])
        : DEFAULT_STORE_STATE.evidenceFavorites,
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
      pinEnabled: typeof parsed.pinEnabled === 'boolean' ? parsed.pinEnabled : false,
      isDemo: false,
    }

    return { success: true, data: state }
  } catch {
    return { success: false, error: 'Синтаксическая ошибка в JSON файле' }
  }
}

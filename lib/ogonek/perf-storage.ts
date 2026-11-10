/**
 * Stage 16: Утилиты высокой производительности, селекторов и надёжного хранения
 */

/**
 * Поверхностное сравнение объектов/массивов (Zero unnecessary re-renders)
 */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i]
    if (!Object.prototype.hasOwnProperty.call(b, key) || !Object.is((a as any)[key], (b as any)[key])) {
      return false
    }
  }
  return true
}

export interface MinimalDay {
  id: number
  title?: string
  photos?: string[]
  [key: string]: any
}

export interface MinimalStoreState {
  days?: MinimalDay[]
  composerDraft?: {
    photo?: string | null
    [key: string]: any
  } | null
  chatThreads?: Record<string, any>
  myStories?: any[]
  [key: string]: any
}

/**
 * Очищает состояние перед физической записью в localStorage:
 * - Запрещает Base64-картинки и тяжёлые data:URL в photos (разрешены только Storage URL и IndexedDB ID)
 * - Очищает черновик композера от Base64 вложений
 */
export function sanitizeStateForStorage<T extends MinimalStoreState>(state: T): T {
  let modified = false

  const cleanedDays = state.days?.map((day) => {
    if (!day.photos || day.photos.length === 0) return day
    const validPhotos = day.photos.filter((p) => {
      if (typeof p !== 'string') return false
      // Запрещаем data: URL и любые Base64 строки длиннее 2 КБ
      if (p.startsWith('data:image') || (p.length > 2048 && !p.startsWith('http') && !p.startsWith('blob:'))) {
        modified = true
        return false
      }
      return true
    })
    if (validPhotos.length !== day.photos.length) {
      modified = true
      return { ...day, photos: validPhotos }
    }
    return day
  })

  let cleanedDraft = state.composerDraft
  if (
    cleanedDraft &&
    cleanedDraft.photo &&
    (cleanedDraft.photo.startsWith('data:image') || cleanedDraft.photo.length > 2048)
  ) {
    modified = true
    cleanedDraft = { ...cleanedDraft, photo: null }
  }

  if (!modified) {
    return state
  }

  return {
    ...state,
    days: cleanedDays ?? state.days,
    composerDraft: cleanedDraft,
  }
}

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null
let pendingStateToSave: any = null
let pendingAdapterToSave: StorageAdapter | null = null
let pendingStorageKey: string = 'ogonek.v2'

/**
 * Синхронный сброс отложенного сохранения в хранилище (вызывается при unload или в тестах)
 */
export function flushSaveStore(): void {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
    saveDebounceTimer = null
  }
  if (pendingStateToSave && pendingAdapterToSave) {
    try {
      const sanitized = sanitizeStateForStorage(pendingStateToSave)
      const serialized = JSON.stringify(sanitized)
      pendingAdapterToSave.setItem(pendingStorageKey, serialized)
    } catch (err) {
      console.error('[Storage] Error in flushSaveStore:', err)
    } finally {
      pendingStateToSave = null
      pendingAdapterToSave = null
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushSaveStore()
  })
}

/**
 * Дебаунс 300мс для физической записи в хранилище
 */
export function scheduleDebouncedSave(
  state: any,
  adapter: StorageAdapter,
  key: string = 'ogonek.v2'
): void {
  pendingStateToSave = state
  pendingAdapterToSave = adapter
  pendingStorageKey = key

  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
  }

  saveDebounceTimer = setTimeout(() => {
    flushSaveStore()
  }, 300)
}

'use client'

const DB_NAME = 'ogonek_photos_db'
const DB_VERSION = 1
const STORE_NAME = 'photos'

let dbPromise: Promise<IDBDatabase> | null = null

function getDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB is not available'))
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(request.error || new Error('Failed to open IndexedDB'))
      }
    })
  }

  return dbPromise
}

export async function savePhoto(blobOrFile: Blob): Promise<string> {
  const id = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  try {
    const db = await getDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.put({
        id,
        blob: blobOrFile,
        mimeType: blobOrFile.type,
        createdAtISO: new Date().toISOString(),
      })

      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error || new Error('Failed to save photo'))
    })
    return id
  } catch {
    // If IndexedDB fails, create and return transient ObjectURL as fallback
    if (typeof window !== 'undefined' && window.URL) {
      return window.URL.createObjectURL(blobOrFile)
    }
    return id
  }
}

export async function getPhotoBlob(id: string): Promise<Blob | null> {
  if (!id || id.startsWith('http') || id.startsWith('blob:') || id.startsWith('data:')) {
    return null
  }

  try {
    const db = await getDb()
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(id)

      req.onsuccess = () => {
        const result = req.result as { blob?: Blob } | undefined
        resolve(result?.blob || null)
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function resolvePhotoUrl(photoIdOrUrl: string): Promise<string> {
  if (!photoIdOrUrl) return ''
  if (
    photoIdOrUrl.startsWith('http://') ||
    photoIdOrUrl.startsWith('https://') ||
    photoIdOrUrl.startsWith('blob:') ||
    photoIdOrUrl.startsWith('data:') ||
    photoIdOrUrl.startsWith('/')
  ) {
    return photoIdOrUrl
  }

  const blob = await getPhotoBlob(photoIdOrUrl)
  if (blob && typeof window !== 'undefined') {
    return window.URL.createObjectURL(blob)
  }

  return photoIdOrUrl
}

export async function deletePhoto(id: string): Promise<void> {
  if (!id || id.startsWith('http') || id.startsWith('blob:')) return

  try {
    const db = await getDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(id)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    // Ignore delete error
  }
}

export function revokePhotoUrl(url: string | null): void {
  if (url && url.startsWith('blob:') && typeof window !== 'undefined') {
    try {
      window.URL.revokeObjectURL(url)
    } catch {
      // Ignore
    }
  }
}

/**
 * Загружает фото дня в Supabase Storage (канонический бакет ogonyok-media)
 * и возвращает постоянный публичный URL.
 */
export async function uploadDayPhotoToStorage(
  fileOrBlob: File | Blob,
  fileName?: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const { getSupabase } = await import('@/lib/supabase/browser')
    const { BUCKET_OGONYOK_MEDIA } = await import('@/lib/supabase/buckets')
    const supabase = getSupabase()
    if (!supabase) return { ok: false, error: 'База данных не подключена' }

    const ext = fileOrBlob.type ? fileOrBlob.type.split('/')[1] || 'jpg' : 'jpg'
    const cleanName = fileName ? fileName.replace(/[^a-zA-Z0-9._-]/g, '_') : `photo.${ext}`
    const storagePath = `photos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${cleanName}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_OGONYOK_MEDIA)
      .upload(storagePath, fileOrBlob, {
        contentType: fileOrBlob.type || 'image/jpeg',
        cacheControl: '31536000',
        upsert: true,
      })

    if (!uploadError) {
      const { data } = supabase.storage.from(BUCKET_OGONYOK_MEDIA).getPublicUrl(storagePath)
      return { ok: true, url: data.publicUrl }
    }

    return { ok: false, error: uploadError.message }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Ошибка загрузки в хранилище' }
  }
}

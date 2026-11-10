/**
 * КЛИЕНТСКИЙ СЕРВИС МЕДИА ДЛЯ ЧАТОВ (ЭТАП 8)
 *
 * Устраняет Base64 из JSONB/базы данных.
 * Загружает изображения, видео, аудио и документы в Storage-бакет 'chat-media'
 * по пути `<uid>/<thread>/<uuid>.<ext>`.
 * Сжимает изображения на клиенте через Canvas (max 1920px),
 * валидирует MIME и лимиты размеров, выдаёт Signed URLs с кэшированием.
 */

import { getSupabase } from '../supabase/browser.ts'
import { BUCKET_CHAT_MEDIA } from '../supabase/buckets.ts'
import { getTierLimits, type SubscriptionTier } from './permissions.ts'

export interface ChatMediaDescriptor {
  path: string
  url: string
  mime: string
  size: number
  duration?: number
  width?: number
  height?: number
  thumbnail?: string
  name?: string
}

export interface UploadProgressHandler {
  onProgress?: (percent: number) => void
  abortSignal?: AbortSignal
}

/** Лимиты размеров файлов */
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024 // 10 МБ
export const MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024 // 25 МБ

/** Разрешенные MIME типы */
export const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const ALLOWED_AUDIO_MIMES = [
  'audio/webm',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/mpeg',
  'audio/aac',
]
export const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime']

/** Локальный in-memory кэш подписанных URL (path -> { url, expiresAt }) */
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

/**
 * Получение подписанного URL (Signed URL) со сроком действия 1 час и кэшированием
 */
export async function getChatMediaUrl(pathOrUrl: string): Promise<string> {
  if (!pathOrUrl) return ''

  // Если это уже внешний публичный URL (например giphy или unsplash)
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl
  }

  // Если это base64 (старое сообщение до миграции)
  if (pathOrUrl.startsWith('data:')) {
    return pathOrUrl
  }

  // Проверка кэша подписанных ссылок
  const now = Date.now()
  const cached = signedUrlCache.get(pathOrUrl)
  if (cached && cached.expiresAt > now + 60_000) {
    return cached.url
  }

  const supabase = getSupabase()
  if (!supabase) return pathOrUrl

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_CHAT_MEDIA)
      .createSignedUrl(pathOrUrl, 3600) // 1 час

    if (!error && data?.signedUrl) {
      signedUrlCache.set(pathOrUrl, {
        url: data.signedUrl,
        expiresAt: now + 3500 * 1000,
      })
      return data.signedUrl
    }
  } catch (err) {
    console.warn('[getChatMediaUrl] Failed to create signed url for', pathOrUrl, err)
  }

  // Фолбэк на public url
  return supabase.storage.from(BUCKET_CHAT_MEDIA).getPublicUrl(pathOrUrl).data.publicUrl
}

/**
 * Клиентское сжатие изображения через Canvas (макс 1920px по большей стороне, WebP/JPEG ~0.85)
 */
export async function compressImageOnClient(
  file: File | Blob,
  maxDimension = 1920,
  quality = 0.85
): Promise<{ blob: Blob; width: number; height: number }> {
  // GIF анимации не пережимаем через canvas, чтобы сохранить кадры
  if (file.type === 'image/gif') {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ blob: file, width: img.naturalWidth, height: img.naturalHeight })
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve({ blob: file, width: 800, height: 600 })
      }
      img.src = url
    })
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { naturalWidth: width, naturalHeight: height } = img

      // Масштабирование
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        resolve({ blob: file, width, height })
        return
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)

      const outputMime = file.type === 'image/png' ? 'image/webp' : file.type || 'image/jpeg'
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, width, height })
          } else {
            resolve({ blob: file, width, height })
          }
        },
        outputMime,
        quality
      )
    }

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Не удалось прочитать изображение для сжатия'))
    }

    img.src = objectUrl
  })
}

/**
 * Валидация файла перед загрузкой (MIME, размер, лимиты тарифа)
 */
export function validateMediaFile(
  file: File | Blob,
  kind: 'image' | 'voice' | 'video' | 'file',
  tier: SubscriptionTier = 'free',
  durationSec?: number
): { ok: boolean; error?: string } {
  const size = file.size
  const mime = file.type

  if (kind === 'image') {
    if (size > MAX_IMAGE_SIZE_BYTES) {
      return { ok: false, error: 'Изображение не должно превышать 10 МБ' }
    }
    if (mime && !ALLOWED_IMAGE_MIMES.includes(mime)) {
      return { ok: false, error: 'Поддерживаются форматы JPEG, PNG, WebP и GIF' }
    }
  }

  if (kind === 'voice') {
    const tierLimits = getTierLimits(tier)
    const maxSec = tierLimits.maxVoiceSeconds
    if (durationSec && durationSec > maxSec) {
      return {
        ok: false,
        error: `Лимит голосового сообщения для вашего тарифа — ${maxSec} сек.`,
      }
    }
  }

  if (kind === 'video' || kind === 'file') {
    if (size > MAX_DOCUMENT_SIZE_BYTES) {
      return { ok: false, error: 'Файл не должен превышать 25 МБ' }
    }
  }

  return { ok: true }
}

/**
 * Загрузка медиа-файла в Storage 'chat-media'
 * Путь: `<uid>/<threadId>/<uuid>.<ext>`
 */
export async function uploadChatMedia(
  file: File | Blob,
  threadId: string,
  userId: string,
  options?: {
    kind?: 'image' | 'voice' | 'video' | 'file'
    fileName?: string
    durationSec?: number
    tier?: SubscriptionTier
    onProgress?: (percent: number) => void
    abortSignal?: AbortSignal
  }
): Promise<{ ok: boolean; descriptor?: ChatMediaDescriptor; error?: string }> {
  const kind = options?.kind || 'file'
  const validation = validateMediaFile(file, kind, options?.tier, options?.durationSec)
  if (!validation.ok) {
    return { ok: false, error: validation.error }
  }

  const supabase = getSupabase()
  if (!supabase) {
    return { ok: false, error: 'Сервис хранилища недоступен' }
  }

  let uploadBlob: Blob = file
  let imgWidth: number | undefined
  let imgHeight: number | undefined

  // Сжатие картинок
  if (kind === 'image') {
    options?.onProgress?.(10)
    try {
      const compressed = await compressImageOnClient(file)
      uploadBlob = compressed.blob
      imgWidth = compressed.width
      imgHeight = compressed.height
    } catch (e) {
      console.warn('Compress fallback to original', e)
    }
  }

  options?.onProgress?.(25)

  // Генерация детерминированного уникального пути
  const ext = (options?.fileName?.split('.').pop() || file.type.split('/')[1] || 'bin').toLowerCase()
  const fileUuid = crypto.randomUUID ? crypto.randomUUID() : `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const storagePath = `${userId}/${threadId}/${fileUuid}.${ext}`

  try {
    options?.onProgress?.(50)

    const { data, error } = await supabase.storage
      .from(BUCKET_CHAT_MEDIA)
      .upload(storagePath, uploadBlob, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
        upsert: true,
      })

    if (error) {
      return { ok: false, error: error.message }
    }

    options?.onProgress?.(90)

    // Получаем подписанный URL
    const signedUrl = await getChatMediaUrl(storagePath)
    options?.onProgress?.(100)

    const descriptor: ChatMediaDescriptor = {
      path: storagePath,
      url: signedUrl,
      mime: file.type || 'application/octet-stream',
      size: uploadBlob.size,
      name: options?.fileName,
      duration: options?.durationSec,
      width: imgWidth,
      height: imgHeight,
    }

    return { ok: true, descriptor }
  } catch (err: unknown) {
    if (options?.abortSignal?.aborted) {
      return { ok: false, error: 'Загрузка отменена' }
    }
    return { ok: false, error: String(err) }
  }
}

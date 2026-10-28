'use client'

import { useEffect, useState } from 'react'
import { resolvePhotoUrl, revokePhotoUrl } from './photos'

/**
 * Превращает сохранённый идентификатор фото (IndexedDB) или прямой URL
 * в отображаемый src. Для blob: URL корректно освобождает память.
 */
export function usePhotoUrl(source: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    if (!source) return null
    if (
      source.startsWith('http://') ||
      source.startsWith('https://') ||
      source.startsWith('blob:') ||
      source.startsWith('data:')
    ) {
      return source
    }
    return null
  })

  useEffect(() => {
    let cancelled = false
    let created: string | null = null

    if (!source) {
      setUrl(null)
      return
    }

    resolvePhotoUrl(source)
      .then((resolved) => {
        if (cancelled) {
          if (resolved !== source) revokePhotoUrl(resolved)
          return
        }
        if (resolved !== source && resolved.startsWith('blob:')) created = resolved
        setUrl(resolved || null)
      })
      .catch(() => {
        if (!cancelled) setUrl(null)
      })

    return () => {
      cancelled = true
      if (created) revokePhotoUrl(created)
    }
  }, [source])

  return url
}

'use client'

import { useEffect, useRef } from 'react'
import {
  applyAppearanceToDocument,
  persistAppearance,
  readPersistedAppearance,
  type AppearanceSettings,
} from '@/lib/ogonek/appearance'
import type { ThemeMode } from '@/lib/ogonek/types'

/**
 * ЭТАП 14 — ПРОВАЙДЕР ОФОРМЛЕНИЯ.
 * Мгновенно переносит выбранную тему, акцент, размер шрифта и плотность ленты
 * на корневой <html> через data-атрибуты.
 * Защищён от гонки гидратации: никогда не перезаписывает сохранённые настройки
 * пользователя серверными дефолтами при первом монтировании.
 */
type Props = AppearanceSettings & {
  /** Необязательный колбэк после применения (для тестов/аналитики) */
  onApplied?: (settings: AppearanceSettings) => void
}

export function AppearanceProvider({ theme, accent, fontScale, feedDensity, onApplied }: Props) {
  const isFirstMount = useRef(true)

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      const persisted = readPersistedAppearance()
      const effectiveTheme = persisted.theme || theme
      const effectiveAccent = persisted.accent || accent
      const effectiveFontScale = persisted.fontScale || fontScale
      const effectiveDensity = persisted.feedDensity || feedDensity

      const settings: AppearanceSettings = {
        theme: effectiveTheme,
        accent: effectiveAccent,
        fontScale: effectiveFontScale,
        feedDensity: effectiveDensity,
      }
      applyAppearanceToDocument(settings)
      onApplied?.(settings)
      return
    }

    const settings: AppearanceSettings = { theme, accent, fontScale, feedDensity }
    applyAppearanceToDocument(settings)
    persistAppearance(settings)
    onApplied?.(settings)
  }, [theme, accent, fontScale, feedDensity, onApplied])

  // Компонент не рендерит разметку — только применяет оформление
  return null
}

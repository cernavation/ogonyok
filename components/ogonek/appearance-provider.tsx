'use client'

import { useEffect, useRef } from 'react'
import {
  applyAppearanceToDocument,
  persistAppearance,
  readPersistedAppearance,
  resolveEffectiveAccentForTier,
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
  subscriptionTier?: string | null
  subscriptionExpiresAt?: string | null
  username?: string | null
  /** Необязательный колбэк после применения (для тестов/аналитики) */
  onApplied?: (settings: AppearanceSettings) => void
}

export function AppearanceProvider({
  theme,
  accent,
  fontScale,
  feedDensity,
  subscriptionTier,
  subscriptionExpiresAt,
  username,
  onApplied,
}: Props) {
  const isFirstMount = useRef(true)

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      const persisted = readPersistedAppearance()
      const effectiveTheme = persisted.theme || theme
      const effectiveAccent = resolveEffectiveAccentForTier(
        persisted.accent || accent,
        subscriptionTier,
        subscriptionExpiresAt,
        username
      )
      const effectiveFontScale = persisted.fontScale || fontScale
      const effectiveDensity = persisted.feedDensity || feedDensity

      const settings: AppearanceSettings = {
        theme: effectiveTheme,
        accent: effectiveAccent,
        fontScale: effectiveFontScale,
        feedDensity: effectiveDensity,
      }
      applyAppearanceToDocument(settings)
      if (persisted.accent !== effectiveAccent) {
        persistAppearance(settings)
      }
      onApplied?.(settings)
      return
    }

    const effectiveAccent = resolveEffectiveAccentForTier(
      accent,
      subscriptionTier,
      subscriptionExpiresAt,
      username
    )
    const settings: AppearanceSettings = { theme, accent: effectiveAccent, fontScale, feedDensity }
    applyAppearanceToDocument(settings)
    persistAppearance(settings)
    onApplied?.(settings)
  }, [theme, accent, fontScale, feedDensity, subscriptionTier, subscriptionExpiresAt, username, onApplied])

  // Компонент не рендерит разметку — только применяет оформление
  return null
}

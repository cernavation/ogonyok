'use client'

import { useEffect } from 'react'
import {
  applyAppearanceToDocument,
  persistAppearance,
  type AppearanceSettings,
} from '@/lib/ogonek/appearance'

/**
 * ЭТАП 14 — ПРОВАЙДЕР ОФОРМЛЕНИЯ.
 * Мгновенно переносит выбранную тему, акцент, размер шрифта и плотность ленты
 * на корневой <html> через data-атрибуты. Дополнительно кэширует лёгкий
 * слепок настроек в localStorage, чтобы при следующем запуске тема
 * применилась ещё до первой отрисовки (см. bootstrap-скрипт в layout).
 */
type Props = AppearanceSettings & {
  /** Необязательный колбэк после применения (для тестов/аналитики) */
  onApplied?: (settings: AppearanceSettings) => void
}

export function AppearanceProvider({ theme, accent, fontScale, feedDensity, onApplied }: Props) {
  useEffect(() => {
    const settings: AppearanceSettings = { theme, accent, fontScale, feedDensity }
    applyAppearanceToDocument(settings)
    persistAppearance(settings)
    onApplied?.(settings)
  }, [theme, accent, fontScale, feedDensity, onApplied])

  // Компонент не рендерит разметку — только применяет оформление
  return null
}

/**
 * ЭТАП 17 — FINE-GRAINED SELECTORS FOR OGONEK STORE
 *
 * Предотвращает ненужные полные ре-рендеры React дерева:
 * Компоненты, использующие селекторы, подписываются только на нужные
 * срезы состояния с поверхностным сравнением (shallow equal).
 */

'use client'

import { useRef, useSyncExternalStore } from 'react'
import { shallowEqual } from './shallow-equal.ts'
export { shallowEqual }

import {
  subscribe,
  getSnapshot,
  getServerSnapshot,
} from './use-ogonek-store'

import type {
  OgonekStoreState,
  Day,
  OgonekProfile,
  PrivacySettings,
  AppSecurityState,
  ThemeMode,
  AccentId,
  FontScaleId,
  FeedDensityId,
} from './types'

/**
 * Универсальный хук-селектор с кэшированием и shallowEqual сравнением
 */
export function useStoreSelector<T>(
  selector: (state: OgonekStoreState) => T,
  isEqual: (a: T, b: T) => boolean = shallowEqual
): T {
  const lastSelectedRef = useRef<T | undefined>(undefined)
  const lastStateRef = useRef<OgonekStoreState | undefined>(undefined)

  const getSelection = (): T => {
    const state = getSnapshot()
    if (lastStateRef.current === state && lastSelectedRef.current !== undefined) {
      return lastSelectedRef.current
    }

    const nextSelected = selector(state)
    if (
      lastSelectedRef.current !== undefined &&
      isEqual(lastSelectedRef.current, nextSelected)
    ) {
      lastStateRef.current = state
      return lastSelectedRef.current
    }

    lastStateRef.current = state
    lastSelectedRef.current = nextSelected
    return nextSelected
  }

  const getServerSelection = (): T => {
    const serverState = getServerSnapshot()
    return selector(serverState)
  }

  return useSyncExternalStore(subscribe, getSelection, getServerSelection)
}

/* ══════════════════════════════════════════════════════════════════════════
   СПЕЦИАЛИЗИРОВАННЫЕ МЕМОИЗИРОВАННЫЕ СЕЛЕКТОРЫ
   ══════════════════════════════════════════════════════════════════════════ */

/** Селектор профиля пользователя */
export function useProfileSelector(): OgonekProfile {
  return useStoreSelector((s) => s.profile)
}

/** Селектор списка дней */
export function useDaysSelector(): Day[] {
  return useStoreSelector(
    (s) => s.days,
    (a, b) =>
      a === b ||
      (Array.isArray(a) &&
        Array.isArray(b) &&
        a.length === b.length &&
        a.every(
          (item, idx) =>
            item.id === b[idx]?.id &&
            item.dateISO === b[idx]?.dateISO
        ))
  )
}

/** Селектор дня по ID */
export function useDayById(dayId: number): Day | undefined {
  return useStoreSelector((s) => s.days.find((d: Day) => d.id === dayId))
}

/** Селектор количества дней */
export function useDayCountSelector(): number {
  return useStoreSelector((s) => s.days?.length || 0, Object.is)
}

/** Селектор текущего стрика */
export function useStreakSelector(): number {
  return useStoreSelector(
    (s) => Number(s.profile?.streak_count || s.profile?.streak || 0),
    Object.is
  )
}

/** Селектор темы и визуальных настроек */
export function useThemeSelector(): {
  theme: ThemeMode
  accent: AccentId
  fontScale: FontScaleId
  feedDensity: FeedDensityId
} {
  return useStoreSelector((s) => ({
    theme: s.theme,
    accent: s.accent,
    fontScale: s.fontScale,
    feedDensity: s.feedDensity,
  }))
}

/** Селектор настроек звука */
export function useSoundSelector(): {
  soundEnabled: boolean
  soundVolume: number
} {
  return useStoreSelector((s) => ({
    soundEnabled: s.soundEnabled,
    soundVolume: s.soundVolume ?? 70,
  }))
}

/** Селектор настроек приватности */
export function usePrivacySelector(): PrivacySettings {
  return useStoreSelector((s) => s.privacy)
}

/** Селектор настроек безопасности */
export function useSecuritySelector(): AppSecurityState {
  return useStoreSelector((s) => s.security)
}

/** Селектор счетчиков непрочитанных уведомлений и чатов */
export function useUnreadCountsSelector(): {
  chat: number
  notifications: number
} {
  return useStoreSelector((s) => ({
    chat: s.unreadChatCount || 0,
    notifications: s.unreadNotificationsCount || 0,
  }))
}

/** Селектор авторизации */
export function useAuthSelector(): {
  signedIn: boolean
  activeAccountId: string | null
} {
  return useStoreSelector((s) => ({
    signedIn: Boolean(s.auth?.signedIn),
    activeAccountId: s.auth?.activeAccountId || null,
  }))
}

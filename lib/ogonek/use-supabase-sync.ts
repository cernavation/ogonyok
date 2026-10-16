'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type ConnectResult,
  type SyncOverview,
  type SyncResult,
  type SupabaseSession,
  type SupabaseSyncState,
  connectSupabase,
  describeSyncOverview,
  disconnectSupabase,
  getSyncStatus,
  refreshOnlineStatus,
  resetSyncMeta,
  subscribeSyncStatus,
  syncWithSupabase,
  startAutoSync,
} from './supabase-sync'
import { useOgonekStore } from './use-ogonek-store'
import type { OgonekStoreState } from './types'

/**
 * ЭТАП 19 — REACT-ОБВЯЗКА АДАПТЕРА SUPABASE.
 *
 * Подключает движок синхронизации к локальному стору Огонька:
 *   • включает фоновую автосинхронизацию при старте;
 *   • отдаёт живую сводку (что и куда поедет);
 *   • даёт кнопкам методы syncNow / connect / disconnect / resetQueue.
 *
 * Полностью безопасен без ключей Supabase: планировщик просто ничего не делает,
 * а приложение продолжает работать локально.
 */

export type UseSupabaseSyncResult = {
  status: SupabaseSyncState
  overview: SyncOverview
  busy: boolean
  /** Отправить дифф и влить серверные данные прямо сейчас */
  syncNow: () => Promise<SyncResult>
  /** Сохранить ключи и подключиться (анонимно или по почте/паролю) */
  connect: (input: {
    url: string
    anonKey: string
    email?: string
    password?: string
  }) => Promise<ConnectResult>
  /** Выйти из аккаунта Supabase (данные остаются локально) */
  disconnect: (forgetKeys?: boolean) => Promise<void>
  /** Сбросить очередь синхронизации — следующий пуш зальёт всё заново */
  resetQueue: () => void
}

export type UseSupabaseSyncOptions = {
  /**
   * Запускать ли фоновый планировщик в этом хуке. По умолчанию true.
   * Панель настроек передаёт false, чтобы не дублировать единственный
   * общеприложенческий планировщик из <SupabaseSyncBootstrap/>.
   */
  autoSync?: boolean
}

export function useSupabaseSync(options: UseSupabaseSyncOptions = {}): UseSupabaseSyncResult {
  const autoSync = options.autoSync ?? true
  const { state, importState } = useOgonekStore()
  const stateRef = useRef<OgonekStoreState>(state)
  stateRef.current = state

  const [status, setStatus] = useState<SupabaseSyncState>(() => getSyncStatus())
  const [busy, setBusy] = useState(false)
  const [metaTick, setMetaTick] = useState(0)

  useEffect(() => subscribeSyncStatus(setStatus), [])

  useEffect(() => {
    if (!autoSync) return
    const handle = startAutoSync({
      getState: () => stateRef.current,
      onState: (next) => {
        // Серверные данные изменили локальное состояние — фиксируем в сторе.
        importState(next)
        setMetaTick((tick) => tick + 1)
      },
    })
    return () => handle.stop()
  }, [autoSync, importState])

  const syncNow = useCallback(async (): Promise<SyncResult> => {
    setBusy(true)
    try {
      const result = await syncWithSupabase(stateRef.current)
      if (result.ok && result.state) importState(result.state)
      setMetaTick((tick) => tick + 1)
      refreshOnlineStatus()
      return result
    } finally {
      setBusy(false)
    }
  }, [importState])

  const connect = useCallback(
    async (input: { url: string; anonKey: string; email?: string; password?: string }): Promise<ConnectResult> => {
      setBusy(true)
      try {
        const result = await connectSupabase(stateRef.current, input)
        if (result.ok) await syncNow()
        setMetaTick((tick) => tick + 1)
        return result
      } finally {
        setBusy(false)
      }
    },
    [syncNow]
  )

  const disconnect = useCallback(async (forgetKeys = false): Promise<void> => {
    setBusy(true)
    try {
      await disconnectSupabase({ forgetKeys })
      setMetaTick((tick) => tick + 1)
    } finally {
      setBusy(false)
    }
  }, [])

  const resetQueue = useCallback(() => {
    resetSyncMeta()
    setMetaTick((tick) => tick + 1)
  }, [])

  const overview = useMemo(
    () => describeSyncOverview(state),
    // metaTick пересчитывает сводку после push/pull/reset
    [state, status.lastSyncAtISO, status.authenticated, metaTick]
  )

  return { status, overview, busy, syncNow, connect, disconnect, resetQueue }
}

export type { SupabaseSession }

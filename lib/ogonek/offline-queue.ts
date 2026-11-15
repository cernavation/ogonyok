/**
 * ЭТАП 17 — ОФЛАЙН-ОЧЕРЕДЬ МУТАЦИЙ И ДЕЛЬТА-СИНХРОНИЗАЦИЯ
 * 
 * Сохраняет несохранённые изменения при отсутствии сети и автоматически
 * отправляет их на сервер при восстановлении соединения (событие window "online").
 */

import { getSupabase } from './supabase-client.ts'

export const OFFLINE_QUEUE_KEY = 'ogonek.offline_queue.v1'
export const MAX_RETRY_ATTEMPTS = 5

export type OfflineMutationType =
  | 'save_day_bundle'
  | 'update_profile'
  | 'update_privacy'
  | 'delete_day'
  | 'send_message'

export interface OfflineMutation {
  id: string
  type: OfflineMutationType
  payload: any
  createdAtISO: string
  retryCount: number
  lastError?: string
}

let isDraining = false

/** Чтение очереди из localStorage */
export function getOfflineQueue(): OfflineMutation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Сохранение очереди в localStorage */
function persistOfflineQueue(queue: OfflineMutation[]): void {
  if (typeof window === 'undefined') return
  try {
    if (queue.length === 0) {
      localStorage.removeItem(OFFLINE_QUEUE_KEY)
    } else {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
    }
    window.dispatchEvent(
      new CustomEvent('ogonek-offline-queue-updated', {
        detail: { count: queue.length },
      })
    )
  } catch (err) {
    console.error('[OfflineQueue] Failed to persist queue:', err)
  }
}

/** Добавление операции в офлайн-очередь */
export function enqueueOfflineMutation(
  type: OfflineMutationType,
  payload: any
): OfflineMutation {
  const mutation: OfflineMutation = {
    id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    createdAtISO: new Date().toISOString(),
    retryCount: 0,
  }

  const queue = getOfflineQueue()
  // Если операция над тем же днём уже в очереди, объединяем/заменяем
  if (type === 'save_day_bundle' && payload?.day?.client_id) {
    const existingIdx = queue.findIndex(
      (m) => m.type === 'save_day_bundle' && m.payload?.day?.client_id === payload.day.client_id
    )
    if (existingIdx >= 0) {
      queue[existingIdx] = mutation
      persistOfflineQueue(queue)
      return mutation
    }
  }

  queue.push(mutation)
  persistOfflineQueue(queue)
  return mutation
}

/** Обработка одиночной мутации */
async function processMutation(mutation: OfflineMutation): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false

  switch (mutation.type) {
    case 'save_day_bundle': {
      const { day, prides, gratitudes, streak } = mutation.payload || {}
      // 1. Пробуем RPC
      try {
        const { error } = await supabase.rpc('save_day_bundle', {
          p_day: day,
          p_prides: prides || [],
          p_gratitudes: gratitudes || [],
          p_streak: streak ?? null,
        })
        if (!error) return true
      } catch {}

      // 2. Фолбэк: раздельный upsert
      try {
        await supabase.from('days').upsert(day, { onConflict: 'user_id,client_id' })
        if (Array.isArray(prides) && prides.length > 0) {
          await supabase.from('prides').upsert(prides, { onConflict: 'user_id,client_id' })
        }
        if (Array.isArray(gratitudes) && gratitudes.length > 0) {
          await supabase.from('gratitudes').upsert(gratitudes, { onConflict: 'user_id,client_id' })
        }
        if (typeof streak === 'number') {
          await supabase.from('profiles').update({ streak_count: streak, streak }).eq('id', day.user_id)
        }
        return true
      } catch {
        return false
      }
    }

    case 'update_profile': {
      const { userId, patch } = mutation.payload || {}
      if (!userId || !patch) return true
      const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
      return !error
    }

    case 'update_privacy': {
      const { userId, patch } = mutation.payload || {}
      if (!userId || !patch) return true
      const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
      return !error
    }

    case 'delete_day': {
      const { userId, clientId } = mutation.payload || {}
      if (!userId || !clientId) return true
      await supabase.from('prides').delete().eq('user_id', userId).eq('day_client_id', clientId)
      await supabase.from('gratitudes').delete().eq('user_id', userId).eq('day_client_id', clientId)
      const { error } = await supabase.from('days').delete().eq('user_id', userId).eq('client_id', clientId)
      return !error
    }

    case 'send_message': {
      const { message } = mutation.payload || {}
      if (!message) return true
      const { error } = await supabase.from('direct_messages').insert(message)
      return !error
    }

    default:
      return true
  }
}

/** Отправка накопившихся офлайн-мутаций на сервер */
export async function drainOfflineQueue(): Promise<{ processed: number; remaining: number }> {
  if (isDraining) return { processed: 0, remaining: getOfflineQueue().length }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { processed: 0, remaining: getOfflineQueue().length }
  }

  isDraining = true
  let processed = 0

  try {
    let queue = getOfflineQueue()
    const remaining: OfflineMutation[] = []

    for (const mutation of queue) {
      const success = await processMutation(mutation)
      if (success) {
        processed++
      } else {
        mutation.retryCount++
        if (mutation.retryCount < MAX_RETRY_ATTEMPTS) {
          remaining.push(mutation)
        } else {
          console.warn('[OfflineQueue] Mutation exceeded max retries, dropping:', mutation)
        }
      }
    }

    persistOfflineQueue(remaining)
    return { processed, remaining: remaining.length }
  } finally {
    isDraining = false
  }
}

// Автоматический слушатель восстановления сети
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.info('[OfflineQueue] Connection restored, draining queue...')
    drainOfflineQueue().catch(console.error)
  })
}

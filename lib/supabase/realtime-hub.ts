/**
 * ЭТАП 17 — ЕДИНЫЙ МУЛЬТИПЛЕКСИРОВАННЫЙ REALTIME-КАНАЛ НА ПОЛЬЗОВАТЕЛЯ
 *
 * Предотвращает утечки памяти и повторные подписки:
 * Все подсистемы (чат, звонки, уведомления, онлайн-статус) используют
 * единый мультиплексированный канал `user_hub_${userId}`.
 */

import { getSupabase } from './client.ts'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type RealtimeEventHandler<T = any> = (payload: T) => void

export interface UserHubListeners {
  directMessages: Set<RealtimeEventHandler>
  directMessageUpdates: Set<RealtimeEventHandler>
  notifications: Set<RealtimeEventHandler>
  callSessions: Set<RealtimeEventHandler>
  broadcasts: Map<string, Set<RealtimeEventHandler>>
}

class UserRealtimeHub {
  private userId: string
  private channel: RealtimeChannel | null = null
  private listeners: UserHubListeners = {
    directMessages: new Set(),
    directMessageUpdates: new Set(),
    notifications: new Set(),
    callSessions: new Set(),
    broadcasts: new Map(),
  }
  private isSubscribed = false

  constructor(userId: string) {
    this.userId = userId
    this.initChannel()
  }

  private initChannel() {
    const supabase = getSupabase()
    if (!supabase || !this.userId) return

    const channelName = `user_hub_${this.userId}`
    this.channel = supabase.channel(channelName)

    this.channel
      // 1. Входящие личные сообщения
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${this.userId}`,
        },
        (payload) => {
          this.listeners.directMessages.forEach((fn) => {
            try {
              fn(payload.new)
            } catch (err) {
              console.error('[RealtimeHub] Error in directMessages listener:', err)
            }
          })
        }
      )
      // 2. Обновления сообщений (прочитано, реакции, редактирование)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${this.userId}`,
        },
        (payload) => {
          this.listeners.directMessageUpdates.forEach((fn) => {
            try {
              fn(payload.new)
            } catch (err) {
              console.error('[RealtimeHub] Error in directMessageUpdates listener:', err)
            }
          })
        }
      )
      // 3. Системные уведомления и запросы дружбы
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${this.userId}`,
        },
        (payload) => {
          this.listeners.notifications.forEach((fn) => {
            try {
              fn(payload.new)
            } catch (err) {
              console.error('[RealtimeHub] Error in notifications listener:', err)
            }
          })
        }
      )
      // 4. Сессии звонков
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_sessions',
          filter: `receiver_id=eq.${this.userId}`,
        },
        (payload) => {
          this.listeners.callSessions.forEach((fn) => {
            try {
              fn(payload.new)
            } catch (err) {
              console.error('[RealtimeHub] Error in callSessions listener:', err)
            }
          })
        }
      )
      // 5. Broadcast-события (звонки, сигналы, быстрые сообщения)
      .on('broadcast', { event: '*' }, (event) => {
        const eventName = event.event
        const fns = this.listeners.broadcasts.get(eventName)
        if (fns) {
          fns.forEach((fn) => {
            try {
              fn(event.payload)
            } catch (err) {
              console.error(`[RealtimeHub] Error in broadcast listener for ${eventName}:`, err)
            }
          })
        }
        // Слушатели "all"
        const allFns = this.listeners.broadcasts.get('*')
        if (allFns) {
          allFns.forEach((fn) => {
            try {
              fn({ event: eventName, payload: event.payload })
            } catch (err) {}
          })
        }
      })

    this.channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        this.isSubscribed = true
      }
    })
  }

  public onDirectMessage(handler: RealtimeEventHandler): () => void {
    this.listeners.directMessages.add(handler)
    return () => {
      this.listeners.directMessages.delete(handler)
    }
  }

  public onDirectMessageUpdate(handler: RealtimeEventHandler): () => void {
    this.listeners.directMessageUpdates.add(handler)
    return () => {
      this.listeners.directMessageUpdates.delete(handler)
    }
  }

  public onNotification(handler: RealtimeEventHandler): () => void {
    this.listeners.notifications.add(handler)
    return () => {
      this.listeners.notifications.delete(handler)
    }
  }

  public onCallSession(handler: RealtimeEventHandler): () => void {
    this.listeners.callSessions.add(handler)
    return () => {
      this.listeners.callSessions.delete(handler)
    }
  }

  public onBroadcast(event: string, handler: RealtimeEventHandler): () => void {
    if (!this.listeners.broadcasts.has(event)) {
      this.listeners.broadcasts.set(event, new Set())
    }
    this.listeners.broadcasts.get(event)!.add(handler)
    return () => {
      const fns = this.listeners.broadcasts.get(event)
      if (fns) {
        fns.delete(handler)
        if (fns.size === 0) {
          this.listeners.broadcasts.delete(event)
        }
      }
    }
  }

  public async broadcast(event: string, payload: any): Promise<boolean> {
    if (!this.channel) return false
    try {
      await this.channel.send({
        type: 'broadcast',
        event,
        payload,
      })
      return true
    } catch {
      return false
    }
  }

  public getChannel(): RealtimeChannel | null {
    return this.channel
  }

  public destroy() {
    const supabase = getSupabase()
    if (supabase && this.channel) {
      try {
        supabase.removeChannel(this.channel)
      } catch {}
    }
    this.channel = null
    this.isSubscribed = false
    this.listeners.directMessages.clear()
    this.listeners.directMessageUpdates.clear()
    this.listeners.notifications.clear()
    this.listeners.callSessions.clear()
    this.listeners.broadcasts.clear()
  }
}

// Реестр активных хабов по userId (гарантирует ровно 1 канал на пользователя)
const hubRegistry = new Map<string, UserRealtimeHub>()

/**
 * Получить или создать единый RealtimeHub для пользователя
 */
export function getUserRealtimeHub(userId: string): UserRealtimeHub {
  let hub = hubRegistry.get(userId)
  if (!hub) {
    hub = new UserRealtimeHub(userId)
    hubRegistry.set(userId, hub)
  }
  return hub
}

/**
 * Завершить и освободить канал пользователя (при выходе из аккаунта)
 */
export function cleanupUserRealtimeHub(userId: string): void {
  const hub = hubRegistry.get(userId)
  if (hub) {
    hub.destroy()
    hubRegistry.delete(userId)
  }
}

/**
 * Очистить все хабы (при полном сбросе приложения)
 */
export function cleanupAllRealtimeHubs(): void {
  hubRegistry.forEach((hub) => hub.destroy())
  hubRegistry.clear()
}

'use client'

/**
 * ЕДИНЫЙ ХУК СЧЁТЧИКОВ НЕПРОЧИТАННЫХ И СИНХРОНИЗАЦИИ (ЭТАП 7)
 * 
 * - Запрашивает данные С СЕРВЕРА при старте (RPC get_unread_counts)
 * - Поддерживает счётчики после перезагрузки страницы
 * - Слушает Realtime каналы notifications, direct_messages, friendships, call_sessions
 * - Синхронизирует document.title «(3) Огонёк» и бейдж на favicon
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { getSupabase } from '../supabase/browser.ts'
import {
  getUnreadCounts,
  markChatRead as apiMarkChatRead,
  markNotificationRead as apiMarkNotificationRead,
  markAllNotificationsRead as apiMarkAllNotificationsRead,
  updateDocumentTitle,
  updateFaviconBadge,
  type UnreadCounts,
} from './notifications.ts'

const DEFAULT_COUNTS: UnreadCounts = {
  chats: 0,
  chatsByThread: {},
  notifications: 0,
  comrades: 0,
  missedCalls: 0,
  total: 0,
}

// Глобальный синглтон стейт для предотвращения расхождений между компонентами
let globalCounts: UnreadCounts = { ...DEFAULT_COUNTS }
const listeners = new Set<(c: UnreadCounts) => void>()

function setGlobalCounts(next: UnreadCounts) {
  globalCounts = next
  updateDocumentTitle(next.total)
  updateFaviconBadge(next.total)
  listeners.forEach((listener) => listener(next))
}

export function useUnreadCounts(userId?: string | null) {
  const [counts, setCounts] = useState<UnreadCounts>(globalCounts)
  const [loading, setLoading] = useState(true)
  const isMounted = useRef(true)

  const refresh = useCallback(async () => {
    if (!userId) return
    const res = await getUnreadCounts(userId)
    if (isMounted.current) {
      setGlobalCounts(res)
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    isMounted.current = true
    const handleChange = (c: UnreadCounts) => {
      if (isMounted.current) setCounts(c)
    }
    listeners.add(handleChange)

    if (userId) {
      refresh()
    } else {
      setGlobalCounts(DEFAULT_COUNTS)
      setLoading(false)
    }

    return () => {
      isMounted.current = false
      listeners.delete(handleChange)
    }
  }, [userId, refresh])

  // Realtime подписка на изменения в БД
  useEffect(() => {
    if (!userId) return
    const supabase = getSupabase()
    if (!supabase) return

    const channelName = `user_unread_${userId}_${Math.random().toString(36).substring(2, 7)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          refresh()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'direct_messages', filter: `recipient_id=eq.${userId}` },
        () => {
          refresh()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => {
          refresh()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'call_sessions', filter: `receiver_id=eq.${userId}` },
        () => {
          refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel).catch(() => {})
    }
  }, [userId, refresh])

  const markChatRead = useCallback(async (friendId: string, threadKey?: string) => {
    // Оптимистичное обновление
    if (globalCounts.chatsByThread[friendId] || globalCounts.chats > 0) {
      const threadUnread = globalCounts.chatsByThread[friendId] || 0
      const nextByThread = { ...globalCounts.chatsByThread }
      delete nextByThread[friendId]
      if (threadKey) delete nextByThread[threadKey]

      const nextChats = Math.max(0, globalCounts.chats - threadUnread)
      setGlobalCounts({
        ...globalCounts,
        chats: nextChats,
        chatsByThread: nextByThread,
        total: Math.max(0, nextChats + globalCounts.notifications + globalCounts.comrades),
      })
    }

    await apiMarkChatRead(friendId, threadKey)
    refresh()
  }, [refresh])

  const markNotificationRead = useCallback(async (notificationId: string) => {
    setGlobalCounts({
      ...globalCounts,
      notifications: Math.max(0, globalCounts.notifications - 1),
      total: Math.max(0, globalCounts.total - 1),
    })
    await apiMarkNotificationRead(notificationId)
    refresh()
  }, [refresh])

  const markAllNotificationsRead = useCallback(async () => {
    setGlobalCounts({
      ...globalCounts,
      notifications: 0,
      missedCalls: 0,
      total: Math.max(0, globalCounts.chats + globalCounts.comrades),
    })
    await apiMarkAllNotificationsRead()
    refresh()
  }, [refresh])

  return {
    counts,
    loading,
    refresh,
    markChatRead,
    markNotificationRead,
    markAllNotificationsRead,
  }
}

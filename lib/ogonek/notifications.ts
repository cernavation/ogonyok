/**
 * КЛИЕНТСКИЙ И СЕРВЕРНЫЙ МОДУЛЬ УВЕДОМЛЕНИЙ И СЧЁТЧИКОВ (ЭТАП 7)
 */

import { getSupabase } from '../supabase/browser.ts'

export interface UnreadCounts {
  chats: number
  chatsByThread: Record<string, number>
  notifications: number
  comrades: number
  missedCalls: number
  total: number
}

export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'new_message'
  | 'missed_call'
  | 'comment'
  | 'reaction'
  | 'group_invite'
  | 'milestone'
  | 'system'

export interface NotificationItem {
  id: string
  user_id: string
  type: NotificationType
  actor_id?: string | null
  entity_type?: string | null
  entity_id?: string | null
  title: string
  body: string
  payload: Record<string, any>
  read_at?: string | null
  created_at: string
  actor?: {
    id: string
    username: string
    display_name: string
    avatar_image?: string | null
  }
}

/**
 * Получение актуальных счётчиков непрочитанных с сервера
 */
export async function getUnreadCounts(userId?: string): Promise<UnreadCounts> {
  const fallback: UnreadCounts = {
    chats: 0,
    chatsByThread: {},
    notifications: 0,
    comrades: 0,
    missedCalls: 0,
    total: 0,
  }

  const supabase = getSupabase()
  if (!supabase) return fallback

  try {
    const { data, error } = await supabase.rpc('get_unread_counts', {
      p_user_id: userId || undefined,
    })

    if (error) {
      console.warn('[getUnreadCounts] RPC error, using fallback:', error.message)
      return fallback
    }

    if (data && typeof data === 'object') {
      return {
        chats: Number(data.chats) || 0,
        chatsByThread: (data.chats_by_thread as Record<string, number>) || {},
        notifications: Number(data.notifications) || 0,
        comrades: Number(data.comrades) || 0,
        missedCalls: Number(data.missed_calls) || 0,
        total: Number(data.total) || 0,
      }
    }
  } catch (err) {
    console.warn('[getUnreadCounts] fetch failed:', err)
  }

  return fallback
}

/**
 * Получение списка уведомлений пользователя с пагинацией
 */
export async function listNotifications(
  limit = 30,
  beforeCreatedAt?: string
): Promise<NotificationItem[]> {
  const supabase = getSupabase()
  if (!supabase) return []

  try {
    let query = supabase
      .from('notifications')
      .select('id, user_id, type, actor_id, entity_type, entity_id, title, body, payload, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (beforeCreatedAt) {
      query = query.lt('created_at', beforeCreatedAt)
    }

    const { data, error } = await query
    if (error) {
      console.warn('[listNotifications] error:', error.message)
      return []
    }

    return (data || []) as NotificationItem[]
  } catch (err) {
    console.warn('[listNotifications] fetch failed:', err)
    return []
  }
}

/**
 * Пометить конкретное уведомление прочитанным
 */
export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false

  try {
    const { data, error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId,
    })
    return !error && Boolean(data)
  } catch {
    return false
  }
}

/**
 * Пометить все уведомления пользователя прочитанными
 */
export async function markAllNotificationsRead(): Promise<number> {
  const supabase = getSupabase()
  if (!supabase) return 0

  try {
    const { data, error } = await supabase.rpc('mark_all_notifications_read')
    return error ? 0 : Number(data) || 0
  } catch {
    return 0
  }
}

/**
 * Пометить чат прочитанным
 */
export async function markChatRead(friendId: string, threadKey?: string): Promise<number> {
  const supabase = getSupabase()
  if (!supabase) return 0

  try {
    const { data, error } = await supabase.rpc('mark_chat_read', {
      p_friend_id: friendId,
      p_thread_key: threadKey || undefined,
    })
    return error ? 0 : Number(data) || 0
  } catch {
    return 0
  }
}

/**
 * Обновление заголовка вкладки браузера document.title
 */
export function updateDocumentTitle(totalUnread: number): void {
  if (typeof document === 'undefined') return
  const baseTitle = 'Огонёк'
  if (totalUnread > 0) {
    const badgeText = totalUnread > 99 ? '99+' : String(totalUnread)
    document.title = `(${badgeText}) ${baseTitle}`
  } else {
    document.title = baseTitle
  }
}

/**
 * Динамический бейдж на Favicon через Canvas
 */
let cachedFaviconImg: HTMLImageElement | null = null

export function updateFaviconBadge(totalUnread: number): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return

  let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']")
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }

  if (totalUnread <= 0) {
    link.href = '/icons/icon-192.svg'
    return
  }

  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const drawBadge = (img?: HTMLImageElement) => {
    ctx.clearRect(0, 0, 32, 32)
    if (img) {
      ctx.drawImage(img, 0, 0, 32, 32)
    } else {
      // Запасной оранжевый фон, если картинка не загрузилась
      ctx.beginPath()
      ctx.arc(16, 16, 14, 0, 2 * Math.PI)
      ctx.fillStyle = '#ff6b35'
      ctx.fill()
    }

    // Красный круг-индикатор в правом верхнем углу
    ctx.beginPath()
    ctx.arc(23, 9, 8, 0, 2 * Math.PI)
    ctx.fillStyle = '#ef4444'
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Белая точка или мини-цифра
    if (totalUnread < 10) {
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 10px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(totalUnread), 23, 9)
    }

    link!.href = canvas.toDataURL('image/png')
  }

  if (cachedFaviconImg && cachedFaviconImg.complete) {
    drawBadge(cachedFaviconImg)
  } else {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = '/icons/icon-192.png'
    img.onload = () => {
      cachedFaviconImg = img
      drawBadge(img)
    }
    img.onerror = () => {
      drawBadge()
    }
  }
}

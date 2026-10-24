'use client'

import { ArrowLeft, MessageCircle, MessageSquarePlus, Search, Sparkles, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { FRIEND_PROFILES, getFriend, presenceMeta } from '@/lib/ogonek/friends'
import { isGroupThread, sortThreadIds, totalUnread } from '@/lib/ogonek/messenger'
import { playClick } from '@/lib/ogonek/sound'
import type { ViewId } from '@/lib/ogonek/types'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { getSupabase } from '@/lib/supabase/client'
import { ChatThreadList, ChatWindow, NewChatModal } from '../messenger'
import { MobileHeader } from '../mobile-header'

type Props = {
  onNavigate: (view: ViewId) => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

const SUGGESTED_IDS = ['fr-voloshin', 'fr-sokolova', 'fr-kovaleva', 'fr-grinev', 'fr-petrov']

/**
 * РАЗДЕЛ «ЧАТЫ / СООБЩЕНИЯ» — ТОЧНАЯ КОПИЯ UX TELEGRAM WEB.
 * Слева — список диалогов (поиск, папки-вкладки Все / Личные / Группы / Непрочитанные),
 * справа — переписка с реакциями, ответами, пересылкой, голосовыми сообщениями,
 * стикерами, вложениями, карточками гордости и закреплёнными сообщениями.
 */
export function MessagesView({ onNavigate, onNotify, soundEnabled = true }: Props) {
  const {
    state,
    markAllThreadsRead,
    setActiveChatFriend,
    startChatWithFriend,
    setChatFolder,
    deleteChatFolder,
    setChatActiveFolderId,
  } = useOgonekStore()

  const [newChatOpen, setNewChatOpen] = useState(false)

  const threads = state.chatThreads ?? {}
  const threadIds = useMemo(() => Object.keys(threads), [threads])
  const activeFriendId = state.chatActiveFriendId
  const folders = state.chatFolders ?? []
  const activeFolderId = state.chatActiveFolderId ?? 'all'

  const unreadTotal = useMemo(() => totalUnread(threads), [threads])
  const onlineCount = useMemo(
    () => FRIEND_PROFILES.filter((f) => presenceMeta(f.presence).short === 'онлайн').length,
    []
  )

  // Supabase Realtime подписка на входящие сообщения
  useEffect(() => {
    const client = getSupabase()
    if (!client) return

    const channel = client
      .channel('ogonek-realtime-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.new) {
            // Уведомление о новом сообщении
            onNotify('Новое сообщение в чате 💬')
          }
        }
      )
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [onNotify])

  const openThread = (friendId: string) => {
    playClick(soundEnabled)
    setActiveChatFriend(friendId)
    if (typeof window !== 'undefined') {
      window.history.pushState({ chatId: friendId }, '', `/chats/${friendId}`)
    }
  }

  const startWith = (friendId: string) => {
    playClick(soundEnabled)
    startChatWithFriend(friendId)
    if (typeof window !== 'undefined') {
      window.history.pushState({ chatId: friendId }, '', `/chats/${friendId}`)
    }
  }

  const isChatAvailable =
    Boolean(activeFriendId) &&
    (Boolean(getFriend(activeFriendId!)) || isGroupThread(threads[activeFriendId!], activeFriendId!))

  return (
    <div className="view-messages">
      <MobileHeader title="Чаты" />

      <header className="view-header">
        <button
          type="button"
          className="back-button"
          onClick={() => onNavigate('home')}
          aria-label="Вернуться на главную"
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1>Чаты</h1>
          <p className="view-subtitle">
            Мессенджер Огонька в стиле Telegram Web · группы, папки, голосовые и карточки в один клик
          </p>
        </div>
        <button
          type="button"
          className="msgr__new inline-flex items-center gap-1.5 px-4 py-2 min-h-[36px] rounded-full text-[13px] font-bold bg-[var(--text)] text-[var(--bg)] hover:opacity-90 transition-opacity"
          onClick={() => {
            playClick(soundEnabled)
            setNewChatOpen(true)
          }}
        >
          <MessageSquarePlus size={16} /> Написать
        </button>
      </header>

      <div className="messages-content flex-1 min-h-0 w-full flex flex-col">
        <ChatThreadList
          threads={threads}
          activeFriendId={activeFriendId}
          onSelect={openThread}
          onMarkAllRead={() => {
            markAllThreadsRead()
            onNotify('Все переписки прочитаны ✓')
          }}
          folders={folders}
          activeFolderId={activeFolderId}
          onSelectFolder={setChatActiveFolderId}
          onSaveCustomFolder={setChatFolder}
          onDeleteCustomFolder={deleteChatFolder}
          soundEnabled={soundEnabled}
        />
      </div>

      {newChatOpen && (
        <NewChatModal
          onClose={() => setNewChatOpen(false)}
          onNotify={onNotify}
          soundEnabled={soundEnabled}
        />
      )}
    </div>
  )
}

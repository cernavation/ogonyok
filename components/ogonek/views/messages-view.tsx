'use client'

import { ArrowLeft, MessageCircle, MessageSquarePlus, Search, Sparkles, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { FRIEND_PROFILES, getFriend, presenceMeta } from '@/lib/ogonek/friends'
import { isGroupThread, sortThreadIds, totalUnread } from '@/lib/ogonek/messenger'
import { playClick } from '@/lib/ogonek/sound'
import type { ViewId } from '@/lib/ogonek/types'
import { useOgonekStore, type CurrentUser } from '@/lib/ogonek/use-ogonek-store'
import { getSupabase } from '@/lib/supabase/browser'
import { subscribeToDirectMessages } from '@/lib/supabase/api'
import { useCallStore } from '@/lib/ogonek/use-call-store'
import { normalizeTier } from '@/lib/ogonek/permissions'
import { ChatThreadList } from '../messenger/chat-thread-list'
import { ChatWindow } from '../messenger/chat-window'
import { NewChatModal } from '../messenger/new-chat-modal'
import { MessengerErrorBoundary } from '../messenger/messenger-error-boundary'
import { ListRowSkeleton } from '../ui/list-row'

type Props = {
  onNavigate: (view: ViewId) => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
  currentUserId?: string | null
  currentUser?: CurrentUser
}

const SUGGESTED_IDS = ['fr-sokolova', 'fr-kovaleva', 'fr-grinev', 'fr-petrov']

/**
 * РАЗДЕЛ «ЧАТЫ / СООБЩЕНИЯ» — ТОЧНАЯ КОПИЯ UX TELEGRAM WEB.
 * Слева — список диалогов (поиск, папки-вкладки Все / Личные / Группы / Непрочитанные),
 * справа — переписка с реакциями, ответами, пересылкой, голосовыми сообщениями,
 * стикерами, вложениями, карточками гордости и закреплёнными сообщениями.
 */
export function MessagesView({
  onNavigate,
  onNotify,
  soundEnabled = true,
  currentUserId,
  currentUser,
}: Props) {
  const {
    state,
    markAllThreadsRead,
    setActiveChatFriend,
    startChatWithFriend,
    receiveIncomingChatMessage,
    setChatFolder,
    deleteChatFolder,
    setChatActiveFolderId,
  } = useOgonekStore()

  const { startCall } = useCallStore(currentUserId)

  const [newChatOpen, setNewChatOpen] = useState(false)

  const threads = state?.chatThreads ?? {}
  const threadIds = useMemo(() => Object.keys(threads || {}), [threads])
  const activeFriendId =
    typeof state?.chatActiveFriendId === 'string' &&
    state.chatActiveFriendId !== 'undefined' &&
    state.chatActiveFriendId !== 'null'
      ? state.chatActiveFriendId
      : null
  const folders = state?.chatFolders ?? []
  const activeFolderId = state?.chatActiveFolderId ?? 'all'

  const unreadTotal = useMemo(() => totalUnread(threads), [threads])
  const onlineCount = useMemo(
    () => FRIEND_PROFILES.filter((f) => presenceMeta(f.presence).short === 'онлайн').length,
    []
  )

  // Supabase Realtime подписка на входящие сообщения
  useEffect(() => {
    const unsubscribe = subscribeToDirectMessages((msg) => {
      if (msg) {
        receiveIncomingChatMessage(msg as any)
        onNotify('Новое сообщение в чате 💬')
      }
    })

    return () => {
      unsubscribe()
    }
  }, [receiveIncomingChatMessage, onNotify])

  const openThread = (friendId: string) => {
    if (!friendId || friendId === 'undefined' || friendId === 'null') return
    playClick(soundEnabled)
    setActiveChatFriend(friendId)
    if (typeof window !== 'undefined') {
      window.history.pushState({ chatId: friendId }, '', `/chats/${friendId}`)
    }
  }

  const startWith = (friendId: string) => {
    if (!friendId || friendId === 'undefined' || friendId === 'null') return
    playClick(soundEnabled)
    startChatWithFriend(friendId)
    if (typeof window !== 'undefined') {
      window.history.pushState({ chatId: friendId }, '', `/chats/${friendId}`)
    }
  }

  const isChatAvailable =
    Boolean(activeFriendId) &&
    (Boolean(getFriend(activeFriendId!)) || isGroupThread(threads[activeFriendId!], activeFriendId!))

  if (!currentUserId && !currentUser && !state?.auth?.signedIn) {
    return (
      <div className="view-messages flex-1 flex flex-col p-4 bg-[var(--bg)] divide-y divide-[var(--border)]/40">
        <ListRowSkeleton />
        <ListRowSkeleton />
        <ListRowSkeleton />
      </div>
    )
  }

  return (
    <MessengerErrorBoundary onNavigateHome={() => onNavigate('home')}>
      <div className="view-messages">
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
            <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">Чаты</h1>
            <p className="view-subtitle text-[13px] text-[var(--muted)] font-normal">
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
            onStartCall={(peerId, isVideo, peerName, peerAvatar) => {
              const userTier = normalizeTier(state?.profile?.subscription_tier)
              startCall({
                peerId,
                isVideo,
                peerName,
                peerAvatar,
                userTier,
                soundEnabled,
              }).then((res) => {
                if (!res.ok && res.message) {
                  onNotify(res.message)
                }
              })
            }}
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
    </MessengerErrorBoundary>
  )
}

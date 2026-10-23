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

  // На широком экране сразу открываем первый диалог, если ничего не выбрано
  useEffect(() => {
    if (activeFriendId || threadIds.length === 0) return
    if (typeof window === 'undefined') return
    if (window.matchMedia('(min-width: 901px)').matches) {
      setActiveChatFriend(sortThreadIds(threads, threadIds)[0] ?? null)
    }
  }, [activeFriendId, threadIds, threads, setActiveChatFriend])

  const openThread = (friendId: string) => {
    playClick(soundEnabled)
    setActiveChatFriend(friendId)
  }

  const startWith = (friendId: string) => {
    playClick(soundEnabled)
    startChatWithFriend(friendId)
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

      <div className="messages-content">
        <div className={`msgr ${activeFriendId ? 'is-chat-open' : ''}`}>
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

          <section className="msgr__chat" aria-label="Окно переписки">
            {isChatAvailable ? (
              <ChatWindow
                friendId={activeFriendId!}
                onNotify={onNotify}
                onBack={() => {
                  playClick(soundEnabled)
                  setActiveChatFriend(null)
                }}
                soundEnabled={soundEnabled}
              />
            ) : (
              <div className="msgr__placeholder">
                <div className="msgr__placeholder-icon">
                  <MessageCircle size={32} className="text-[var(--accent)]" />
                </div>
                <h2>Напиши первому другу</h2>
                <p>
                  Здесь будут твои личные и групповые диалоги. Делись гордостями, обменивайся опытом и держи огонь вместе.
                </p>

                {threadIds.length > 0 && (
                  <div className="msgr__placeholder-stats">
                    <span>
                      <Users size={14} /> {threadIds.length} диалогов
                    </span>
                    <span>
                      <Sparkles size={14} /> {unreadTotal} непрочитанных
                    </span>
                    <span className="is-online">{onlineCount} в сети</span>
                  </div>
                )}

                {/* Подсказки демо-собеседников выводятся ТОЛЬКО при NEXT_PUBLIC_DEMO_MODE=1 */}
                {process.env.NEXT_PUBLIC_DEMO_MODE === '1' && (
                  <div className="msgr__suggest">
                    <p className="msgr__suggest-title">Кому написать прямо сейчас (демо)</p>
                    <div className="msgr__suggest-row">
                      {SUGGESTED_IDS.map((id) => {
                        const friend = getFriend(id)
                        if (!friend) return null
                        const hasThread = Boolean(threads[id])
                        return (
                          <button
                            key={id}
                            type="button"
                            className="msgr__suggest-chip"
                            onClick={() => (hasThread ? openThread(id) : startWith(id))}
                          >
                            <span
                              className="msgr__suggest-ava"
                              style={{ background: friend.avatarColor }}
                              aria-hidden="true"
                            >
                              {friend.initials}
                            </span>
                            {friend.name.split(/\s+/)[0]}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 py-2.5 px-6 rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-xs font-bold shadow-md hover:opacity-90 transition-all active:scale-95"
                    onClick={() => {
                      playClick(soundEnabled)
                      onNavigate('explore')
                    }}
                  >
                    <Search size={14} /> Найти друзей по нику
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
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

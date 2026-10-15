'use client'

import { ArrowLeft, MessageCircle, MessageSquarePlus, Search, Sparkles, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { FRIEND_PROFILES, getFriend, presenceMeta } from '@/lib/ogonek/friends'
import { sortThreadIds, totalUnread } from '@/lib/ogonek/messenger'
import { playClick } from '@/lib/ogonek/sound'
import type { ViewId } from '@/lib/ogonek/types'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { ChatThreadList, ChatWindow, NewChatModal } from '../messenger'
import { MobileHeader } from '../mobile-header'

type Props = {
  onNavigate: (view: ViewId) => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

const SUGGESTED_IDS = ['fr-voloshin', 'fr-sokolova', 'fr-kovaleva', 'fr-grinev', 'fr-petrov']

/**
 * ЭТАП 13 — РАЗДЕЛ «ЧАТЫ / СООБЩЕНИЯ».
 * Слева — живой список диалогов с друзьями (поиск, фильтры, непрочитанные),
 * справа — окно быстрой переписки в стиле Telegram с реакциями и вложениями.
 * Любую карточку гордости или сторис можно переслать другу в один клик.
 */
export function MessagesView({ onNavigate, onNotify, soundEnabled = true }: Props) {
  const { state, markAllThreadsRead, setActiveChatFriend, startChatWithFriend } = useOgonekStore()
  const [newChatOpen, setNewChatOpen] = useState(false)

  const threads = state.chatThreads ?? {}
  const threadIds = useMemo(() => Object.keys(threads), [threads])
  const activeFriendId = state.chatActiveFriendId

  const unreadTotal = useMemo(() => totalUnread(threads), [threads])
  const onlineCount = useMemo(
    () => FRIEND_PROFILES.filter((f) => presenceMeta(f.presence).short === 'онлайн').length,
    []
  )

  // На широком экране сразу открываем первый диалог, чтобы чат был «живым»
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
            Быстрая переписка с друзьями · реакции и карточки гордости в один клик
          </p>
        </div>
        <button
          type="button"
          className="primary-btn msgr__new"
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
            soundEnabled={soundEnabled}
          />

          <section className="msgr__chat" aria-label="Окно переписки">
            {activeFriendId && getFriend(activeFriendId) ? (
              <ChatWindow
                friendId={activeFriendId}
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
                  <MessageCircle size={30} />
                </div>
                <h2>Твои переписки</h2>
                <p>
                  Выбери диалог слева{unreadTotal > 0 ? ` — там ${unreadTotal} непрочитанных` : ''} или
                  начни новый. Отсюда удобно делиться гордостями и сторис и поддерживать друзей.
                </p>

                <div className="msgr__placeholder-stats">
                  <span>
                    <Users size={14} /> {threadIds.length} диалогов
                  </span>
                  <span>
                    <Sparkles size={14} /> {unreadTotal} непрочитанных
                  </span>
                  <span className="is-online">{onlineCount} в сети</span>
                </div>

                <div className="msgr__suggest">
                  <p className="msgr__suggest-title">Кому написать прямо сейчас</p>
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

                <button
                  type="button"
                  className="secondary-btn msgr__placeholder-cta"
                  onClick={() => {
                    playClick(soundEnabled)
                    setNewChatOpen(true)
                  }}
                >
                  <Search size={15} /> Найти друга по имени
                </button>
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

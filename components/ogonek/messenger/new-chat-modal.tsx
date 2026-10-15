'use client'

import { motion } from 'framer-motion'
import { MessageCirclePlus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { FRIEND_PROFILES, presenceMeta } from '@/lib/ogonek/friends'
import { lastActivityMs, unreadCount } from '@/lib/ogonek/messenger'
import { playClick } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { ChatAvatar } from './chat-avatar'

type Props = {
  onClose: () => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

/**
 * ЭТАП 13 — Новый чат.
 * Живой поиск по кругу друзей и всему сообществу: выбираешь человека — и
 * мгновенно открывается переписка с ним (тред создаётся в сторе).
 */
export function NewChatModal({ onClose, onNotify, soundEnabled = true }: Props) {
  const { state, startChatWithFriend } = useOgonekStore()
  const [query, setQuery] = useState('')

  const friendIds = state.friendIds ?? []
  const friendSet = useMemo(() => new Set(friendIds), [friendIds])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return FRIEND_PROFILES.filter((f) => {
      if (!q) return true
      return (
        f.name.toLowerCase().includes(q) ||
        f.username.toLowerCase().includes(q) ||
        f.city.toLowerCase().includes(q)
      )
    }).sort((a, b) => {
      const af = friendSet.has(a.id) ? 1 : 0
      const bf = friendSet.has(b.id) ? 1 : 0
      if (af !== bf) return bf - af
      const pa = presenceMeta(a.presence).short === 'онлайн' ? 1 : 0
      const pb = presenceMeta(b.presence).short === 'онлайн' ? 1 : 0
      if (pa !== pb) return pb - pa
      const ta = lastActivityMs(state.chatThreads?.[a.id])
      const tb = lastActivityMs(state.chatThreads?.[b.id])
      if (ta !== tb) return tb - ta
      return a.name.localeCompare(b.name)
    })
  }, [query, friendSet, state.chatThreads])

  const open = (friendId: string) => {
    playClick(soundEnabled)
    const ok = startChatWithFriend(friendId)
    if (ok) {
      onNotify('Диалог открыт — напиши первое слово ✍️')
      onClose()
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Новый чат"
    >
      <motion.div
        className="modal"
        style={{ maxWidth: 480 }}
        initial={{ y: 24, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 24, scale: 0.98 }}
      >
        <header>
          <h2>
            <MessageCirclePlus size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} />
            Новый чат
          </h2>
          <button type="button" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </header>

        <div className="forward-search">
          <Search size={16} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Имя, @username или город"
            aria-label="Поиск человека"
            autoFocus
          />
        </div>

        <div className="forward-list" role="listbox" aria-label="Кому написать">
          {list.length === 0 && (
            <p className="empty-state__desc" style={{ padding: '14px 4px' }}>
              Никого не найдено.
            </p>
          )}
          {list.map((friend) => {
            const presence = presenceMeta(friend.presence)
            const unread = unreadCount(state.chatThreads?.[friend.id])
            return (
              <button
                key={friend.id}
                type="button"
                role="option"
                aria-selected={false}
                className="forward-row"
                onClick={() => open(friend.id)}
              >
                <ChatAvatar friendId={friend.id} size={40} ringColor="#0b0c0d" />
                <span className="forward-row__text">
                  <span className="forward-row__name">
                    {friend.name}
                    {friend.verified && <span className="friend-verified">✓</span>}
                    {friendSet.has(friend.id) && <em className="forward-row__tag">друг</em>}
                  </span>
                  <span className="forward-row__sub" style={{ color: presence.color }}>
                    {presence.short} · @{friend.username}
                  </span>
                </span>
                {unread > 0 && <span className="msgr-thread__unread">{unread}</span>}
              </button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}

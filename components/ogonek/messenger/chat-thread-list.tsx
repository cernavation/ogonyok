'use client'

import { CheckCheck, Pin, Search, VolumeX, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { getFriend, presenceMeta } from '@/lib/ogonek/friends'
import {
  lastMessage,
  sortThreadIds,
  summarizeMessage,
  totalUnread,
  unreadCount,
} from '@/lib/ogonek/messenger'
import { playClick } from '@/lib/ogonek/sound'
import type { ChatThreads } from '@/lib/ogonek/types'
import { ChatAvatar } from './chat-avatar'

type Filter = 'all' | 'unread' | 'online'

type Props = {
  threads: ChatThreads
  activeFriendId: string | null
  onSelect: (friendId: string) => void
  onMarkAllRead: () => void
  /** Друзья, с которыми есть смысл начать диалог (все из круга) */
  soundEnabled?: boolean
}

/**
 * ЭТАП 13 — Список диалогов.
 * Живой поиск по друзьям, фильтры «Все / Непрочитанные / Онлайн», превью
 * последнего сообщения, счётчик непрочитанных, метки закрепления и «выкл. звук».
 */
export function ChatThreadList({
  threads,
  activeFriendId,
  onSelect,
  onMarkAllRead,
  soundEnabled = true,
}: Props) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const ids = useMemo(() => Object.keys(threads), [threads])
  const unreadTotal = useMemo(() => totalUnread(threads), [threads])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sortThreadIds(threads, ids)
      .flatMap((id) => {
        const friend = getFriend(id)
        const thread = threads[id]
        if (!friend || !thread) return []
        return [{ id, friend, thread }]
      })
      .filter(({ friend, thread }) => {
        if (q) {
          const hit =
            friend.name.toLowerCase().includes(q) ||
            friend.username.toLowerCase().includes(q) ||
            friend.city.toLowerCase().includes(q) ||
            (lastMessage(thread)?.text ?? '').toLowerCase().includes(q)
          if (!hit) return false
        }
        if (filter === 'unread') return unreadCount(thread) > 0
        if (filter === 'online') return friend.presence === 'online'
        return true
      })
  }, [threads, ids, query, filter])

  const FILTERS: Array<{ id: Filter; label: string }> = [
    { id: 'all', label: 'Все' },
    { id: 'unread', label: unreadTotal > 0 ? `Непрочитанные · ${unreadTotal}` : 'Непрочитанные' },
    { id: 'online', label: 'Онлайн' },
  ]

  return (
    <div className="msgr__sidebar">
      <div className="msgr__sidebar-head">
        <div className="msgr__search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по диалогам"
            aria-label="Поиск по диалогам"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Очистить поиск">
              <X size={15} />
            </button>
          )}
        </div>

        <div className="msgr__filters" role="tablist" aria-label="Фильтр диалогов">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`msgr-filter ${filter === f.id ? 'is-active' : ''}`}
              onClick={() => {
                playClick(soundEnabled)
                setFilter(f.id)
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="msgr__list" role="list">
        {rows.length === 0 ? (
          <p className="msgr__empty">
            {filter === 'unread'
              ? 'Всё прочитано — ни одного непрочитанного сообщения 🔥'
              : 'Диалогов пока нет. Нажми «Написать» и начни первым.'}
          </p>
        ) : (
          rows.map(({ id, friend, thread }) => {
            const last = lastMessage(thread)
            const unread = unreadCount(thread)
            const presence = presenceMeta(friend.presence)
            const preview = summarizeMessage(last)
            const isMine = last?.authorId === 'me'
            return (
              <button
                key={id}
                type="button"
                role="listitem"
                className={`msgr-thread ${activeFriendId === id ? 'is-active' : ''}`}
                onClick={() => onSelect(id)}
                aria-label={`Диалог с ${friend.name}${unread > 0 ? `, ${unread} непрочитанных` : ''}`}
              >
                <ChatAvatar friendId={id} size={48} ringColor="#0b0c0d" />
                <span className="msgr-thread__body">
                  <span className="msgr-thread__top">
                    <span className="msgr-thread__name">
                      {friend.name}
                      {friend.verified && <span className="friend-verified">✓</span>}
                      {thread.pinned && <Pin size={12} className="msgr-thread__pin" />}
                      {thread.muted && <VolumeX size={12} className="msgr-thread__mute" />}
                    </span>
                    <span className={`msgr-thread__stamp ${unread > 0 ? 'is-hot' : ''}`}>
                      {last ? new Date(last.createdAtISO).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </span>
                  <span className="msgr-thread__bottom">
                    <span className={`msgr-thread__preview ${unread > 0 ? 'is-unread' : ''}`}>
                      {isMine && <em className="msgr-thread__you">Ты: </em>}
                      {preview}
                    </span>
                    {unread > 0 ? (
                      <span className="msgr-thread__unread">{unread}</span>
                    ) : (
                      <span className="msgr-thread__dot" style={{ background: presence.color }} title={presence.label} />
                    )}
                  </span>
                </span>
              </button>
            )
          })
        )}
      </div>

      <div className="msgr__sidebar-foot">
        <button
          type="button"
          className="msgr__mark-all"
          onClick={() => {
            playClick(soundEnabled)
            onMarkAllRead()
          }}
          disabled={unreadTotal === 0}
        >
          <CheckCheck size={15} /> Прочитать всё
        </button>
      </div>
    </div>
  )
}

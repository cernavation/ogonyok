'use client'

import { motion } from 'framer-motion'
import { Check, Forward, Search, Send, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { FRIEND_PROFILES, formatLastSeenStatus, getFriend, type FriendProfile } from '@/lib/ogonek/friends'
import { getInitials } from '@/lib/ogonek/initials'
import { getMutualFriendProfiles, getProfilesByIds, type ProfileRecord } from '@/lib/supabase/api'
import { getEffectiveLastSeenSync, usePresenceSnapshot } from '@/lib/supabase/presence'
import { lastActivityMs, threadOf } from '@/lib/ogonek/messenger'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { ChatAttachment } from '@/lib/ogonek/types'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { ChatAttachmentCard } from './chat-attachment-card'
import { ChatAvatar } from './chat-avatar'
import { VerifiedBadge } from '../ui'

type Props = {
  attachment?: ChatAttachment | null
  onClose: () => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
  /** Друзья, отмеченные заранее (например, текущий собеседник) */
  initialFriendIds?: string[]
  /** Дополнительный текст к пересылке */
  initialNote?: string
}

/**
 * ЭТАП 13 — Переслать карточку другу в чат в один клик.
 * Показывает карточку и список друзей с чекбоксами: можно отправить сразу
 * нескольким. Отправка идёт через `forwardToChat` стора и реально кладёт
 * сообщение с вложением в переписку. Если карточки нет — уходит только текст.
 */
export function ForwardToChatModal({
  attachment,
  onClose,
  onNotify,
  soundEnabled = true,
  initialFriendIds = [],
  initialNote = '',
}: Props) {
  const { state, forwardToChat, sendChatMessage } = useOgonekStore()
  // Если карточку пересылают из уже открытого чата — этот друг выбран заранее,
  // так что пересылка срабатывает буквально в один клик.
  const activeFriendId = state.chatActiveFriendId
  const [selected, setSelected] = useState<string[]>(() =>
    initialFriendIds.length > 0 ? [...initialFriendIds] : activeFriendId ? [activeFriendId] : []
  )
  const [note, setNote] = useState(initialNote)
  const [query, setQuery] = useState('')
  const [cloudFriends, setCloudFriends] = useState<FriendProfile[]>([])
  const presenceSnap = usePresenceSnapshot()

  const friendIds = useMemo(() => state.friendIds ?? [], [state.friendIds])
  const currentUserId = state.auth?.activeAccountId || null

  useEffect(() => {
    let cancelled = false
    const mapRecord = (p: ProfileRecord): FriendProfile => ({
      id: p.id,
      name: p.display_name || `@${p.username}`,
      username: p.username,
      initials: getInitials(p.display_name, p.username),
      avatarUrl: p.avatar_image || p.avatar_url || null,
      avatarColor: p.avatar_color || '#FF5C00',
      bio: p.bio || '',
      city: p.city || '',
      streak: p.streak_count ?? p.streak ?? 0,
      together: 0,
      mutual: 0,
      verified: Boolean(p.verified),
      lastActive: 'недавно',
      lastSeenAt: p.last_seen_at || null,
      presence: 'offline',
    })

    const load = async () => {
      try {
        const records =
          friendIds.length > 0
            ? Object.values(await getProfilesByIds(friendIds))
            : currentUserId &&
                !currentUserId.startsWith('anon-') &&
                !currentUserId.startsWith('acct-guest')
              ? await getMutualFriendProfiles(currentUserId)
              : []
        if (!cancelled && Array.isArray(records)) {
          setCloudFriends(records.map(mapRecord))
        }
      } catch {}
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [friendIds, currentUserId])

  const friendSet = useMemo(() => new Set(friendIds), [friendIds])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const mergedMap = new Map<string, FriendProfile>()
    for (const f of FRIEND_PROFILES) mergedMap.set(f.id, f)
    for (const fid of friendIds) {
      const cached = getFriend(fid)
      if (cached) mergedMap.set(fid, cached)
    }
    for (const cf of cloudFriends) mergedMap.set(cf.id, cf)

    return Array.from(mergedMap.values())
      .filter((f) => {
        if (!q) return true
        return (
          f.name.toLowerCase().includes(q) ||
          f.username.toLowerCase().includes(q) ||
          f.city.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        const af = friendSet.has(a.id) ? 1 : 0
        const bf = friendSet.has(b.id) ? 1 : 0
        if (af !== bf) return bf - af
        const ta = lastActivityMs(state.chatThreads?.[a.id])
        const tb = lastActivityMs(state.chatThreads?.[b.id])
        if (ta !== tb) return tb - ta
        return a.name.localeCompare(b.name)
      })
  }, [query, friendIds, cloudFriends, friendSet, state.chatThreads])

  const toggle = (id: string) => {
    playClick(soundEnabled)
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleSend = () => {
    if (selected.length === 0) {
      onNotify('Выбери хотя бы одного друга')
      return
    }

    if (!attachment) {
      const text = note.trim()
      if (!text) {
        onNotify('Нет текста для пересылки')
        return
      }
      let sent = 0
      for (const id of selected) {
        if (sendChatMessage(id, text)) sent += 1
      }
      if (sent > 0) {
        playSuccess(soundEnabled)
        onNotify(`Сообщение переслано ${sent} ${sent === 1 ? 'другу' : 'друзьям'} ✓`)
        onClose()
      }
      return
    }

    const count = forwardToChat(selected, attachment, note.trim())
    if (count > 0) {
      playSuccess(soundEnabled)
      onNotify(
        count === 1
          ? `Карточка отправлена @${getFriend(selected[0])?.username ?? ''} ✓`
          : `Карточка переслана ${count} друзьям ✓`
      )
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
      aria-label="Переслать карточку другу"
    >
      <motion.div
        className="modal"
        style={{ maxWidth: 540 }}
        initial={{ y: 24, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 24, scale: 0.98 }}
      >
        <header>
          <h2>
            <Forward size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} />
            Переслать другу
          </h2>
          <button type="button" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </header>

        <div className="forward-preview">
          {attachment ? (
            <ChatAttachmentCard attachment={attachment} />
          ) : (
            <p className="forward-note-preview">{note.trim() || 'Пустое сообщение'}</p>
          )}
        </div>

        <div className="forward-search">
          <Search size={16} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти друга по имени, @username или городу"
            aria-label="Поиск друга"
          />
        </div>

        <div className="forward-list" role="listbox" aria-label="Друзья">
          {list.length === 0 && (
            <p className="empty-state__desc" style={{ padding: '14px 4px' }}>
              Никого не найдено. Попробуй другое имя.
            </p>
          )}
          {list.map((friend) => {
            const checked = selected.includes(friend.id)
            const isFriendOnline = presenceSnap.onlineIds.has(friend.id)
            const status = formatLastSeenStatus(getEffectiveLastSeenSync(friend.id, friend.lastSeenAt), isFriendOnline)
            const thread = threadOf(state.chatThreads ?? {}, friend.id)
            const hasThread = Boolean(state.chatThreads?.[friend.id])
            return (
              <button
                key={friend.id}
                type="button"
                role="option"
                aria-selected={checked}
                className={`forward-row ${checked ? 'is-checked' : ''}`}
                onClick={() => toggle(friend.id)}
              >
                <ChatAvatar friendId={friend.id} size={40} ringColor="#0b0c0d" />
                <span className="forward-row__text">
                  <span className="forward-row__name">
                    {friend.name}
                    {friend.verified && <VerifiedBadge size="xs" />}
                    {friendSet.has(friend.id) && <em className="forward-row__tag">друг</em>}
                  </span>
                  <span className="forward-row__sub" style={{ color: status.color }}>
                    {status.shortLabel} · {hasThread ? `${thread.messages.length} сообщ.` : 'нет переписки'}
                  </span>
                </span>
                <span className={`forward-check ${checked ? 'is-on' : ''}`} aria-hidden="true">
                  {checked && <Check size={14} />}
                </span>
              </button>
            )
          })}
        </div>

        <textarea
          className="forward-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Добавить подпись к карточке (необязательно)…"
          rows={2}
          maxLength={400}
          aria-label="Подпись к карточке"
        />

        <footer>
          <span className="char-count">
            {selected.length > 0 ? `Выбрано: ${selected.length}` : 'Выбери получателей'}
          </span>
          <button
            type="button"
            className="primary-btn"
            onClick={handleSend}
            disabled={selected.length === 0}
          >
            <Send size={16} /> Отправить
          </button>
        </footer>
      </motion.div>
    </motion.div>,
    document.body
  )
}

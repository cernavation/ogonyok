'use client'

import { ChevronRight, Copy, Check, Search, Share2, Users, Flame } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useMemo, useState } from 'react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import {
  type FriendProfile,
  getActiveFriends,
  getFriend,
  presenceMeta,
} from '@/lib/ogonek/friends'
import { buildFriendSlides } from '@/lib/ogonek/stories'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import type { ViewId } from '@/lib/ogonek/types'
import { FriendDetailModal } from './friend-detail-modal'

type Props = {
  onNavigate: (view: ViewId) => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

export function ActiveFriendsWidget({ onNavigate, onNotify, soundEnabled = true }: Props) {
  const { state, toggleFollow, addFriend } = useOgonekStore()
  const [openFriendId, setOpenFriendId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const friendIds = state.friendIds ?? []
  const viewedStoryIds = state.viewedStoryIds ?? []
  const incoming = state.incomingFriendRequests ?? []

  const active = useMemo(() => getActiveFriends(friendIds, 6), [friendIds])
  const onlineCount = active.filter((f) => f.presence === 'online').length

  const storyChip = (friend: FriendProfile) => {
    const index = Math.max(0, friendIds.indexOf(friend.id))
    const slide = buildFriendSlides(friend, index)[0]
    return slide
  }

  const openFriend = (id: string) => {
    playClick(soundEnabled)
    setOpenFriendId(id)
  }

  const handleCopyInvite = () => {
    playClick(soundEnabled)
    const url = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${state.profile.username}` : 'https://ogonek.app'
    navigator.clipboard?.writeText(url)
    setCopied(true)
    playSuccess(soundEnabled)
    onNotify('Ссылка-приглашение скопирована в буфер обмена!')
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <section className="af-widget" aria-labelledby="active-friends-title">
      <header className="af-widget__head">
        <h2 id="active-friends-title">
          <Users size={17} className="text-[var(--accent)]" aria-hidden="true" />
          Друзья
        </h2>
        <span className="af-widget__badge">
          {onlineCount > 0 ? `${onlineCount} в сети` : `${active.length} друзей`}
        </span>
      </header>

      {active.length === 0 ? (
        <div className="p-4 rounded-xl bg-[var(--surface2)] border border-[var(--line)] text-center my-2">
          <div className="w-8 h-8 rounded-full bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center mx-auto mb-2">
            <Flame size={16} />
          </div>
          <p className="text-xs font-semibold text-[var(--text)] mb-1">У тебя пока нет соратников</p>
          <p className="text-[11px] text-[var(--muted)] mb-3 leading-snug">
            Пригласи друзей вести дневник вместе, делиться гордостями и держать огонь.
          </p>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleCopyInvite}
              className="w-full min-h-[36px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] text-xs font-bold hover:opacity-90 transition-all shadow-sm active:scale-95"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Ссылка скопирована!' : 'Скопировать ссылку-приглашение'}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('explore')}
              className="w-full min-h-[36px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[var(--bg-hover)] hover:bg-[var(--line)] text-[var(--text)] text-xs font-medium border border-[var(--line)] transition-all"
            >
              <Search size={14} /> <span>Найти людей по нику</span>
            </button>
          </div>
        </div>
      ) : (
        <ul className="af-list flex flex-col gap-2" role="group">
          {active.map((friend) => {
            const presence = presenceMeta(friend.presence)
            const slide = storyChip(friend)
            const viewed = viewedStoryIds.includes(friend.id)
            return (
              <li key={friend.id}>
                <button
                  type="button"
                  className="af-row"
                  onClick={() => openFriend(friend.id)}
                  aria-label={`Открыть ${friend.name}`}
                >
                  <span className="friend-avatar friend-avatar--sm" aria-hidden="true">
                    <span
                      className="friend-avatar__img"
                      style={{ background: friend.avatarColor, textShadow: '0 1px 2px #000' }}
                    >
                      {friend.initials}
                    </span>
                    <span
                      className="friend-avatar__dot"
                      style={{ background: presence.color, borderColor: '#16181c' }}
                      title={presence.label}
                    />
                  </span>

                  <span className="af-row__text">
                    <span className="af-row__name flex items-center gap-1">
                      {friend.name.split(/\s+/)[0]}
                      {friend.verified && (
                        <span className="friend-verified flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[var(--primary)] text-white" aria-hidden="true">
                          <Check size={9} strokeWidth={3} />
                        </span>
                      )}
                    </span>
                    <span className="af-row__sub" style={{ color: friend.presence === 'online' ? 'var(--success)' : 'var(--text-2)' }}>
                      {presence.short} · 🔥 {friend.streak}
                    </span>
                  </span>

                  <span
                    className={`af-story ${viewed ? 'is-viewed' : ''}`}
                    style={{ background: `linear-gradient(150deg, ${slide.from}, ${slide.to})` }}
                    title={viewed ? 'Сторис просмотрена' : 'Новая сторис'}
                    aria-hidden="true"
                  >
                    <span>{slide.emoji}</span>
                    {!viewed && <span className="af-story__dot" />}
                  </span>

                  <ChevronRight size={16} className="af-row__chev" aria-hidden="true" />
                </button>

                {incoming.includes(friend.id) && (
                  <span className="af-row__incoming">заявка в друзья</span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {active.length > 0 && (
        <div className="af-widget__actions pt-2">
          <button
            type="button"
            className="w-full py-2 px-3 rounded-full text-[13px] font-bold text-[var(--text)] bg-[var(--surface2)] hover:bg-[var(--bg-hover)] border border-[var(--border)] transition-colors min-h-[36px]"
            onClick={() => onNavigate('profile')}
          >
            Все друзья →
          </button>
        </div>
      )}

      <AnimatePresence>
        {openFriendId && (
          <FriendDetailModal
            friendId={openFriendId}
            onClose={() => setOpenFriendId(null)}
            onNotify={onNotify}
            soundEnabled={soundEnabled}
          />
        )}
      </AnimatePresence>
    </section>
  )
}

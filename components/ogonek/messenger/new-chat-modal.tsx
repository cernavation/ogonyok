'use client'

import { motion } from 'framer-motion'
import { Check, MessageCirclePlus, Search, Users, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { FRIEND_PROFILES, presenceMeta } from '@/lib/ogonek/friends'
import { lastActivityMs, unreadCount } from '@/lib/ogonek/messenger'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { ChatAvatar } from './chat-avatar'

type Props = {
  onClose: () => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
}

const GROUP_GRADIENTS = [
  'linear-gradient(135deg, #ff7a18 0%, #af002d 100%)',
  'linear-gradient(135deg, #1d9bf0 0%, #0a4d8c 100%)',
  'linear-gradient(135deg, #00ba7c 0%, #065f46 100%)',
  'linear-gradient(135deg, #7856ff 0%, #3b0764 100%)',
  'linear-gradient(135deg, #f4212e 0%, #881337 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #78350f 100%)',
]

const GROUP_EMOJIS = ['🔥', '👥', '⚡️', '🏃', '🎯', '🚀', '🏆', '❤️', '🌱', '💪']

export function NewChatModal({ onClose, onNotify, soundEnabled = true }: Props) {
  const { state, startChatWithFriend, createGroupChat } = useOgonekStore()
  const [mode, setMode] = useState<'direct' | 'group'>('direct')
  const [query, setQuery] = useState('')

  // Состояние создания группы
  const [groupTitle, setGroupTitle] = useState('')
  const [groupEmoji, setGroupEmoji] = useState('🔥')
  const [groupColor, setGroupColor] = useState(GROUP_GRADIENTS[0])
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])

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

  const openDirect = (friendId: string) => {
    playClick(soundEnabled)
    const ok = startChatWithFriend(friendId)
    if (ok) {
      onNotify('Диалог открыт — напиши первое слово ✍️')
      onClose()
    }
  }

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleCreateGroup = () => {
    const title = groupTitle.trim()
    if (!title) return
    playSuccess(soundEnabled)
    createGroupChat(title, selectedMemberIds, groupColor, groupEmoji)
    onNotify(`Группа «${title}» создана 🎉`)
    onClose()
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
      aria-label="Новый чат или группа"
    >
      <motion.div
        className="modal"
        style={{ maxWidth: 480 }}
        initial={{ y: 24, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 24, scale: 0.98 }}
      >
        <header className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                setMode('direct')
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === 'direct'
                  ? 'bg-[#ff7a18] text-white shadow-sm'
                  : 'text-[#71767b] hover:text-white'
              }`}
            >
              <MessageCirclePlus size={14} className="inline mr-1" />
              Личный чат
            </button>
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                setMode('group')
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === 'group'
                  ? 'bg-[#ff7a18] text-white shadow-sm'
                  : 'text-[#71767b] hover:text-white'
              }`}
            >
              <Users size={14} className="inline mr-1" />
              Создать группу
            </button>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </header>

        {mode === 'direct' ? (
          <>
            <div className="forward-search mt-3">
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
                    onClick={() => openDirect(friend.id)}
                  >
                    <ChatAvatar friendId={friend.id} size={40} ringColor="#0b0c0d" />
                    <span className="forward-row__text">
                      <span className="forward-row__name">
                        {friend.name}
                        {friend.verified && <Check size={11} className="friend-verified text-[#1d9bf0] inline-block" />}
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
          </>
        ) : (
          <div className="mt-3 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#71767b]">
                Название группы
              </label>
              <div className="flex gap-2">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg shadow-inner"
                  style={{ background: groupColor }}
                >
                  {groupEmoji}
                </div>
                <input
                  type="text"
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder="Например: Соратники 700 дней 🔥"
                  className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-[#71767b] outline-none focus:border-[#ff7a18]"
                  maxLength={50}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#71767b]">
                Иконка и цвет группы
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {GROUP_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setGroupEmoji(e)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-all ${
                      groupEmoji === e ? 'bg-white/20 scale-110' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {GROUP_GRADIENTS.map((g, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setGroupColor(g)}
                    className={`h-6 w-6 rounded-full transition-transform ${
                      groupColor === g ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-black' : ''
                    }`}
                    style={{ background: g }}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-medium text-[#71767b]">
                <span>Участники группы</span>
                <span>Выбрано: {selectedMemberIds.length}</span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-white/10 bg-black/20 p-2">
                {list.map((friend) => {
                  const isSelected = selectedMemberIds.includes(friend.id)
                  return (
                    <button
                      key={friend.id}
                      type="button"
                      onClick={() => toggleMember(friend.id)}
                      className={`flex w-full items-center justify-between rounded-lg p-2 transition-colors ${
                        isSelected ? 'bg-[#ff7a18]/15 text-[#ffad5a]' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ChatAvatar friendId={friend.id} size={28} />
                        <span className="text-xs font-medium text-white">{friend.name}</span>
                      </div>
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                          isSelected
                            ? 'border-[#ff7a18] bg-[#ff7a18] text-white'
                            : 'border-white/20'
                        }`}
                      >
                        {isSelected && <Check size={12} />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateGroup}
              disabled={!groupTitle.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-[#ff7a18] to-[#af002d] py-2.5 text-xs font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              Создать группу
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body
  )
}

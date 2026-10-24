'use client'

import React, { useMemo, useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Camera,
  Check,
  MessageCirclePlus,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { createPortal } from 'react-dom'

import { FRIEND_PROFILES, presenceMeta } from '@/lib/ogonek/friends'
import { lastActivityMs, unreadCount } from '@/lib/ogonek/messenger'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { ChatAvatar } from './chat-avatar'

type Props = {
  onClose: () => void
  onOpenThread?: (threadId: string) => void
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

export function NewChatModal({
  onClose,
  onOpenThread,
  onNotify,
  soundEnabled = true,
}: Props) {
  const { state, startChatWithFriend, createGroupChat } = useOgonekStore()
  const [mode, setMode] = useState<'direct' | 'group'>('direct')
  const [groupStep, setGroupStep] = useState<1 | 2>(1)
  const [query, setQuery] = useState('')

  // Состояние создания группы
  const [groupTitle, setGroupTitle] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [groupEmoji, setGroupEmoji] = useState('🔥')
  const [groupColor, setGroupColor] = useState(GROUP_GRADIENTS[0])
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const photoInputRef = useRef<HTMLInputElement>(null)

  const friendIds = state.friendIds ?? []
  const friendSet = useMemo(() => new Set(friendIds), [friendIds])

  // Фильтрация контактов
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

  // Список уже выбранных участников как объектов
  const selectedMembers = useMemo(() => {
    return selectedMemberIds
      .map((id) => FRIEND_PROFILES.find((f) => f.id === id))
      .filter((f): f is (typeof FRIEND_PROFILES)[0] => Boolean(f))
  }, [selectedMemberIds])

  // Открыть личный диалог
  const openDirect = (friendId: string) => {
    playClick(soundEnabled)
    const ok = startChatWithFriend(friendId)
    if (ok) {
      onOpenThread?.(friendId)
      onNotify('Диалог открыт — напиши первое слово ✍️')
      onClose()
    }
  }

  // Переключение выбора участника
  const toggleMember = (id: string) => {
    playClick(soundEnabled)
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  // Загрузка фото группы
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      onNotify('Размер изображения не должен превышать 5 МБ')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomPhotoUrl(reader.result)
        onNotify('Фото группы загружено')
      }
    }
    reader.readAsDataURL(file)
  }

  // Финальное создание группы
  const handleCreateGroup = () => {
    const title = groupTitle.trim()
    if (!title) {
      onNotify('Введи название группы')
      return
    }
    if (selectedMemberIds.length === 0) {
      onNotify('Выбери хотя бы одного участника группы')
      return
    }

    playSuccess(soundEnabled)
    const newGroupId = createGroupChat(
      title,
      selectedMemberIds,
      groupColor,
      customPhotoUrl ? '🖼' : groupEmoji,
      groupDescription.trim()
    )

    onNotify(`Группа «${title}» успешно создана 🎉`)
    onOpenThread?.(newGroupId)
    onClose()
  }

  // Обработка Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mode === 'group' && groupStep === 2) {
          setGroupStep(1)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, groupStep, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Новый чат или группа"
    >
      <div
        className="w-full sm:max-w-[480px] bg-[var(--bg-elev)] border border-[var(--border)] rounded-t-[28px] sm:rounded-[24px] shadow-2xl flex flex-col max-h-[88vh] sm:max-h-[82vh] overflow-hidden text-[var(--text)] transition-all animate-in slide-in-from-bottom sm:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка модалки */}
        <header className="px-4 py-3.5 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--bg)]/50 backdrop-blur-md">
          {mode === 'group' && groupStep === 2 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGroupStep(1)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] -ml-1 transition-colors"
                aria-label="Назад к выбору участников"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="text-[16px] font-[800] text-[var(--text)] leading-tight">О группе</h2>
                <p className="text-[12px] text-[var(--text-2)]">Шаг 2 из 2</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 p-1 bg-[var(--bg)] rounded-full border border-[var(--border)]">
              <button
                type="button"
                onClick={() => {
                  playClick(soundEnabled)
                  setMode('direct')
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  mode === 'direct'
                    ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-sm'
                    : 'text-[var(--text-2)] hover:text-[var(--text)]'
                }`}
              >
                <MessageCirclePlus size={14} className="inline mr-1 -mt-0.5" />
                Личный чат
              </button>
              <button
                type="button"
                onClick={() => {
                  playClick(soundEnabled)
                  setMode('group')
                  setGroupStep(1)
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  mode === 'group'
                    ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-sm'
                    : 'text-[var(--text-2)] hover:text-[var(--text)]'
                }`}
              >
                <Users size={14} className="inline mr-1 -mt-0.5" />
                Создать группу
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </header>

        {/* Содержимое: Личный чат */}
        {mode === 'direct' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Поисковая строка */}
            <div className="p-3 border-b border-[var(--border)] shrink-0">
              <div className="relative flex items-center h-10 w-full rounded-full border border-[var(--border)] bg-[var(--bg)] px-3.5 focus-within:border-[var(--accent)] transition-colors">
                <Search size={16} className="text-[var(--text-2)] shrink-0 mr-2" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск по имени, @нику или городу..."
                  className="w-full bg-transparent text-xs text-[var(--text)] placeholder:text-[var(--text-2)] outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Список контактов */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]/60" role="listbox">
              {list.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-2)] text-xs">
                  Никого не найдено по запросу «{query}»
                </div>
              ) : (
                list.map((friend) => {
                  const presence = presenceMeta(friend.presence)
                  const unread = unreadCount(state.chatThreads?.[friend.id])
                  return (
                    <button
                      key={friend.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--bg-hover)] transition-colors text-left"
                      onClick={() => openDirect(friend.id)}
                    >
                      <ChatAvatar friendId={friend.id} size={44} ringColor="var(--bg-elev)" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-[var(--text)] truncate">
                            {friend.name}
                          </span>
                          {friend.verified && (
                            <span className="w-3.5 h-3.5 rounded-full bg-[var(--accent)] text-white inline-flex items-center justify-center shrink-0">
                              <Check size={9} strokeWidth={3} />
                            </span>
                          )}
                          {friendSet.has(friend.id) && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[var(--accent-soft)] text-[var(--accent)]">
                              друг
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-2)] truncate mt-0.5">
                          {presence.short} · @{friend.username}
                        </p>
                      </div>
                      {unread > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-xs font-bold">
                          {unread}
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* Содержимое: Создание группы (2 шага) */}
        {mode === 'group' && groupStep === 1 && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Поиск и чипы выбранных участников */}
            <div className="p-3 border-b border-[var(--border)] shrink-0 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--text)]">Выбери участников группы</span>
                <span className="text-[var(--text-2)]">Выбрано: {selectedMemberIds.length}</span>
              </div>

              {/* Чипы выбранных */}
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-[var(--bg)]/60 rounded-xl border border-[var(--border)]">
                  {selectedMembers.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-bold"
                    >
                      <span className="truncate max-w-[120px]">{m.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleMember(m.id)}
                        className="hover:opacity-75 transition-opacity"
                        aria-label={`Удалить ${m.name}`}
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Поле поиска */}
              <div className="relative flex items-center h-10 w-full rounded-full border border-[var(--border)] bg-[var(--bg)] px-3.5 focus-within:border-[var(--accent)] transition-colors">
                <Search size={16} className="text-[var(--text-2)] shrink-0 mr-2" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск по имени или @нику..."
                  className="w-full bg-transparent text-xs text-[var(--text)] placeholder:text-[var(--text-2)] outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Список контактов с чекбоксами */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]/60">
              {list.map((friend) => {
                const isSelected = selectedMemberIds.includes(friend.id)
                return (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => toggleMember(friend.id)}
                    className={`w-full px-4 py-3 flex items-center justify-between gap-3 transition-colors text-left ${
                      isSelected ? 'bg-[var(--accent-soft)]/40' : 'hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ChatAvatar friendId={friend.id} size={42} ringColor="var(--bg-elev)" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--text)] truncate">{friend.name}</p>
                        <p className="text-xs text-[var(--text-2)] truncate">@{friend.username}</p>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)] scale-105'
                          : 'border-[var(--border)] bg-[var(--bg)]'
                      }`}
                    >
                      {isSelected && <Check size={13} strokeWidth={3} />}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Нижняя кнопка перехода к шагу 2 */}
            <div className="p-3 border-t border-[var(--border)] shrink-0 bg-[var(--bg)]/50">
              <button
                type="button"
                onClick={() => {
                  playClick(soundEnabled)
                  setGroupStep(2)
                }}
                disabled={selectedMemberIds.length === 0}
                className="w-full h-11 rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-sm font-bold shadow-md hover:opacity-90 disabled:opacity-40 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <span>Далее ({selectedMemberIds.length})</span>
                <ArrowLeft size={16} className="rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* Содержимое: Создание группы (Шаг 2 — детали группы) */}
        {mode === 'group' && groupStep === 2 && (
          <div className="p-4 flex flex-col flex-1 min-h-0 overflow-y-auto space-y-4">
            {/* Аватар группы: предпросмотр и загрузка */}
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-[var(--bg)] border border-[var(--border)]">
              <div className="relative shrink-0">
                {customPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={customPhotoUrl}
                    alt="Аватар группы"
                    className="w-16 h-16 rounded-full object-cover shadow-md border-2 border-[var(--accent)]"
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-md transition-transform"
                    style={{ background: groupColor }}
                  >
                    {groupEmoji}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all"
                  title="Загрузить фото"
                >
                  <Camera size={13} />
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              <div className="flex-1 min-w-0">
                <label className="block text-xs font-bold text-[var(--text)] mb-1">
                  Название группы *
                </label>
                <input
                  type="text"
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder="Например: Соратники 700 дней 🔥"
                  className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-2)] focus:border-[var(--accent)] outline-none"
                  maxLength={50}
                  autoFocus
                />
              </div>
            </div>

            {/* Выбор эмодзи и градиента (если не загружено фото) */}
            {!customPhotoUrl && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-2)] mb-2">
                    Эмодзи группы
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {GROUP_EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setGroupEmoji(e)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-transform ${
                          groupEmoji === e
                            ? 'bg-[var(--accent-soft)] border border-[var(--accent)] scale-110'
                            : 'bg-[var(--bg)] border border-[var(--border)] hover:bg-[var(--bg-hover)]'
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-2)] mb-2">
                    Цвет подложки
                  </label>
                  <div className="flex items-center gap-2.5">
                    {GROUP_GRADIENTS.map((g, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setGroupColor(g)}
                        className={`w-7 h-7 rounded-full transition-transform ${
                          groupColor === g
                            ? 'scale-125 ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-elev)]'
                            : 'hover:scale-105'
                        }`}
                        style={{ background: g }}
                        aria-label={`Цвет градиента ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Описание группы */}
            <div>
              <label className="block text-xs font-bold text-[var(--text)] mb-1">
                Описание группы (необязательно)
              </label>
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="О чём эта группа, цели марафона или правила общения..."
                rows={3}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-xs text-[var(--text)] placeholder:text-[var(--text-2)] focus:border-[var(--accent)] outline-none resize-none"
                maxLength={200}
              />
            </div>

            {/* Сводка участников */}
            <div className="p-3 rounded-2xl bg-[var(--bg)] border border-[var(--border)]">
              <p className="text-xs text-[var(--text-2)]">
                В группе будет <strong className="text-[var(--text)]">{selectedMemberIds.length + 1}</strong> участников (включая тебя).
              </p>
            </div>

            {/* Финальная кнопка «Создать группу» */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCreateGroup}
                disabled={!groupTitle.trim()}
                className="w-full h-12 rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-sm font-[800] shadow-md hover:opacity-90 disabled:opacity-40 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                <span>Создать группу</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

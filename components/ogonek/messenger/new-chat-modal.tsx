'use client'

import React, { useMemo, useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Camera,
  Check,
  Loader2,
  MessageCirclePlus,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { createPortal } from 'react-dom'

import { searchProfiles, getRecentProfiles, type ProfileRecord } from '@/lib/supabase/api'
import { getInitials } from '@/lib/ogonek/initials'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'

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

/** Simple initials-based avatar for Supabase users */
function ProfileAvatar({ profile, size = 44 }: { profile: ProfileRecord; size?: number }) {
  const initials = getInitials(profile.display_name, profile.username)
  const colors = ['#ff7a18', '#1d9bf0', '#00ba7c', '#7856ff', '#f4212e', '#f59e0b']
  const color = colors[profile.username.charCodeAt(0) % colors.length]
  const avatar = profile.avatar_url || profile.avatar_image
  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt={profile.display_name || profile.username}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 text-white font-bold"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  )
}

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

  // Supabase profiles state
  const [profiles, setProfiles] = useState<ProfileRecord[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)

  // Состояние создания группы
  const [groupTitle, setGroupTitle] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [groupEmoji, setGroupEmoji] = useState('🔥')
  const [groupColor, setGroupColor] = useState(GROUP_GRADIENTS[0])
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const photoInputRef = useRef<HTMLInputElement>(null)

  const currentUserId = state.auth?.activeAccountId ?? undefined

  // Debounced Supabase search
  useEffect(() => {
    setLoadingProfiles(true)
    const timer = setTimeout(async () => {
      try {
        let results: ProfileRecord[]
        if (query.trim()) {
          results = await searchProfiles(query.trim(), currentUserId)
        } else {
          results = await getRecentProfiles(24, currentUserId)
        }
        setProfiles(results)
      } catch {
        setProfiles([])
      } finally {
        setLoadingProfiles(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [query, currentUserId])

  // Список уже выбранных участников как объектов
  const selectedMembers = useMemo(() => {
    return selectedMemberIds
      .map((id) => profiles.find((p) => p.id === id))
      .filter((p): p is ProfileRecord => Boolean(p))
  }, [selectedMemberIds, profiles])

  // Открыть личный диалог
  const openDirect = (profile: ProfileRecord) => {
    playClick(soundEnabled)
    const displayName = profile.display_name || `@${profile.username}`
    const avatarUrl = profile.avatar_url || profile.avatar_image || undefined
    startChatWithFriend(profile.id, {
      name: displayName,
      username: profile.username,
      avatarUrl,
    })
    onClose()
    onOpenThread?.(profile.id)
    onNotify('Диалог открыт — напиши первое слово ✍️')
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Новый чат или группа"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="w-full sm:max-w-[480px] bg-[var(--bg-elev)] border border-[var(--border)] rounded-t-[28px] sm:rounded-[24px] shadow-2xl flex flex-col max-h-[88vh] sm:max-h-[82vh] overflow-hidden text-[var(--text)]"
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
                {loadingProfiles && (
                  <Loader2 size={14} className="animate-spin text-[var(--text-3)] shrink-0 ml-2" />
                )}
              </div>
            </div>

            {/* Список пользователей */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]/60" role="listbox">
              {!loadingProfiles && profiles.length === 0 && query.trim() ? (
                <div className="p-8 text-center text-[var(--text-2)] text-xs">
                  Никого не найдено по запросу «{query}»
                </div>
              ) : !loadingProfiles && profiles.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-2)] text-xs">
                  Нет пользователей в базе
                </div>
              ) : (
                profiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--bg-hover)] transition-colors text-left"
                    onClick={() => openDirect(profile)}
                  >
                    <ProfileAvatar profile={profile} size={44} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[var(--text)] truncate">
                          {profile.display_name || profile.username}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-2)] truncate mt-0.5">
                        @{profile.username}{profile.city ? ` · ${profile.city}` : ''}
                      </p>
                    </div>
                  </button>
                ))
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
                      <span className="truncate max-w-[120px]">{m.display_name || m.username}</span>
                      <button
                        type="button"
                        onClick={() => toggleMember(m.id)}
                        className="hover:opacity-75 transition-opacity"
                        aria-label={`Удалить ${m.display_name || m.username}`}
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
                {loadingProfiles && (
                  <Loader2 size={14} className="animate-spin text-[var(--text-3)] shrink-0 ml-2" />
                )}
              </div>
            </div>

            {/* Список контактов с чекбоксами */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]/60">
              {profiles.map((profile) => {
                const isSelected = selectedMemberIds.includes(profile.id)
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => toggleMember(profile.id)}
                    className={`w-full px-4 py-3 flex items-center justify-between gap-3 transition-colors text-left ${
                      isSelected ? 'bg-[var(--accent-soft)]/40' : 'hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ProfileAvatar profile={profile} size={42} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--text)] truncate">{profile.display_name || profile.username}</p>
                        <p className="text-xs text-[var(--text-2)] truncate">@{profile.username}</p>
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
      </motion.div>
    </div>,
    document.body
  )
}

'use client'

import React, { useMemo, useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Camera,
  Check,
  Loader2,
  MessageCirclePlus,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react'
import { createPortal } from 'react-dom'

import {
  getMutualFriendProfiles,
  getRecentProfiles,
  searchProfiles,
  type ProfileRecord,
} from '@/lib/supabase/api'
import { canInviteUserToGroup, canMessageUser } from '@/lib/ogonek/privacy'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { uploadChatMedia } from '@/lib/ogonek/chat-media-service'
import { UserAvatar, VerifiedBadge } from '../ui'

type Props = {
  onClose: () => void
  onOpenThread?: (threadId: string) => void
  onNotify: (message: string) => void
  soundEnabled?: boolean
  initialMode?: 'direct' | 'group'
}

// Сдержанная премиальная палитра Winlog без кричащих радужных градиентов
const GROUP_PALETTE = [
  { id: 'graphite', bg: '#16181c', label: 'Графит' },
  { id: 'obsidian', bg: '#1c1917', label: 'Обсидиан' },
  { id: 'slate', bg: '#172554', label: 'Полночь' },
  { id: 'moss', bg: '#143326', label: 'Хвоя' },
  { id: 'ember', bg: '#3b180e', label: 'Терракота' },
  { id: 'plum', bg: '#261932', label: 'Слива' },
]

const GROUP_ICONS = ['👥', '🔥', '🏃', '🎯', '⚡️', '🌿', '💬', '✦']

/** Unified avatar wrapper for NewChatModal using Supabase profile fields */
function ProfileAvatar({ profile, size = 44 }: { profile: ProfileRecord; size?: number }) {
  return (
    <UserAvatar
      avatarUrl={profile.avatar_image || profile.avatar_url}
      avatarColor={profile.avatar_color}
      displayName={profile.display_name}
      username={profile.username}
      size={size}
      bordered={false}
    />
  )
}

export function NewChatModal({
  onClose,
  onOpenThread,
  onNotify,
  soundEnabled = true,
  initialMode = 'direct',
}: Props) {
  const { state, startChatWithFriend, createGroupChat } = useOgonekStore()
  const [mode, setMode] = useState<'direct' | 'group'>(initialMode)
  const [groupStep, setGroupStep] = useState<1 | 2>(1)
  const [query, setQuery] = useState('')

  // Supabase profiles state (для личных чатов) и список строго взаимных друзей (для групп)
  const [profiles, setProfiles] = useState<ProfileRecord[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [mutualFriends, setMutualFriends] = useState<ProfileRecord[]>([])
  const [loadingMutualFriends, setLoadingMutualFriends] = useState(false)

  // Состояние создания группы
  const [groupTitle, setGroupTitle] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [groupEmoji, setGroupEmoji] = useState('👥')
  const [groupColor, setGroupColor] = useState(GROUP_PALETTE[0].bg)
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const photoInputRef = useRef<HTMLInputElement>(null)

  const currentUserId = state.auth?.activeAccountId ?? undefined
  const friendIdsSet = useMemo(() => new Set(state.friendIds ?? []), [state.friendIds])

  // Debounced Supabase search для личных чатов
  useEffect(() => {
    if (mode !== 'direct') return
    setLoadingProfiles(true)
    const timer = setTimeout(async () => {
      try {
        const cleanQuery = query.trim()
        const results = cleanQuery
          ? await searchProfiles(cleanQuery, currentUserId)
          : await getRecentProfiles(24, currentUserId)
        setProfiles(results.filter((p) => p.id !== currentUserId))
      } catch {
        setProfiles([])
      } finally {
        setLoadingProfiles(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query, currentUserId, mode])

  // Загрузка строго взаимных друзей для вкладки «Создать группу»
  useEffect(() => {
    if (mode !== 'group' || !currentUserId) return
    let active = true
    setLoadingMutualFriends(true)
    getMutualFriendProfiles(currentUserId)
      .then((list) => {
        if (!active) return
        setMutualFriends(
          list.filter((p) =>
            canInviteUserToGroup({ viewerId: currentUserId, targetProfile: p, isMutualFriend: true }).allowed
          )
        )
      })
      .catch(() => {
        if (active) setMutualFriends([])
      })
      .finally(() => {
        if (active) setLoadingMutualFriends(false)
      })
    return () => {
      active = false
    }
  }, [mode, currentUserId])

  const filteredGroupFriends = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, '')
    if (!q) return mutualFriends
    return mutualFriends.filter(
      (p) =>
        p.username.toLowerCase().includes(q) ||
        (p.display_name || '').toLowerCase().includes(q)
    )
  }, [mutualFriends, query])

  const selectedMembers = useMemo(
    () => mutualFriends.filter((p) => selectedMemberIds.includes(p.id)),
    [mutualFriends, selectedMemberIds]
  )

  // Открыть личный диалог (с проверкой приватности кто может писать мне)
  const openDirect = (profile: ProfileRecord) => {
    const isMutual = friendIdsSet.has(profile.id)
    const perm = canMessageUser({
      viewerId: currentUserId,
      targetProfile: profile,
      isMutualFriend: isMutual,
    })
    if (!perm.allowed) {
      onNotify(perm.reason || 'Пользователь ограничил получение личных сообщений')
      return
    }
    playClick(soundEnabled)
    const displayName = profile.display_name || `@${profile.username}`
    const avatarUrl = profile.avatar_url || profile.avatar_image || undefined
    startChatWithFriend(profile.id, {
      name: displayName,
      username: profile.username,
      avatarUrl,
      avatarColor: profile.avatar_color || undefined,
      verified: Boolean(profile.verified),
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

  // Загрузка фото группы (в бакет chat-media)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      onNotify('Размер изображения не должен превышать 5 МБ')
      return
    }
    setIsUploadingPhoto(true)
    try {
      const res = await uploadChatMedia(file, {
        userId: currentUserId || 'me',
        threadId: 'group-create',
        fileName: file.name,
        mediaType: 'image',
      })
      if (res.ok && res.url) {
        setCustomPhotoUrl(res.url)
        onNotify('Фото группы загружено')
      } else {
        onNotify(res.error || 'Ошибка загрузки фото группы')
      }
    } catch {
      onNotify('Не удалось загрузить фото')
    } finally {
      setIsUploadingPhoto(false)
      e.target.value = ''
    }
  }

  // Финальное создание группы с реальной записью в Supabase
  const handleCreateGroup = async () => {
    if (isCreatingGroup) return
    const title = groupTitle.trim()
    if (!title) {
      onNotify('Введи название группы')
      return
    }
    if (selectedMemberIds.length === 0) {
      onNotify('Выбери хотя бы одного участника группы')
      return
    }

    setIsCreatingGroup(true)
    try {
      const newGroupId = await createGroupChat(
        title,
        selectedMemberIds,
        groupColor,
        groupEmoji,
        groupDescription.trim(),
        customPhotoUrl
      )
      playSuccess(soundEnabled)
      onNotify(`Группа «${title}» создана`)
      onOpenThread?.(newGroupId)
      onClose()
    } catch (err: any) {
      onNotify(err?.message || 'Не удалось создать группу в базе данных')
    } finally {
      setIsCreatingGroup(false)
    }
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-[4px] animate-in fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isCreatingGroup) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Новый чат или группа"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.14 }}
        className="w-full sm:max-w-[480px] bg-[#060608] border border-white/[0.14] rounded-t-[24px] sm:rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.95)] flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка модалки */}
        <header className="px-4 py-3.5 border-b border-white/[0.1] flex items-center justify-between shrink-0 bg-[#060608]">
          {mode === 'group' && groupStep === 2 ? (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setGroupStep(1)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#71767b] hover:text-white hover:bg-white/[0.06] -ml-1 transition-colors cursor-pointer"
                aria-label="Назад к выбору участников"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="text-[16px] font-bold text-white leading-tight">О группе</h2>
                <p className="text-[11.5px] text-[#71767b]">Шаг 2 из 2</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1 p-1 bg-black rounded-full border border-white/[0.12]">
              <button
                type="button"
                onClick={() => {
                  playClick(soundEnabled)
                  setMode('direct')
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  mode === 'direct'
                    ? 'bg-[#d76737] text-black shadow-sm'
                    : 'text-[#71767b] hover:text-white'
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
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  mode === 'group'
                    ? 'bg-[#d76737] text-black shadow-sm'
                    : 'text-[#71767b] hover:text-white'
                }`}
              >
                <Users size={14} className="inline mr-1 -mt-0.5" />
                Создать группу
              </button>
            </div>
          )}

          <button
            type="button"
            disabled={isCreatingGroup}
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#71767b] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </header>

        {/* Содержимое: Личный чат */}
        {mode === 'direct' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Поисковая строка */}
            <div className="p-3 border-b border-white/[0.1] shrink-0">
              <div className="relative flex items-center h-10 w-full rounded-xl border border-white/[0.12] bg-black px-3.5 focus-within:border-[#d76737] transition-colors">
                <Search size={15} className="text-[#71767b] shrink-0 mr-2" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск по имени, @нику или городу..."
                  className="w-full bg-transparent text-xs text-white placeholder:text-[#71767b] outline-none"
                  autoFocus
                />
                {loadingProfiles && (
                  <Loader2 size={14} className="animate-spin text-[#71767b] shrink-0 ml-2" />
                )}
              </div>
            </div>

            {/* Список пользователей */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06]" role="listbox">
              {!loadingProfiles && profiles.length === 0 && query.trim() ? (
                <div className="p-8 text-center text-[#71767b] text-xs">
                  Никого не найдено по запросу «{query}»
                </div>
              ) : !loadingProfiles && profiles.length === 0 ? (
                <div className="p-8 text-center text-[#71767b] text-xs">
                  Нет пользователей в базе
                </div>
              ) : (
                profiles.map((profile) => {
                  const dmPerm = canMessageUser({
                    viewerId: currentUserId,
                    targetProfile: profile,
                    isMutualFriend: friendIdsSet.has(profile.id),
                  })
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      aria-disabled={!dmPerm.allowed}
                      title={!dmPerm.allowed ? dmPerm.reason : undefined}
                      className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left ${
                        dmPerm.allowed ? 'hover:bg-white/[0.04] cursor-pointer' : 'opacity-50 cursor-not-allowed'
                      }`}
                      onClick={() => openDirect(profile)}
                    >
                      <ProfileAvatar profile={profile} size={42} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-white truncate">
                            {profile.display_name || profile.username}
                          </span>
                          {profile.verified && <VerifiedBadge size="xs" />}
                          {!dmPerm.allowed && (
                            <span className="text-[10px] font-semibold text-[#71767b] px-1.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.1] shrink-0">
                              ЛС закрыты
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#71767b] truncate mt-0.5">
                          @{profile.username}{profile.city ? ` · ${profile.city}` : ''}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* Содержимое: Создание группы — Шаг 1 (строго взаимные друзья) */}
        {mode === 'group' && groupStep === 1 && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="p-3.5 border-b border-white/[0.1] shrink-0 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-[13.5px] font-bold text-white leading-snug">
                    Выбери участников группы
                  </h3>
                  <p className="text-[11.5px] text-[#71767b] mt-0.5">
                    В группу можно добавить только взаимных друзей
                  </p>
                </div>
                <span className="text-[11.5px] font-semibold text-[#71767b] shrink-0">
                  Выбрано: <span className="text-white">{selectedMemberIds.length}</span>
                </span>
              </div>

              {/* Чипы выбранных друзей */}
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-black rounded-xl border border-white/[0.1]">
                  {selectedMembers.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#d76737]/15 border border-[#d76737]/40 text-white text-xs font-semibold"
                    >
                      <span className="truncate max-w-[120px]">{m.display_name || `@${m.username}`}</span>
                      <button
                        type="button"
                        onClick={() => toggleMember(m.id)}
                        className="text-white/70 hover:text-white transition-colors cursor-pointer"
                        aria-label={`Удалить ${m.display_name || m.username}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Поиск среди взаимных друзей */}
              <div className="relative flex items-center h-10 w-full rounded-xl border border-white/[0.12] bg-black px-3.5 focus-within:border-[#d76737] transition-colors">
                <Search size={15} className="text-[#71767b] shrink-0 mr-2" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск среди друзей..."
                  className="w-full bg-transparent text-xs text-white placeholder:text-[#71767b] outline-none"
                  autoFocus
                />
                {loadingMutualFriends && (
                  <Loader2 size={14} className="animate-spin text-[#71767b] shrink-0 ml-2" />
                )}
              </div>
            </div>

            {/* Список взаимных друзей */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06]">
              {!loadingMutualFriends && mutualFriends.length === 0 ? (
                <div className="p-8 text-center text-[#71767b] text-xs leading-relaxed">
                  Чтобы создать группу, сначала добавь друзей (взаимная подписка)
                </div>
              ) : !loadingMutualFriends && filteredGroupFriends.length === 0 ? (
                <div className="p-8 text-center text-[#71767b] text-xs">
                  Никого из друзей не найдено по запросу «{query}»
                </div>
              ) : (
                filteredGroupFriends.map((profile) => {
                  const isSelected = selectedMemberIds.includes(profile.id)
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => toggleMember(profile.id)}
                      className={`w-full px-4 py-3 flex items-center justify-between gap-3 transition-colors text-left cursor-pointer ${
                        isSelected ? 'bg-[#d76737]/10' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ProfileAvatar profile={profile} size={40} />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {profile.display_name || profile.username}
                          </p>
                          <p className="text-xs text-[#71767b] truncate">@{profile.username}</p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? 'border-[#d76737] bg-[#d76737] text-black'
                            : 'border-white/25 bg-black'
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Кнопка «Далее» */}
            <div className="p-3.5 border-t border-white/[0.1] shrink-0 bg-[#060608]">
              <button
                type="button"
                onClick={() => {
                  playClick(soundEnabled)
                  setGroupStep(2)
                }}
                disabled={selectedMemberIds.length === 0}
                className="w-full h-11 rounded-full bg-[#d76737] hover:bg-[#e0784b] text-black text-sm font-bold disabled:opacity-40 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Далее ({selectedMemberIds.length})</span>
                <ArrowLeft size={16} className="rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* Содержимое: Создание группы — Шаг 2 («О группе» в чистом pure black Winlog) */}
        {mode === 'group' && groupStep === 2 && (
          <div className="p-4 sm:p-5 flex flex-col flex-1 min-h-0 overflow-y-auto space-y-4">
            {/* 1. Центрированный аккуратный аватар группы + загрузка или выбор иконки */}
            <div className="flex flex-col items-center gap-3 pt-1">
              <div className="relative">
                {customPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={customPhotoUrl}
                    alt="Аватар группы"
                    className="w-20 h-20 rounded-full object-cover border border-white/[0.18]"
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-3xl border border-white/[0.14] text-white transition-colors"
                    style={{ background: groupColor }}
                  >
                    {groupEmoji}
                  </div>
                )}

                <button
                  type="button"
                  disabled={isUploadingPhoto}
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-[#d76737] hover:bg-[#e0784b] text-black border-2 border-[#060608] flex items-center justify-center transition-transform hover:scale-105 cursor-pointer disabled:opacity-60"
                  title="Загрузить фото группы"
                  aria-label="Загрузить фото группы"
                >
                  {isUploadingPhoto ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Camera size={13} />
                  )}
                </button>

                {customPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => setCustomPhotoUrl(null)}
                    className="absolute -top-0.5 -right-0.5 w-6 h-6 rounded-full bg-black border border-white/[0.2] text-white/80 hover:text-white flex items-center justify-center cursor-pointer"
                    title="Удалить фото"
                    aria-label="Удалить загруженное фото"
                  >
                    <X size={11} />
                  </button>
                )}

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              {!customPhotoUrl && (
                <div className="w-full space-y-2.5 pt-1">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    {GROUP_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setGroupEmoji(icon)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[15px] border transition-colors cursor-pointer ${
                          groupEmoji === icon
                            ? 'border-[#d76737] bg-[#d76737]/15 text-white'
                            : 'border-white/[0.1] bg-black text-white/80 hover:bg-white/[0.06]'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    {GROUP_PALETTE.map((swatch) => (
                      <button
                        key={swatch.id}
                        type="button"
                        onClick={() => setGroupColor(swatch.bg)}
                        className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                          groupColor === swatch.bg
                            ? 'scale-115 border-[#d76737] ring-2 ring-[#d76737]/40'
                            : 'border-white/[0.2] hover:scale-105'
                        }`}
                        style={{ background: swatch.bg }}
                        title={swatch.label}
                        aria-label={`Фон: ${swatch.label}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Чистые поля «Название группы» и «Описание» */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-white/85 mb-1.5">
                  Название группы *
                </label>
                <input
                  type="text"
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder="Например: Бегуны!"
                  className="w-full h-11 rounded-xl border border-white/[0.12] bg-black px-3.5 text-sm text-white placeholder:text-[#71767b] focus:border-[#d76737] outline-none transition-colors"
                  maxLength={50}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/85 mb-1.5">
                  Описание
                </label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="О чём эта группа или общая цель (необязательно)"
                  rows={2}
                  className="w-full rounded-xl border border-white/[0.12] bg-black p-3 text-xs text-white placeholder:text-[#71767b] focus:border-[#d76737] outline-none resize-none transition-colors"
                  maxLength={200}
                />
              </div>
            </div>

            {/* 3. Интерактивный список выбранных участников */}
            <div className="rounded-xl border border-white/[0.12] bg-black p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-white">
                  Участники ({selectedMembers.length + 1})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    setGroupStep(1)
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/[0.14] bg-white/[0.04] hover:bg-white/[0.08] text-[11.5px] font-semibold text-white transition-colors cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Добавить</span>
                </button>
              </div>

              {selectedMembers.length === 0 ? (
                <p className="text-xs text-[#71767b]">
                  Выбери хотя бы одного взаимного друга через «+ Добавить»
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {selectedMembers.map((m) => (
                    <div
                      key={m.id}
                      className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-white/[0.05] border border-white/[0.12] text-xs text-white"
                    >
                      <ProfileAvatar profile={m} size={22} />
                      <span className="truncate max-w-[130px] font-medium">
                        {m.display_name || `@${m.username}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleMember(m.id)}
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[#71767b] hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
                        aria-label={`Убрать ${m.display_name || m.username}`}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Финальная кнопка «Создать группу» в #d76737 с чёрным текстом */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => void handleCreateGroup()}
                disabled={!groupTitle.trim() || selectedMemberIds.length === 0 || isCreatingGroup}
                className="w-full h-11 rounded-full bg-[#d76737] hover:bg-[#e0784b] active:bg-[#bd562b] text-black text-sm font-bold disabled:opacity-40 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isCreatingGroup ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Создание группы…</span>
                  </>
                ) : (
                  <span>Создать группу</span>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>,
    document.body
  )
}

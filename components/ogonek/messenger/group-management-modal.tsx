'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import {
  Camera,
  Check,
  Crown,
  Loader2,
  LogOut,
  MoreVertical,
  Plus,
  Shield,
  ShieldAlert,
  Trash2,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { formatLastSeenStatus, getFriend } from '@/lib/ogonek/friends'
import { uploadChatMedia } from '@/lib/ogonek/chat-media-service'
import { canInviteUserToGroup } from '@/lib/ogonek/privacy'
import {
  getCachedProfileSync,
  getMutualFriendProfiles,
  getProfilesByIds,
  type ProfileRecord,
} from '@/lib/supabase/api'
import { getEffectiveLastSeenSync, usePresenceSnapshot } from '@/lib/supabase/presence'
import type { ChatGroupMeta } from '@/lib/ogonek/types'
import { UserAvatar, VerifiedBadge } from '../ui'
import { GroupAvatar } from './chat-avatar'

const GROUP_PALETTE = [
  '#16181c',
  '#1c1917',
  '#172554',
  '#143326',
  '#3b180e',
  '#261932',
]

const GROUP_ICONS = ['👥', '🔥', '🏃', '🎯', '⚡️', '🌿', '💬', '✦']

type Props = {
  groupId: string
  groupMeta: ChatGroupMeta
  onUpdateGroup: (patch: Partial<ChatGroupMeta>) => void | Promise<boolean | void>
  onAddMembers: (memberIds: string[]) => void | Promise<boolean | void>
  onRemoveMember: (memberId: string) => void | Promise<boolean | void>
  onSetMemberRole: (memberId: string, role: 'admin' | 'member') => void | Promise<void>
  onLeaveGroup: () => void | Promise<boolean | void>
  onDeleteGroup?: () => void | Promise<boolean | void>
  onOpenProfile?: (userId: string) => void
  onClose: () => void
  soundEnabled?: boolean
  onNotify: (message: string) => void
}

export function GroupManagementModal({
  groupId,
  groupMeta,
  onUpdateGroup,
  onAddMembers,
  onRemoveMember,
  onSetMemberRole,
  onLeaveGroup,
  onDeleteGroup,
  onOpenProfile,
  onClose,
  soundEnabled = true,
  onNotify,
}: Props) {
  const { state, currentUser } = useOgonekStore()
  const presenceSnap = usePresenceSnapshot()

  const [title, setTitle] = useState(groupMeta.title)
  const [description, setDescription] = useState(groupMeta.description || '')
  const [avatarEmoji, setAvatarEmoji] = useState(groupMeta.avatarEmoji || '👥')
  const [avatarColor, setAvatarColor] = useState(groupMeta.avatarColor || GROUP_PALETTE[0])
  const [avatarImage, setAvatarImage] = useState<string | null>(groupMeta.avatarImage ?? null)
  const [adminsOnly, setAdminsOnly] = useState(Boolean(groupMeta.adminsOnly))

  const [isSaving, setIsSaving] = useState(false)
  const [isAddingMembers, setIsAddingMembers] = useState(false)
  const [selectedFriendsToAdd, setSelectedFriendsToAdd] = useState<string[]>([])
  const [memberMenuId, setMemberMenuId] = useState<string | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'leave' | 'delete' | null>(null)
  const [isActionBusy, setIsActionBusy] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const myUserId = state.auth?.activeAccountId || currentUser?.id || 'me'

  const [mutualFriendProfiles, setMutualFriendProfiles] = useState<ProfileRecord[]>([])
  const [memberProfilesMap, setMemberProfilesMap] = useState<Record<string, ProfileRecord>>({})

  useEffect(() => {
    setTitle(groupMeta.title)
    setDescription(groupMeta.description || '')
    setAvatarEmoji(groupMeta.avatarEmoji || '👥')
    setAvatarColor(groupMeta.avatarColor || GROUP_PALETTE[0])
    setAvatarImage(groupMeta.avatarImage ?? null)
    setAdminsOnly(Boolean(groupMeta.adminsOnly))
  }, [groupMeta])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmAction) {
          setConfirmAction(null)
        } else if (memberMenuId) {
          setMemberMenuId(null)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmAction, memberMenuId, onClose])

  useEffect(() => {
    let cancelled = false
    if (myUserId && myUserId !== 'me' && !myUserId.startsWith('anon-')) {
      getMutualFriendProfiles(myUserId)
        .then((list) => {
          if (!cancelled) setMutualFriendProfiles(list)
        })
        .catch(() => {})
    }
    const memberIds = groupMeta.memberIds.filter((id) => id !== 'me' && id !== myUserId)
    if (memberIds.length > 0) {
      getProfilesByIds(memberIds)
        .then((map) => {
          if (!cancelled) setMemberProfilesMap(map)
        })
        .catch(() => {})
    }
    return () => {
      cancelled = true
    }
  }, [myUserId, groupMeta.memberIds])

  const isCreator =
    groupMeta.createdBy === myUserId ||
    groupMeta.createdBy === 'me' ||
    groupMeta.role === 'owner'
  const adminIds = groupMeta.adminIds || (isCreator ? [myUserId] : [])
  const isMeAdmin = isCreator || adminIds.includes(myUserId) || groupMeta.role === 'admin'

  // Строго взаимные друзья, не состоящие в группе и разрешившие добавление в группы
  const availableFriends = useMemo(() => {
    return mutualFriendProfiles
      .filter((p) => !groupMeta.memberIds.includes(p.id))
      .filter((p) => canInviteUserToGroup({ viewerId: myUserId, targetProfile: p, isMutualFriend: true }).allowed)
  }, [mutualFriendProfiles, groupMeta.memberIds, myUserId])

  const hasUnsavedChanges = useMemo(() => {
    return (
      title.trim() !== (groupMeta.title || '').trim() ||
      description.trim() !== (groupMeta.description || '').trim() ||
      avatarEmoji !== (groupMeta.avatarEmoji || '👥') ||
      avatarColor !== (groupMeta.avatarColor || GROUP_PALETTE[0]) ||
      (avatarImage ?? null) !== (groupMeta.avatarImage ?? null) ||
      adminsOnly !== Boolean(groupMeta.adminsOnly)
    )
  }, [title, description, avatarEmoji, avatarColor, avatarImage, adminsOnly, groupMeta])

  const handleSaveChanges = async () => {
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      onNotify('Название группы не может быть пустым')
      return
    }
    setIsSaving(true)
    try {
      const ok = await onUpdateGroup({
        title: cleanTitle,
        description: description.trim(),
        avatarEmoji,
        avatarColor,
        avatarImage,
        adminsOnly,
      })
      if (ok === false) {
        onNotify('Не удалось сохранить изменения в Supabase')
        return
      }
      playSuccess(soundEnabled)
      onNotify('Изменения группы сохранены')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      onNotify('Размер фото не должен превышать 5 МБ')
      return
    }
    setIsUploadingPhoto(true)
    try {
      const res = await uploadChatMedia(file, {
        userId: myUserId,
        threadId: groupId,
        fileName: file.name,
        mediaType: 'image',
      })
      if (res.ok && res.url) {
        setAvatarImage(res.url)
        await onUpdateGroup({ avatarImage: res.url })
        playSuccess(soundEnabled)
        onNotify('Фото группы обновлено')
      } else {
        onNotify(res.error || 'Ошибка загрузки фото')
      }
    } catch {
      onNotify('Не удалось загрузить фото')
    } finally {
      setIsUploadingPhoto(false)
      e.target.value = ''
    }
  }

  const handleConfirmAddMembers = async () => {
    if (selectedFriendsToAdd.length === 0) return
    const ok = await onAddMembers(selectedFriendsToAdd)
    if (ok === false) {
      onNotify('Не удалось добавить участников (проверьте права или дружбу)')
      return
    }
    playSuccess(soundEnabled)
    onNotify(`Добавлено участников: ${selectedFriendsToAdd.length}`)
    setSelectedFriendsToAdd([])
    setIsAddingMembers(false)
  }

  const handleOpenMemberProfile = (targetId: string) => {
    playClick(soundEnabled)
    onClose()
    if (onOpenProfile) {
      onOpenProfile(targetId)
      return
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ogonek:navigate-view', {
          detail: {
            view: 'profile',
            userId: targetId === 'me' || targetId === myUserId ? null : targetId,
          },
        })
      )
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-[4px] flex items-center justify-center p-4"
      onClick={() => !isSaving && !isActionBusy && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={`О группе ${groupMeta.title}`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.14 }}
        className="relative w-full max-w-lg rounded-2xl border border-white/[0.14] bg-[#060608] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.95)] flex flex-col max-h-[88vh] overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoUpload}
        />

        {/* Шапка модалки */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.1] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <GroupAvatar
              group={{ title: title || groupMeta.title, avatarColor, avatarEmoji, avatarImage }}
              size={38}
            />
            <div className="min-w-0">
              <h3 className="text-[16px] font-bold text-white leading-tight truncate">
                О группе
              </h3>
              <p className="text-[11.5px] text-[#71767b]">
                {groupMeta.memberIds.length} участников
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#71767b] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {/* Прокручиваемое содержимое */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar">
          {/* Блок информации / редактирования группы */}
          <div className="p-4 rounded-2xl bg-black border border-white/[0.12] space-y-3.5">
            <div className="flex items-center gap-3.5">
              <div className="relative shrink-0">
                <GroupAvatar
                  group={{ title, avatarColor, avatarEmoji, avatarImage }}
                  size={60}
                />
                {isCreator && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#d76737] hover:bg-[#e0784b] text-black border-2 border-black flex items-center justify-center cursor-pointer disabled:opacity-60"
                      aria-label="Сменить фото группы"
                      title="Загрузить фото"
                    >
                      {isUploadingPhoto ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                    </button>
                    {avatarImage && (
                      <button
                        type="button"
                        onClick={() => setAvatarImage(null)}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black border border-white/[0.2] text-white/80 hover:text-white flex items-center justify-center cursor-pointer"
                        aria-label="Убрать фото"
                        title="Убрать фото"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                {isCreator ? (
                  <>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Название группы"
                      className="w-full h-10 rounded-xl border border-white/[0.12] bg-[#060608] px-3 text-sm font-bold text-white placeholder:text-[#71767b] outline-none focus:border-[#d76737]"
                      maxLength={100}
                      aria-label="Название группы"
                    />
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Описание группы (необязательно)"
                      className="w-full h-9 rounded-xl border border-white/[0.12] bg-[#060608] px-3 text-xs text-white placeholder:text-[#71767b] outline-none focus:border-[#d76737]"
                      maxLength={200}
                      aria-label="Описание группы"
                    />
                  </>
                ) : (
                  <>
                    <p className="text-base font-bold text-white truncate">{groupMeta.title}</p>
                    <p className="text-xs text-[#71767b] leading-relaxed">
                      {groupMeta.description || 'Описание не указано'}
                    </p>
                  </>
                )}
              </div>
            </div>

            {isCreator && !avatarImage && (
              <div className="pt-2 border-t border-white/[0.08] space-y-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {GROUP_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setAvatarEmoji(icon)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[15px] border transition-colors cursor-pointer ${
                        avatarEmoji === icon
                          ? 'border-[#d76737] bg-[#d76737]/15 text-white'
                          : 'border-white/[0.1] bg-[#060608] text-white/80 hover:bg-white/[0.06]'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {GROUP_PALETTE.map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setAvatarColor(bg)}
                      className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                        avatarColor === bg
                          ? 'scale-115 border-[#d76737] ring-2 ring-[#d76737]/40'
                          : 'border-white/[0.2] hover:scale-105'
                      }`}
                      style={{ background: bg }}
                      aria-label="Выбрать фон иконки"
                    />
                  ))}
                </div>
              </div>
            )}

            {isCreator && (
              <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-white">Только админы могут писать</p>
                  <p className="text-[11px] text-[#71767b]">
                    Участники смогут только читать посты и обсуждения
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={adminsOnly}
                  onChange={(e) => setAdminsOnly(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#d76737] cursor-pointer shrink-0"
                  aria-label="Только админы могут писать"
                />
              </div>
            )}

            {isCreator && (
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  disabled={isSaving || !title.trim()}
                  onClick={() => void handleSaveChanges()}
                  className={`h-9 px-5 rounded-full text-xs font-bold transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5 ${
                    hasUnsavedChanges
                      ? 'bg-[#d76737] hover:bg-[#e0784b] text-black shadow-sm'
                      : 'bg-[#d76737] hover:bg-[#e0784b] text-black'
                  }`}
                >
                  {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={2.8} />}
                  <span>Сохранить</span>
                </button>
              </div>
            )}
          </div>

          {/* Список участников */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-bold text-[#71767b] uppercase tracking-wider">
                Участники ({groupMeta.memberIds.length})
              </p>
              {isMeAdmin && !isAddingMembers && (
                <button
                  type="button"
                  onClick={() => setIsAddingMembers(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.12] hover:bg-white/[0.1] text-xs font-bold text-[#d76737] transition-colors cursor-pointer"
                >
                  <UserPlus size={13} />
                  <span>+ Добавить друзей</span>
                </button>
              )}
            </div>

            {/* Панель добавления взаимных друзей */}
            {isAddingMembers && (
              <div className="p-3.5 rounded-2xl bg-black border border-[#d76737]/40 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white">Выбери друзей для добавления:</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingMembers(false)
                      setSelectedFriendsToAdd([])
                    }}
                    className="text-[11px] text-[#71767b] hover:text-white cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>

                {availableFriends.length === 0 ? (
                  <p className="text-xs text-[#71767b] py-2 text-center leading-relaxed">
                    Чтобы создать группу или пригласить участников, сначала добавь друзей (взаимная подписка)
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 no-scrollbar">
                    {availableFriends.map((friendProf) => {
                      const isSelected = selectedFriendsToAdd.includes(friendProf.id)
                      const friendTitle = friendProf.display_name || `@${friendProf.username}`
                      return (
                        <button
                          key={friendProf.id}
                          type="button"
                          onClick={() => {
                            setSelectedFriendsToAdd((prev) =>
                              isSelected ? prev.filter((id) => id !== friendProf.id) : [...prev, friendProf.id]
                            )
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'border-[#d76737] bg-[#d76737]/10'
                              : 'border-white/[0.1] bg-[#060608] hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <UserAvatar
                              avatarUrl={friendProf.avatar_image || friendProf.avatar_url}
                              avatarColor={friendProf.avatar_color}
                              displayName={friendTitle}
                              username={friendProf.username}
                              size={30}
                              bordered={false}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-white truncate">{friendTitle}</p>
                              <p className="text-[10.5px] text-[#71767b] truncate">@{friendProf.username}</p>
                            </div>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-[#d76737] bg-[#d76737] text-black' : 'border-white/25'
                            }`}
                          >
                            {isSelected && <Check size={10} strokeWidth={3} />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {availableFriends.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleConfirmAddMembers()}
                    disabled={selectedFriendsToAdd.length === 0}
                    className="w-full h-9 rounded-full bg-[#d76737] hover:bg-[#e0784b] text-black text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Добавить ({selectedFriendsToAdd.length})
                  </button>
                )}
              </div>
            )}

            {/* Карточки текущих участников */}
            <div className="space-y-1.5">
              {groupMeta.memberIds.map((mId) => {
                const isMe = mId === myUserId || mId === 'me'
                const resolvedUid = isMe ? myUserId : mId
                const liveProf = isMe ? null : memberProfilesMap[mId] || getCachedProfileSync(mId)
                const friend = isMe ? null : getFriend(mId)

                const name = isMe
                  ? currentUser?.displayName || state.profile?.displayName || 'Вы'
                  : liveProf?.display_name || (liveProf?.username ? `@${liveProf.username}` : friend?.name || 'Участник')
                const usernameRaw = isMe
                  ? currentUser?.username || state.profile?.username || ''
                  : liveProf?.username || friend?.username || ''
                const username = usernameRaw ? `@${usernameRaw.replace(/^@/, '')}` : ''

                const avatarUrl = isMe
                  ? currentUser?.avatarImage || state.profile?.avatarImage
                  : liveProf?.avatar_image || liveProf?.avatar_url
                const avatarColor = isMe
                  ? state.profile?.avatarColor
                  : liveProf?.avatar_color || friend?.avatarColor
                const verified = isMe ? Boolean(state.profile?.verified) : Boolean(liveProf?.verified || friend?.verified)

                const isMemberCreator = mId === groupMeta.createdBy || (isCreator && isMe)
                const isMemberAdmin = isMemberCreator || adminIds.includes(mId)

                const isOnline = isMe || Boolean(resolvedUid && presenceSnap.onlineIds.has(resolvedUid))
                const effLastSeen = resolvedUid
                  ? getEffectiveLastSeenSync(resolvedUid, liveProf?.last_seen_at)
                  : liveProf?.last_seen_at || null
                const statusInfo = formatLastSeenStatus(effLastSeen, isOnline)

                return (
                  <div
                    key={mId}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-black border border-white/[0.1] hover:border-white/[0.18] transition-colors relative"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenMemberProfile(resolvedUid)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <UserAvatar
                        avatarUrl={avatarUrl}
                        avatarColor={avatarColor}
                        displayName={name}
                        username={usernameRaw}
                        size={38}
                        isOnline={isOnline}
                        ringColor="#000000"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[13px] font-bold text-white truncate">{name}</span>
                          {verified && <VerifiedBadge size="xs" />}
                          {isMemberCreator ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#d76737]/20 text-[#d76737] text-[10px] font-bold">
                              <Crown size={10} /> Создатель
                            </span>
                          ) : isMemberAdmin ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/10 text-white/80 text-[10px] font-semibold">
                              <Shield size={10} /> Админ
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#71767b] truncate mt-0.5">
                          {username && <span className="truncate">{username}</span>}
                          {username && <span>·</span>}
                          <span className={statusInfo.isOnline ? 'text-[#00ba7c] font-medium' : ''}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Управление участником для создателя / админа */}
                    {isMeAdmin && !isMe && !isMemberCreator && (
                      <div className="relative ml-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setMemberMenuId(memberMenuId === mId ? null : mId)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[#71767b] hover:text-white hover:bg-white/[0.06] cursor-pointer"
                          aria-label={`Действия с ${name}`}
                        >
                          <MoreVertical size={15} />
                        </button>

                        {memberMenuId === mId && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setMemberMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-white/[0.14] bg-[#060608] p-1 shadow-2xl z-50 text-xs font-medium">
                              {isMemberAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    void onSetMemberRole(mId, 'member')
                                    setMemberMenuId(null)
                                    onNotify(`Сняты права админа с ${name}`)
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-white hover:bg-white/[0.06] cursor-pointer"
                                >
                                  <ShieldAlert size={14} className="text-[#d76737]" /> Снять админа
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    void onSetMemberRole(mId, 'admin')
                                    setMemberMenuId(null)
                                    onNotify(`${name} назначен администратором`)
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-white hover:bg-white/[0.06] cursor-pointer"
                                >
                                  <Shield size={14} className="text-white/75" /> Назначить админом
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={async () => {
                                  const ok = await onRemoveMember(mId)
                                  setMemberMenuId(null)
                                  if (ok !== false) {
                                    onNotify(`${name} исключён из группы`)
                                  } else {
                                    onNotify('Не удалось исключить участника')
                                  }
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                              >
                                <UserMinus size={14} /> Исключить из группы
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Действия внизу: Выйти из группы (участники) / Удалить группу (создатель) */}
          <div className="pt-2 border-t border-white/[0.08] space-y-2">
            {confirmAction === 'leave' && (
              <div className="p-3 rounded-2xl bg-black border border-rose-500/35 space-y-2.5">
                <p className="text-xs text-white font-medium text-center">
                  Выйти из группы «{groupMeta.title}»?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isActionBusy}
                    onClick={() => setConfirmAction(null)}
                    className="flex-1 h-9 rounded-full border border-white/[0.14] text-xs font-semibold text-white hover:bg-white/[0.06] cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    disabled={isActionBusy}
                    onClick={async () => {
                      setIsActionBusy(true)
                      try {
                        await onLeaveGroup()
                        onClose()
                      } finally {
                        setIsActionBusy(false)
                      }
                    }}
                    className="flex-1 h-9 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Выйти
                  </button>
                </div>
              </div>
            )}

            {confirmAction === 'delete' && (
              <div className="p-3 rounded-2xl bg-black border border-rose-500/35 space-y-2.5">
                <p className="text-xs text-white font-medium text-center">
                  Удалить группу «{groupMeta.title}» и всю переписку навсегда?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isActionBusy}
                    onClick={() => setConfirmAction(null)}
                    className="flex-1 h-9 rounded-full border border-white/[0.14] text-xs font-semibold text-white hover:bg-white/[0.06] cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    disabled={isActionBusy}
                    onClick={async () => {
                      if (!onDeleteGroup) return
                      setIsActionBusy(true)
                      try {
                        await onDeleteGroup()
                        onClose()
                      } finally {
                        setIsActionBusy(false)
                      }
                    }}
                    className="flex-1 h-9 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Удалить навсегда
                  </button>
                </div>
              </div>
            )}

            {!confirmAction && !isCreator && (
              <button
                type="button"
                onClick={() => setConfirmAction('leave')}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-full border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors text-xs font-bold cursor-pointer"
              >
                <LogOut size={15} />
                <span>Выйти из группы</span>
              </button>
            )}

            {!confirmAction && isCreator && onDeleteGroup && (
              <button
                type="button"
                onClick={() => setConfirmAction('delete')}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-full border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors text-xs font-bold cursor-pointer"
              >
                <Trash2 size={15} />
                <span>Удалить группу</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}

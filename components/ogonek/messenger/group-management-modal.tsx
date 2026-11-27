'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera,
  Check,
  Crown,
  LogOut,
  MoreVertical,
  Plus,
  Shield,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { getFriend } from '@/lib/ogonek/friends'
import { getInitials } from '@/lib/ogonek/initials'
import { uploadChatMedia } from '@/lib/ogonek/chat-media-service'
import { canInviteUserToGroup } from '@/lib/ogonek/privacy'
import {
  getCachedProfileSync,
  getMutualFriendProfiles,
  getProfilesByIds,
  type ProfileRecord,
} from '@/lib/supabase/api'
import type { ChatGroupMeta } from '@/lib/ogonek/types'

type Props = {
  groupId: string
  groupMeta: ChatGroupMeta
  onUpdateGroup: (patch: Partial<ChatGroupMeta>) => void
  onAddMembers: (memberIds: string[]) => void
  onRemoveMember: (memberId: string) => void
  onSetMemberRole: (memberId: string, role: 'admin' | 'member') => void
  onLeaveGroup: () => void
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
  onClose,
  soundEnabled = true,
  onNotify,
}: Props) {
  const { state } = useOgonekStore()
  const [title, setTitle] = useState(groupMeta.title)
  const [description, setDescription] = useState(groupMeta.description || '')
  const [adminsOnly, setAdminsOnly] = useState(Boolean(groupMeta.adminsOnly))
  const [isAddingMembers, setIsAddingMembers] = useState(false)
  const [selectedFriendsToAdd, setSelectedFriendsToAdd] = useState<string[]>([])
  const [memberMenuId, setMemberMenuId] = useState<string | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const myUserId = state.auth?.activeAccountId || 'me'

  const [mutualFriendProfiles, setMutualFriendProfiles] = useState<ProfileRecord[]>([])
  const [memberProfilesMap, setMemberProfilesMap] = useState<Record<string, ProfileRecord>>({})

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

  const isCreator = groupMeta.createdBy === myUserId || groupMeta.createdBy === 'me'
  const adminIds = groupMeta.adminIds || (isCreator ? [myUserId] : [])
  const isMeAdmin = isCreator || adminIds.includes(myUserId) || groupMeta.role === 'admin' || groupMeta.role === 'owner'

  // Строго взаимные друзья, не состоящие в группе и разрешившие добавление в группы
  const availableFriends = useMemo(() => {
    return mutualFriendProfiles
      .filter((p) => !groupMeta.memberIds.includes(p.id))
      .filter((p) => canInviteUserToGroup({ viewerId: myUserId, targetProfile: p, isMutualFriend: true }).allowed)
      .map((p) => ({
        id: p.id,
        name: p.display_name || `@${p.username}`,
        username: p.username,
      }))
  }, [mutualFriendProfiles, groupMeta.memberIds, myUserId])

  const handleSaveTitle = () => {
    if (!title.trim()) {
      onNotify('Название группы не может быть пустым')
      return
    }
    onUpdateGroup({ title: title.trim(), description: description.trim(), adminsOnly })
    playSuccess(soundEnabled)
    onNotify('Параметры группы обновлены')
  }

  const handleToggleAdminsOnly = (checked: boolean) => {
    setAdminsOnly(checked)
    onUpdateGroup({ adminsOnly: checked })
    playClick(soundEnabled)
    onNotify(checked ? 'Теперь только администраторы могут отправлять сообщения' : 'Все участники могут писать в чат')
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingPhoto(true)
    try {
      const res = await uploadChatMedia(file, {
        userId: myUserId,
        threadId: groupId,
        fileName: file.name,
        mediaType: 'image',
      })
      if (res.ok && res.url) {
        onUpdateGroup({ avatarImage: res.url })
        playSuccess(soundEnabled)
        onNotify('Аватар группы обновлён')
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

  const handleConfirmAddMembers = () => {
    if (selectedFriendsToAdd.length === 0) return
    onAddMembers(selectedFriendsToAdd)
    playSuccess(soundEnabled)
    onNotify(`Добавлено участников: ${selectedFriendsToAdd.length}`)
    setSelectedFriendsToAdd([])
    setIsAddingMembers(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Скрытый инпут загрузки фото */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoUpload}
        />

        {/* Шапка модалки */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center">
              <Users size={17} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text)] leading-tight">Управление группой</h3>
              <p className="text-[11px] text-[var(--text-2)]">{groupMeta.memberIds.length} участников</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {/* Прокручиваемое содержимое */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 no-scrollbar">
          {/* Аватар и название группы */}
          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-[var(--bg)] border border-[var(--border)]">
            <div className="relative group shrink-0">
              {groupMeta.avatarImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={groupMeta.avatarImage}
                  alt={groupMeta.title}
                  className="w-14 h-14 rounded-2xl object-cover"
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm text-white"
                  style={{ background: groupMeta.avatarColor || '#ff7a18' }}
                >
                  {groupMeta.avatarEmoji || '👥'}
                </div>
              )}
              {isMeAdmin && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                  aria-label="Сменить фото группы"
                  title="Загрузить фото"
                >
                  <Camera size={18} />
                </button>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1.5">
              {isMeAdmin ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleSaveTitle}
                    placeholder="Название группы"
                    className="flex-1 h-9 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 text-xs font-bold text-[var(--text)] outline-none focus:border-[var(--accent)]"
                    maxLength={100}
                    aria-label="Название группы"
                  />
                  <button
                    type="button"
                    onClick={handleSaveTitle}
                    className="h-9 px-3 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] text-xs font-bold hover:opacity-90 transition-opacity"
                    aria-label="Сохранить название"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <p className="text-sm font-bold text-[var(--text)] truncate">{groupMeta.title}</p>
              )}
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleSaveTitle}
                disabled={!isMeAdmin}
                placeholder="Описание группы (необязательно)"
                className="w-full h-8 rounded-lg border border-[var(--border)] bg-transparent px-2.5 text-[11px] text-[var(--text)] placeholder:text-[var(--text-2)] outline-none focus:border-[var(--accent)]"
                maxLength={200}
                aria-label="Описание группы"
              />
            </div>
          </div>

          {/* Режим «Только админы могут писать» */}
          {isMeAdmin && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg)] border border-[var(--border)]">
              <div className="space-y-0.5 pr-3">
                <p className="text-xs font-bold text-[var(--text)]">Только админы могут писать</p>
                <p className="text-[11px] text-[var(--text-2)]">
                  Обычные участники смогут только читать сообщения и опросы
                </p>
              </div>
              <input
                type="checkbox"
                checked={adminsOnly}
                onChange={(e) => handleToggleAdminsOnly(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--accent)] cursor-pointer"
                aria-label="Только админы могут писать"
              />
            </div>
          )}

          {/* Список участников */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider">
                Участники ({groupMeta.memberIds.length})
              </p>
              {isMeAdmin && !isAddingMembers && (
                <button
                  type="button"
                  onClick={() => setIsAddingMembers(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] hover:opacity-80 transition-opacity"
                >
                  <UserPlus size={14} /> Добавить
                </button>
              )}
            </div>

            {/* Панель добавления друзей в группу */}
            {isAddingMembers && (
              <div className="p-3 rounded-2xl bg-[var(--bg)] border border-[var(--accent)]/40 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[var(--text)]">Выберите друзей для добавления:</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingMembers(false)
                      setSelectedFriendsToAdd([])
                    }}
                    className="text-[11px] text-[var(--text-2)] hover:text-[var(--text)]"
                  >
                    Отмена
                  </button>
                </div>

                {availableFriends.length === 0 ? (
                  <p className="text-xs text-[var(--text-2)] py-2 text-center leading-relaxed">
                    Чтобы создать группу или пригласить участников, сначала добавь друзей (взаимная подписка)
                  </p>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-1.5 no-scrollbar">
                    {availableFriends.map((friend) => {
                      const isSelected = selectedFriendsToAdd.includes(friend.id)
                      return (
                        <button
                          key={friend.id}
                          type="button"
                          onClick={() => {
                            setSelectedFriendsToAdd((prev) =>
                              isSelected ? prev.filter((id) => id !== friend.id) : [...prev, friend.id]
                            )
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-colors ${
                            isSelected
                              ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                              : 'border-[var(--border)] bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-[10px] font-bold flex items-center justify-center">
                              {getInitials(friend.name, friend.username)}
                            </div>
                            <span className="text-xs font-semibold text-[var(--text)]">{friend.name}</span>
                          </div>
                          {isSelected && <Check size={14} className="text-[var(--accent)]" />}
                        </button>
                      )
                    })}
                  </div>
                )}

                {availableFriends.length > 0 && (
                  <button
                    type="button"
                    onClick={handleConfirmAddMembers}
                    disabled={selectedFriendsToAdd.length === 0}
                    className="w-full h-8 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    Добавить ({selectedFriendsToAdd.length})
                  </button>
                )}
              </div>
            )}

            {/* Карточки текущих участников */}
            <div className="space-y-1.5">
              {groupMeta.memberIds.map((mId) => {
                const liveProf = memberProfilesMap[mId] || getCachedProfileSync(mId)
                const friend = getFriend(mId)
                const isMe = mId === myUserId || mId === 'me'
                const name = isMe
                  ? 'Вы'
                  : liveProf?.display_name || (liveProf?.username ? `@${liveProf.username}` : friend?.name || 'Участник')
                const username = liveProf?.username
                  ? `@${liveProf.username}`
                  : friend?.username
                  ? `@${friend.username}`
                  : ''
                const isMemberCreator = mId === groupMeta.createdBy || (isCreator && isMe)
                const isMemberAdmin = isMemberCreator || adminIds.includes(mId)
                const roleLabel = isMemberCreator ? 'Владелец' : isMemberAdmin ? 'Админ' : 'Участник'

                return (
                  <div
                    key={mId}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--bg)] border border-[var(--border)] relative"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text)] text-xs font-bold flex items-center justify-center shrink-0">
                        {getInitials(name, username)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-[var(--text)] truncate">{name}</p>
                          {isMemberCreator ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#ffad5a]/15 text-[#ffad5a] text-[9px] font-extrabold uppercase">
                              <Crown size={10} /> Владелец
                            </span>
                          ) : isMemberAdmin ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#1d9bf0]/15 text-[#1d9bf0] text-[9px] font-extrabold uppercase">
                              <Shield size={10} /> Админ
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-[var(--text-2)] text-[9px] font-medium">
                              Участник
                            </span>
                          )}
                        </div>
                        {username && <p className="text-[10px] text-[var(--text-2)]">{username}</p>}
                      </div>
                    </div>

                    {/* Меню действий над участником для админов */}
                    {isMeAdmin && !isMe && !isMemberCreator && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setMemberMenuId(memberMenuId === mId ? null : mId)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]"
                          aria-label={`Действия с ${name}`}
                        >
                          <MoreVertical size={15} />
                        </button>

                        {memberMenuId === mId && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setMemberMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-1 shadow-2xl z-50 text-xs font-medium animate-in fade-in zoom-in-95">
                              {isMemberAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSetMemberRole(mId, 'member')
                                    setMemberMenuId(null)
                                    onNotify(`Сняты права админа с ${name}`)
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[var(--text)] hover:bg-[var(--bg-hover)]"
                                >
                                  <ShieldAlert size={14} className="text-[#ffad5a]" /> Снять админа
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSetMemberRole(mId, 'admin')
                                    setMemberMenuId(null)
                                    onNotify(`${name} назначен администратором`)
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[var(--text)] hover:bg-[var(--bg-hover)]"
                                >
                                  <Shield size={14} className="text-[#1d9bf0]" /> Назначить админом
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  onRemoveMember(mId)
                                  setMemberMenuId(null)
                                  onNotify(`${name} исключен из группы`)
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-red-400 hover:bg-red-500/10"
                              >
                                <UserMinus size={14} /> Исключить
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

          {/* Кнопка выхода из группы */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (confirm('Вы действительно хотите покинуть эту группу?')) {
                  onLeaveGroup()
                  onClose()
                }
              }}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-xs font-bold"
            >
              <LogOut size={15} /> Покинуть группу
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

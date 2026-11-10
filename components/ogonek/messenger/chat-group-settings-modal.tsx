'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Camera,
  Check,
  Crown,
  Edit2,
  LogOut,
  Plus,
  Shield,
  ShieldAlert,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  VolumeX,
  X,
} from 'lucide-react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { getInitials } from '@/lib/ogonek/initials'
import type { ProfileRecord } from '@/lib/supabase/api'

export interface GroupMemberItem {
  userId: string
  username: string
  displayName: string
  avatar?: string | null
  role: 'owner' | 'admin' | 'member'
}

type Props = {
  threadId: string
  title: string
  avatar?: string | null
  isChannel?: boolean
  currentUserRole?: 'owner' | 'admin' | 'member'
  members: GroupMemberItem[]
  availableComrades?: ProfileRecord[]
  onUpdateGroup: (newTitle: string, newAvatar: string | null, isChannel: boolean) => Promise<void> | void
  onAddMembers: (userIds: string[]) => Promise<void> | void
  onRemoveMember: (userId: string) => Promise<void> | void
  onSetRole: (userId: string, role: 'admin' | 'member') => Promise<void> | void
  onLeaveGroup: () => Promise<void> | void
  onClearHistory: () => Promise<void> | void
  onClose: () => void
  soundEnabled?: boolean
}

export function ChatGroupSettingsModal({
  threadId,
  title,
  avatar,
  isChannel = false,
  currentUserRole = 'member',
  members,
  availableComrades = [],
  onUpdateGroup,
  onAddMembers,
  onRemoveMember,
  onSetRole,
  onLeaveGroup,
  onClearHistory,
  onClose,
  soundEnabled = true,
}: Props) {
  const isOwnerOrAdmin = currentUserRole === 'owner' || currentUserRole === 'admin'
  const isOwner = currentUserRole === 'owner'

  const [editTitle, setEditTitle] = useState(title)
  const [editChannel, setEditChannel] = useState(isChannel)
  const [isEditingInfo, setIsEditingInfo] = useState(false)
  const [isAddingMembers, setIsAddingMembers] = useState(false)
  const [selectedNewMemberIds, setSelectedNewMemberIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const handleSaveInfo = async () => {
    setSaving(true)
    playSuccess(soundEnabled)
    await onUpdateGroup(editTitle.trim() || title, avatar || null, editChannel)
    setIsEditingInfo(false)
    setSaving(false)
  }

  const handleAddSelectedMembers = async () => {
    if (selectedNewMemberIds.length === 0) return
    setSaving(true)
    playSuccess(soundEnabled)
    await onAddMembers(selectedNewMemberIds)
    setSelectedNewMemberIds([])
    setIsAddingMembers(false)
    setSaving(false)
  }

  const existingMemberIds = new Set(members.map((m) => m.userId))
  const comradesToAdd = availableComrades.filter((c) => !existingMemberIds.has(c.id))

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-2xl flex flex-col max-h-[85vh] text-[var(--text)]"
        role="dialog"
        aria-modal="true"
        aria-label="Управление группой"
      >
        {/* Шапка */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-[var(--accent)]" />
            <h3 className="text-base font-bold text-[var(--text)]">Информация о группе</h3>
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

        {/* Тело модалки */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 py-3">
          {/* Блок названия и аватара */}
          <div className="p-3.5 rounded-2xl bg-[var(--bg)] border border-[var(--border)] flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#ff6a1a] to-[#ff944d] flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-md">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt={title} className="w-full h-full rounded-full object-cover" />
              ) : (
                getInitials(title, 'Группа')
              )}
            </div>

            <div className="flex-1 min-w-0">
              {isEditingInfo ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full h-8 rounded-lg border border-[var(--border)] bg-[var(--bg-elev)] px-2.5 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
                    placeholder="Название группы"
                  />
                  {isOwnerOrAdmin && (
                    <label className="flex items-center gap-2 text-xs text-[var(--text-2)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editChannel}
                        onChange={(e) => setEditChannel(e.target.checked)}
                        className="rounded border-[var(--border)] accent-[var(--accent)]"
                      />
                      <span>Только администраторы могут писать (режим канала)</span>
                    </label>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingInfo(false)}
                      className="px-2 py-1 text-xs text-[var(--text-2)] hover:text-[var(--text)]"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveInfo}
                      disabled={saving}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-[var(--accent)] text-white hover:opacity-90"
                    >
                      Сохранить
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[var(--text)] truncate">{title}</h4>
                    {isOwnerOrAdmin && (
                      <button
                        type="button"
                        onClick={() => setIsEditingInfo(true)}
                        className="p-1 rounded-md text-[var(--text-2)] hover:text-[var(--text)]"
                        title="Редактировать"
                        aria-label="Редактировать название группы"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-2)] mt-0.5">
                    {members.length} участников {isChannel && '· Режим канала'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Список участников */}
          <div className="p-3.5 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-2)]">
                Участники ({members.length})
              </span>
              {isOwnerOrAdmin && (
                <button
                  type="button"
                  onClick={() => setIsAddingMembers(!isAddingMembers)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[var(--accent)] hover:underline"
                >
                  <UserPlus size={14} /> Добавить
                </button>
              )}
            </div>

            {/* Панель добавления участников */}
            {isAddingMembers && (
              <div className="p-3 rounded-xl bg-[var(--bg-elev)] border border-[var(--border)] space-y-2">
                <span className="text-xs font-semibold text-[var(--text)] block">
                  Выберите соратников для добавления:
                </span>
                {comradesToAdd.length === 0 ? (
                  <p className="text-xs text-[var(--text-2)]">Все ваши соратники уже в группе</p>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-1">
                    {comradesToAdd.map((c) => {
                      const isSelected = selectedNewMemberIds.includes(c.id)
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            playClick(soundEnabled)
                            setSelectedNewMemberIds((prev) =>
                              prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                            )
                          }}
                          className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs transition-colors ${
                            isSelected ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'hover:bg-[var(--bg)] text-[var(--text)]'
                          }`}
                        >
                          <span className="font-medium">{c.display_name || c.username}</span>
                          {isSelected && <Check size={14} />}
                        </button>
                      )
                    })}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingMembers(false)}
                    className="px-2 py-1 text-xs text-[var(--text-2)]"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSelectedMembers}
                    disabled={selectedNewMemberIds.length === 0 || saving}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-[var(--accent)] text-white disabled:opacity-50"
                  >
                    Добавить ({selectedNewMemberIds.length})
                  </button>
                </div>
              </div>
            )}

            {/* Карточки участников */}
            <div className="space-y-1.5">
              {members.map((m) => {
                const isMemberOwner = m.role === 'owner'
                const isMemberAdmin = m.role === 'admin'

                return (
                  <div
                    key={m.userId}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--bg-elev)] transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center font-bold text-xs shrink-0">
                        {getInitials(m.displayName, m.username)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[var(--text)] truncate">{m.displayName}</span>
                          {isMemberOwner && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-400 bg-amber-400/15 px-1.5 py-0.5 rounded-full">
                              <Crown size={10} /> Владелец
                            </span>
                          )}
                          {isMemberAdmin && !isMemberOwner && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-400 bg-blue-400/15 px-1.5 py-0.5 rounded-full">
                              <Shield size={10} /> Админ
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[var(--text-2)]">@{m.username}</span>
                      </div>
                    </div>

                    {/* Меню управления правами (для владельца) */}
                    {isOwner && !isMemberOwner && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            playClick(soundEnabled)
                            onSetRole(m.userId, isMemberAdmin ? 'member' : 'admin')
                          }}
                          className="p-1 rounded-lg text-[var(--text-2)] hover:text-blue-400 hover:bg-blue-500/10"
                          title={isMemberAdmin ? 'Снять права админа' : 'Сделать администратором'}
                          aria-label={isMemberAdmin ? 'Снять права админа' : 'Сделать администратором'}
                        >
                          <Shield size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playClick(soundEnabled)
                            onRemoveMember(m.userId)
                          }}
                          className="p-1 rounded-lg text-[var(--text-2)] hover:text-red-400 hover:bg-red-500/10"
                          title="Исключить из группы"
                          aria-label="Исключить участника из группы"
                        >
                          <UserMinus size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Действия с группой */}
          <div className="p-2 space-y-1">
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                onClearHistory()
                onClose()
              }}
              className="w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
            >
              <Trash2 size={16} /> Очистить историю сообщений у себя
            </button>
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                onLeaveGroup()
                onClose()
              }}
              className="w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={16} /> Покинуть группу
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Plus,
  MessageCircle,
  Shield,
  Copy,
  Check,
  UserPlus,
  LogOut,
  ArrowLeft,
  Flame,
  Heart,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import {
  listUserGroups,
  createGroup,
  inviteToGroup,
  leaveGroup,
  removeGroupMember,
  getGroupFeed,
  type GroupFeedItem,
} from '@/lib/ogonek/groups'
import { getTierLimits } from '@/lib/ogonek/permissions'
import type { ComradeProfile } from '@/lib/ogonek/social'
import type { OgonekGroup, GroupKind, ViewId } from '@/lib/ogonek/types'

interface Props {
  currentUserId: string
  userTier?: 'free' | 'pro' | 'ultra'
  comrades: ComradeProfile[]
  onOpenChat?: (threadId: string) => void
  onNavigate: (view: ViewId) => void
  onNotify: (msg: string) => void
  soundEnabled?: boolean
}

const KIND_LABELS: Record<GroupKind, { label: string; icon: string; color: string }> = {
  family: { label: 'Семья', icon: '👨‍👩‍👧', color: '#ec4899' },
  sport: { label: 'Спорт', icon: '🏋️', color: '#10b981' },
  friends: { label: 'Друзья', icon: '🤝', color: '#3b82f6' },
  custom: { label: 'Соратники', icon: '🔥', color: '#ff5c00' },
}

const AVATAR_OPTIONS = ['👥', '👨‍👩‍👧', '🏋️', '🤝', '🔥', '⚡', '🎯', '🚀', '🏔️', '🏆']
const COLOR_OPTIONS = ['#ff5c00', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b']

export function GroupsSection({
  currentUserId,
  userTier = 'free',
  comrades,
  onOpenChat,
  onNavigate,
  onNotify,
  soundEnabled = true,
}: Props) {
  const [groups, setGroups] = useState<OgonekGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<OgonekGroup | null>(null)
  const [groupFeed, setGroupFeed] = useState<GroupFeedItem[]>([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [activeGroupSubTab, setActiveGroupSubTab] = useState<'feed' | 'members'>('feed')

  // Создание группы
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newKind, setNewKind] = useState<GroupKind>('family')
  const [newAvatar, setNewAvatar] = useState('👥')
  const [newColor, setNewColor] = useState('#ff5c00')
  const [newDesc, setNewDesc] = useState('')
  const [selectedComradeIds, setSelectedComradeIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Приглашение соратников
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteSelectedComradeId, setInviteSelectedComradeId] = useState('')
  const [inviting, setInviting] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const tierLimits = getTierLimits(userTier)
  const ownedGroupsCount = groups.filter((g) => g.ownerId === currentUserId).length
  const canCreateGroup = ownedGroupsCount < tierLimits.maxGroupsOwned

  const loadGroups = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listUserGroups(currentUserId)
      setGroups(list)
    } finally {
      setLoading(false)
    }
  }, [currentUserId])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  // Загрузка ленты при открытии группы
  useEffect(() => {
    if (!selectedGroup) return
    setFeedLoading(true)
    getGroupFeed(selectedGroup.id)
      .then((feed) => {
        setGroupFeed(feed)
      })
      .finally(() => {
        setFeedLoading(false)
      })
  }, [selectedGroup])

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) {
      onNotify('Введите название группы')
      return
    }
    if (!canCreateGroup) {
      onNotify(`Лимит групп для тарифа ${userTier.toUpperCase()} исчерпан`)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createGroup({
        name: newName.trim(),
        kind: newKind,
        avatar: newAvatar,
        color: newColor,
        description: newDesc.trim(),
        initialMemberIds: selectedComradeIds,
      })

      if (res.ok && res.groupId) {
        playSuccess(soundEnabled)
        onNotify(`Группа «${newName.trim()}» создана!`)
        setCreateModalOpen(false)
        setNewName('')
        setNewDesc('')
        setSelectedComradeIds([])
        await loadGroups()
      } else {
        onNotify(res.error || 'Ошибка создания группы')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyInviteLink = (group: OgonekGroup) => {
    playClick(soundEnabled)
    if (!group.inviteCode) {
      onNotify('У группы нет активного кода приглашения')
      return
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ogonek.app'
    const link = `${origin}/g/${group.inviteCode}`
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true)
      onNotify('Ссылка-приглашение скопирована (действует 7 дней) 📋')
      setTimeout(() => setCopiedLink(false), 3000)
    })
  }

  const handleInviteComrade = async () => {
    if (!selectedGroup || !inviteSelectedComradeId) return
    setInviting(true)
    try {
      const res = await inviteToGroup(selectedGroup.id, inviteSelectedComradeId)
      if (res.ok) {
        playSuccess(soundEnabled)
        onNotify('Приглашение отправлено соратнику!')
        setInviteModalOpen(false)
        setInviteSelectedComradeId('')
        await loadGroups()
      } else {
        onNotify(res.error || 'Ошибка отправки приглашения')
      }
    } finally {
      setInviting(false)
    }
  }

  const handleLeaveGroup = async (group: OgonekGroup) => {
    if (!confirm(`Вы действительно хотите покинуть группу «${group.name}»?`)) return
    playClick(soundEnabled)
    const res = await leaveGroup(group.id)
    if (res.ok) {
      onNotify(`Вы вышли из группы «${group.name}»`)
      setSelectedGroup(null)
      await loadGroups()
    } else {
      onNotify(res.error || 'Ошибка при выходе из группы')
    }
  }

  const handleRemoveMember = async (groupId: string, memberId: string, memberName: string) => {
    if (!confirm(`Удалить участника ${memberName} из группы?`)) return
    playClick(soundEnabled)
    const res = await removeGroupMember(groupId, memberId)
    if (res.ok) {
      onNotify(`Участник ${memberName} исключён из группы`)
      await loadGroups()
    } else {
      onNotify(res.error || 'Ошибка исключения')
    }
  }

  // ==========================================================================
  // ВИД: ДЕТАЛИ ГРУППЫ
  // ==========================================================================
  if (selectedGroup) {
    const kindInfo = KIND_LABELS[selectedGroup.kind] || KIND_LABELS.custom
    const isOwner = selectedGroup.ownerId === currentUserId

    return (
      <div className="space-y-4">
        {/* Хедер группы */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface-subtle,#16181c)] border border-[var(--line)]">
          <div className="flex items-start justify-between gap-3 mb-3">
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                setSelectedGroup(null)
              }}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)] transition"
            >
              <ArrowLeft size={14} />
              <span>Все группы</span>
            </button>

            <div className="flex items-center gap-2">
              {selectedGroup.threadId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold gap-1.5 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/10"
                  onClick={() => {
                    playClick(soundEnabled)
                    onOpenChat?.(selectedGroup.threadId!)
                  }}
                >
                  <MessageCircle size={14} />
                  <span>Чат группы</span>
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-medium gap-1 text-[var(--muted)] hover:text-[var(--text)]"
                onClick={() => handleCopyInviteLink(selectedGroup)}
                title="Скопировать ссылку-приглашение (действует 7 дней)"
              >
                {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span className="hidden sm:inline">Ссылка</span>
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm border"
              style={{ backgroundColor: `${selectedGroup.color}20`, borderColor: `${selectedGroup.color}40` }}
            >
              {selectedGroup.avatar || '👥'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-[var(--text)] truncate">{selectedGroup.name}</h2>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: `${kindInfo.color}15`,
                    borderColor: `${kindInfo.color}30`,
                    color: kindInfo.color,
                  }}
                >
                  {kindInfo.label}
                </span>
                {isOwner && (
                  <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    Владелец
                  </span>
                )}
              </div>
              {selectedGroup.description && (
                <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-2">{selectedGroup.description}</p>
              )}
              <div className="text-xs text-[var(--muted)] mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {selectedGroup.membersCount || 1} участников (макс. {tierLimits.maxGroupMembers})
                </span>
              </div>
            </div>
          </div>

          {/* Вкладки внутри группы: Лента / Участники */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                setActiveGroupSubTab('feed')
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeGroupSubTab === 'feed'
                  ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              Лента записей
            </button>
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                setActiveGroupSubTab('members')
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeGroupSubTab === 'members'
                  ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              Участники ({selectedGroup.membersCount || 1})
            </button>

            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  playClick(soundEnabled)
                  setInviteModalOpen(true)
                }}
                className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1 font-medium"
              >
                <UserPlus size={13} />
                <span>Пригласить</span>
              </button>
              <button
                type="button"
                onClick={() => handleLeaveGroup(selectedGroup)}
                className="text-xs text-rose-400 hover:text-rose-300 ml-2"
                title="Покинуть группу"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Контент: Лента группы */}
        {activeGroupSubTab === 'feed' && (
          <div className="space-y-3">
            {feedLoading ? (
              <div className="py-8 text-center text-xs text-[var(--muted)]">Загрузка записей группы…</div>
            ) : groupFeed.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[var(--surface-subtle,#16181c)] border border-[var(--line)]">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto mb-3">
                  <Shield size={24} />
                </div>
                <h3 className="text-sm font-bold text-[var(--text)] mb-1">Пока нет записей</h3>
                <p className="text-xs text-[var(--muted)] max-w-sm mx-auto leading-relaxed">
                  Опубликуйте гордость или благодарность из композера, выбрав аудиторию «{selectedGroup.name}».
                </p>
              </div>
            ) : (
              groupFeed.map((entry) => {
                const isPride = entry.entryKind === 'pride'
                const dateLabel = new Date(entry.createdAtISO).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })

                return (
                  <div
                    key={`${entry.entryKind}_${entry.entryId}`}
                    className="p-4 rounded-xl bg-[var(--surface-subtle,#16181c)] border border-[var(--line)] space-y-2 hover:border-[var(--line-focus)] transition"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-300 overflow-hidden border border-zinc-700">
                          {entry.authorAvatar ? (
                            <img src={entry.authorAvatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            entry.authorName?.[0]?.toUpperCase() || '👤'
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-[var(--text)]">{entry.authorName}</span>
                          <span className="text-[var(--muted)] text-[11px] ml-1.5">@{entry.authorUsername}</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-[var(--muted)]">{dateLabel}</span>
                    </div>

                    <div className="text-sm text-[var(--text)] leading-relaxed pl-9">
                      <div className="flex items-start gap-2">
                        {isPride ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0 mt-0.5">
                            <Flame size={12} />
                            <span>{entry.scale}/10</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 shrink-0 mt-0.5">
                            <Heart size={12} />
                            <span>Спасибо</span>
                          </span>
                        )}
                        <span className="flex-1">{entry.text}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Контент: Участники группы */}
        {activeGroupSubTab === 'members' && (
          <div className="p-4 rounded-2xl bg-[var(--surface-subtle,#16181c)] border border-[var(--line)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Состав ({selectedGroup.membersCount || 1} из {tierLimits.maxGroupMembers})
              </h3>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs font-medium gap-1"
                onClick={() => setInviteModalOpen(true)}
              >
                <UserPlus size={12} />
                <span>Добавить соратника</span>
              </Button>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {/* Владелец */}
              <div className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs border border-amber-500/30">
                    👑
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                      <span>{isOwner ? 'Вы' : 'Владелец группы'}</span>
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono">
                        OWNER
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--muted)]">Полный доступ к настройкам</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Модалка приглашения соратника */}
        {inviteModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[var(--surface,#16181c)] border border-[var(--line)] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text)]">Пригласить в группу</h3>
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-[var(--muted)]">
                  Выберите соратника из вашего списка для добавления в «{selectedGroup.name}»:
                </p>

                {comrades.length === 0 ? (
                  <p className="text-xs text-amber-400">У вас пока нет взаимных соратников.</p>
                ) : (
                  <select
                    value={inviteSelectedComradeId}
                    onChange={(e) => setInviteSelectedComradeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elev)] border border-[var(--border)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                  >
                    <option value="">-- Выберите соратника --</option>
                    {comrades.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.display_name} (@{c.username})
                      </option>
                    ))}
                  </select>
                )}

                <div className="pt-2 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-9 text-xs"
                    onClick={() => setInviteModalOpen(false)}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="button"
                    disabled={!inviteSelectedComradeId || inviting}
                    className="flex-1 h-9 text-xs font-semibold"
                    onClick={handleInviteComrade}
                  >
                    {inviting ? 'Отправка…' : 'Пригласить'}
                  </Button>
                </div>

                <div className="pt-3 border-t border-[var(--border)] text-center">
                  <button
                    type="button"
                    onClick={() => handleCopyInviteLink(selectedGroup)}
                    className="text-xs text-[var(--primary)] hover:underline flex items-center justify-center gap-1 mx-auto"
                  >
                    <Copy size={12} />
                    <span>Или скопировать ссылку-приглашение</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ==========================================================================
  // ВИД: СПИСОК ВСЕХ ГРУПП ПОЛЬЗОВАТЕЛЯ
  // ==========================================================================
  return (
    <div className="space-y-4">
      {/* Верхний блок с квотой и кнопкой создания */}
      <div className="p-4 rounded-2xl bg-[var(--surface-subtle,#16181c)] border border-[var(--line)] flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
            <span>Ваши группы и круги</span>
            <span className="text-xs font-mono font-medium text-[var(--muted)]">
              ({ownedGroupsCount} из {tierLimits.maxGroupsOwned})
            </span>
          </h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Публикуйте гордости и благодарности для конкретных людей
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            playClick(soundEnabled)
            if (!canCreateGroup) {
              onNotify(`Для создания более ${tierLimits.maxGroupsOwned} групп перейдите на тариф Премиум или Ultra`)
              onNavigate('premium')
              return
            }
            setCreateModalOpen(true)
          }}
          className="h-8 text-xs font-semibold gap-1.5 shadow-sm"
        >
          <Plus size={14} />
          <span>Создать</span>
        </Button>
      </div>

      {/* Список групп */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[var(--muted)]">Загрузка групп…</div>
      ) : groups.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-[var(--surface-subtle,#16181c)] border border-[var(--line)]">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto mb-3 border border-purple-500/20 shadow-inner">
            <Shield size={28} />
          </div>
          <h3 className="text-base font-bold text-[var(--text)] mb-1">Создайте вашу первую группу</h3>
          <p className="text-xs text-[var(--muted)] max-w-md mx-auto leading-relaxed mb-4">
            Группа «Семья», «Спортсмены» или закрытый клуб соратников. Каждая гордость и благодарность может публиковаться в свою аудиторию.
          </p>
          <Button
            size="sm"
            onClick={() => {
              playClick(soundEnabled)
              setCreateModalOpen(true)
            }}
            className="text-xs font-semibold gap-1.5"
          >
            <Plus size={14} />
            <span>Создать группу</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {groups.map((g) => {
            const kindInfo = KIND_LABELS[g.kind] || KIND_LABELS.custom
            const isOwner = g.ownerId === currentUserId

            return (
              <div
                key={g.id}
                onClick={() => {
                  playClick(soundEnabled)
                  setSelectedGroup(g)
                }}
                className="p-4 rounded-2xl bg-[var(--surface-subtle,#16181c)] border border-[var(--line)] hover:border-[var(--line-focus)] cursor-pointer transition flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 border"
                    style={{ backgroundColor: `${g.color}20`, borderColor: `${g.color}40` }}
                  >
                    {g.avatar || '👥'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-[var(--text)] truncate">{g.name}</h4>
                      {isOwner && (
                        <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded">
                          Владелец
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--muted)] flex items-center gap-2 mt-0.5">
                      <span style={{ color: kindInfo.color }}>{kindInfo.label}</span>
                      <span>•</span>
                      <span>{g.membersCount || 1} участников</span>
                    </div>
                  </div>
                </div>

                <ChevronRight size={16} className="text-[var(--muted)] group-hover:text-[var(--text)] transition shrink-0" />
              </div>
            )
          })}
        </div>
      )}

      {/* Модалка создания группы */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[var(--surface,#16181c)] border border-[var(--line)] p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text)]">Создать группу</h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--muted)] block mb-1.5">
                  Название группы *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Семья, Спортклуб, Олимп"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elev)] border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--muted)] block mb-1.5">
                  Тип группы
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(KIND_LABELS) as GroupKind[]).map((k) => {
                    const info = KIND_LABELS[k]
                    const isSelected = newKind === k
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          playClick(soundEnabled)
                          setNewKind(k)
                        }}
                        className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-2 transition ${
                          isSelected
                            ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)] shadow-sm'
                            : 'bg-[var(--bg-elev)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                      >
                        <span>{info.icon}</span>
                        <span>{info.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--muted)] block mb-1.5">
                  Иконка группы
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewAvatar(emoji)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition ${
                        newAvatar === emoji
                          ? 'bg-purple-500/30 border-2 border-purple-500 scale-105'
                          : 'bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] border border-[var(--border)]'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--muted)] block mb-1.5">
                  Цвет группы
                </label>
                <div className="flex items-center gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        newColor === c ? 'scale-125 ring-2 ring-white/50' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--muted)] block mb-1.5">
                  Описание (необязательно)
                </label>
                <textarea
                  rows={2}
                  placeholder="О чём эта группа и для кого…"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elev)] border border-[var(--border)] text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--primary)] resize-none"
                />
              </div>

              {/* Выбор соратников для приглашения сразу */}
              {comrades.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-[var(--muted)] block mb-1.5">
                    Пригласить соратников сразу:
                  </label>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-[var(--bg-elev)] border border-[var(--border)]">
                    {comrades.map((c) => {
                      const isChecked = selectedComradeIds.includes(c.id)
                      return (
                        <label
                          key={c.id}
                          className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
                        >
                          <span className="text-[var(--text)] font-medium">
                            {c.display_name} (@{c.username})
                          </span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedComradeIds([...selectedComradeIds, c.id])
                              } else {
                                setSelectedComradeIds(selectedComradeIds.filter((id) => id !== c.id))
                              }
                            }}
                            className="rounded border-zinc-700 text-purple-600 focus:ring-0"
                          />
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-9 text-xs"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={!newName.trim() || isSubmitting}
                  className="flex-1 h-9 text-xs font-semibold"
                >
                  {isSubmitting ? 'Создание…' : 'Создать группу'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

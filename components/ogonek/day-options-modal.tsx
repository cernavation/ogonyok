'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useBodyScrollLock } from '@/lib/ogonek/use-body-scroll-lock'
import {
  Sparkles,
  Pencil,
  Share2,
  Trash2,
  AlertTriangle,
  X,
  Users,
  UsersRound,
  Check,
  Globe,
  Lock,
  Plus,
} from 'lucide-react'
import { normalizeVisibility, visibilityMeta } from '@/lib/ogonek/visibility'
import { playClick } from '@/lib/ogonek/sound'
import type { Day, VisibilityLevel, ChatGroupMeta } from '@/lib/ogonek/types'
import type { PrideEvaluation } from '@/lib/ogonek/evaluate-heuristic'
import { useOgonekStore, syncDayToSupabase } from '@/lib/ogonek/use-ogonek-store'
import { EvaluationCeremonyModal } from './evaluation-ceremony-modal'

export type DayOptionsModalProps = {
  isOpen: boolean
  day: Day
  onClose: () => void
  onEdit?: (day: Day) => void
  onShare?: (day: Day) => void
  onAiEvaluate?: (day: Day) => void
  onNotify?: (msg: string) => void
  soundEnabled?: boolean
}

export function DayOptionsModal({
  isOpen,
  day,
  onClose,
  onEdit,
  onShare,
  onAiEvaluate,
  onNotify,
  soundEnabled = true,
}: DayOptionsModalProps) {
  useBodyScrollLock(isOpen)
  const {
    state,
    setDayAudience,
    setAllPridesVisibility,
    deleteDay,
    updateDay,
    loadChatThreadsFromCloud,
  } = useOgonekStore()

  const dayVisibility = normalizeVisibility(day.visibility)

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showCeremony, setShowCeremony] = useState(false)
  const [draftVisibility, setDraftVisibility] = useState<VisibilityLevel>(dayVisibility)
  const [draftGroupId, setDraftGroupId] = useState<string | null>(day.groupId ?? null)
  const [draftGroupName, setDraftGroupName] = useState<string | undefined>(day.groupName)
  const [groupListExpanded, setGroupListExpanded] = useState(dayVisibility === 'group')
  const [syncedAllPrides, setSyncedAllPrides] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const curVis = normalizeVisibility(day.visibility)
    setDraftVisibility(curVis)
    setDraftGroupId(day.groupId ?? null)
    setDraftGroupName(day.groupName)
    setGroupListExpanded(curVis === 'group')
    setSyncedAllPrides(false)
    // Подтягиваем актуальный список групп из Supabase при открытии опций
    if (loadChatThreadsFromCloud) {
      void loadChatThreadsFromCloud().catch(() => {})
    }
  }, [isOpen, day.id, day.visibility, day.groupId, day.groupName, loadChatThreadsFromCloud])

  const userGroups = useMemo(() => {
    const threads = state.chatThreads ?? {}
    const seen = new Set<string>()
    const list: ChatGroupMeta[] = []
    Object.values(threads).forEach((t) => {
      if (t.groupMeta) {
        const key = t.groupMeta.dbId || t.groupMeta.id
        if (!seen.has(key)) {
          seen.add(key)
          list.push(t.groupMeta)
        }
      }
    })
    return list
  }, [state.chatThreads])

  const hasExistingEvaluation = useMemo(() => {
    if ((day as any).evaluated === true) return true
    if (typeof day.score === 'number' && day.score > 0) return true
    if (typeof day.aiScore === 'number' && day.aiScore > 0) return true
    if (typeof day.aiVerdict === 'string' && day.aiVerdict.trim().length > 0) return true
    return (day.prides || []).some(
      (p) =>
        p.text !== '—' &&
        ((typeof p.score === 'number' && p.score > 0) ||
          (typeof p.scale === 'number' && p.scale > 0))
    )
  }, [day])

  const selectedGroupMeta = useMemo(() => {
    if (draftVisibility !== 'group') return null
    return (
      userGroups.find(
        (g) =>
          (draftGroupId && (g.id === draftGroupId || g.dbId === draftGroupId)) ||
          (draftGroupName && g.title === draftGroupName)
      ) || null
    )
  }, [draftVisibility, userGroups, draftGroupId, draftGroupName])

  const currentAudienceLabel = useMemo(() => {
    if (draftVisibility === 'group') {
      const gTitle = selectedGroupMeta?.title || draftGroupName
      return gTitle ? `👥 ${gTitle}` : '👥 Группе'
    }
    if (draftVisibility === 'friends') return '👥 Друзьям'
    if (draftVisibility === 'private') return '🔒 Лично'
    return '🌐 Публично'
  }, [draftVisibility, selectedGroupMeta?.title, draftGroupName])

  const handleSelectAudience = async (mode: VisibilityLevel) => {
    playClick(soundEnabled)
    setDraftVisibility(mode)
    if (mode === 'group') {
      setGroupListExpanded(true)
      if (!draftGroupId && userGroups.length === 1) {
        const g = userGroups[0]
        setDraftGroupId(g.dbId || g.id)
        setDraftGroupName(g.title)
      }
      return
    }
    setGroupListExpanded(false)
    setDraftGroupId(null)
    setDraftGroupName(undefined)
  }

  const handleSelectGroup = async (g: ChatGroupMeta) => {
    playClick(soundEnabled)
    setDraftVisibility('group')
    setDraftGroupId(g.dbId || g.id)
    setDraftGroupName(g.title)
  }

  const handleApplyToAllPrides = async () => {
    playClick(soundEnabled)
    setSyncedAllPrides((v) => !v)
  }

  const handleSaveAndClose = async () => {
    playClick(soundEnabled)
    if (draftVisibility === 'group' && !draftGroupId) {
      onNotify?.('Выбери группу из списка')
      return
    }
    setIsSaving(true)
    try {
      const targetGid = draftVisibility === 'group' ? (selectedGroupMeta?.dbId || selectedGroupMeta?.id || draftGroupId) : null
      const targetGname = draftVisibility === 'group' ? (selectedGroupMeta?.title || draftGroupName) : undefined
      if (syncedAllPrides) {
        await setAllPridesVisibility(day.id, draftVisibility, targetGid, targetGname)
      } else {
        await setDayAudience(day.id, draftVisibility, targetGid, targetGname)
      }
      const label =
        draftVisibility === 'group'
          ? `группе «${targetGname || 'Группа'}»`
          : draftVisibility === 'friends'
          ? 'друзьям 👥'
          : draftVisibility === 'private'
          ? 'только лично 🔒'
          : 'публично 🌐'
      onNotify?.(
        syncedAllPrides
          ? `День #${day.id} и все гордости сохранены (${label})`
          : `Видимость дня #${day.id}: ${label}`
      )
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenCreateGroup = () => {
    playClick(soundEnabled)
    onClose()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ogonek:navigate-view', {
          detail: { view: 'messages' },
        })
      )
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('ogonek:open-group-creator'))
      }, 80)
    }
  }

  const handleOpenAiCeremony = () => {
    playClick(soundEnabled)
    const prides = (day.prides || [])
      .map((p) => p.text)
      .filter((t): t is string => Boolean(t && t !== '—'))

    if (prides.length === 0) {
      onNotify?.('Нет записей гордостей для оценки в этом дне')
      return
    }

    setShowCeremony(true)
  }

  const handleCeremonyAccept = async (
    evalMap: Record<number, PrideEvaluation>,
    mentorWord: string,
    averageScore: number
  ) => {
    const updatedPrides = (day.prides || []).map((p, idx) => {
      const ev = evalMap[idx]
      const itemScore = ev ? (typeof ev.score === 'number' ? ev.score : ev.scale) : (p.score ?? averageScore)
      return {
        ...p,
        score: itemScore,
        scale: Math.max(1, Math.min(10, Math.round(itemScore))),
      }
    })

    const updatedDay: Day = {
      ...day,
      score: averageScore,
      aiScore: averageScore,
      aiVerdict: mentorWord,
      prides: updatedPrides,
    }

    updateDay(updatedDay)
    await syncDayToSupabase(updatedDay).catch((err) => {
      console.warn('Supabase syncDayToSupabase background error:', err)
    })

    onNotify?.('✅ Запись успешно сохранена в облако Supabase')
    onAiEvaluate?.(updatedDay)
    setShowCeremony(false)
    onClose()
  }

  if (!isOpen) return null

  if (showCeremony) {
    return (
      <EvaluationCeremonyModal
        isOpen={true}
        prides={(day.prides || []).map((p) => p.text).filter((t): t is string => Boolean(t && t !== '—'))}
        gratitudes={(day.gratitudes || [])
          .map((g) => (typeof g === 'string' ? g : g.text))
          .filter((t): t is string => Boolean(t && t !== '—'))}
        dayNumber={day.id}
        soundEnabled={soundEnabled}
        onClose={() => {
          setShowCeremony(false)
          onClose()
        }}
        onAccept={handleCeremonyAccept}
        onNotify={onNotify}
      />
    )
  }

  const handleDeleteConfirm = async () => {
    playClick(soundEnabled)
    setIsDeleting(true)
    try {
      await deleteDay(day.id)
      onNotify?.(`День #${day.id} удалён из летописи`)
      setConfirmDeleteOpen(false)
      onClose()
    } catch (e) {
      console.error('Failed to delete day:', e)
      onNotify?.('Ошибка при удалении дня')
    } finally {
      setIsDeleting(false)
    }
  }

  const modes: Array<{
    id: VisibilityLevel
    label: string
    hint: string
    icon: React.ReactNode
    activeClass: string
  }> = [
    {
      id: 'private',
      label: 'Лично',
      hint: 'Только мне',
      icon: <Lock size={14} />,
      activeClass: 'border-white/40 bg-white/[0.12] text-white',
    },
    {
      id: 'friends',
      label: 'Друзьям',
      hint: 'Взаимным друзьям',
      icon: <Users size={14} />,
      activeClass: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300',
    },
    {
      id: 'group',
      label: 'Группе',
      hint: 'Выбрать группу',
      icon: <UsersRound size={14} />,
      activeClass: 'border-[#d76737]/60 bg-[#d76737]/15 text-[#e0784b]',
    },
    {
      id: 'public',
      label: 'Публично',
      hint: 'Видно всем',
      icon: <Globe size={14} />,
      activeClass: 'border-white/30 bg-white/[0.09] text-white',
    },
  ]

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-[4px]"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={`Опции дня #${day.id}`}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.14 }}
          className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-5 shadow-[0_24px_80px_rgba(0,0,0,0.95)] flex flex-col gap-3.5 bg-[#060608] border border-white/[0.14] text-[#e7e9ea]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Шапка модалки (без огромного фото-превью) */}
          <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.1]">
            <div className="flex items-center gap-2.5 min-w-0">
              <h3 className="font-bold text-white text-[16px]">
                Опции дня #{day.id}
              </h3>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-white/75 truncate">
                {currentAudienceLabel}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>
          </div>

          {/* Единый блок управления видимостью «Кому видно» */}
          <div className="rounded-2xl border border-white/[0.12] bg-black p-3.5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-bold text-white">Кому видно</span>
              <span className="text-[11px] text-[#71767b]">
                {draftVisibility === 'private'
                  ? 'Видно только тебе'
                  : draftVisibility === 'friends'
                  ? 'Попадёт в ленту «Друзья»'
                  : draftVisibility === 'group'
                  ? selectedGroupMeta?.title || draftGroupName
                    ? `Только группе «${selectedGroupMeta?.title || draftGroupName}»`
                    : 'Выбери группу ниже'
                  : 'Видно в подписках и профиле'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Кому видно день">
              {modes.map((m) => {
                const isSelected = m.id === 'group' ? (draftVisibility === 'group' || groupListExpanded) : (!groupListExpanded && draftVisibility === m.id)
                const isActiveMode = m.id === 'group' ? draftVisibility === 'group' || groupListExpanded : draftVisibility === m.id && !groupListExpanded
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={draftVisibility === m.id}
                    onClick={() => void handleSelectAudience(m.id)}
                    className={`flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                      isActiveMode || (isSelected && m.id === 'group' && groupListExpanded)
                        ? m.activeClass
                        : 'border-white/[0.1] bg-white/[0.02] text-white/75 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[12.5px] font-bold leading-tight">
                      {m.icon}
                      <span>{m.label}</span>
                    </div>
                    <span className="text-[10.5px] opacity-70 leading-tight truncate w-full">
                      {m.hint}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Раскрывающийся список групп при выборе режима «Группе» */}
            {groupListExpanded && (
              <div className="pt-2 border-t border-white/[0.08] flex flex-col gap-1.5 animate-in fade-in duration-150">
                {userGroups.length > 0 ? (
                  <>
                    <div className="text-[11px] font-semibold text-[#71767b] px-1">
                      Выбери группу для публикации:
                    </div>
                    <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-0.5">
                      {userGroups.map((g) => {
                        const isPicked =
                          draftVisibility === 'group' &&
                          ((draftGroupId && (draftGroupId === g.id || draftGroupId === g.dbId)) ||
                            (draftGroupName && draftGroupName === g.title))
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => void handleSelectGroup(g)}
                            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left text-[13px] transition-colors cursor-pointer ${
                              isPicked
                                ? 'border-[#d76737]/60 bg-[#d76737]/15 text-white font-semibold'
                                : 'border-white/[0.08] bg-white/[0.02] text-white/80 hover:bg-white/[0.06]'
                            }`}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              {g.avatarImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={g.avatarImage}
                                  alt={g.title}
                                  className="w-5 h-5 rounded-full object-cover shrink-0"
                                />
                              ) : (
                                <span className="text-base leading-none shrink-0">
                                  {g.avatarEmoji || '👥'}
                                </span>
                              )}
                              <span className="truncate">{g.title}</span>
                            </span>
                            {isPicked ? (
                              <span className="w-4 h-4 rounded-full bg-[#d76737] text-black flex items-center justify-center shrink-0">
                                <Check size={11} strokeWidth={3} />
                              </span>
                            ) : (
                              <span className="w-4 h-4 rounded-full border border-white/25 shrink-0" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                    <span className="text-[12.5px] text-white/70">
                      У тебя пока нет групп
                    </span>
                    <button
                      type="button"
                      onClick={handleOpenCreateGroup}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#d76737] hover:bg-[#e0784b] active:bg-[#bd562b] text-black text-[12px] font-bold transition-colors shrink-0 cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Создать группу</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Компактная строка синхронизации всех пунктов дня */}
            <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void handleApplyToAllPrides()}
                className={`inline-flex items-center gap-2 text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                  syncedAllPrides
                    ? 'text-emerald-400'
                    : 'text-white/75 hover:text-white'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                    syncedAllPrides
                      ? 'bg-emerald-500 border-emerald-500 text-black'
                      : 'border-white/30 bg-transparent'
                  }`}
                >
                  {syncedAllPrides && <Check size={11} strokeWidth={3} />}
                </span>
                <span>Применить ко всем гордостям дня</span>
              </button>
            </div>
          </div>

          {/* Действия дня */}
          <div className="flex flex-col gap-1">
            {!hasExistingEvaluation && (
              <button
                type="button"
                onClick={handleOpenAiCeremony}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left text-[13.5px] font-medium text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <Sparkles size={16} className="text-amber-400 shrink-0" />
                <span>Оценить с ИИ</span>
              </button>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  playClick(soundEnabled)
                  onClose()
                  onEdit(day)
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left text-[13.5px] font-medium text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <Pencil size={16} className="text-[#d76737] shrink-0" />
                <span>Редактировать день</span>
              </button>
            )}

            {onShare && (
              <button
                type="button"
                onClick={() => {
                  playClick(soundEnabled)
                  onClose()
                  onShare(day)
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left text-[13.5px] font-medium text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <Share2 size={16} className="text-emerald-400 shrink-0" />
                <span>Экспорт карточки (SVG / PNG)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                setConfirmDeleteOpen(true)
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left text-[13.5px] font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <Trash2 size={16} className="text-rose-500 shrink-0" />
              <span>Удалить этот день</span>
            </button>
          </div>

          {/* Явная кнопка Сохранить (#d76737 с чёрным текстом) */}
          <div className="pt-2 border-t border-white/[0.1] flex items-center gap-2.5">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="h-11 px-5 rounded-full border border-white/[0.14] bg-black hover:bg-white/[0.06] text-white/85 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handleSaveAndClose()}
              className="flex-1 h-11 rounded-full bg-[#d76737] hover:bg-[#e0784b] active:bg-[#bd562b] text-black text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check size={16} strokeWidth={2.8} />
              <span>{isSaving ? 'Сохранение…' : 'Сохранить'}</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Подтверждение удаления */}
      {confirmDeleteOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-[4px]"
          onClick={() => !isDeleting && setConfirmDeleteOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-sm rounded-2xl p-6 shadow-[0_24px_80px_rgba(0,0,0,0.95)] flex flex-col gap-4 border border-white/[0.14] bg-[#060608] text-center items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>

            <div className="flex flex-col gap-1.5">
              <h4 className="text-lg font-bold text-white leading-snug">
                Удалить День #{day.id} из летописи?
              </h4>
              <p className="text-sm text-[#71767b] leading-relaxed">
                Это действие нельзя отменить. Записи гордостей, благодарностей и прогресс стрика будут обновлены.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full mt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setConfirmDeleteOpen(false)}
                className="flex-1 py-2.5 rounded-full border border-white/[0.14] text-sm font-semibold text-white hover:bg-white/[0.06] transition-colors disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <Trash2 size={16} />
                <span>{isDeleting ? 'Удаление…' : 'Удалить'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}

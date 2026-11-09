'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Ban,
  Check,
  ChevronRight,
  Copy,
  Flag,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  QrCode,
  RotateCcw,
  Search,
  Share2,
  ShieldAlert,
  Sparkles,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  type ComradeProfile,
  type FriendshipStatus,
  type SocialCounts,
  blockUser,
  cancelFriendRequest,
  getSocialCounts,
  listComrades,
  listFriendRequests,
  removeFriend,
  reportTarget,
  respondFriendRequest,
  searchProfiles,
  sendFriendRequest,
  toggleFollowUser,
  unblockUser,
} from '@/lib/ogonek/social'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { getInitials } from '@/lib/ogonek/initials'
import type { ViewId } from '@/lib/ogonek/types'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { Tooltip } from '../tooltip'
import { Button } from '../ui'

type TabId = 'comrades' | 'requests' | 'search' | 'following' | 'groups'

interface Props {
  onNavigate: (view: ViewId) => void
  onOpenChat?: (userId: string) => void
  onOpenProfile?: (userId: string) => void
  onNotify: (msg: string) => void
  soundEnabled?: boolean
  initialTab?: TabId
}

export function ComradesView({
  onNavigate,
  onOpenChat,
  onOpenProfile,
  onNotify,
  soundEnabled = true,
  initialTab = 'comrades',
}: Props) {
  const { state, currentUser } = useOgonekStore()
  const currentUserId = currentUser?.id || state.auth?.activeAccountId || ''
  const currentUsername = currentUser?.username || state.profile?.username || 'user'

  const [activeTab, setActiveTab] = useState<TabId>(initialTab)
  const [requestsSubTab, setRequestsSubTab] = useState<'incoming' | 'outgoing'>('incoming')

  // Списки данных
  const [comrades, setComrades] = useState<ComradeProfile[]>([])
  const [incomingRequests, setIncomingRequests] = useState<ComradeProfile[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<ComradeProfile[]>([])
  const [searchResults, setSearchResults] = useState<ComradeProfile[]>([])
  const [socialCounts, setSocialCounts] = useState<SocialCounts>({
    friends: 0,
    incomingRequests: 0,
    outgoingRequests: 0,
    following: 0,
    followers: 0,
  })

  // Состояния загрузки
  const [loadingComrades, setLoadingComrades] = useState(true)
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState<Record<string, boolean>>({})

  // Поисковый инпут
  const [searchQuery, setSearchQuery] = useState('')
  const [localComradesFilter, setLocalComradesFilter] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Модальные окна
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [reportModalData, setReportModalData] = useState<{ userId: string; username: string } | null>(null)
  const [reportReason, setReportReason] = useState('Спам или реклама')
  const [reportDetails, setReportDetails] = useState('')
  const [reportSending, setReportSending] = useState(false)
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null)

  // 1. Загрузка счетчиков
  const refreshCounts = useCallback(async () => {
    if (!currentUserId) return
    const counts = await getSocialCounts(currentUserId)
    setSocialCounts(counts)
  }, [currentUserId])

  // 2. Загрузка списка взаимных соратников
  const loadComradesList = useCallback(async () => {
    setLoadingComrades(true)
    const res = await listComrades()
    if (res.ok) {
      setComrades(res.comrades)
    }
    setLoadingComrades(false)
  }, [])

  // 3. Загрузка заявок
  const loadRequestsList = useCallback(async () => {
    setLoadingRequests(true)
    const res = await listFriendRequests()
    if (res.ok) {
      setIncomingRequests(res.incoming)
      setOutgoingRequests(res.outgoing)
    }
    setLoadingRequests(false)
  }, [])

  // Первоначальная загрузка
  useEffect(() => {
    loadComradesList()
    refreshCounts()
  }, [loadComradesList, refreshCounts])

  // Загрузка при переключении табов
  useEffect(() => {
    if (activeTab === 'requests') {
      loadRequestsList()
    } else if (activeTab === 'search') {
      if (searchResults.length === 0 && !searchQuery) {
        performSearch('')
      }
    }
  }, [activeTab, loadRequestsList])

  // 4. Поиск с Debounce 300 мс
  const performSearch = useCallback(
    async (q: string) => {
      setSearching(true)
      setSearchError(null)
      const res = await searchProfiles({ query: q, limit: 30 })
      if (res.ok) {
        setSearchResults(res.profiles)
      } else {
        setSearchError(res.error || 'Ошибка поиска')
      }
      setSearching(false)
    },
    []
  )

  useEffect(() => {
    if (activeTab !== 'search') return
    const timer = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, activeTab, performSearch])

  // Установка фокуса при переходе на поиск
  const handleSwitchToSearch = () => {
    playClick(soundEnabled)
    setActiveTab('search')
    setTimeout(() => {
      searchInputRef.current?.focus()
    }, 100)
  }

  // Копирование ссылки-приглашения
  const handleCopyInviteLink = () => {
    playClick(soundEnabled)
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ogonek.app'
    const link = `${origin}/invite/${currentUsername}`
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(link)
    }
    playSuccess(soundEnabled)
    onNotify('Ссылка-приглашение скопирована в буфер обмена!')
  }

  // ДЕЙСТВИЯ: Отправка заявки
  const handleSendRequest = async (targetUser: ComradeProfile) => {
    playClick(soundEnabled)
    setActionInProgress((prev) => ({ ...prev, [targetUser.id]: true }))
    const res = await sendFriendRequest(targetUser.id)
    if (res.ok) {
      playSuccess(soundEnabled)
      onNotify(res.message || 'Заявка отправлена')
      // Обновляем статус в поиске
      setSearchResults((prev) =>
        prev.map((p) =>
          p.id === targetUser.id
            ? { ...p, friendship_status: res.status || 'pending_sent', friendship_id: res.id || p.friendship_id }
            : p
        )
      )
      refreshCounts()
    } else {
      onNotify(res.error || 'Не удалось отправить заявку')
    }
    setActionInProgress((prev) => ({ ...prev, [targetUser.id]: false }))
  }

  // ДЕЙСТВИЯ: Ответ на заявку (принять/отклонить)
  const handleRespondRequest = async (targetUser: ComradeProfile, accept: boolean) => {
    if (!targetUser.friendship_id) return
    playClick(soundEnabled)
    setActionInProgress((prev) => ({ ...prev, [targetUser.id]: true }))
    const res = await respondFriendRequest(targetUser.friendship_id, accept)
    if (res.ok) {
      playSuccess(soundEnabled)
      onNotify(res.message || (accept ? 'Заявка принята!' : 'Заявка отклонена'))
      // Убираем из входящих
      setIncomingRequests((prev) => prev.filter((p) => p.id !== targetUser.id))
      // Если приняли — добавляем в список соратников
      if (accept) {
        setComrades((prev) => [
          { ...targetUser, friendship_status: 'accepted', is_following: true },
          ...prev.filter((p) => p.id !== targetUser.id),
        ])
      }
      // Обновляем результаты поиска, если открыт
      setSearchResults((prev) =>
        prev.map((p) => (p.id === targetUser.id ? { ...p, friendship_status: accept ? 'accepted' : 'none' } : p))
      )
      refreshCounts()
    } else {
      onNotify(res.error || 'Ошибка обработки заявки')
    }
    setActionInProgress((prev) => ({ ...prev, [targetUser.id]: false }))
  }

  // ДЕЙСТВИЯ: Отмена заявки
  const handleCancelRequest = async (targetUser: ComradeProfile) => {
    playClick(soundEnabled)
    setActionInProgress((prev) => ({ ...prev, [targetUser.id]: true }))
    const res = await cancelFriendRequest(targetUser.id)
    if (res.ok) {
      playSuccess(soundEnabled)
      onNotify('Заявка отменена')
      setOutgoingRequests((prev) => prev.filter((p) => p.id !== targetUser.id))
      setSearchResults((prev) =>
        prev.map((p) => (p.id === targetUser.id ? { ...p, friendship_status: 'none', friendship_id: null } : p))
      )
      refreshCounts()
    } else {
      onNotify(res.error || 'Ошибка отмены заявки')
    }
    setActionInProgress((prev) => ({ ...prev, [targetUser.id]: false }))
  }

  // ДЕЙСТВИЯ: Удаление из соратников
  const handleRemoveFriend = async (targetUser: ComradeProfile) => {
    if (!confirm(`Удалить @${targetUser.username} из соратников?`)) return
    playClick(soundEnabled)
    setActionInProgress((prev) => ({ ...prev, [targetUser.id]: true }))
    const res = await removeFriend(targetUser.id)
    if (res.ok) {
      playSuccess(soundEnabled)
      onNotify('Пользователь удалён из соратников')
      setComrades((prev) => prev.filter((p) => p.id !== targetUser.id))
      setSearchResults((prev) =>
        prev.map((p) => (p.id === targetUser.id ? { ...p, friendship_status: 'none', friendship_id: null } : p))
      )
      refreshCounts()
    } else {
      onNotify(res.error || 'Ошибка удаления')
    }
    setActionInProgress((prev) => ({ ...prev, [targetUser.id]: false }))
    setActiveMenuUserId(null)
  }

  // ДЕЙСТВИЯ: Блокировка пользователя
  const handleBlockUser = async (targetUser: ComradeProfile) => {
    if (!confirm(`Заблокировать @${targetUser.username}? Он не сможет писать, звонить и видеть ваши записи.`)) return
    playClick(soundEnabled)
    setActionInProgress((prev) => ({ ...prev, [targetUser.id]: true }))
    const res = await blockUser(targetUser.id)
    if (res.ok) {
      playSuccess(soundEnabled)
      onNotify(`@${targetUser.username} заблокирован`)
      setComrades((prev) => prev.filter((p) => p.id !== targetUser.id))
      setIncomingRequests((prev) => prev.filter((p) => p.id !== targetUser.id))
      setOutgoingRequests((prev) => prev.filter((p) => p.id !== targetUser.id))
      setSearchResults((prev) => prev.filter((p) => p.id !== targetUser.id))
      refreshCounts()
    } else {
      onNotify(res.error || 'Ошибка блокировки')
    }
    setActionInProgress((prev) => ({ ...prev, [targetUser.id]: false }))
    setActiveMenuUserId(null)
  }

  // ДЕЙСТВИЯ: Подписка / Отписка
  const handleToggleFollow = async (targetUser: ComradeProfile) => {
    playClick(soundEnabled)
    setActionInProgress((prev) => ({ ...prev, [targetUser.id]: true }))
    const res = await toggleFollowUser(targetUser.id)
    if (res.ok) {
      playSuccess(soundEnabled)
      onNotify(res.message || 'Статус подписки обновлён')
      setSearchResults((prev) =>
        prev.map((p) => (p.id === targetUser.id ? { ...p, is_following: Boolean(res.following) } : p))
      )
      refreshCounts()
    } else {
      onNotify(res.error || 'Ошибка изменения подписки')
    }
    setActionInProgress((prev) => ({ ...prev, [targetUser.id]: false }))
    setActiveMenuUserId(null)
  }

  // ДЕЙСТВИЯ: Отправка жалобы
  const handleSendReport = async () => {
    if (!reportModalData) return
    setReportSending(true)
    const res = await reportTarget({
      targetType: 'user',
      targetId: reportModalData.userId,
      reason: reportReason,
      details: reportDetails,
    })
    setReportSending(false)
    if (res.ok) {
      onNotify('Жалоба отправлена модераторам')
      setReportModalData(null)
      setReportDetails('')
    } else {
      onNotify(res.error || 'Ошибка отправки жалобы')
    }
  }

  // Фильтрация локального списка соратников
  const filteredComrades = useMemo(() => {
    if (!localComradesFilter) return comrades
    const q = localComradesFilter.trim().toLowerCase()
    return comrades.filter(
      (c) =>
        c.username.toLowerCase().includes(q) ||
        c.display_name.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q))
    )
  }, [comrades, localComradesFilter])

  // Карточка человека
  const renderPersonCard = (person: ComradeProfile, context: 'comrade' | 'incoming' | 'outgoing' | 'search') => {
    const isBusy = actionInProgress[person.id]
    const initials = getInitials(person.display_name, person.username)
    const isUltra = person.subscription_tier === 'ultra' || person.is_founder
    const isPro = person.subscription_tier === 'pro'

    return (
      <div
        key={person.id}
        className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:border-white/20 transition-all duration-150 gap-3"
      >
        {/* Аватар + Информация */}
        <div
          className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
          onClick={() => onOpenProfile?.(person.id)}
        >
          <div className="relative shrink-0">
            {person.avatar_image ? (
              <img
                src={person.avatar_image}
                alt={person.display_name}
                className="w-12 h-12 rounded-full object-cover border border-white/10"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ff5c00] to-[#b33900] text-white flex items-center justify-center font-bold text-sm border border-white/10 shadow-sm">
                {initials}
              </div>
            )}
            {/* Кружок онлайна/офлайна */}
            <span
              className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[var(--surface)] bg-[#00ba7c]"
              title="В сети"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-[15px] text-[var(--text)] truncate max-w-[160px] sm:max-w-[220px]">
                {person.display_name}
              </span>
              {isUltra && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Sparkles size={10} /> ULTRA
                </span>
              )}
              {isPro && !isUltra && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  PRO
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-[var(--muted)] truncate">
              <span>@{person.username}</span>
              {person.city && <span>• {person.city}</span>}
              <span>• 🔥 {person.streak} дн.</span>
            </div>

            {person.bio && (
              <p className="text-xs text-[var(--muted)]/90 truncate mt-0.5 max-w-[280px] sm:max-w-[340px]">
                {person.bio}
              </p>
            )}
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Контекст: Взаимный соратник */}
          {context === 'comrade' && (
            <>
              {onOpenChat && (
                <button
                  type="button"
                  onClick={() => onOpenChat(person.id)}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-[var(--surface)] hover:bg-white/10 text-[var(--text)] border border-[var(--line)] flex items-center gap-1.5 text-xs font-semibold transition"
                  title="Написать сообщение"
                  aria-label="Написать сообщение"
                >
                  <MessageCircle size={15} />
                  <span className="hidden sm:inline">Написать</span>
                </button>
              )}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveMenuUserId(activeMenuUserId === person.id ? null : person.id)}
                  className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/10 transition"
                  aria-label="Действия"
                >
                  <MoreHorizontal size={18} />
                </button>
                {activeMenuUserId === person.id && (
                  <div className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-[#1e2025] border border-white/10 shadow-2xl p-1.5 z-40 text-xs">
                    <button
                      type="button"
                      onClick={() => handleRemoveFriend(person)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-rose-400 flex items-center gap-2 transition"
                    >
                      <UserMinus size={14} /> Удалить из соратников
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBlockUser(person)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-rose-400 flex items-center gap-2 transition"
                    >
                      <Ban size={14} /> Заблокировать
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReportModalData({ userId: person.id, username: person.username })
                        setActiveMenuUserId(null)
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-[var(--muted)] flex items-center gap-2 transition"
                    >
                      <Flag size={14} /> Пожаловаться
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Контекст: Входящая заявка */}
          {context === 'incoming' && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleRespondRequest(person, true)}
                disabled={isBusy}
                className="gap-1 text-xs"
              >
                {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
                Принять
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRespondRequest(person, false)}
                disabled={isBusy}
                className="text-xs text-rose-400 hover:text-rose-300"
              >
                Отклонить
              </Button>
            </div>
          )}

          {/* Контекст: Исходящая заявка */}
          {context === 'outgoing' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCancelRequest(person)}
              disabled={isBusy}
              className="text-xs text-[var(--muted)] hover:text-rose-400 gap-1"
            >
              {isBusy ? <Loader2 size={13} className="animate-spin" /> : <X size={14} />}
              Отменить
            </Button>
          )}

          {/* Контекст: Серверный поиск */}
          {context === 'search' && (
            <div className="flex items-center gap-2">
              {person.friendship_status === 'accepted' ? (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00ba7c]/15 text-[#00ba7c] text-xs font-bold border border-[#00ba7c]/30">
                  <UserCheck size={14} /> Соратник ✓
                </span>
              ) : person.friendship_status === 'pending_sent' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancelRequest(person)}
                  disabled={isBusy}
                  className="text-xs text-amber-400 border-amber-500/30 gap-1"
                >
                  {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
                  Заявка отправлена
                </Button>
              ) : person.friendship_status === 'pending_received' ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleRespondRequest(person, true)}
                    disabled={isBusy}
                    className="text-xs gap-1"
                  >
                    Принять
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRespondRequest(person, false)}
                    disabled={isBusy}
                    className="text-xs text-rose-400"
                  >
                    Отклонить
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSendRequest(person)}
                  disabled={isBusy}
                  className="text-xs gap-1.5"
                >
                  {isBusy ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={14} />}
                  Добавить
                </Button>
              )}

              {/* Меню дополнительных действий */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveMenuUserId(activeMenuUserId === person.id ? null : person.id)}
                  className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/10 transition"
                  aria-label="Опции пользователя"
                >
                  <MoreHorizontal size={18} />
                </button>
                {activeMenuUserId === person.id && (
                  <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-[#1e2025] border border-white/10 shadow-2xl p-1.5 z-40 text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleFollow(person)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-[var(--text)] flex items-center gap-2 transition"
                    >
                      {person.is_following ? <UserMinus size={14} /> : <UserPlus size={14} />}
                      {person.is_following ? 'Отписаться' : 'Подписаться'}
                    </button>
                    {onOpenChat && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenChat(person.id)
                          setActiveMenuUserId(null)
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-[var(--text)] flex items-center gap-2 transition"
                      >
                        <MessageCircle size={14} /> Написать
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleBlockUser(person)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-rose-400 flex items-center gap-2 transition"
                    >
                      <Ban size={14} /> Заблокировать
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReportModalData({ userId: person.id, username: person.username })
                        setActiveMenuUserId(null)
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-[var(--muted)] flex items-center gap-2 transition"
                    >
                      <Flag size={14} /> Пожаловаться
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg)] text-[var(--text)] max-w-full">
      {/* Шапка раздела */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-[var(--bg)]/85 border-b border-[var(--line)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Соратники</h1>
            <p className="text-xs text-[var(--muted)]">Круг взаимной поддержки и дисциплины</p>
          </div>
        </div>

        {/* Кнопка поделиться инвайт-ссылкой */}
        <button
          type="button"
          onClick={handleCopyInviteLink}
          className="px-3 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-white/10 border border-[var(--line)] text-xs font-semibold flex items-center gap-1.5 text-[var(--text)] transition"
          title="Скопировать ссылку-приглашение"
        >
          <Share2 size={14} />
          <span className="hidden sm:inline">Ссылка</span>
        </button>
      </div>

      {/* Навигационные табы */}
      <div className="flex border-b border-[var(--line)] bg-[var(--surface)]/50 px-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => {
            playClick(soundEnabled)
            setActiveTab('comrades')
          }}
          className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'comrades'
              ? 'border-[var(--primary)] text-[var(--text)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          Соратники
          {socialCounts.friends > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[11px] font-bold">
              {socialCounts.friends}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            playClick(soundEnabled)
            setActiveTab('requests')
          }}
          className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'border-[var(--primary)] text-[var(--text)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          Заявки
          {socialCounts.incomingRequests > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#ff5c00] text-white text-[11px] font-bold">
              {socialCounts.incomingRequests}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            playClick(soundEnabled)
            setActiveTab('search')
          }}
          className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'search'
              ? 'border-[var(--primary)] text-[var(--text)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <Search size={14} />
          Найти
        </button>

        <button
          type="button"
          onClick={() => {
            playClick(soundEnabled)
            setActiveTab('following')
          }}
          className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'following'
              ? 'border-[var(--primary)] text-[var(--text)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          Подписки
        </button>

        <button
          type="button"
          onClick={() => {
            playClick(soundEnabled)
            setActiveTab('groups')
          }}
          className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'groups'
              ? 'border-[var(--primary)] text-[var(--text)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          Группы
          <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
            Скоро
          </span>
        </button>
      </div>

      {/* ТЕЛО ВКЛАДОК */}
      <div className="p-4 sm:p-5 flex-1 max-w-3xl mx-auto w-full">
        {/* ============================================================== */}
        {/* ВКЛАДКА 1: СОРАТНИКИ */}
        {/* ============================================================== */}
        {activeTab === 'comrades' && (
          <div className="flex flex-col gap-4">
            {comrades.length > 0 && (
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="text"
                  value={localComradesFilter}
                  onChange={(e) => setLocalComradesFilter(e.target.value)}
                  placeholder="Поиск среди ваших соратников..."
                  className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
            )}

            {loadingComrades ? (
              <div className="flex items-center justify-center py-16 text-[var(--muted)] gap-2">
                <Loader2 size={20} className="animate-spin text-[var(--primary)]" />
                <span>Загрузка соратников...</span>
              </div>
            ) : filteredComrades.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {filteredComrades.map((c) => renderPersonCard(c, 'comrade'))}
              </div>
            ) : comrades.length === 0 ? (
              /* ОБЯЗАТЕЛЬНОЕ ПУСТОЕ СОСТОЯНИЕ (ТРЕБОВАНИЕ 3) */
              <div className="flex flex-col items-center text-center py-10 px-4 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 text-[var(--primary)] flex items-center justify-center mb-4 border border-[var(--primary)]/20 shadow-inner">
                  <Users size={32} />
                </div>
                <h2 className="text-xl font-bold mb-2">Соратников пока нет</h2>
                <p className="text-sm text-[var(--muted)] leading-relaxed mb-6">
                  Соратник видит записи с видимостью «Соратникам», может писать и звонить. Добавьте друзей для
                  совместной летописи побед.
                </p>

                {/* ТРИ КРУПНЫХ ДЕЙСТВИЯ */}
                <div className="flex flex-col gap-3 w-full">
                  <button
                    type="button"
                    onClick={handleSwitchToSearch}
                    className="flex items-center justify-between p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                        <Search size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[var(--text)] group-hover:text-[var(--primary)] transition">
                          Найти по нику
                        </div>
                        <div className="text-xs text-[var(--muted)]">Поиск соратников по всей базе «Огонька»</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-[var(--muted)] group-hover:translate-x-1 transition" />
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="flex items-center justify-between p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <Copy size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[var(--text)] group-hover:text-emerald-400 transition">
                          Скопировать ссылку-приглашение
                        </div>
                        <div className="text-xs text-[var(--muted)]">Отправьте персональную ссылку другу</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-[var(--muted)] group-hover:translate-x-1 transition" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClick(soundEnabled)
                      setQrModalOpen(true)
                    }}
                    className="flex items-center justify-between p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
                        <QrCode size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[var(--text)] group-hover:text-purple-400 transition">
                          Показать QR-код
                        </div>
                        <div className="text-xs text-[var(--muted)]">Для быстрого сканирования со смартфона</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-[var(--muted)] group-hover:translate-x-1 transition" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-[var(--muted)] text-sm">
                Никого не найдено по запросу «{localComradesFilter}»
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* ВКЛАДКА 2: ЗАЯВКИ */}
        {/* ============================================================== */}
        {activeTab === 'requests' && (
          <div className="flex flex-col gap-4">
            {/* Под-табы: Входящие / Исходящие */}
            <div className="flex bg-[var(--surface)] p-1 rounded-xl border border-[var(--line)]">
              <button
                type="button"
                onClick={() => setRequestsSubTab('incoming')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  requestsSubTab === 'incoming'
                    ? 'bg-[var(--primary)] text-white shadow'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                Входящие
                {incomingRequests.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-white text-[10px]">
                    {incomingRequests.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setRequestsSubTab('outgoing')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  requestsSubTab === 'outgoing'
                    ? 'bg-[var(--primary)] text-white shadow'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                Исходящие
                {outgoingRequests.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-white text-[10px]">
                    {outgoingRequests.length}
                  </span>
                )}
              </button>
            </div>

            {loadingRequests ? (
              <div className="flex items-center justify-center py-16 text-[var(--muted)] gap-2">
                <Loader2 size={20} className="animate-spin text-[var(--primary)]" />
                <span>Загрузка заявок...</span>
              </div>
            ) : requestsSubTab === 'incoming' ? (
              incomingRequests.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {incomingRequests.map((r) => renderPersonCard(r, 'incoming'))}
                </div>
              ) : (
                <div className="text-center py-12 text-[var(--muted)]">
                  <UserCheck size={36} className="mx-auto mb-2 opacity-40" />
                  <p className="font-semibold text-sm">Входящих заявок нет</p>
                  <p className="text-xs mt-1">Когда кто-то захочет стать вашим соратником, вы увидите заявку здесь.</p>
                </div>
              )
            ) : outgoingRequests.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {outgoingRequests.map((r) => renderPersonCard(r, 'outgoing'))}
              </div>
            ) : (
              <div className="text-center py-12 text-[var(--muted)]">
                <UserPlus size={36} className="mx-auto mb-2 opacity-40" />
                <p className="font-semibold text-sm">Нет исходящих заявок</p>
                <p className="text-xs mt-1">Вы ещё не отправляли заявок, ожидающих ответа.</p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* ВКЛАДКА 3: НАЙТИ (СЕРВЕРНЫЙ ПОИСК) */}
        {/* ============================================================== */}
        {activeTab === 'search' && (
          <div className="flex flex-col gap-4">
            {/* Поле поиска */}
            <div className="relative">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по никнейму, имени (например: Alexei Cerna) или городу..."
                className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-xl pl-11 pr-10 py-3 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--primary)] transition shadow-sm"
              />
              {searching ? (
                <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--primary)] animate-spin" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--muted)] hover:text-[var(--text)]"
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>

            {/* Результаты поиска */}
            {searchError ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between">
                <span>{searchError}</span>
                <Button variant="outline" size="sm" onClick={() => performSearch(searchQuery)}>
                  Повторить
                </Button>
              </div>
            ) : searching && searchResults.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-[var(--muted)] gap-2">
                <Loader2 size={20} className="animate-spin text-[var(--primary)]" />
                <span>Поиск по всей базе пользователей...</span>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                <div className="text-xs text-[var(--muted)] px-1">
                  Найдено пользователей: {searchResults.length}
                </div>
                {searchResults.map((p) => renderPersonCard(p, 'search'))}
              </div>
            ) : (
              <div className="text-center py-16 text-[var(--muted)]">
                <Search size={36} className="mx-auto mb-2 opacity-40" />
                <p className="font-semibold text-sm">Никого не найдено</p>
                <p className="text-xs mt-1">Попробуйте ввести другой никнейм или имя.</p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* ВКЛАДКА 4: ПОДПИСКИ */}
        {/* ============================================================== */}
        {activeTab === 'following' && (
          <div className="flex flex-col gap-4">
            <div className="text-xs text-[var(--muted)]">
              Подписки позволяют следить за публичными записями людей в отдельной ленте, не требуя обоюдного согласия.
            </div>

            {loadingComrades ? (
              <div className="flex items-center justify-center py-16 text-[var(--muted)]">
                <Loader2 size={20} className="animate-spin text-[var(--primary)]" />
              </div>
            ) : comrades.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {comrades.map((c) => renderPersonCard(c, 'comrade'))}
              </div>
            ) : (
              <div className="text-center py-12 text-[var(--muted)]">
                <p className="text-sm">Вы ещё ни на кого не подписаны</p>
                <Button variant="outline" size="sm" onClick={handleSwitchToSearch} className="mt-3">
                  Найти интересных людей
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* ВКЛАДКА 5: ГРУППЫ (ЗАГОТОВКА ЭТАПА 9) */}
        {/* ============================================================== */}
        {activeTab === 'groups' && (
          <div className="flex flex-col items-center text-center py-10 px-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 border border-amber-500/20 shadow-inner">
              <ShieldAlert size={32} />
            </div>
            <h2 className="text-xl font-bold mb-2">Группы и закрытые круги силы</h2>
            <p className="text-sm text-[var(--muted)] leading-relaxed mb-6">
              Скоро: закрытые чаты, общие челленджи и командная дисциплина. Вы сможете создавать группы до 25 (Премиум)
              или 100 участников (Ultra).
            </p>
            <Button variant="outline" onClick={() => onNavigate('premium')}>
              Узнать о лимитах групп в тарифах
            </Button>
          </div>
        )}
      </div>

      {/* МОДАЛЬНОЕ ОКНО QR-КОДА */}
      <AnimatePresence>
        {qrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl bg-[#16181c] border border-white/10 p-6 flex flex-col items-center text-center shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] transition"
                aria-label="Закрыть QR-код"
              >
                <X size={18} />
              </button>

              <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center mb-3">
                <QrCode size={24} />
              </div>

              <h3 className="text-lg font-bold">QR-код профиля</h3>
              <p className="text-xs text-[var(--muted)] mt-1 mb-5">
                Наведите камеру смартфона, чтобы открыть приглашение от @{currentUsername}
              </p>

              {/* QR Код (SVG) */}
              <div className="p-4 bg-white rounded-2xl shadow-md mb-5">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    `${typeof window !== 'undefined' ? window.location.origin : 'https://ogonek.app'}/invite/${currentUsername}`
                  )}`}
                  alt={`QR-код приглашения @${currentUsername}`}
                  className="w-[180px] h-[180px]"
                />
              </div>

              <Button variant="primary" className="w-full gap-2" onClick={handleCopyInviteLink}>
                <Copy size={16} /> Скопировать ссылку
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* МОДАЛЬНОЕ ОКНО ЖАЛОБЫ */}
      <AnimatePresence>
        {reportModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-[#16181c] border border-white/10 p-6 flex flex-col shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setReportModalData(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] transition"
                aria-label="Закрыть окно жалобы"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2.5 text-rose-400 mb-2 font-bold text-base">
                <Flag size={20} /> Пожаловаться на @{reportModalData.username}
              </div>
              <p className="text-xs text-[var(--muted)] mb-4">
                Наша команда рассматривает все обращения в течение 24 часов.
              </p>

              <label className="text-xs font-semibold text-[var(--muted)] mb-1">Причина жалобы</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text)] mb-3 focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="Спам или реклама">Спам или реклама</option>
                <option value="Оскорбительное поведение">Оскорбительное поведение</option>
                <option value="Подделка чужого аккаунта">Подделка чужого аккаунта</option>
                <option value="Неприемлемый контент">Неприемлемый контент</option>
                <option value="Другое">Другое</option>
              </select>

              <label className="text-xs font-semibold text-[var(--muted)] mb-1">Дополнительные детали (опционально)</label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                rows={3}
                placeholder="Опишите подробнее причину жалобы..."
                className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-xl p-3 text-xs text-[var(--text)] placeholder-[var(--muted)] mb-4 focus:outline-none focus:border-[var(--primary)] resize-none"
              />

              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setReportModalData(null)}>
                  Отмена
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSendReport}
                  disabled={reportSending}
                  className="bg-rose-600 hover:bg-rose-500 gap-1.5"
                >
                  {reportSending && <Loader2 size={13} className="animate-spin" />}
                  Отправить жалобу
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

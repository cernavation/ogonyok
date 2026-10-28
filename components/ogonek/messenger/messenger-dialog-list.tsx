'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronDown,
  FileText,
  Filter,
  Flame,
  Home,
  Image as ImageIcon,
  Mic,
  PenSquare,
  Pin,
  Plus,
  Search,
  Sparkles,
  Tag,
  VolumeX,
  X,
} from 'lucide-react'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { getFriend, presenceMeta } from '@/lib/ogonek/friends'
import {
  emptyThread,
  filterThreadsByFolder,
  formatThreadStamp,
  isGroupThread,
  lastMessage,
  sortThreadIds,
  summarizeMessage,
  threadTitle,
  unreadCount,
} from '@/lib/ogonek/messenger'
import { playClick } from '@/lib/ogonek/sound'
import type { ChatFolder, ChatTag, ChatThreads } from '@/lib/ogonek/types'
import { ChatAvatar } from './chat-avatar'
import { getProfile } from '@/lib/supabase/api'
import { getInitials } from '@/lib/ogonek/initials'

type Props = {
  activeThreadId: string | null
  onSelectThread: (threadId: string) => void
  onNewChat: () => void
  onNavigateHome?: () => void
  soundEnabled?: boolean
  className?: string
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getTargetUserId(id: string, currentUserId?: string | null): string {
  if (id.includes('_')) {
    const parts = id.split('_')
    return (currentUserId && parts.find((p) => p !== currentUserId)) || parts[0]
  }
  return id
}

export function MessengerDialogList({
  activeThreadId,
  onSelectThread,
  onNewChat,
  onNavigateHome,
  soundEnabled = true,
  className = '',
}: Props) {
  const { state, currentUser, setChatActiveFolderId, updateThreadPeerMeta } = useOgonekStore()
  const threads = state.chatThreads ?? {}
  const folders = state.chatFolders ?? []
  const activeFolderId = state.chatActiveFolderId ?? 'all'
  const tags: ChatTag[] = state.chatTags ?? []

  const [searchQuery, setSearchQuery] = useState('')
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)

  const allThreadIds = useMemo(() => Object.keys(threads || {}), [threads])
  const currentUserId = state.auth?.activeAccountId || currentUser?.id || null

  // Подтягивание имени и аватара собеседника из public.profiles Supabase для всех неизвестных ID (вместо сырых UUID)
  useEffect(() => {
    const isUuid = (s: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

    for (const id of allThreadIds) {
      if (id === 'saved-messages' || id.startsWith('group-') || getFriend(id)) continue
      const targetUserId = getTargetUserId(id, currentUserId)
      const thread = threads[id]
      if (thread?.peerMeta?.name && !isUuid(thread.peerMeta.name)) continue

      if (isUuid(targetUserId)) {
        getProfile(targetUserId).then((p) => {
          if (p) {
            updateThreadPeerMeta(id, {
              name: p.display_name || p.username || 'Собеседник',
              username: p.username || undefined,
              avatarUrl: p.avatar_image || undefined,
              initials: getInitials(p.display_name, p.username),
            })
          }
        }).catch(() => {})
      }
    }
  }, [allThreadIds, currentUserId, threads, updateThreadPeerMeta])

  // Фильтрация по выбранной папке/тегу
  const folderFilteredIds = useMemo(() => {
    return filterThreadsByFolder(threads || {}, allThreadIds || [], activeFolderId, folders || [])
  }, [threads, allThreadIds, activeFolderId, folders])

  // Поиск и сортировка диалогов (строго без сырых UUID!)
  const filteredThreads = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase()
    const safeThreads = threads || {}
    const sorted = sortThreadIds(safeThreads, folderFilteredIds || [])
    const isUuid = (s: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

    return (sorted || [])
      .map((id) => {
        if (!id) return null
        const thread = safeThreads[id] ?? emptyThread()
        const isGroup = isGroupThread(thread, id)
        const isSaved = id === 'saved-messages'
        const friend = !isGroup && !isSaved ? getFriend(id) : null

        let title = isSaved ? 'Избранное' : threadTitle(id, thread)
        let username = friend?.username || thread?.peerMeta?.username || null
        if (username && isUuid(username)) username = null
        if (title && isUuid(title)) title = username ? `@${username}` : 'Собеседник'

        return { id, isGroup, isSaved, friend, thread, title, username }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .filter(({ friend, thread, title, username }) => {
        if (!q) return true
        const last = lastMessage(thread)?.text ?? ''
        return (
          (title || '').toLowerCase().includes(q) ||
          Boolean(username && username.toLowerCase().includes(q)) ||
          Boolean(friend?.username && friend.username.toLowerCase().includes(q)) ||
          Boolean(thread?.peerMeta?.username && thread.peerMeta.username.toLowerCase().includes(q)) ||
          last.toLowerCase().includes(q)
        )
      })
  }, [threads, folderFilteredIds, searchQuery])

  // Метка текущего фильтра
  const activeFilterLabel = useMemo(() => {
    if (activeFolderId === 'all') return 'Все'
    if (activeFolderId === 'direct') return 'Личные'
    if (activeFolderId === 'groups') return 'Группы'
    if (activeFolderId === 'unread') return 'Непрочитанные'
    if (activeFolderId === 'pinned') return 'Закреплённые'
    if (activeFolderId === 'archived') return 'Архив'
    if (activeFolderId.startsWith('tag:')) {
      const tagId = activeFolderId.slice(4)
      const foundTag = tags.find((t) => t.id === tagId)
      return foundTag ? `#${foundTag.name}` : 'Тег'
    }
    const foundFolder = folders.find((f) => f.id === activeFolderId)
    return foundFolder?.title || 'Все'
  }, [activeFolderId, folders, tags])

  const FILTER_OPTIONS = [
    { id: 'all', label: 'Все диалоги', icon: Filter },
    { id: 'direct', label: 'Личные сообщения', icon: Sparkles },
    { id: 'groups', label: 'Группы', icon: Sparkles },
    { id: 'unread', label: 'Непрочитанные', icon: Flame },
    { id: 'pinned', label: 'Закреплённые', icon: Pin },
    { id: 'archived', label: 'Архив', icon: Archive },
  ]

  return (
    <div
      className={`w-full h-full flex flex-col bg-[var(--bg)] select-none shrink-0 min-w-0 ${className}`}
    >
      {/* 1. Верхняя панель: Заголовок «Чаты» 20px/800, пилюля-фильтр «Все ▾» и кнопка «Написать» */}
      <div className="h-[64px] px-3.5 sm:px-4 flex items-center justify-between border-b border-[var(--border)] shrink-0 gap-2 min-w-0 w-full">
        <div className="flex items-center gap-2 min-w-0">
          {onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] text-[var(--text)] border border-[var(--border)] transition-colors shrink-0 -ml-1"
              aria-label="Назад в ленту"
              title="Назад в ленту"
            >
              <ArrowLeft size={15} />
              <span>Назад в ленту</span>
            </button>
          )}
          <h1 className="text-[19px] sm:text-[20px] font-[800] text-[var(--text)] tracking-tight shrink-0">Чаты</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Пилюля-фильтр «Все ▾» */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                setFilterMenuOpen((v) => !v)
              }}
              className="h-[36px] px-3.5 rounded-full border border-[var(--border)] bg-[var(--bg-elev)] hover:bg-[var(--bg-hover)] text-[var(--text)] text-[14px] font-semibold flex items-center gap-1.5 transition-colors"
              aria-expanded={filterMenuOpen}
              aria-label="Фильтр диалогов"
            >
              <span className="truncate max-w-[110px]">{activeFilterLabel}</span>
              <ChevronDown size={14} className="text-[var(--text-2)] shrink-0" />
            </button>

            {/* Выпадающее меню фильтра */}
            {filterMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setFilterMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 backdrop-blur-md">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider">
                    Фильтры чатов
                  </div>

                  {FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        playClick(soundEnabled)
                        setChatActiveFolderId(opt.id)
                        setFilterMenuOpen(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${
                        activeFolderId === opt.id
                          ? 'bg-[var(--accent)] text-[var(--accent-text)] font-bold'
                          : 'text-[var(--text)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {activeFolderId === opt.id && <Check size={14} />}
                    </button>
                  ))}

                  {/* Пользовательские папки */}
                  {folders.length > 0 && (
                    <>
                      <div className="h-[1px] bg-[var(--border)] my-1" />
                      <div className="px-3 py-1 text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider">
                        Мои папки
                      </div>
                      {folders.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            playClick(soundEnabled)
                            setChatActiveFolderId(f.id)
                            setFilterMenuOpen(false)
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${
                            activeFolderId === f.id
                              ? 'bg-[var(--accent)] text-[var(--accent-text)] font-bold'
                              : 'text-[var(--text)] hover:bg-[var(--bg-hover)]'
                          }`}
                        >
                          <span className="truncate">{f.title}</span>
                          {activeFolderId === f.id && <Check size={14} />}
                        </button>
                      ))}
                    </>
                  )}

                  {/* Теги */}
                  {tags.length > 0 && (
                    <>
                      <div className="h-[1px] bg-[var(--border)] my-1" />
                      <div className="px-3 py-1 text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider">
                        Теги
                      </div>
                      {tags.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            playClick(soundEnabled)
                            setChatActiveFolderId(`tag:${t.id}`)
                            setFilterMenuOpen(false)
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${
                            activeFolderId === `tag:${t.id}`
                              ? 'bg-[var(--accent)] text-[var(--accent-text)] font-bold'
                              : 'text-[var(--text)] hover:bg-[var(--bg-hover)]'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: t.color }}
                            />
                            {t.name}
                          </span>
                          {activeFolderId === `tag:${t.id}` && <Check size={14} />}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Круглая кнопка «Написать» */}
          <button
            type="button"
            onClick={() => {
              playClick(soundEnabled)
              onNewChat()
            }}
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-sm"
            aria-label="Написать сообщение или создать группу"
            title="Написать"
          >
            <PenSquare size={18} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* 2. Поиск-пилюля 44px («Поиск» по людям и сообщениям) */}
      <div className="px-3.5 sm:px-4 py-2 border-b border-[var(--border)] shrink-0 w-full min-w-0">
        <div className="relative flex items-center h-[42px] w-full rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-3.5 focus-within:border-[var(--accent)] transition-colors min-w-0">
          <Search size={17} className="text-[var(--text-2)] shrink-0 mr-2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск людей и сообщений..."
            className="flex-1 min-w-0 bg-transparent text-[13px] text-[var(--text)] placeholder:text-[var(--text-2)] outline-none"
            aria-label="Поиск"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[var(--text-2)] hover:text-[var(--text)] p-1 ml-1 shrink-0"
              aria-label="Очистить поиск"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* 3. Список диалогов: строки по 84px с аватарами 56px */}
      <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-[var(--border)]/60" role="list">
        {filteredThreads.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[var(--text-2)]">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-elev)] border border-[var(--border)] flex items-center justify-center text-3xl mb-3">
              💬
            </div>
            <p className="text-[16px] font-bold text-[var(--text)] mb-1">
              {searchQuery ? 'Ничего не найдено' : 'Начни первый чат'}
            </p>
            <p className="text-[13px] text-[var(--text-2)] max-w-xs mb-4">
              {searchQuery
                ? 'Попробуй изменить поисковый запрос'
                : 'Выбери соратника из списка или создай группу для совместного стрика'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={onNewChat}
                className="px-5 py-2.5 rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-[13px] font-bold shadow-md hover:opacity-90 active:scale-95 transition-all"
              >
                Написать сообщение
              </button>
            )}
          </div>
        ) : (
          (filteredThreads || []).map((item) => {
            if (!item) return null
            const { id, isGroup, isSaved, friend, thread, title } = item
            const last = lastMessage(thread)
            const unread = unreadCount(thread)
            const hasDraft = Boolean(thread?.draft && thread.draft.trim().length > 0)
            const isMuted = Boolean(thread?.muted)
            const isPinned = Boolean(thread?.pinned)
            const isActive = activeThreadId === id
            const timeStamp = last?.createdAtISO ? formatThreadStamp(last.createdAtISO) : ''
            const rawUsername = friend?.username || thread?.peerMeta?.username
            const username = rawUsername && !UUID_REGEX.test(rawUsername) ? rawUsername : null

            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  playClick(soundEnabled)
                  onSelectThread(id)
                }}
                className={`w-full h-[84px] px-4 flex items-center gap-3.5 transition-colors text-left relative ${
                  isActive
                    ? 'bg-[var(--bg-elev)] hover:bg-[var(--bg-elev)]'
                    : 'hover:bg-[var(--bg-hover)]'
                }`}
                role="listitem"
                aria-label={`Диалог с ${title}`}
                data-thread-id={id}
              >
                {/* Аватар 56px */}
                <div className="relative shrink-0 w-[56px] h-[56px]">
                  {isSaved ? (
                    <div className="w-[56px] h-[56px] rounded-full bg-gradient-to-br from-[#c2410c] to-[#9a3412] flex items-center justify-center text-2xl shadow-md text-white">
                      ⭐️
                    </div>
                  ) : isGroup ? (
                    <div
                      className="w-[56px] h-[56px] rounded-full flex items-center justify-center text-2xl shadow-md"
                      style={{
                        background:
                          thread?.groupMeta?.avatarColor ||
                          'linear-gradient(135deg, #ff7a18 0%, #af002d 100%)',
                      }}
                    >
                      {thread?.groupMeta?.avatarEmoji || '👥'}
                    </div>
                  ) : (
                    <ChatAvatar friendId={id} size={56} ringColor="var(--bg)" />
                  )}
                </div>

                {/* Основная колонка: Имя + галочка, время справа, превью сообщения */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                  {/* Верхняя строка: Имя и Время */}
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="text-[15px] sm:text-[16px] font-[700] text-[var(--text)] truncate leading-tight">
                        {title}
                      </span>
                      {friend?.verified && (
                        <span className="w-4 h-4 rounded-full bg-[var(--accent)] text-white inline-flex items-center justify-center shrink-0">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </div>

                    {timeStamp && (
                      <span
                        suppressHydrationWarning
                        className="text-[12px] text-[var(--text-2)] shrink-0 font-medium whitespace-nowrap [font-variant-numeric:tabular-nums]"
                      >
                        {timeStamp}
                      </span>
                    )}
                  </div>

                  {/* Никнейм собеседника: @username */}
                  {username && (
                    <div className="text-[12px] text-[var(--text-2)] truncate leading-none font-medium">
                      @{username.replace(/^@/, '')}
                    </div>
                  )}

                  {/* Нижняя строка: Превью сообщения и значки статусов */}
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 text-[14px] text-[var(--text-2)] truncate min-w-0">
                      {/* Значки слева от превью */}
                      {isPinned && <Pin size={13} className="text-[var(--accent)] shrink-0" />}
                      {isMuted && <VolumeX size={13} className="text-[var(--text-2)] shrink-0" />}

                      {/* Текст последнего сообщения или Черновик */}
                      {hasDraft ? (
                        <span className="truncate">
                          <span className="text-[#f4212e] font-semibold mr-1">Черновик:</span>
                          <span className="text-[var(--text)]">{thread?.draft || ''}</span>
                        </span>
                      ) : last ? (
                        <span className="truncate flex items-center gap-1">
                          {last.authorId === 'me' && (
                            <span className="text-[var(--text-2)] shrink-0">
                              {last.read ? (
                                <CheckCheck size={14} className="text-[var(--accent)] inline" />
                              ) : (
                                <Check size={14} className="inline" />
                              )}
                            </span>
                          )}
                          {last.media?.type === 'audio' && (
                            <span className="flex items-center gap-1 text-[var(--accent)] shrink-0">
                              <Mic size={13} /> Голосовое
                            </span>
                          )}
                          {last.media?.type === 'image' && (
                            <span className="flex items-center gap-1 text-[var(--accent)] shrink-0">
                              <ImageIcon size={13} /> Фото
                            </span>
                          )}
                          {last.media?.type === 'file' && (
                            <span className="flex items-center gap-1 text-[var(--accent)] shrink-0">
                              <FileText size={13} /> Файл
                            </span>
                          )}
                          <span className="truncate">{last.text || summarizeMessage(last)}</span>
                        </span>
                      ) : (
                        <span className="text-[var(--text-2)] italic text-[13px]">Нет сообщений</span>
                      )}
                    </div>

                    {/* Счётчик непрочитанных: акцентный круг справа */}
                    {unread > 0 && (
                      <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-[12px] font-extrabold flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

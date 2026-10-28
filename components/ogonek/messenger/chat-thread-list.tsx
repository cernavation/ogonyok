'use client'

import { Archive, Check, CheckCheck, Clock, Pin, Search, VolumeX, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { getFriend, presenceMeta } from '@/lib/ogonek/friends'
import {
  emptyThread,
  filterThreadsByFolder,
  isGroupThread,
  lastMessage,
  sortThreadIds,
  summarizeMessage,
  threadTitle,
  totalUnread,
  unreadCount,
} from '@/lib/ogonek/messenger'
import { playClick } from '@/lib/ogonek/sound'
import type { ChatFolder, ChatThreads } from '@/lib/ogonek/types'
import { ChatAvatar } from './chat-avatar'
import { ChatFoldersBar } from './chat-folders-bar'

type Props = {
  threads: ChatThreads
  activeFriendId: string | null
  onSelect: (friendId: string) => void
  onMarkAllRead: () => void
  folders?: ChatFolder[]
  activeFolderId?: string
  onSelectFolder?: (folderId: string) => void
  onSaveCustomFolder?: (folder: ChatFolder) => void
  onDeleteCustomFolder?: (folderId: string) => void
  soundEnabled?: boolean
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function ChatThreadList({
  threads,
  activeFriendId,
  onSelect,
  onMarkAllRead,
  folders = [],
  activeFolderId = 'all',
  onSelectFolder,
  onSaveCustomFolder,
  onDeleteCustomFolder,
  soundEnabled = true,
}: Props) {
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const allIds = useMemo(() => Object.keys(threads || {}), [threads])
  const unreadTotal = useMemo(() => totalUnread(threads || {}), [threads])

  // Filter by folder first
  const folderFilteredIds = useMemo(() => {
    return filterThreadsByFolder(threads || {}, allIds, activeFolderId, folders || [])
  }, [threads, allIds, activeFolderId, folders])

  // Split into active and archived
  const { activeIds, archivedIds } = useMemo(() => {
    const act: string[] = []
    const arc: string[] = []
    const safe = threads || {}
    for (const id of folderFilteredIds) {
      if (safe[id]?.archived) arc.push(id)
      else act.push(id)
    }
    return { activeIds: act, archivedIds: arc }
  }, [folderFilteredIds, threads])

  const targetIds = showArchived ? archivedIds : activeIds

  const rows = useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    const safeThreads = threads || {}
    const isUuid = (s: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

    return sortThreadIds(safeThreads, targetIds)
      .map((id) => {
        if (!id) return null
        const thread = safeThreads[id] ?? emptyThread()
        const isGroup = isGroupThread(thread, id)
        const friend = !isGroup ? getFriend(id) : null
        let title = threadTitle(id, thread)
        let username = friend?.username || thread?.peerMeta?.username || null
        if (username && isUuid(username)) username = null
        if (title && isUuid(title)) title = username ? `@${username}` : 'Собеседник'
        return { id, isGroup, friend, thread, title, username }
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
          Boolean(friend?.city && friend.city.toLowerCase().includes(q)) ||
          last.toLowerCase().includes(q)
        )
      })
  }, [threads, targetIds, query])

  return (
    <div className="msgr__sidebar flex flex-col h-full w-full bg-[var(--bg)] select-none">
      {/* Шапка: поиск и папки-вкладки как в Telegram Web */}
      <div className="msgr__sidebar-head border-b border-[var(--border)] p-2.5 pb-0">
        <div className="relative mb-2 flex items-center">
          <Search size={16} className="absolute left-3 text-[var(--text-2)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск диалогов или людей..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface2)] py-2 pl-9 pr-8 text-xs text-[var(--text)] placeholder-[var(--text-2)] outline-none transition-colors focus:border-[var(--accent)]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2.5 text-[#71767b] hover:text-white"
              aria-label="Очистить поиск"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Папки-вкладки Telegram (Все, Личные, Группы, Непрочитанные + кастомные) */}
        {onSelectFolder && onSaveCustomFolder && onDeleteCustomFolder && (
          <ChatFoldersBar
            threads={threads}
            activeFolderId={activeFolderId}
            folders={folders}
            onSelectFolder={onSelectFolder}
            onSaveCustomFolder={onSaveCustomFolder}
            onDeleteCustomFolder={onDeleteCustomFolder}
            soundEnabled={soundEnabled}
          />
        )}
      </div>

      {/* Список диалогов */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar" role="list">
        {/* Кнопка перехода в Архив, если есть архивированные чаты */}
        {archivedIds.length > 0 && (
          <button
            type="button"
            onClick={() => {
              playClick(soundEnabled)
              setShowArchived((v) => !v)
            }}
            className="flex w-full items-center justify-between border-b border-white/5 px-4 py-2.5 text-xs text-[#71767b] hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Archive size={15} />
              <span className="font-medium">{showArchived ? '← Назад ко всем чатам' : 'Архив чатов'}</span>
            </div>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold">
              {archivedIds.length}
            </span>
          </button>
        )}

        {rows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs text-[#71767b]">
              {query
                ? 'Ничего не найдено'
                : activeFolderId === 'unread'
                ? 'Всё прочитано — ни одного непрочитанного сообщения 🔥'
                : activeFolderId === 'groups'
                ? 'В этой папке пока нет групп. Нажми «Написать» → «Создать группу».'
                : 'У вас пока нет активных диалогов'}
            </p>
          </div>
        ) : (
          rows.map(({ id, isGroup, friend, thread, title }) => {
            const last = lastMessage(thread)
            const unread = unreadCount(thread)
            const presence = friend ? presenceMeta(friend.presence) : null
            const preview = summarizeMessage(last)
            const isMine = last?.authorId === 'me'
            const isMuted = Boolean(thread?.muted)
            const isPinned = Boolean(thread?.pinned)
            const rawUsername = friend?.username || thread?.peerMeta?.username
            const username = rawUsername && !UUID_REGEX.test(rawUsername) ? rawUsername : null

            return (
              <button
                key={id}
                type="button"
                role="listitem"
                className={`relative flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors border-b border-[var(--border)] ${
                  activeFriendId === id
                    ? 'bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)]'
                    : 'hover:bg-[var(--bg-hover)]'
                }`}
                onClick={() => onSelect(id)}
                aria-label={`Диалог с ${title}${unread > 0 ? `, ${unread} непрочитанных` : ''}`}
              >
                {/* Аватар (личный или группы) */}
                <div className="relative shrink-0">
                  {isGroup ? (
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full text-xl border border-[var(--line)] bg-[var(--surface2)]"
                      style={{
                        background: thread?.groupMeta?.avatarColor || undefined,
                      }}
                    >
                      {thread?.groupMeta?.avatarEmoji || '👥'}
                    </div>
                  ) : (
                    <ChatAvatar friendId={id} size={48} ringColor="var(--bg)" />
                  )}
                  {presence?.short === 'онлайн' && (
                    <span
                      className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[var(--bg)] bg-[#00ba7c]"
                      title="Онлайн"
                    />
                  )}
                </div>

                {/* Тело строки диалога */}
                <div className="flex flex-1 flex-col min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="truncate text-[14px] font-semibold text-[var(--text)] flex items-center gap-1">
                      {title}
                      {friend?.verified && (
                        <Check size={11} className="text-[var(--accent)] inline-block" />
                      )}
                    </span>
                    <span className="shrink-0 text-[11px] font-mono text-[var(--text-2)]">
                      {last?.createdAtISO
                        ? new Date(last.createdAtISO).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </span>
                  </div>

                  {username && (
                    <div className="text-[11px] text-[var(--text-2)] truncate leading-none mb-1 font-medium">
                      @{username.replace(/^@/, '')}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-xs text-[var(--text-2)] flex items-center gap-1">
                      {isMine && (
                        <span className="text-[var(--text-2)] shrink-0">
                          {last?.read ? (
                            <CheckCheck size={13} className="text-[#66ffd9] inline" />
                          ) : (
                            <Check size={12} className="inline" />
                          )}
                        </span>
                      )}
                      <span className="truncate">{preview}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {Boolean(thread?.muted) && <VolumeX size={13} className="text-[#71767b]" />}
                      {Boolean(thread?.pinned) && (
                        <Pin size={12} className="rotate-45 text-[#ffad5a]" fill="currentColor" />
                      )}
                      {unread > 0 && (
                        <span
                          className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                            thread?.muted
                              ? 'bg-[#2f3336] text-[#71767b]'
                              : 'bg-[#ff7a18] text-white shadow-sm'
                          }`}
                        >
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Подвал сайдбара: Прочитать все */}
      {unreadTotal > 0 && (
        <div className="border-t border-[var(--border)] p-2 bg-[var(--bg-elev)]">
          <button
            type="button"
            onClick={onMarkAllRead}
            className="flex w-full items-center justify-center gap-2 rounded-full py-2 min-h-[36px] sm:min-h-[34px] text-[13px] font-semibold text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)] transition-colors"
          >
            <CheckCheck size={16} />
            <span>Прочитать все ({unreadTotal})</span>
          </button>
        </div>
      )}
    </div>
  )
}

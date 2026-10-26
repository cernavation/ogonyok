'use client'

import { FolderPlus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { DEFAULT_CHAT_FOLDERS, filterThreadsByFolder, unreadCountForFolder } from '@/lib/ogonek/messenger'
import { playClick } from '@/lib/ogonek/sound'
import type { ChatFolder, ChatThreads } from '@/lib/ogonek/types'
import { ChatFolderModal } from './chat-folder-modal'

type Props = {
  threads: ChatThreads
  activeFolderId: string
  folders?: ChatFolder[]
  onSelectFolder: (folderId: string) => void
  onSaveCustomFolder: (folder: ChatFolder) => void
  onDeleteCustomFolder: (folderId: string) => void
  soundEnabled?: boolean
}

export function ChatFoldersBar({
  threads,
  activeFolderId,
  folders = [],
  onSelectFolder,
  onSaveCustomFolder,
  onDeleteCustomFolder,
  soundEnabled = true,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  const allFolders: ChatFolder[] = useMemo(() => {
    const list = folders.length > 0 ? folders : DEFAULT_CHAT_FOLDERS
    // Ensure all built-in exist
    const builtInIds = new Set(DEFAULT_CHAT_FOLDERS.map((f) => f.id))
    const userCustom = list.filter((f) => !builtInIds.has(f.id))
    return [...DEFAULT_CHAT_FOLDERS, ...userCustom]
  }, [folders])

  const chatIds = useMemo(() => Object.keys(threads || {}), [threads])

  return (
    <div className="relative border-b border-[var(--border)] bg-[var(--bg-elev)]">
      <div className="flex items-center justify-between px-2 gap-2">
        <div className="flex flex-1 items-center gap-2 overflow-x-auto no-scrollbar py-2 scroll-smooth min-w-0" role="tablist" aria-label="Папки чатов">
          {(allFolders || []).map((f) => {
            if (!f) return null
            const isActive = activeFolderId === f.id
            const count = unreadCountForFolder(threads || {}, chatIds, f.id, folders || [])
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  playClick(soundEnabled)
                  onSelectFolder(f.id)
                }}
                className={`relative flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 min-h-[36px] sm:min-h-[34px] text-[13px] font-bold transition-all ${
                  isActive
                    ? 'bg-[var(--text)] text-[var(--bg)] shadow-sm'
                    : 'text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]'
                }`}
              >
                {f.icon && <span className="text-xs">{f.icon}</span>}
                <span>{f.title}</span>
                {count > 0 && (
                  <span
                    className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[11px] font-bold ${
                      isActive ? 'bg-[var(--bg)] text-[var(--text)]' : 'bg-[var(--surface2)] text-[var(--text)]'
                    }`}
                  >
                    {count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[var(--accent)]" />
                )}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            playClick(soundEnabled)
            setModalOpen(true)
          }}
          className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)] transition-colors min-h-[36px] min-w-[36px]"
          title="Настроить папки"
          aria-label="Настроить папки"
        >
          <FolderPlus size={17} />
        </button>
      </div>

      {modalOpen && (
        <ChatFolderModal
          folders={allFolders}
          threads={threads}
          onSave={(folder) => {
            onSaveCustomFolder(folder)
          }}
          onDelete={(id) => {
            onDeleteCustomFolder(id)
          }}
          onClose={() => setModalOpen(false)}
          soundEnabled={soundEnabled}
        />
      )}
    </div>
  )
}

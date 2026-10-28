'use client'

import { Folder, Plus, Trash2, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'

import { FRIEND_PROFILES } from '@/lib/ogonek/friends'
import { threadTitle } from '@/lib/ogonek/messenger'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { ChatFolder, ChatThreads } from '@/lib/ogonek/types'

type Props = {
  folders: ChatFolder[]
  threads: ChatThreads
  onSave: (folder: ChatFolder) => void
  onDelete: (folderId: string) => void
  onClose: () => void
  soundEnabled?: boolean
}

const FOLDER_ICONS = ['📁', '⭐️', '🔥', '👥', '💼', '🎯', '🌱', '⚡️', '❤️', '🏆']

export function ChatFolderModal({
  folders,
  threads,
  onSave,
  onDelete,
  onClose,
  soundEnabled = true,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [icon, setIcon] = useState('📁')
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([])

  const customFolders = folders.filter((f) => !f.isBuiltIn)
  const allChatIds = Object.keys(threads)

  const startCreate = () => {
    playClick(soundEnabled)
    setEditingId('new')
    setTitle('')
    setIcon('📁')
    setSelectedChatIds([])
  }

  const startEdit = (f: ChatFolder) => {
    playClick(soundEnabled)
    setEditingId(f.id)
    setTitle(f.title)
    setIcon(f.icon || '📁')
    setSelectedChatIds(f.chatIds ?? [])
  }

  const toggleChat = (id: string) => {
    setSelectedChatIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSave = () => {
    const cleanTitle = title.trim()
    if (!cleanTitle) return
    const id = editingId === 'new' ? `folder-${Date.now().toString(36)}` : editingId!
    onSave({
      id,
      title: cleanTitle,
      icon,
      chatIds: selectedChatIds,
      isBuiltIn: false,
      type: 'custom',
    })
    playSuccess(soundEnabled)
    setEditingId(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#16181c] shadow-2xl text-[#e7e9ea]"
        role="dialog"
        aria-modal="true"
        aria-label="Настройка папок чатов"
      >
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff7a18]/15 text-[#ffad5a]">
              <Folder size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Папки чатов</h2>
              <p className="text-xs text-[#71767b]">Группируй переписки как в Telegram</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#71767b] hover:bg-white/10 hover:text-white"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {editingId ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#71767b]">Название папки</label>
                <div className="flex gap-2">
                  <div className="flex items-center justify-center rounded-xl border border-white/10 bg-black/30 px-3 text-xl">
                    {icon}
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Например: Соратники, Семья..."
                    className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3.5 py-2 text-sm text-white placeholder-[#71767b] outline-none focus:border-[#ff7a18]"
                    maxLength={30}
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#71767b]">Иконка</label>
                <div className="flex flex-wrap gap-2">
                  {FOLDER_ICONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setIcon(emoji)}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-base transition-all ${
                        icon === emoji
                          ? 'border border-[#ff7a18] bg-[#ff7a18]/20 scale-105'
                          : 'border border-white/5 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#71767b]">
                  Чаты в папке ({selectedChatIds.length})
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-white/10 bg-black/20 p-2">
                  {allChatIds.length === 0 ? (
                    <p className="p-3 text-center text-xs text-[#71767b]">Нет активных чатов</p>
                  ) : (
                    allChatIds.map((id) => {
                      const thread = threads[id]
                      const name = threadTitle(id, thread)
                      const isSelected = selectedChatIds.includes(id)
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleChat(id)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                            isSelected
                              ? 'bg-[#ff7a18]/15 text-[#ffad5a] font-medium'
                              : 'text-[#e7e9ea] hover:bg-white/5'
                          }`}
                        >
                          <span className="truncate">{name}</span>
                          <span className="text-xs">
                            {isSelected ? '✓' : '+'}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="flex-1 rounded-xl border border-white/10 py-2 text-xs font-medium text-[#71767b] hover:bg-white/5 hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!title.trim()}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#ff7a18] to-[#af002d] py-2 text-xs font-semibold text-white shadow hover:opacity-90 disabled:opacity-40"
                >
                  Сохранить
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-[#71767b]">
                  <span>Пользовательские папки</span>
                  <span>{customFolders.length}</span>
                </div>

                {customFolders.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 p-5 text-center">
                    <p className="text-xs text-[#71767b]">
                      У тебя пока нет своих папок. Создай первую, чтобы сортировать чаты по проектам и темам!
                    </p>
                  </div>
                ) : (
                  customFolders.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-3 hover:bg-white/[0.06] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg">{f.icon || '📁'}</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{f.title}</p>
                          <p className="text-xs text-[#71767b]">
                            {f.chatIds?.length ?? 0} {f.chatIds?.length === 1 ? 'чат' : 'чатов'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(f)}
                          className="rounded-lg px-2.5 py-1 text-xs text-[#ffad5a] hover:bg-[#ff7a18]/10"
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(f.id)}
                          className="rounded-lg p-1.5 text-[#71767b] hover:bg-red-500/10 hover:text-red-400"
                          aria-label="Удалить папку"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={startCreate}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-2.5 text-xs font-medium text-[#ffad5a] hover:border-[#ff7a18] hover:bg-[#ff7a18]/5 transition-colors"
              >
                <Plus size={15} />
                Создать новую папку
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

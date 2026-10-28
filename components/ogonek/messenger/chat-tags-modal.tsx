'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Plus, Tag, Trash2, X } from 'lucide-react'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { playClick } from '@/lib/ogonek/sound'
import type { ChatTag } from '@/lib/ogonek/types'

type Props = {
  friendId: string
  onClose: () => void
  soundEnabled?: boolean
}

const TAG_COLORS = [
  '#ff7a18',
  '#00ba7c',
  '#1d9bf0',
  '#ffd400',
  '#f4212e',
  '#a855f7',
  '#ec4899',
  '#71767b',
]

export function ChatTagsModal({ friendId, onClose, soundEnabled = true }: Props) {
  const { state, setChatTag, deleteChatTag, assignChatTag } = useOgonekStore()
  const tags: ChatTag[] = state.chatTags ?? []
  const thread = state.chatThreads?.[friendId]
  const assignedTagIds = thread?.tagIds ?? []

  const [newTagName, setNewTagName] = useState('')
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0])
  const [creating, setCreating] = useState(false)

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = newTagName.trim()
    if (!clean) return
    playClick(soundEnabled)

    const tag: ChatTag = {
      id: `tag-${Date.now().toString(36)}`,
      name: clean,
      color: selectedColor,
    }
    setChatTag(tag)
    assignChatTag(friendId, tag.id)
    setNewTagName('')
    setCreating(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-2xl flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Tag size={20} className="text-[var(--accent)]" />
            <h3 className="text-base font-bold text-[var(--text)]">Теги диалога</h3>
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

        <div className="py-3 flex-1 overflow-y-auto no-scrollbar space-y-2">
          {tags.length === 0 && !creating ? (
            <div className="p-6 text-center text-xs text-[var(--text-2)]">
              У вас пока нет тегов. Создайте первый тег (например: «Работа», «Семья», «Коучинг»).
            </div>
          ) : (
            tags.map((tag) => {
              const isAssigned = assignedTagIds.includes(tag.id)
              return (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => {
                      playClick(soundEnabled)
                      assignChatTag(friendId, tag.id)
                    }}
                    className="flex-1 flex items-center gap-2.5 text-left text-xs font-semibold text-[var(--text)]"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span>{tag.name}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {isAssigned && (
                      <span className="w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center shrink-0">
                        <Check size={13} strokeWidth={3} />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        playClick(soundEnabled)
                        deleteChatTag(tag.id)
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-2)] hover:text-red-400 hover:bg-red-500/10"
                      aria-label="Удалить тег"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })
          )}

          {creating ? (
            <form onSubmit={handleCreate} className="pt-2 border-t border-[var(--border)] space-y-3">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Название тега..."
                className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
                maxLength={30}
                autoFocus
              />

              <div className="flex items-center gap-2 flex-wrap">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      selectedColor === c ? 'scale-125 ring-2 ring-white shadow-md' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 h-9 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] text-xs font-bold shadow hover:opacity-90 transition-all"
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="px-3 h-9 rounded-xl border border-[var(--border)] text-xs text-[var(--text-2)] hover:text-[var(--text)]"
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                setCreating(true)
              }}
              className="w-full py-2.5 rounded-xl border border-dashed border-[var(--border)] hover:border-[var(--accent)] text-xs font-bold text-[var(--accent)] flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus size={16} /> Создать новый тег
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

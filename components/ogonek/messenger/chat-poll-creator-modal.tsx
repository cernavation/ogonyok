'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, X } from 'lucide-react'
import { playClick } from '@/lib/ogonek/sound'
import type { ChatPoll } from '@/lib/ogonek/types'

type Props = {
  onCreatePoll: (poll: ChatPoll) => void
  onClose: () => void
  soundEnabled?: boolean
}

export function ChatPollCreatorModal({ onCreatePoll, onClose, soundEnabled = true }: Props) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isMulti, setIsMulti] = useState(false)

  const handleAddOption = () => {
    if (options.length >= 10) return
    playClick(soundEnabled)
    setOptions([...options, ''])
  }

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return
    playClick(soundEnabled)
    setOptions(options.filter((_, i) => i !== index))
  }

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...options]
    updated[index] = val
    setOptions(updated)
  }

  const validOptions = options.map((o) => o.trim()).filter(Boolean)
  const canCreate = question.trim().length > 0 && validOptions.length >= 2

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canCreate) return
    playClick(soundEnabled)

    const poll: ChatPoll = {
      id: `poll-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      question: question.trim(),
      options: validOptions.map((text) => ({ text, votes: 0, votedByMe: false })),
      isAnonymous,
      isMulti,
      totalVotes: 0,
    }

    onCreatePoll(poll)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h3 className="text-base font-bold text-[var(--text)]">Создать опрос</h3>
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar py-3 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-2)] uppercase tracking-wider mb-1.5">
              Вопрос
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Задайте вопрос..."
              className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-2)] outline-none focus:border-[var(--accent)]"
              maxLength={250}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-2)] uppercase tracking-wider mb-1.5">
              Варианты ответа (от 2 до 10)
            </label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Вариант ${idx + 1}`}
                    className="flex-1 h-10 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--text)] placeholder:text-[var(--text-2)] outline-none focus:border-[var(--accent)]"
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-2)] hover:text-red-400 hover:bg-red-500/10"
                      aria-label="Удалить вариант"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] hover:opacity-80 py-1"
              >
                <Plus size={16} /> Добавить вариант
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-[var(--border)] space-y-2.5">
            <label className="flex items-center gap-2 text-xs text-[var(--text)] cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded accent-[var(--accent)]"
              />
              <span>Анонимное голосование</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-[var(--text)] cursor-pointer">
              <input
                type="checkbox"
                checked={isMulti}
                onChange={(e) => setIsMulti(e.target.checked)}
                className="rounded accent-[var(--accent)]"
              />
              <span>Выбор нескольких вариантов</span>
            </label>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={!canCreate}
              className="w-full h-11 rounded-full bg-[var(--accent)] text-[var(--accent-text)] font-bold text-sm shadow-md hover:opacity-90 active:scale-98 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              Создать опрос
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

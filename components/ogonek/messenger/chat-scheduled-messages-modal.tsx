'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Check,
  Clock,
  FileText,
  Image as ImageIcon,
  Pencil,
  Trash2,
  VolumeX,
  X,
} from 'lucide-react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { getTierLimits } from '@/lib/ogonek/permissions'
import type { ChatMessage } from '@/lib/ogonek/types'

type Props = {
  friendId: string
  friendName: string
  scheduledMessages: ChatMessage[]
  tier?: string
  onEditMessage: (messageId: string, patch: { text?: string; scheduledForISO?: string }) => void
  onCancelMessage: (messageId: string) => void
  onClose: () => void
  soundEnabled?: boolean
  onNotify: (message: string) => void
}

export function ChatScheduledMessagesModal({
  friendId,
  friendName,
  scheduledMessages,
  tier = 'free',
  onEditMessage,
  onCancelMessage,
  onClose,
  soundEnabled = true,
  onNotify,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')

  const limits = getTierLimits(tier)
  const maxAllowed = limits.maxScheduledMessages
  const count = scheduledMessages.length

  const pad = (n: number) => String(n).padStart(2, '0')

  const startEdit = (msg: ChatMessage) => {
    playClick(soundEnabled)
    setEditingId(msg.id)
    setEditText(msg.text)
    if (msg.scheduledForISO) {
      try {
        const d = new Date(msg.scheduledForISO)
        setEditDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
        setEditTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`)
      } catch {
        const d = new Date(Date.now() + 3600 * 1000)
        setEditDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
        setEditTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`)
      }
    }
  }

  const saveEdit = (messageId: string) => {
    if (!editText.trim()) {
      onNotify('Текст сообщения не может быть пустым')
      return
    }
    const newISO = new Date(`${editDate}T${editTime}:00`).toISOString()
    onEditMessage(messageId, { text: editText.trim(), scheduledForISO: newISO })
    playSuccess(soundEnabled)
    setEditingId(null)
    onNotify('Запланированное сообщение обновлено')
  }

  const formatScheduledDate = (iso?: string | null) => {
    if (!iso) return 'Позже'
    try {
      const d = new Date(iso)
      const datePart = d.toLocaleDateString([], { day: 'numeric', month: 'short' })
      const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      return `${datePart} в ${timePart}`
    } catch {
      return 'Позже'
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Шапка модалки */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center">
              <Clock size={17} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text)] leading-tight">
                Запланированные сообщения
              </h3>
              <p className="text-[11px] text-[var(--text-2)]">
                {count} из {maxAllowed} (тариф {tier.toUpperCase()})
              </p>
            </div>
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

        {/* Список запланированных сообщений */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 no-scrollbar">
          {scheduledMessages.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-[var(--text-2)]">
              <Clock size={36} className="text-[var(--text-2)] opacity-50 mb-2" />
              <p className="text-sm font-bold text-[var(--text)]">Нет отложенных сообщений</p>
              <p className="text-xs text-[var(--text-2)] max-w-xs mt-1 leading-relaxed">
                Чтобы запланировать отправку, нажмите иконку ⏰ рядом с кнопкой отправки в окне чата.
              </p>
            </div>
          ) : (
            scheduledMessages.map((msg) => {
              const isEditing = editingId === msg.id

              return (
                <div
                  key={msg.id}
                  className="p-3.5 rounded-2xl bg-[var(--bg)] border border-[var(--border)] space-y-2 relative"
                >
                  {isEditing ? (
                    <div className="space-y-2.5">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full h-20 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-2.5 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)] resize-none"
                        aria-label="Редактировать текст отложенного сообщения"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="h-8 rounded-lg border border-[var(--border)] bg-[var(--bg-elev)] px-2 text-xs text-[var(--text)] outline-none"
                        />
                        <input
                          type="time"
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          className="h-8 rounded-lg border border-[var(--border)] bg-[var(--bg-elev)] px-2 text-xs text-[var(--text)] outline-none"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 rounded-lg text-xs text-[var(--text-2)] hover:text-[var(--text)]"
                        >
                          Отмена
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(msg.id)}
                          className="px-3.5 py-1 rounded-lg bg-[var(--accent)] text-[var(--accent-text)] text-xs font-bold hover:opacity-90 transition-opacity"
                        >
                          Сохранить
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--accent)]">
                          <Calendar size={13} />
                          <span>{formatScheduledDate(msg.scheduledForISO)}</span>
                          {msg.silent && (
                            <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-2)] ml-2">
                              <VolumeX size={12} /> без звука
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(msg)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]"
                            aria-label="Редактировать сообщение"
                            title="Редактировать"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onCancelMessage(msg.id)
                              onNotify('Отложенное сообщение отменено')
                            }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10"
                            aria-label="Отменить отправку"
                            title="Отменить"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {msg.text && (
                        <p className="text-xs text-[var(--text)] whitespace-pre-wrap leading-relaxed">
                          {msg.text}
                        </p>
                      )}

                      {msg.media && (
                        <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white/5 text-xs text-[var(--text-2)]">
                          {msg.media.type === 'image' ? (
                            <ImageIcon size={15} className="text-[#1d9bf0]" />
                          ) : (
                            <FileText size={15} className="text-[#00ba7c]" />
                          )}
                          <span className="truncate">{msg.media.name || 'Медиафайл'}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>
      </motion.div>
    </div>
  )
}

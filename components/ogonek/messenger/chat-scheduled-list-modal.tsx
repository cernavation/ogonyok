'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, Edit2, Play, Trash2, X, AlertCircle } from 'lucide-react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { getTierLimits, TIER_NAMES, type SubscriptionTier } from '@/lib/ogonek/permissions'

export interface ScheduledMessageItem {
  id: string
  threadKey: string
  text: string
  scheduledAtISO: string
  isSilent?: boolean
  delivered?: boolean
}

type Props = {
  threadKey: string
  scheduledMessages: ScheduledMessageItem[]
  tier?: SubscriptionTier
  onSendNow: (id: string) => void
  onEdit: (id: string, newText: string, newScheduledAtISO: string) => void
  onCancel: (id: string) => void
  onClose: () => void
  soundEnabled?: boolean
}

export function ChatScheduledListModal({
  threadKey,
  scheduledMessages,
  tier = 'free',
  onSendNow,
  onEdit,
  onCancel,
  onClose,
  soundEnabled = true,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')

  const limits = getTierLimits(tier)
  const maxLimit = limits.maxScheduledMessages
  const count = scheduledMessages.length

  const handleStartEdit = (msg: ScheduledMessageItem) => {
    playClick(soundEnabled)
    setEditingId(msg.id)
    setEditText(msg.text)
    const d = new Date(msg.scheduledAtISO)
    const pad = (n: number) => String(n).padStart(2, '0')
    setEditDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
    setEditTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`)
  }

  const handleSaveEdit = (id: string) => {
    playSuccess(soundEnabled)
    const iso = new Date(`${editDate}T${editTime}:00`).toISOString()
    onEdit(id, editText, iso)
    setEditingId(null)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-2xl flex flex-col max-h-[85vh] text-[var(--text)]"
        role="dialog"
        aria-modal="true"
        aria-label="Отложенные сообщения"
      >
        {/* Шапка */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-[var(--accent)]" />
            <h3 className="text-base font-bold text-[var(--text)]">Отложенные сообщения</h3>
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

        {/* Индикатор лимита тарифа */}
        <div className="my-3 px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between text-xs">
          <span className="text-[var(--text-2)]">
            Лимит тарифа <strong>{TIER_NAMES[tier]}</strong>:
          </span>
          <span className="font-semibold text-[var(--accent)]">
            {count} / {maxLimit === Infinity ? 'Безлимит' : maxLimit}
          </span>
        </div>

        {/* Список сообщений */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 py-1">
          {scheduledMessages.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-[var(--text-2)]">
              <Calendar size={36} className="text-[var(--muted)] mb-2 opacity-50" />
              <p className="text-sm font-semibold text-[var(--text)]">Нет запланированных сообщений</p>
              <p className="text-xs max-w-xs mt-1 opacity-70">
                Зажмите кнопку отправки в чате, чтобы запланировать отправку на удобное время
              </p>
            </div>
          ) : (
            scheduledMessages.map((msg) => {
              const isEditing = editingId === msg.id
              const dateStr = new Date(msg.scheduledAtISO).toLocaleString('ru-RU', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <div
                  key={msg.id}
                  className="p-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)] flex flex-col gap-2"
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-2 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)] resize-none"
                        rows={2}
                      />
                      <div className="flex items-center gap-2">
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
                        <div className="flex-1" />
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 text-xs text-[var(--text-2)] hover:text-[var(--text)]"
                        >
                          Отмена
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(msg.id)}
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-[var(--accent)] text-white hover:opacity-90"
                        >
                          Сохранить
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-[var(--text)] whitespace-pre-wrap break-words leading-relaxed flex-1">
                          {msg.text}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onSendNow(msg.id)}
                            title="Отправить сейчас"
                            className="p-1.5 rounded-lg text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                            aria-label="Отправить сейчас"
                          >
                            <Play size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(msg)}
                            title="Редактировать"
                            className="p-1.5 rounded-lg text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
                            aria-label="Редактировать отложенное сообщение"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onCancel(msg.id)}
                            title="Отменить"
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                            aria-label="Отменить отложенное сообщение"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-2)]">
                        <Clock size={12} className="opacity-70" />
                        <span>Будет отправлено: <strong>{dateStr}</strong></span>
                        {msg.isSilent && <span className="text-[10px] opacity-60">(без звука)</span>}
                      </div>
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

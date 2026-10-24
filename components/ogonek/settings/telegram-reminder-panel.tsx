'use client'

import { useState } from 'react'
import { Send, Check, Loader2, Clock, Bell, ExternalLink, ShieldCheck } from 'lucide-react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'

type Props = {
  chatId?: string | null
  reminderTimes?: string[]
  soundEnabled?: boolean
  onNotify: (msg: string) => void
  onSaveChatId?: (chatId: string) => Promise<boolean> | void
  onSaveReminderTimes?: (times: string[]) => Promise<boolean> | void
}

const TIME_OPTIONS = [
  { id: 'morning', label: 'Утро (09:00)', time: '09:00' },
  { id: 'afternoon', label: 'День (14:00)', time: '14:00' },
  { id: 'evening', label: 'Вечер (21:00)', time: '21:00' },
]

export function TelegramReminderPanel({
  chatId: initialChatId,
  reminderTimes: initialTimes = ['21:00'],
  soundEnabled = true,
  onNotify,
  onSaveChatId,
  onSaveReminderTimes,
}: Props) {
  const [chatId, setChatId] = useState(initialChatId || '')
  const [selectedTimes, setSelectedTimes] = useState<string[]>(initialTimes)
  const [isLinking, setIsLinking] = useState(false)
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [isSavingManual, setIsSavingManual] = useState(false)

  const isConnected = Boolean(chatId.trim())

  // Шаг 1: Подключение по ссылке бота
  const handleConnectTelegram = async () => {
    playClick(soundEnabled)
    setIsLinking(true)

    try {
      const res = await fetch('/api/telegram/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'current' }),
      })
      const data = await res.json()

      if (data.success && data.link) {
        window.open(data.link, '_blank')
        onNotify('Открываем Telegram-бота. Нажмите START в боте!')
      } else {
        // Fallback ссылка на бота
        window.open(`https://t.me/${data.botUsername || 'OgonekDiaryBot'}`, '_blank')
        onNotify('Открываем бота в Telegram...')
      }
    } catch {
      window.open('https://t.me/OgonekDiaryBot', '_blank')
    } finally {
      setIsLinking(false)
    }
  }

  // Шаг 2: Ручное сохранение Chat ID
  const handleSaveManualChatId = async () => {
    if (!chatId.trim()) {
      onNotify('Введите ваш Telegram Chat ID')
      return
    }
    playClick(soundEnabled)
    setIsSavingManual(true)
    try {
      await onSaveChatId?.(chatId.trim())
      playSuccess(soundEnabled)
      onNotify('Telegram Chat ID сохранён!')
    } finally {
      setIsSavingManual(false)
    }
  }

  // Шаг 3: Выбор времени
  const handleToggleTime = (time: string) => {
    playClick(soundEnabled)
    let next: string[]
    if (selectedTimes.includes(time)) {
      if (selectedTimes.length === 1) {
        onNotify('Выберите хотя бы одно время напоминания')
        return
      }
      next = selectedTimes.filter((t) => t !== time)
    } else {
      next = [...selectedTimes, time]
    }
    setSelectedTimes(next)
    onSaveReminderTimes?.(next)
    onNotify('Время напоминания обновлено')
  }

  // Тестовое сообщение
  const handleSendTestMessage = async () => {
    playClick(soundEnabled)
    setIsSendingTest(true)

    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chatId.trim() }),
      })
      const data = await res.json()

      if (data.success) {
        playSuccess(soundEnabled)
        onNotify('Тестовое сообщение отправлено в ваш Telegram!')
      } else {
        onNotify(data.error || 'Ошибка отправки тестового сообщения')
      }
    } catch (e) {
      onNotify('Не удалось связаться с Telegram-ботом')
    } finally {
      setIsSendingTest(false)
    }
  }

  return (
    <div className="settings-card rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#229ed9]/15 flex items-center justify-center text-[#229ed9]">
            <Send size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-base text-white">Напоминания в Telegram</h3>
            <p className="text-xs text-white/60">Бот напомнит о дневнике, только если день ещё не закрыт</p>
          </div>
        </div>

        {isConnected ? (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <Check size={12} strokeWidth={3} /> Подключён
          </span>
        ) : (
          <span className="text-[11px] font-medium text-white/50 bg-white/5 px-2.5 py-1 rounded-full">
            Не подключён
          </span>
        )}
      </div>

      {/* 3 простых шага без технических слов */}
      <div className="space-y-4">
        {/* ШАГ 1 */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-5 h-5 rounded-full bg-[#229ed9] text-white text-xs font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <span className="text-sm font-medium text-white">Шаг 1: Подключить бота в Telegram</span>
          </div>
          <p className="text-xs text-white/60 mb-3 ml-7">
            Нажмите кнопку ниже, бот откроется в Telegram. Нажмите в боте «Start» — аккаунт привяжется автоматически.
          </p>
          <div className="ml-7">
            <button
              type="button"
              disabled={isLinking}
              onClick={handleConnectTelegram}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#229ed9] text-white text-xs font-semibold hover:bg-[#229ed9]/90 transition-all shadow-sm"
            >
              {isLinking ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
              Открыть бота в Telegram
            </button>
          </div>
        </div>

        {/* ШАГ 2 */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-5 h-5 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <span className="text-sm font-medium text-white">Шаг 2: Запасной способ (если бот не привязался)</span>
          </div>
          <p className="text-xs text-white/60 mb-2 ml-7">
            Введите ваш Telegram Chat ID вручную (его можно узнать у бота командой /start):
          </p>
          <div className="ml-7 flex gap-2">
            <input
              type="text"
              value={chatId}
              placeholder="Например: 123456789"
              onChange={(e) => setChatId(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#229ed9]"
            />
            <button
              type="button"
              disabled={isSavingManual || !chatId.trim()}
              onClick={handleSaveManualChatId}
              className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-all disabled:opacity-40"
            >
              {isSavingManual ? <Loader2 size={12} className="animate-spin" /> : 'Сохранить'}
            </button>
          </div>
        </div>

        {/* ШАГ 3 */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-5 h-5 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <span className="text-sm font-medium text-white">Шаг 3: Выберите время напоминаний</span>
          </div>
          <p className="text-xs text-white/60 mb-3 ml-7">
            Бот напомнит вам записать гордости и благодарности (1–3 раза в день):
          </p>
          <div className="ml-7 grid grid-cols-3 gap-2">
            {TIME_OPTIONS.map((opt) => {
              const active = selectedTimes.includes(opt.time)
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleToggleTime(opt.time)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-medium border text-center transition-all ${
                    active
                      ? 'bg-[#229ed9]/15 border-[#229ed9] text-white'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-[10px] text-white/40 mt-0.5">{opt.time}</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Кнопка проверки связи */}
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
        <span className="text-xs text-white/50">
          Проверьте связь с ботом прямо сейчас:
        </span>
        <button
          type="button"
          disabled={isSendingTest || !chatId.trim()}
          onClick={handleSendTestMessage}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-medium hover:bg-white/15 transition-all disabled:opacity-40"
        >
          {isSendingTest ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
          Отправить тестовое
        </button>
      </div>
    </div>
  )
}

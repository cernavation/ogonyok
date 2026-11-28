'use client'

import React, { useEffect, useState } from 'react'
import {
  Bell,
  BellOff,
  Check,
  Clock,
  Moon,
  Send,
  Volume2,
  VolumeX,
} from 'lucide-react'
import {
  playChatMessageSound,
  playClick,
  playFriendRequestSound,
  playMissedCallSound,
  playSuccess,
} from '@/lib/ogonek/sound'
import type { OgonekProfile } from '@/lib/ogonek/types'
import { TelegramReminderPanel } from './telegram-reminder-panel'

type Props = {
  profile: OgonekProfile
  soundEnabled: boolean
  soundVolume?: number
  onSetSoundEnabled: (enabled: boolean) => void
  onSetSoundVolume?: (volume: number) => void
  onUpdateProfile?: (patch: Partial<OgonekProfile>) => void
  onNotify: (msg: string) => void
}

const DND_STORAGE_KEY = 'ogonek.dnd.settings'

interface DndSettings {
  enabled: boolean
  from: string
  to: string
}

export function NotificationsPanel({
  profile,
  soundEnabled,
  soundVolume = 0.8,
  onSetSoundEnabled,
  onSetSoundVolume,
  onUpdateProfile,
  onNotify,
}: Props) {
  // Настройки режима "Не беспокоить"
  const [dnd, setDnd] = useState<DndSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(DND_STORAGE_KEY)
        if (stored) return JSON.parse(stored)
      } catch {}
    }
    return { enabled: false, from: '23:00', to: '08:00' }
  })

  // Статус браузерных пуш-уведомлений
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission)
    }
  }, [])

  const saveDnd = (updated: DndSettings) => {
    setDnd(updated)
    try {
      localStorage.setItem(DND_STORAGE_KEY, JSON.stringify(updated))
    } catch {}
  }

  const handleToggleDnd = () => {
    const next = !dnd.enabled
    const updated = { ...dnd, enabled: next }
    saveDnd(updated)
    playClick(soundEnabled)
    onNotify(next ? `Режим «Не беспокоить» включён (${dnd.from}–${dnd.to})` : 'Режим «Не беспокоить» выключен')
  }

  const handleRequestPush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      onNotify('Ваш браузер не поддерживает Push-уведомления')
      return
    }

    try {
      const res = await Notification.requestPermission()
      setPushPermission(res)
      if (res === 'granted') {
        playSuccess(soundEnabled)
        onNotify('Push-уведомления успешно включены')
        try {
          new Notification('Winlog', {
            body: 'Уведомления активированы! Мы напомним о закрытии дня.',
            icon: '/icon-192.png',
          })
        } catch {}
      } else if (res === 'denied') {
        onNotify('Уведомления заблокированы в настройках браузера')
      }
    } catch {
      onNotify('Не удалось запросить разрешение на уведомления')
    }
  }

  const handleTestPush = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Winlog: Тестовое уведомление', {
          body: 'Так выглядит напоминание о закрытии дня и победах.',
          icon: '/icon-192.png',
        })
        playSuccess(soundEnabled)
        onNotify('Тестовый пуш отправлен на рабочий стол')
        return
      } catch {}
    }
    onNotify('Разрешите push-уведомления браузера для проверки')
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-5" aria-label="Настройки уведомлений">
      {/* ── 1. Звуковые сигналы и громкость ─────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-3">
            <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 size={16} className="text-[var(--accent)]" />
              ) : (
                <VolumeX size={16} className="text-[var(--text-3)]" />
              )}
              <span>Звуки интерфейса и событий</span>
            </h3>
            <p className="text-[13px] text-[var(--text-2)] mt-0.5">
              Аудиосигналы входящих сообщений, заявок в друзья и звонков
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={soundEnabled}
            aria-label="Включить звуковые эффекты"
            onClick={() => {
              const next = !soundEnabled
              onSetSoundEnabled(next)
              if (next) playChatMessageSound(soundVolume, true)
            }}
            className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${
              soundEnabled ? 'bg-[var(--accent)]' : 'bg-zinc-800'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                soundEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {soundEnabled && (
          <div className="flex flex-col gap-3 pt-3 border-t border-[var(--border)]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--text)]">Громкость звука</span>
              <span className="font-mono font-bold text-[var(--accent)]">
                {Math.round(soundVolume * 100)}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={soundVolume}
              onChange={(e) => {
                const vol = parseFloat(e.target.value)
                onSetSoundVolume?.(vol)
              }}
              aria-label="Громкость звука"
              className="w-full accent-[var(--accent)] cursor-pointer"
            />

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-xs text-[var(--text-3)] mr-1">Проверить:</span>
              <button
                type="button"
                onClick={() => playChatMessageSound(soundVolume, true)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--border-strong)] text-[var(--text)] transition-colors"
              >
                Сообщение
              </button>
              <button
                type="button"
                onClick={() => playFriendRequestSound(soundVolume, true)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--border-strong)] text-[var(--text)] transition-colors"
              >
                Заявка
              </button>
              <button
                type="button"
                onClick={() => playMissedCallSound(soundVolume, true)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--border-strong)] text-[var(--text)] transition-colors"
              >
                Звонок
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Режим «Не беспокоить» (DND) ──────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-3">
            <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
              {dnd.enabled ? (
                <Moon size={16} className="text-indigo-400" />
              ) : (
                <BellOff size={16} className="text-[var(--text-3)]" />
              )}
              <span>Режим «Не беспокоить»</span>
            </h3>
            <p className="text-[13px] text-[var(--text-2)] mt-0.5">
              Заглушает звуки и уведомления звонков и чатов в ночное время
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={dnd.enabled}
            aria-label="Включить режим не беспокоить"
            onClick={handleToggleDnd}
            className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${
              dnd.enabled ? 'bg-indigo-500' : 'bg-zinc-800'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                dnd.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {dnd.enabled && (
          <div className="flex items-center gap-3 pt-3 border-t border-[var(--border)]">
            <Clock size={15} className="text-[var(--text-3)] shrink-0" />
            <div className="flex items-center gap-2 text-xs text-[var(--text-2)]">
              <span>С</span>
              <input
                type="time"
                value={dnd.from}
                onChange={(e) => saveDnd({ ...dnd, from: e.target.value })}
                className="px-2 py-1 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] font-mono text-xs outline-none focus:border-[var(--accent)]"
              />
              <span>до</span>
              <input
                type="time"
                value={dnd.to}
                onChange={(e) => saveDnd({ ...dnd, to: e.target.value })}
                className="px-2 py-1 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] font-mono text-xs outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Браузерные Push-уведомления ───────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-3">
            <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
              <Bell size={16} className="text-[var(--accent)]" /> Браузерные Push-уведомления
            </h3>
            <p className="text-[13px] text-[var(--text-2)] mt-0.5">
              Всплывающие напоминания на рабочем столе даже при закрытой вкладке
            </p>
          </div>

          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold shrink-0 border border-[var(--border)]"
            style={{
              background:
                pushPermission === 'granted'
                  ? 'rgba(34,197,94,0.1)'
                  : pushPermission === 'denied'
                  ? 'rgba(239,68,68,0.1)'
                  : 'rgba(234,179,8,0.1)',
              color:
                pushPermission === 'granted'
                  ? '#22c55e'
                  : pushPermission === 'denied'
                  ? '#ef4444'
                  : '#eab308',
            }}
          >
            {pushPermission === 'granted'
              ? 'Включены'
              : pushPermission === 'denied'
              ? 'Заблокированы'
              : 'Не настроены'}
          </span>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)] flex-wrap">
          {pushPermission !== 'granted' ? (
            <button
              type="button"
              onClick={handleRequestPush}
              className="h-8 px-4 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
            >
              <Bell size={13} />
              <span>Запросить разрешение</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleTestPush}
              className="h-8 px-4 rounded-full border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)] text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
            >
              <Send size={13} />
              <span>Тестовое уведомление</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 4. Telegram-напоминания ──────────────────────────────────────── */}
      <TelegramReminderPanel
        chatId={profile.telegramChatId}
        reminderTimes={profile.reminderTimes}
        soundEnabled={soundEnabled}
        onNotify={onNotify}
        onSaveChatId={(id) => onUpdateProfile?.({ telegramChatId: id })}
        onSaveReminderTimes={(times) => onUpdateProfile?.({ reminderTimes: times })}
      />
    </div>
  )
}

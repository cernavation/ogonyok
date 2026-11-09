'use client'

import React, { useState, useEffect } from 'react'
import { Bell, BellOff, Check, Laptop, Moon, Volume2, VolumeX } from 'lucide-react'
import { playClick } from '@/lib/ogonek/sound'
import {
  playNewMessageSound,
  isNotificationSoundAllowed,
  getNotificationVolume,
} from '@/lib/ogonek/notification-sound'

type Props = {
  onNotify?: (msg: string) => void
}

export function NotificationsSettingsPanel({ onNotify }: Props) {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [volume, setVolume] = useState(0.35)
  const [dndUntil, setDndUntil] = useState<string | null>(null)
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default')

  // Загрузка настроек из localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const raw = localStorage.getItem('ogonek.v2')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (typeof parsed?.notificationsSoundEnabled === 'boolean') {
          setSoundEnabled(parsed.notificationsSoundEnabled)
        }
        if (typeof parsed?.notificationVolume === 'number') {
          setVolume(parsed.notificationVolume)
        }
        if (parsed?.dndUntil) {
          setDndUntil(parsed.dndUntil)
        }
      }
    } catch {}

    if ('Notification' in window) {
      setBrowserPermission(Notification.permission)
    }
  }, [])

  const saveSettings = (patch: Record<string, any>) => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('ogonek.v2')
      const current = raw ? JSON.parse(raw) : {}
      const updated = { ...current, ...patch }
      localStorage.setItem('ogonek.v2', JSON.stringify(updated))
    } catch {}
  }

  const handleToggleSound = () => {
    playClick(true)
    const next = !soundEnabled
    setSoundEnabled(next)
    saveSettings({ notificationsSoundEnabled: next })
    onNotify?.(next ? 'Звуки уведомлений включены' : 'Звуки уведомлений выключены')
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    saveSettings({ notificationVolume: val })
  }

  const handleTestSound = () => {
    playNewMessageSound()
  }

  const handleSetDnd = (hours: number | null) => {
    playClick(true)
    if (hours === null) {
      setDndUntil(null)
      saveSettings({ dndUntil: null })
      onNotify?.('Режим «Не беспокоить» отключён')
      return
    }

    const expiry = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
    setDndUntil(expiry)
    saveSettings({ dndUntil: expiry })
    onNotify?.(`Режим «Не беспокоить» включён на ${hours} ч.`)
  }

  const handleRequestBrowserPermission = async () => {
    playClick(true)
    if (typeof window === 'undefined' || !('Notification' in window)) {
      onNotify?.('Браузер не поддерживает системные уведомления')
      return
    }

    try {
      const permission = await Notification.requestPermission()
      setBrowserPermission(permission)
      if (permission === 'granted') {
        saveSettings({ browserNotificationsEnabled: true })
        onNotify?.('Системные уведомления успешно разрешены!')
        new Notification('Огонёк', {
          body: 'Уведомления успешно включены!',
          icon: '/icons/icon-192.png',
        })
      } else {
        onNotify?.('Разрешение отклонено в браузере')
      }
    } catch {
      onNotify?.('Ошибка запроса разрешения уведомлений')
    }
  }

  const isDndActive = Boolean(dndUntil && new Date(dndUntil).getTime() > Date.now())

  return (
    <section className="settings-section rounded-2xl bg-white/[0.03] border border-white/10 p-5 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
          <Bell size={20} />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Всплывающие уведомления и звуки</h3>
          <p className="text-xs text-neutral-400">
            Настройки звуковых сигналов, быстрого ответа и системных оповещений
          </p>
        </div>
      </div>

      {/* 1. Звук уведомлений */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-white">Звук новых сообщений</span>
            <p className="text-xs text-neutral-400">Воспроизводить мягкий тон при входящем сообщении</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={soundEnabled}
            onClick={handleToggleSound}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              soundEnabled ? 'bg-[var(--accent)]' : 'bg-white/20'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                soundEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {soundEnabled && (
          <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl">
            <VolumeX size={15} className="text-neutral-500" />
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1 accent-[var(--accent)] cursor-pointer"
              aria-label="Громкость уведомлений"
            />
            <Volume2 size={16} className="text-[var(--accent)]" />
            <button
              type="button"
              onClick={handleTestSound}
              className="px-2.5 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition"
            >
              Тест
            </button>
          </div>
        )}
      </div>

      {/* 2. Не беспокоить */}
      <div className="space-y-2 pt-2 border-t border-white/5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Moon size={15} className="text-amber-400" /> Не беспокоить
          </span>
          {isDndActive && (
            <span className="text-xs text-amber-400 font-mono">
              до {new Date(dndUntil!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-400">
          Временно отключает звуки уведомлений и всплывающие окна
        </p>

        <div className="grid grid-cols-4 gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleSetDnd(null)}
            className={`py-1.5 px-2 rounded-xl text-xs font-semibold transition border ${
              !isDndActive
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10'
            }`}
          >
            Выкл
          </button>
          <button
            type="button"
            onClick={() => handleSetDnd(1)}
            className="py-1.5 px-2 rounded-xl text-xs font-semibold bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10 transition"
          >
            1 час
          </button>
          <button
            type="button"
            onClick={() => handleSetDnd(8)}
            className="py-1.5 px-2 rounded-xl text-xs font-semibold bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10 transition"
          >
            8 часов
          </button>
          <button
            type="button"
            onClick={() => handleSetDnd(24)}
            className="py-1.5 px-2 rounded-xl text-xs font-semibold bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10 transition"
          >
            24 часа
          </button>
        </div>
      </div>

      {/* 3. Системные уведомления браузера */}
      <div className="space-y-2 pt-2 border-t border-white/5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Laptop size={15} className="text-blue-400" /> Системные уведомления
          </span>
          <span className="text-xs font-mono text-neutral-400">
            {browserPermission === 'granted'
              ? 'Включены'
              : browserPermission === 'denied'
              ? 'Заблокированы'
              : 'Не активны'}
          </span>
        </div>
        <p className="text-xs text-neutral-400">
          Показывать системные уведомления macOS/Windows, когда вкладка свернута
        </p>

        {browserPermission !== 'granted' ? (
          <button
            type="button"
            onClick={handleRequestBrowserPermission}
            className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 transition flex items-center justify-center gap-2 mt-1"
          >
            <Bell size={14} /> Включить системные уведомления браузера
          </button>
        ) : (
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl mt-1">
            <Check size={14} /> Браузерные уведомления разрешены и активны
          </div>
        )}
      </div>
    </section>
  )
}

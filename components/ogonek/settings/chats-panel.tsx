'use client'

import React, { useEffect, useState } from 'react'
import {
  Check,
  CornerDownLeft,
  Database,
  FileText,
  HardDrive,
  Image,
  MessageSquare,
  Mic,
  Trash2,
  Wifi,
} from 'lucide-react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'

type Props = {
  soundEnabled?: boolean
  onNotify: (msg: string) => void
}

const CHAT_SETTINGS_KEY = 'ogonek.chat.settings.v1'

interface ChatSettings {
  autoDownloadPhotos: 'always' | 'wifi' | 'never'
  autoDownloadVoice: 'always' | 'wifi' | 'never'
  sendByEnter: boolean
  saveDrafts: boolean
}

const DEFAULT_SETTINGS: ChatSettings = {
  autoDownloadPhotos: 'always',
  autoDownloadVoice: 'wifi',
  sendByEnter: true,
  saveDrafts: true,
}

export function ChatsPanel({ soundEnabled = true, onNotify }: Props) {
  const [settings, setSettings] = useState<ChatSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(CHAT_SETTINGS_KEY)
        if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
      } catch {}
    }
    return DEFAULT_SETTINGS
  })

  const [cacheSizeMb, setCacheSizeMb] = useState<string>('4.8')
  const [isClearing, setIsClearing] = useState(false)

  const update = (patch: Partial<ChatSettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    try {
      localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(next))
    } catch {}
    playClick(soundEnabled)
  }

  const handleClearCache = () => {
    setIsClearing(true)
    playClick(soundEnabled)
    setTimeout(() => {
      // Очистка ключей черновиков и временного медиа-кэша
      try {
        if (typeof window !== 'undefined') {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i)
            if (key && (key.startsWith('ogonek.chat.draft.') || key.startsWith('ogonek.media.cache.'))) {
              localStorage.removeItem(key)
            }
          }
        }
      } catch {}
      setCacheSizeMb('0.1')
      setIsClearing(false)
      playSuccess(soundEnabled)
      onNotify('Кэш чатов очищен (освобождено 4.7 МБ)')
    }, 400)
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-5" aria-label="Настройки чатов">
      {/* ── 1. Клавиши отправки сообщений ────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex flex-col gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
            <CornerDownLeft size={16} className="text-[var(--accent)]" /> Клавиши отправки сообщений
          </h3>
          <p className="text-[13px] text-[var(--text-2)] mt-0.5">
            Комбинация клавиш для быстрой отправки в поле ввода диалога
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Клавиши отправки">
          <button
            type="button"
            role="radio"
            aria-checked={settings.sendByEnter}
            onClick={() => {
              update({ sendByEnter: true })
              onNotify('Отправка по Enter')
            }}
            className={`p-3 rounded-xl border text-left transition-all ${
              settings.sendByEnter
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]'
                : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-2)] hover:border-[var(--border-strong)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text)]">Enter</span>
              {settings.sendByEnter && <Check size={14} className="text-[var(--accent)]" />}
            </div>
            <p className="text-[11px] text-[var(--text-3)] mt-1">
              Enter — отправка, Shift+Enter — новая строка
            </p>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={!settings.sendByEnter}
            onClick={() => {
              update({ sendByEnter: false })
              onNotify('Отправка по Cmd/Ctrl+Enter')
            }}
            className={`p-3 rounded-xl border text-left transition-all ${
              !settings.sendByEnter
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]'
                : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-2)] hover:border-[var(--border-strong)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text)]">Cmd / Ctrl + Enter</span>
              {!settings.sendByEnter && <Check size={14} className="text-[var(--accent)]" />}
            </div>
            <p className="text-[11px] text-[var(--text-3)] mt-1">
              Enter — перенос строки, Cmd+Enter — отправка
            </p>
          </button>
        </div>
      </div>

      {/* ── 2. Сохранение черновиков ─────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex items-center justify-between">
        <div className="min-w-0 pr-3">
          <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
            <MessageSquare size={16} className="text-[var(--accent)]" /> Сохранение черновиков
          </h3>
          <p className="text-[13px] text-[var(--text-2)] mt-0.5">
            Запоминает незаконченный текст сообщения отдельно для каждого диалога
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={settings.saveDrafts}
          aria-label="Сохранять черновики сообщений"
          onClick={() => {
            const next = !settings.saveDrafts
            update({ saveDrafts: next })
            onNotify(next ? 'Черновики сохраняются' : 'Черновики отключены')
          }}
          className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${
            settings.saveDrafts ? 'bg-[var(--accent)]' : 'bg-zinc-800'
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              settings.saveDrafts ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* ── 3. Автозагрузка медиа ────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex flex-col gap-4">
        <div>
          <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
            <Wifi size={16} className="text-[var(--accent)]" /> Автозагрузка медиафайлов
          </h3>
          <p className="text-[13px] text-[var(--text-2)] mt-0.5">
            Экономия трафика при использовании мобильного интернета
          </p>
        </div>

        {/* Фотографии */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text)]">
            <span className="flex items-center gap-1.5">
              <Image size={14} className="text-[var(--accent)]" /> Фотографии
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Автозагрузка фото">
            {[
              { id: 'always' as const, label: 'Всегда' },
              { id: 'wifi' as const, label: 'Только Wi-Fi' },
              { id: 'never' as const, label: 'Никогда' },
            ].map((opt) => {
              const active = settings.autoDownloadPhotos === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => update({ autoDownloadPhotos: opt.id })}
                  className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-all text-center ${
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]'
                      : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-2)]'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Голосовые и видео */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text)]">
            <span className="flex items-center gap-1.5">
              <Mic size={14} className="text-[var(--accent)]" /> Голосовые и видео
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Автозагрузка аудио">
            {[
              { id: 'always' as const, label: 'Всегда' },
              { id: 'wifi' as const, label: 'Только Wi-Fi' },
              { id: 'never' as const, label: 'Никогда' },
            ].map((opt) => {
              const active = settings.autoDownloadVoice === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => update({ autoDownloadVoice: opt.id })}
                  className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-all text-center ${
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]'
                      : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-2)]'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── 4. Локальный кэш диалогов ───────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex items-center justify-between">
        <div className="min-w-0 pr-3">
          <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
            <HardDrive size={16} className="text-[var(--accent)]" /> Локальный кэш чатов
          </h3>
          <p className="text-[13px] text-[var(--text-2)] mt-0.5">
            Занимает на устройстве: <span className="font-mono font-bold text-[var(--text)]">{cacheSizeMb} МБ</span>
          </p>
        </div>

        <button
          type="button"
          disabled={isClearing || cacheSizeMb === '0.1'}
          onClick={handleClearCache}
          className="h-8 px-4 rounded-full border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-40 shrink-0"
        >
          <Trash2 size={13} />
          <span>{isClearing ? 'Очистка...' : 'Очистить кэш'}</span>
        </button>
      </div>
    </div>
  )
}

'use client'

import {
  ArrowLeft,
  Check,
  Download,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  Volume2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CURRENT_DAY } from '@/lib/ogonek/data'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { exportStoreAsJson, validateAndImportJson } from '@/lib/ogonek/storage'
import type { OgonekStoreState, ViewId } from '@/lib/ogonek/types'
import { MobileHeader } from '../mobile-header'

type Props = {
  state: OgonekStoreState
  onNavigate: (view: ViewId) => void
  onNotify: (msg: string) => void
  onSetSoundEnabled: (enabled: boolean) => void
  onSetPinEnabled: (enabled: boolean) => void
  onImportState: (newState: OgonekStoreState) => void
  onResetToDefaults: () => void
}

export function SettingsView({
  state,
  onNavigate,
  onNotify,
  onSetSoundEnabled,
  onSetPinEnabled,
  onImportState,
  onResetToDefaults,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tgStatus, setTgStatus] = useState<{
    configured: boolean
    botUsername?: string
    chatIdConfigured?: boolean
  } | null>(null)
  const [isSyncingStreak, setIsSyncingStreak] = useState(false)
  const [isSendingTestMsg, setIsSendingTestMsg] = useState(false)

  // Fetch Telegram status on mount
  useEffect(() => {
    fetch('/api/telegram/status')
      .then((res) => res.json())
      .then((data) => setTgStatus(data))
      .catch(() => setTgStatus({ configured: false }))
  }, [])

  const handleExportBackup = () => {
    const jsonStr = exportStoreAsJson(state)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ogonok-backup-day-${CURRENT_DAY}-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)

    playSuccess(state.soundEnabled)
    onNotify('Резервная копия скачана на устройство')
  }

  const handleImportClick = () => {
    playClick(state.soundEnabled)
    fileInputRef.current?.click()
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result
      if (typeof content !== 'string') {
        onNotify('Не удалось прочитать файл бэкапа')
        return
      }

      const result = validateAndImportJson(content)
      if (result.success) {
        onImportState(result.data)
        playSuccess(state.soundEnabled)
        onNotify(`Бэкап успешно восстановлен (${result.data.days.length} дней)!`)
      } else {
        onNotify(`Ошибка валидации бэкапа: ${result.error}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const [isLoadingAuthentic, setIsLoadingAuthentic] = useState(false)

  const handleLoadAuthenticHistory = async () => {
    playClick(state.soundEnabled)
    setIsLoadingAuthentic(true)
    try {
      const res = await fetch('/seeds/ogonek-import.v1.json')
      if (!res.ok) throw new Error('Файл сида не найден')
      const data = await res.json()
      if (data && Array.isArray(data.days) && data.days.length > 0) {
        onImportState(data)
        playSuccess(state.soundEnabled)
        onNotify(`100% подлинная летопись успешно загружена (${data.days.length} дней)!`)
      } else {
        throw new Error('Некорректная структура данных в архиве')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка загрузки'
      onNotify(`Не удалось загрузить архив: ${msg}`)
    } finally {
      setIsLoadingAuthentic(false)
    }
  }

  const handleSyncStreak = async () => {
    playClick(state.soundEnabled)
    setIsSyncingStreak(true)

    try {
      const dates = state.days
        .map((d) => d.dateISO?.slice(0, 10))
        .filter((d): d is string => typeof d === 'string')

      const res = await fetch('/api/streak/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: dates }),
      })

      if (res.ok) {
        playSuccess(state.soundEnabled)
        onNotify('Стрик успешно синхронизирован с сервером!')
      } else {
        onNotify('Ошибка при сохранении снимка на сервере')
      }
    } catch {
      onNotify('Не удалось связаться с сервером')
    } finally {
      setIsSyncingStreak(false)
    }
  }

  const handleSendTestTg = async () => {
    playClick(state.soundEnabled)
    setIsSendingTestMsg(true)

    try {
      const res = await fetch('/api/telegram/test', { method: 'POST' })
      const data = (await res.json()) as { success?: boolean; error?: string }

      if (data.success) {
        playSuccess(state.soundEnabled)
        onNotify('Тестовое сообщение отправлено в Telegram!')
      } else {
        onNotify(data.error || 'Ошибка отправки в Telegram')
      }
    } catch {
      onNotify('Не удалось связаться с Telegram')
    } finally {
      setIsSendingTestMsg(false)
    }
  }

  const handleReset = () => {
    if (typeof window !== 'undefined' && window.confirm('Сбросить данные к начальным сид-значениям?')) {
      onResetToDefaults()
      playClick(state.soundEnabled)
      onNotify('Хранилище сброшено к исходным значениям')
    }
  }

  return (
    <div className="view-settings">
      <MobileHeader title="Настройки & Экспорт" />

      <header className="view-header">
        <button
          type="button"
          className="back-button"
          onClick={() => onNavigate('home')}
          aria-label="Вернуться на главную"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1>Настройки & Экспорт</h1>
          <p className="view-subtitle">Локальное хранилище, звук, безопасность и серверная синхронизация</p>
        </div>
      </header>

      <div className="settings-content">
        <section className="settings-section" aria-label="Параметры интерфейса и безопасности">
          <div className="setting-row">
            <div>
              <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Volume2 size={16} /> Звуковые эффекты
              </b>
              <small>Ультра-короткие щелчки табов и звук триумфа при записи дня</small>
            </div>
            <button
              type="button"
              className={`switch ${state.soundEnabled ? 'on' : ''}`}
              onClick={() => {
                const next = !state.soundEnabled
                onSetSoundEnabled(next)
                if (next) playClick(true)
                onNotify(next ? 'Звуковые эффекты включены' : 'Звук отключен')
              }}
              aria-label={state.soundEnabled ? 'Отключить звук' : 'Включить звук'}
              aria-pressed={state.soundEnabled}
            >
              <i />
            </button>
          </div>

          <div className="setting-row">
            <div>
              <b>PIN-код</b>
              <small>Защитить личный журнал при открытии на устройстве</small>
            </div>
            <button
              type="button"
              className={`switch ${state.pinEnabled ? 'on' : ''}`}
              onClick={() => {
                const next = !state.pinEnabled
                onSetPinEnabled(next)
                playClick(state.soundEnabled)
                onNotify(next ? 'PIN-код активирован' : 'PIN-код выключен')
              }}
              aria-label={state.pinEnabled ? 'Отключить PIN-код' : 'Включить PIN-код'}
              aria-pressed={state.pinEnabled}
            >
              <i />
            </button>
          </div>
        </section>

        {/* Telegram & Server Streak Synchronization Section */}
        <section className="settings-section" aria-labelledby="sync-title">
          <div className="setting-row" style={{ alignItems: 'flex-start' }}>
            <div>
              <b id="sync-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Send size={16} className="text-blue-400" /> Telegram & Серверный стрик
              </b>
              <small className={tgStatus?.configured ? 'text-green-400' : 'text-muted'}>
                {tgStatus?.configured
                  ? `Бот активен (${tgStatus.botUsername ? `@${tgStatus.botUsername}` : 'подключен'})`
                  : 'Бот не настроен (добавьте TELEGRAM_BOT_TOKEN в .env.local)'}
              </small>
            </div>
            <div className="telegram-status" aria-label="Статус бота">
              {tgStatus?.configured ? (
                <Check className="text-green-400" size={20} />
              ) : (
                <span className="text-xs text-muted">Офлайн</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="secondary-btn flex items-center gap-2 text-xs py-2 px-3"
              onClick={handleSyncStreak}
              disabled={isSyncingStreak}
            >
              {isSyncingStreak ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              <span>Синхронизировать стрик с сервером</span>
            </button>

            {tgStatus?.configured && (
              <button
                type="button"
                className="secondary-btn flex items-center gap-2 text-xs py-2 px-3"
                onClick={handleSendTestTg}
                disabled={isSendingTestMsg}
              >
                {isSendingTestMsg ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span>Тестовое уведомление в Telegram</span>
              </button>
            )}
          </div>
        </section>

        {/* Local Storage & Backup Section */}
        <section className="export-section" aria-labelledby="export-title">
          <div className="export-info">
            <ShieldCheck size={24} className="stat-icon--orange" />
            <div>
              <b id="export-title">Локальное хранилище (Local-first)</b>
              <p>
                Все записи (гордости, благодарности, факты Evidence Vault и утренний фокус)
                хранятся в вашем браузере (схема v2, ключ <code>ogonek.v2</code>). Фотографии сохраняются в оффлайн-базе IndexedDB.
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleFileSelected}
            aria-label="Загрузить файл бэкапа"
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            <button
              type="button"
              className="export-button"
              onClick={handleLoadAuthenticHistory}
              disabled={isLoadingAuthentic}
              style={{ color: '#ff8a50', borderColor: 'rgba(255, 107, 53, 0.4)' }}
              aria-label="Загрузить подлинную историю из архива (719 дней)"
            >
              {isLoadingAuthentic ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              <span>Загрузить подлинную историю (719 дней)</span>
            </button>

            <button
              type="button"
              className="export-button"
              onClick={handleExportBackup}
              aria-label="Экспорт бэкапа в формате JSON"
            >
              <Download size={18} />
              <span>Экспорт бэкапа (.json)</span>
            </button>

            <button
              type="button"
              className="export-button"
              onClick={handleImportClick}
              style={{ color: '#53d3a3', borderColor: '#234d3d' }}
              aria-label="Импорт бэкапа из файла JSON"
            >
              <Upload size={18} />
              <span>Импорт бэкапа (.json)</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              style={{
                marginTop: 8,
                padding: '10px',
                background: 'none',
                border: 0,
                color: 'var(--muted)',
                fontSize: 12,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <RefreshCw size={13} />
              <span>Сбросить хранилище к исходным значениям</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

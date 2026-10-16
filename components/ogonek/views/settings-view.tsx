'use client'

import {
  ArrowLeft,
  Check,
  Download,
  Eye,
  Loader2,
  Moon,
  Palette,
  RefreshCw,
  RotateCcw,
  Rows3,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  SunDim,
  Type,
  Upload,
  Volume2,
  Zap,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  ACCENT_PRESETS,
  FEED_DENSITY_PRESETS,
  FONT_SCALE_PRESETS,
  THEME_PRESETS,
  getAccentPreset,
  getFeedDensityPreset,
  getFontScalePreset,
  getThemePreset,
} from '@/lib/ogonek/appearance'
import { CURRENT_DAY } from '@/lib/ogonek/data'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { exportStoreAsJson, validateAndImportJson } from '@/lib/ogonek/storage'
import type {
  AccentId,
  FeedDensityId,
  FontScaleId,
  OgonekStoreState,
  ThemeMode,
  ViewId,
} from '@/lib/ogonek/types'
import { MobileHeader } from '../mobile-header'

type Props = {
  state: OgonekStoreState
  onNavigate: (view: ViewId) => void
  onNotify: (msg: string) => void
  onSetSoundEnabled: (enabled: boolean) => void
  onSetPinEnabled: (enabled: boolean) => void
  onSetTheme: (theme: ThemeMode) => void
  onSetAccent: (accent: AccentId) => void
  onSetFontScale: (scale: FontScaleId) => void
  onSetFeedDensity: (density: FeedDensityId) => void
  onResetAppearance: () => void
  onImportState: (newState: OgonekStoreState) => void
  onResetToDefaults: () => void
}

const THEME_ICONS: Record<ThemeMode, typeof Moon> = {
  'x-black': Moon,
  'apple-light': Sun,
  dim: SunDim,
}

export function SettingsView({
  state,
  onNavigate,
  onNotify,
  onSetSoundEnabled,
  onSetPinEnabled,
  onSetTheme,
  onSetAccent,
  onSetFontScale,
  onSetFeedDensity,
  onResetAppearance,
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

  // Актуальные настройки оформления из стора
  const activeTheme = getThemePreset(state.theme)
  const activeAccent = getAccentPreset(state.accent)
  const activeFont = getFontScalePreset(state.fontScale)
  const activeDensity = getFeedDensityPreset(state.feedDensity)

  // Fetch Telegram status on mount
  useEffect(() => {
    fetch('/api/telegram/status')
      .then((res) => res.json())
      .then((data) => setTgStatus(data))
      .catch(() => setTgStatus({ configured: false }))
  }, [])

  /* ── Оформление: обработчики ─────────────────────────────────────────── */

  const handleSelectTheme = (theme: ThemeMode) => {
    if (theme === state.theme) return
    onSetTheme(theme)
    playClick(state.soundEnabled)
    const preset = getThemePreset(theme)
    onNotify(`Тема «${preset.label} · ${preset.code}» применена`)
  }

  const handleSelectAccent = (accent: AccentId) => {
    if (accent === state.accent) return
    onSetAccent(accent)
    playClick(state.soundEnabled)
    onNotify(`Акцент «${getAccentPreset(accent).label}» активирован`)
  }

  const handleSelectFontScale = (scale: FontScaleId) => {
    if (scale === state.fontScale) return
    onSetFontScale(scale)
    playClick(state.soundEnabled)
    onNotify(`Размер интерфейса: ${getFontScalePreset(scale).label}`)
  }

  const handleSelectDensity = (density: FeedDensityId) => {
    if (density === state.feedDensity) return
    onSetFeedDensity(density)
    playClick(state.soundEnabled)
    onNotify(`Плотность ленты: ${getFeedDensityPreset(density).label}`)
  }

  const handleResetAppearance = () => {
    onResetAppearance()
    playSuccess(state.soundEnabled)
    onNotify('Оформление сброшено к заводским значениям Огонька')
  }

  /* ── Экспорт / импорт ────────────────────────────────────────────────── */

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

  const isDefaultAppearance =
    state.theme === 'x-black' &&
    state.accent === 'flame' &&
    state.fontScale === 'regular' &&
    state.feedDensity === 'cozy'

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
          <h1>Настройки &amp; Экспорт</h1>
          <p className="view-subtitle">
            Оформление, локальное хранилище, звук, безопасность и серверная синхронизация
          </p>
        </div>
      </header>

      <div className="settings-content">
        {/* ═══ ТЕМА ОФОРМЛЕНИЯ ═══ */}
        <section className="settings-section appearance-hero" aria-labelledby="theme-title">
          <div className="appearance-section-head">
            <div>
              <b id="theme-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Palette size={16} className="text-[#ff6b35]" /> Тема оформления
              </b>
              <small>
                Активно: <strong style={{ color: 'var(--accent)' }}>{activeTheme.label} · {activeTheme.code}</strong>
              </small>
            </div>
            <span
              className="appearance-live-badge"
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            >
              <Eye size={12} /> Применяется мгновенно
            </span>
          </div>

          <div className="theme-grid" role="radiogroup" aria-label="Выбор темы оформления">
            {THEME_PRESETS.map((preset) => {
              const Icon = THEME_ICONS[preset.id]
              const active = preset.id === state.theme
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`theme-card ${active ? 'is-active' : ''}`}
                  onClick={() => handleSelectTheme(preset.id)}
                >
                  <span
                    className="theme-card__preview"
                    style={{
                      background: preset.preview.bg,
                      borderColor: active ? 'var(--accent)' : preset.preview.line,
                    }}
                    aria-hidden="true"
                  >
                    <span className="theme-card__bar" style={{ background: preset.preview.surface }}>
                      <span
                        className="theme-card__dot"
                        style={{ background: 'var(--accent)' }}
                      />
                      <span
                        className="theme-card__line"
                        style={{ background: preset.preview.text, opacity: 0.75 }}
                      />
                    </span>
                    <span
                      className="theme-card__line"
                      style={{ background: preset.preview.muted, width: '82%' }}
                    />
                    <span
                      className="theme-card__line"
                      style={{ background: preset.preview.muted, width: '64%' }}
                    />
                    <span className="theme-card__chip" style={{ background: 'var(--accent)' }} />
                  </span>

                  <span className="theme-card__meta">
                    <span className="theme-card__name">
                      <Icon size={14} />
                      <b>{preset.label}</b>
                    </span>
                    <small>{preset.code}</small>
                  </span>

                  {active && (
                    <span className="theme-card__check" aria-hidden="true">
                      <Check size={13} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <p className="appearance-hint">{activeTheme.hint}</p>
        </section>

        {/* ═══ АКЦЕНТНЫЙ ЦВЕТ ═══ */}
        <section className="settings-section" aria-labelledby="accent-title">
          <div className="appearance-section-head">
            <div>
              <b id="accent-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={16} style={{ color: 'var(--accent)' }} /> Акцентный цвет
              </b>
              <small>
                Акцент: <strong style={{ color: activeAccent.color }}>{activeAccent.label}</strong>
              </small>
            </div>
          </div>

          <div className="accent-swatches" role="radiogroup" aria-label="Акцентный цвет приложения">
            {ACCENT_PRESETS.map((accent) => {
              const active = accent.id === state.accent
              return (
                <button
                  key={accent.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={accent.label}
                  title={accent.label}
                  className={`accent-swatch ${active ? 'is-active' : ''}`}
                  style={{ background: accent.color }}
                  onClick={() => handleSelectAccent(accent.id)}
                >
                  {active && <Check size={16} />}
                </button>
              )
            })}
          </div>
          <p className="appearance-hint">
            Акцент меняет активные вкладки, ссылки, прогресс и кнопки действия по всему приложению.
          </p>
        </section>

        {/* ═══ РАЗМЕР ШРИФТА ═══ */}
        <section className="settings-section" aria-labelledby="font-title">
          <div className="appearance-section-head">
            <div>
              <b id="font-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Type size={16} className="text-[#1d9bf0]" /> Размер шрифта
              </b>
              <small>
                Активно: <strong style={{ color: 'var(--accent)' }}>{activeFont.label}</strong> (масштаб{' '}
                {Math.round(activeFont.scale * 100)}%)
              </small>
            </div>
          </div>

          <div className="font-scale-row" role="radiogroup" aria-label="Размер шрифта">
            {FONT_SCALE_PRESETS.map((font) => {
              const active = font.id === state.fontScale
              return (
                <button
                  key={font.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`font-scale-btn ${active ? 'is-active' : ''}`}
                  onClick={() => handleSelectFontScale(font.id)}
                >
                  <span className="font-scale-btn__sample" style={{ fontSize: `${Math.round(16 * font.scale)}px` }}>
                    {font.sample}
                  </span>
                  <span className="font-scale-btn__label">{font.label}</span>
                </button>
              )
            })}
          </div>

          <div className="type-preview" aria-hidden="true">
            <strong>День #{CURRENT_DAY} — я держу слово</strong>
            <span>
              Сегодня закрыл важную задачу и провёл вечернюю сверку обещаний. Так выглядит текст при
              выбранном размере.
            </span>
          </div>
        </section>

        {/* ═══ ПЛОТНОСТЬ ЛЕНТЫ ═══ */}
        <section className="settings-section" aria-labelledby="density-title">
          <div className="appearance-section-head">
            <div>
              <b id="density-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Rows3 size={16} className="text-[#f5b942]" /> Плотность ленты
              </b>
              <small>
                Активно: <strong style={{ color: 'var(--accent)' }}>{activeDensity.label}</strong>
              </small>
            </div>
          </div>

          <div className="density-grid" role="radiogroup" aria-label="Плотность ленты">
            {FEED_DENSITY_PRESETS.map((density) => {
              const active = density.id === state.feedDensity
              const rows = density.id === 'compact' ? 4 : density.id === 'comfortable' ? 2 : 3
              return (
                <button
                  key={density.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`density-card density-card--${density.id} ${active ? 'is-active' : ''}`}
                  onClick={() => handleSelectDensity(density.id)}
                >
                  <span className="density-visual" aria-hidden="true">
                    {Array.from({ length: rows }).map((_, i) => (
                      <span key={i} className="density-visual__row" />
                    ))}
                  </span>
                  <span className="density-card__meta">
                    <b>{density.label}</b>
                    <small>{density.hint}</small>
                  </span>
                  {active && (
                    <span className="theme-card__check" aria-hidden="true">
                      <Check size={13} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* ═══ ЖИВОЙ ПРЕДПРОСМОТР ═══ */}
        <section className="settings-section" aria-labelledby="preview-title" style={{ paddingBottom: 12 }}>
          <div className="appearance-section-head">
            <div>
              <b id="preview-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} style={{ color: 'var(--accent)' }} /> Предпросмотр оформления
              </b>
              <small>Так будет выглядеть карточка дня с текущими настройками</small>
            </div>
          </div>

          <article
            className="appearance-preview-card"
            style={{
              background: activeTheme.preview.bg,
              borderColor: activeTheme.preview.line,
              color: activeTheme.preview.text,
            }}
          >
            <div className="appearance-preview-card__head">
              <span className="appearance-preview-card__avatar" style={{ background: activeAccent.soft, color: activeAccent.color }}>
                AC
              </span>
              <span className="appearance-preview-card__who">
                <strong>Alexei Cerna</strong>
                <small style={{ color: activeTheme.preview.muted }}>
                  День #{CURRENT_DAY} · только что
                </small>
              </span>
              <span className="appearance-preview-card__tag" style={{ background: activeAccent.soft, color: activeAccent.color }}>
                🔥 Гордость
              </span>
            </div>
            <p style={{ color: activeTheme.preview.text }}>
              Закрыл спринт и провёл вечернюю сверку обещаний — держу слово четвёртый день подряд.
            </p>
            <div className="appearance-preview-card__bar" style={{ background: activeTheme.preview.surface }}>
              <span style={{ background: activeAccent.color, width: '72%' }} />
            </div>
            <div className="appearance-preview-card__actions" style={{ color: activeTheme.preview.muted }}>
              <span style={{ color: activeAccent.color }}>
                <Zap size={13} /> Огонёк
              </span>
              <span>
                <Rows3 size={13} /> {activeDensity.label}
              </span>
              <span>
                <Type size={13} /> {activeFont.label}
              </span>
            </div>
          </article>
        </section>

        <div className="appearance-reset-row">
          <button
            type="button"
            className="appearance-reset-btn"
            onClick={handleResetAppearance}
            disabled={isDefaultAppearance}
            aria-label="Сбросить оформление к заводским значениям"
          >
            <RotateCcw size={14} />
            <span>{isDefaultAppearance ? 'Оформление по умолчанию' : 'Сбросить оформление'}</span>
          </button>
        </div>

        {/* ═══ ИНТЕРФЕЙС И БЕЗОПАСНОСТЬ ═══ */}
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
                <Send size={16} className="text-blue-400" /> Telegram &amp; Серверный стрик
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

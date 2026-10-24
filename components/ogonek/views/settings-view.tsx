'use client'

import React, { useRef, useState } from 'react'
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  Flame,
  Lock,
  Moon,
  Palette,
  Pipette,
  RotateCcw,
  Sun,
  SunDim,
  Type,
  Upload,
  User,
  Volume2,
} from 'lucide-react'
import {
  ACCENT_PRESETS,
  FONT_SCALE_PRESETS,
  THEME_PRESETS,
} from '@/lib/ogonek/appearance'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { exportStoreAsJson, validateAndImportJson } from '@/lib/ogonek/storage'
import type {
  AccentId,
  FeedDensityId,
  FontScaleId,
  OgonekProfile,
  OgonekStoreState,
  ThemeMode,
  ViewId,
} from '@/lib/ogonek/types'
import { SecurityPanel } from '../security'
import { PrivacyPanel, StreakDeadlinePanel } from '../settings'
import { DifficultyLevelPanel } from '../settings/difficulty-level-panel'
import { TelegramReminderPanel } from '../settings/telegram-reminder-panel'
import { Button } from '../ui'

type Props = {
  state: OgonekStoreState
  onNavigate: (view: ViewId) => void
  onNotify: (msg: string) => void
  onSetSoundEnabled: (enabled: boolean) => void
  onSetTheme: (theme: ThemeMode) => void
  onSetAccent: (accent: AccentId) => void
  onSetFontScale: (scale: FontScaleId) => void
  onSetFeedDensity: (density: FeedDensityId) => void
  onResetAppearance: () => void
  onImportState: (newState: OgonekStoreState) => void
  onResetToDefaults: () => void
  onUpdateProfile?: (patch: Partial<OgonekProfile>) => void
}

type SettingsSection = 'appearance' | 'diary' | 'notifications' | 'privacy' | 'account' | 'guide'

const THEME_ICONS: Record<ThemeMode, typeof Moon> = {
  'x-black': Moon,
  'apple-light': Sun,
  dim: SunDim,
}

const SECTIONS = [
  { id: 'appearance' as SettingsSection, label: 'Внешний вид', hint: 'Тема, акцентный цвет, шрифт и звук', icon: Palette },
  { id: 'diary' as SettingsSection, label: 'Дневник', hint: 'Уровень сложности, стрик и дедлайн дня', icon: Flame },
  { id: 'notifications' as SettingsSection, label: 'Уведомления', hint: 'Напоминания в Telegram и расписание', icon: Bell },
  { id: 'privacy' as SettingsSection, label: 'Приватность', hint: 'Видимость записей, Face ID и PIN-код', icon: Eye },
  { id: 'account' as SettingsSection, label: 'Аккаунт', hint: 'Профиль, резервное копирование и сброс', icon: User },
  { id: 'guide' as SettingsSection, label: 'Как пользоваться', hint: 'Руководство, правила стрика и уровней', icon: HelpCircle },
] as const

export function SettingsView({
  state,
  onNavigate,
  onNotify,
  onSetSoundEnabled,
  onSetTheme,
  onSetAccent,
  onSetFontScale,
  onResetToDefaults,
  onImportState,
  onUpdateProfile,
}: Props) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    try {
      const json = exportStoreAsJson(state)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ogonek-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      playSuccess(state.soundEnabled)
      onNotify('Резервная копия сохранена')
    } catch {
      onNotify('Ошибка при экспорте данных')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const raw = event.target?.result as string
      const res = validateAndImportJson(raw)
      if (res.success) {
        onImportState(res.data)
        playSuccess(state.soundEnabled)
        onNotify('Данные успешно импортированы')
      } else {
        onNotify(res.error || 'Неверный формат файла бэкапа')
      }
    }
    reader.readAsText(file)
  }

  const renderSectionContent = (sec: SettingsSection) => {
    switch (sec) {
      case 'appearance':
        return (
          <div className="flex flex-col gap-5 p-4 sm:p-5">
            {/* Тема оформления */}
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
                  <Moon size={16} className="text-[var(--accent)]" /> Тема оформления
                </h3>
                <p className="text-[13px] text-[var(--text-2)] mt-0.5">
                  Тёмная X Black, Dim или светлая Apple Light
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {THEME_PRESETS.map((t) => {
                  const Icon = THEME_ICONS[t.id]
                  const active = state.theme === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        onSetTheme(t.id)
                        playClick(state.soundEnabled)
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                        active
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)] shadow-sm'
                          : 'border-[var(--border)] bg-[var(--bg-elev)] text-[var(--text-2)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <Icon size={20} className={active ? 'text-[var(--accent)]' : ''} />
                      <span className="text-[12px] font-bold mt-1.5">{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Акцентный цвет */}
            <div className="flex flex-col gap-3 pt-3 border-t border-[var(--border)]">
              <div>
                <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
                  <Palette size={16} className="text-[var(--accent)]" /> Акцентный цвет
                </h3>
                <p className="text-[13px] text-[var(--text-2)] mt-0.5">
                  Главный цвет кнопок, бейджей и активных элементов
                </p>
              </div>

              {/* 6 Пресетов */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {ACCENT_PRESETS.map((a) => {
                  const active = state.accent === a.id
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        onSetAccent(a.id)
                        playClick(state.soundEnabled)
                      }}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all ${
                        active
                          ? 'border-[var(--text)] bg-[var(--bg-elev)] shadow-sm'
                          : 'border-[var(--border)] bg-[var(--bg-elev)]/50 hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full shadow-sm mb-1"
                        style={{ background: a.color }}
                      />
                      <span className="text-[13px] font-semibold text-[var(--text)] truncate w-full">
                        {a.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Выбор своего цвета (Color Picker) */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-elev)]/60 border border-[var(--border)] mt-1">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <input
                      type="color"
                      value={state.accent.startsWith('#') ? state.accent : '#FF5C00'}
                      onChange={(e) => {
                        onSetAccent(e.target.value as any)
                      }}
                      className="w-9 h-9 rounded-full cursor-pointer opacity-0 absolute inset-0 z-10"
                      aria-label="Выбрать свой цвет"
                    />
                    <div
                      className="w-9 h-9 rounded-full border-2 border-white/20 shadow-sm flex items-center justify-center transition-transform hover:scale-105"
                      style={{
                        background: state.accent.startsWith('#') ? state.accent : 'var(--accent)',
                      }}
                    >
                      <Pipette size={14} className="text-white drop-shadow" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[var(--text)]">Свой цвет (HEX)</p>
                    <p className="text-[12px] text-[var(--text-2)]">
                      {state.accent.startsWith('#') ? state.accent.toUpperCase() : 'Выбери любой оттенок'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={state.accent.startsWith('#') ? state.accent : ''}
                    placeholder="#FF5C00"
                    onChange={(e) => {
                      const val = e.target.value.trim()
                      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                        onSetAccent(val as any)
                      }
                    }}
                    className="w-24 h-8 px-2.5 text-xs font-mono font-bold rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] outline-none focus:border-[var(--accent)]"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>

            {/* Размер шрифта */}
            <div className="flex flex-col gap-3 pt-3 border-t border-[var(--border)]">
              <div>
                <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
                  <Type size={16} className="text-[var(--accent)]" /> Размер шрифта
                </h3>
                <p className="text-[13px] text-[var(--text-2)] mt-0.5">
                  Масштабирование текста интерфейса
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FONT_SCALE_PRESETS.map((f) => {
                  const active = state.fontScale === f.id
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        onSetFontScale(f.id)
                        playClick(state.soundEnabled)
                      }}
                      className={`p-2.5 rounded-xl border text-center text-[13px] font-semibold transition-all ${
                        active
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]'
                          : 'border-[var(--border)] bg-[var(--bg-elev)] text-[var(--text-2)]'
                      }`}
                    >
                      {f.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Звуковые эффекты */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
              <div>
                <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
                  <Volume2 size={16} className="text-[var(--accent)]" /> Звуковые эффекты
                </h3>
                <p className="text-[13px] text-[var(--text-2)] mt-0.5">
                  Тактильный отклик и щелчки при взаимодействии
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.soundEnabled}
                  onChange={(e) => onSetSoundEnabled(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-11 h-6 rounded-full transition-colors ${
                    state.soundEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 ${
                      state.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>
            </div>
          </div>
        )

      case 'diary':
        return (
          <div className="flex flex-col gap-5 p-4 sm:p-5">
            <DifficultyLevelPanel
              currentLevel={state.profile.level ?? 5}
              levelChangedAtISO={state.profile.levelChangedAtISO ?? null}
              soundEnabled={state.soundEnabled}
              onChangeLevel={(newLevel) => {
                onUpdateProfile?.({ level: newLevel, levelChangedAtISO: new Date().toISOString() })
              }}
              onNotify={onNotify}
            />

            <StreakDeadlinePanel onNotify={onNotify} />
          </div>
        )

      case 'notifications':
        return (
          <div className="flex flex-col gap-5 p-4 sm:p-5">
            <TelegramReminderPanel
              chatId={state.profile.telegramChatId}
              reminderTimes={state.profile.reminderTimes}
              soundEnabled={state.soundEnabled}
              onNotify={onNotify}
              onSaveChatId={(id) => onUpdateProfile?.({ telegramChatId: id })}
              onSaveReminderTimes={(times) => onUpdateProfile?.({ reminderTimes: times })}
            />
          </div>
        )

      case 'privacy':
        return (
          <div className="flex flex-col gap-5 p-4 sm:p-5">
            <PrivacyPanel onNotify={onNotify} />
            <SecurityPanel onNotify={onNotify} />
          </div>
        )

      case 'account':
        return (
          <div className="flex flex-col gap-5 p-4 sm:p-5">
            {/* Данные профиля */}
            <div className="p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white"
                  style={{ background: state.profile.avatarColor || 'var(--accent)' }}
                >
                  {state.profile.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-[15px] text-[var(--text)]">
                    {state.profile.displayName}
                  </h3>
                  <p className="text-[13px] text-[var(--text-2)]">
                    @{state.profile.username}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="h-8 px-4 rounded-full border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)] text-[13px] font-bold transition-colors"
              >
                Профиль
              </button>
            </div>

            {/* Резервная копия */}
            <div className="p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex flex-col gap-3">
              <div>
                <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
                  <Download size={16} className="text-[var(--accent)]" /> Резервное копирование
                </h3>
                <p className="text-[13px] text-[var(--text-2)] mt-0.5">
                  Сохранение всех записей дневника в локальный JSON файл
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExport}
                  className="h-9 px-4 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-[13px] font-extrabold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Download size={15} />
                  <span>Скачать JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 px-4 rounded-full border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)] text-[13px] font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Upload size={15} />
                  <span>Импортировать JSON</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* Сброс к демо */}
            <div className="p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-bold text-rose-500">
                  Сброс к демо-данным
                </h3>
                <p className="text-[13px] text-[var(--text-2)] mt-0.5">
                  Вернуть дневник в исходное состояние
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Сбросить все данные дневника к демо-состоянию?')) {
                    onResetToDefaults()
                    onNotify('Данные сброшены к демо')
                  }
                }}
                className="h-8 px-4 rounded-full border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 text-[13px] font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw size={14} />
                <span>Сбросить</span>
              </button>
            </div>
          </div>
        )

      case 'guide':
        return (
          <div className="flex flex-col gap-4 p-4 sm:p-5">
            <div className="p-5 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex flex-col gap-3">
              <div>
                <h3 className="text-[16px] font-bold text-[var(--text)] flex items-center gap-2">
                  <HelpCircle size={18} className="text-[var(--accent)]" /> Как пользоваться Огоньком
                </h3>
                <p className="text-[13px] text-[var(--text-2)] mt-1.5 leading-relaxed">
                  «Огонёк» — твой честный дневник силы без фальши и токсичной продуктивности.
                  Каждый день фиксируй свои победы и слова благодарности.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-3 border-t border-[var(--border)] text-[13px] text-[var(--text-2)]">
                <p>• <b>Стрик никогда не сгорает</b>: стрик равен общему количеству закрытых дней.</p>
                <p>• <b>Уровни сложности 1–5</b>: требуют от 1 до 5 побед каждый день.</p>
                <p>• <b>Evidence Vault</b>: прикрепляй фотофиксации и сертификаты к рекордам.</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('ogonek:open-onboarding'))
                }}
                className="x-primary-btn mt-3 py-2.5 px-4 rounded-full text-[14px] font-bold text-center"
              >
                Открыть интерактивный гайд
              </button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)]">
        <button
          type="button"
          className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
          onClick={() => onNavigate('home')}
          aria-label="Назад"
        >
          <ArrowLeft size={19} />
        </button>
        <div>
          <h1 className="text-[19px] font-extrabold text-[var(--text)] tracking-[-0.02em] leading-tight">
            Настройки
          </h1>
          <p className="text-[13px] text-[var(--text-2)]">
            Персонализация дневника и системы
          </p>
        </div>
      </header>

      {/* Main Settings Container */}
      <div className="max-w-5xl mx-auto md:grid md:grid-cols-[320px_1fr] md:divide-x md:divide-[var(--border)]">
        {/* Left Column (Desktop) / Section List with Chevrons (Mobile) */}
        <div className="divide-y divide-[var(--border)]" role="tablist" aria-label="Разделы настроек">
          {SECTIONS.map((sec) => {
            const Icon = sec.icon
            const isSelected = activeSection === sec.id

            return (
              <div key={sec.id} className="flex flex-col">
                <button
                  type="button"
                  role="tab"
                  onClick={() => {
                    playClick(state.soundEnabled)
                    setActiveSection(sec.id)
                  }}
                  className={`w-full px-4 py-3.5 flex items-center justify-between text-left transition-colors ${
                    isSelected
                      ? 'bg-[var(--bg-elev)] border-l-4 border-l-[var(--accent)] text-[var(--text)]'
                      : 'hover:bg-[var(--bg-hover)] text-[var(--text-2)]'
                  }`}
                  aria-label={sec.label}
                  aria-selected={isSelected}
                  aria-current={isSelected ? 'true' : undefined}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-none transition-colors ${
                        isSelected
                          ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                          : 'bg-[var(--bg-elev)] text-[var(--text-2)]'
                      }`}
                    >
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold text-[var(--text)] leading-tight">
                        {sec.label}
                      </p>
                      <p className="text-[13px] text-[var(--text-2)] truncate mt-0.5">
                        {sec.hint}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-none text-[var(--text-3)] ml-2">
                    <span className="hidden md:block">
                      <ChevronRight size={17} />
                    </span>
                    <span className="md:hidden">
                      {isSelected ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                    </span>
                  </div>
                </button>

                {/* Mobile accordion expansion */}
                <div className={`md:hidden ${isSelected ? 'block border-b border-[var(--border)] bg-[var(--bg)]' : 'hidden'}`}>
                  {renderSectionContent(sec.id)}
                </div>
              </div>
            )
          })}
        </div>

        {/* Right Column (Desktop only pane) */}
        <div className="hidden md:block min-h-[500px]">
          {renderSectionContent(activeSection)}
        </div>
      </div>
    </div>
  )
}

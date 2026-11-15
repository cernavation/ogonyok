'use client'

import React, { useState } from 'react'
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  Database,
  Info,
  Lock,
  MessageSquare,
  Palette,
  Play,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react'
import { playClick } from '@/lib/ogonek/sound'
import type {
  AccentId,
  FeedDensityId,
  FontScaleId,
  OgonekProfile,
  OgonekStoreState,
  ThemeMode,
  ViewId,
} from '@/lib/ogonek/types'
import {
  AboutPanel,
  AppearancePanel,
  ChatsPanel,
  DataPanel,
  NotificationsPanel,
  PrivacyPanel,
  ProfilePanel,
  SecurityPanel,
  TariffPanel,
  TourPanel,
} from '../settings'

type Props = {
  state: OgonekStoreState
  onNavigate: (view: ViewId) => void
  onNotify: (msg: string) => void
  onSetSoundEnabled: (enabled: boolean) => void
  onSetSoundVolume?: (volume: number) => void
  onSetTheme: (theme: ThemeMode) => void
  onSetAccent: (accent: AccentId) => void
  onSetFontScale: (scale: FontScaleId) => void
  onSetFeedDensity?: (density: FeedDensityId) => void
  onResetAppearance: () => void
  onImportState: (newState: OgonekStoreState) => void
  onResetToDefaults: () => void
  onUpdateProfile?: (patch: Partial<OgonekProfile>) => void
}

import {
  SETTINGS_SECTIONS,
  type SettingsSection,
} from '@/lib/ogonek/settings-data'

export function SettingsView({
  state,
  onNavigate,
  onNotify,
  onSetSoundEnabled,
  onSetSoundVolume,
  onSetTheme,
  onSetAccent,
  onSetFontScale,
  onSetFeedDensity,
  onResetAppearance,
  onResetToDefaults,
  onImportState,
  onUpdateProfile,
}: Props) {
  const [activeSection, setActiveSection] = useState<SettingsSection | null>('profile')

  const renderSectionContent = (sec: SettingsSection) => {
    switch (sec) {
      case 'profile':
        return (
          <ProfilePanel
            profile={state.profile}
            soundEnabled={state.soundEnabled}
            onUpdateProfile={onUpdateProfile}
            onNotify={onNotify}
          />
        )

      case 'appearance':
        return (
          <AppearancePanel
            theme={state.theme}
            accent={state.accent}
            fontScale={state.fontScale}
            feedDensity={state.feedDensity}
            soundEnabled={state.soundEnabled}
            subscriptionTier={state.profile.subscription_tier}
            subscriptionExpiresAt={
              state.profile.subscription_expires_at || (state.profile as any)?.subscription_valid_until
            }
            onSetTheme={onSetTheme}
            onSetAccent={onSetAccent}
            onSetFontScale={onSetFontScale}
            onSetFeedDensity={onSetFeedDensity}
            onSetSoundEnabled={onSetSoundEnabled}
            onResetAppearance={onResetAppearance}
            onNotify={onNotify}
          />
        )

      case 'privacy':
        return <PrivacyPanel onNotify={onNotify} />

      case 'notifications':
        return (
          <NotificationsPanel
            profile={state.profile}
            soundEnabled={state.soundEnabled}
            soundVolume={state.soundVolume}
            onSetSoundEnabled={onSetSoundEnabled}
            onSetSoundVolume={onSetSoundVolume}
            onUpdateProfile={onUpdateProfile}
            onNotify={onNotify}
          />
        )

      case 'chats':
        return <ChatsPanel soundEnabled={state.soundEnabled} onNotify={onNotify} />

      case 'security':
        return <SecurityPanel onNotify={onNotify} />

      case 'data':
        return (
          <DataPanel
            state={state}
            onImportState={onImportState}
            onResetToDefaults={onResetToDefaults}
            onNotify={onNotify}
          />
        )

      case 'tariff':
        return (
          <TariffPanel
            profile={state.profile}
            soundEnabled={state.soundEnabled}
            onNotify={onNotify}
          />
        )

      case 'tour':
        return <TourPanel soundEnabled={state.soundEnabled} onNotify={onNotify} />

      case 'about':
        return <AboutPanel />

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--line)]">
        <button
          type="button"
          className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
          onClick={() => onNavigate('home')}
          aria-label="Назад"
        >
          <ArrowLeft size={19} />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">
            Настройки
          </h1>
          <p className="text-[13px] text-[var(--muted)] font-normal">
            Персонализация дневника, приватность и безопасность
          </p>
        </div>
      </header>

      {/* Banner: Интерактивный обучающий тур */}
      <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-elev)] flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--accent)]" /> Обучающий тур
          </h2>
          <p className="text-[13px] text-[var(--text-2)] mt-0.5">
            Пройди интерактивный тур по ключевым возможностям Огонька за 1 минуту
          </p>
        </div>
        <button
          type="button"
          id="settings-restart-tour-btn"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('ogonek:open-tour'))
          }}
          className="x-primary-btn shrink-0 py-2 px-4 rounded-full text-[13px] font-bold text-center"
        >
          Пройти тур заново
        </button>
      </div>

      {/* Main Settings Container: 10 подразделов */}
      <div className="w-full divide-y divide-[var(--border)]" role="tablist" aria-label="Разделы настроек">
        {SETTINGS_SECTIONS.map((sec) => {
          const Icon = sec.icon
          const isSelected = activeSection === sec.id

          return (
            <div key={sec.id} className="flex flex-col">
              <button
                type="button"
                role="tab"
                id={`settings-tab-${sec.id}`}
                onClick={() => {
                  playClick(state.soundEnabled)
                  setActiveSection(isSelected ? null : sec.id)
                }}
                className={`w-full px-4 py-3.5 flex items-center justify-between text-left transition-colors ${
                  isSelected
                    ? 'bg-[var(--bg-elev)] border-l-4 border-l-[var(--accent)] text-[var(--text)]'
                    : 'hover:bg-[var(--bg-hover)] text-[var(--text-2)]'
                }`}
                aria-label={sec.label}
                aria-selected={isSelected}
                aria-expanded={isSelected}
                aria-controls={`settings-panel-${sec.id}`}
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
                    <p className="text-[12px] text-[var(--text-2)] break-words mt-0.5 leading-snug">
                      {sec.hint}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-none text-[var(--text-3)] ml-2">
                  <ChevronDown
                    size={17}
                    className={`transition-transform duration-200 ${
                      isSelected ? 'rotate-180 text-[var(--accent)]' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Vertical section expansion in full width */}
              {isSelected && (
                <div
                  id={`settings-panel-${sec.id}`}
                  className="border-t border-[var(--border)] bg-[var(--bg)] animate-in fade-in duration-200"
                >
                  {renderSectionContent(sec.id)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

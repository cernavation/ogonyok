'use client'

import React, { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  EyeOff,
  RefreshCw,
  Rows3,
  Settings2,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { FEED_DENSITY_PRESETS, getFeedDensityPreset } from '@/lib/ogonek/appearance'
import { playClick } from '@/lib/ogonek/sound'
import type { FeedDensityId } from '@/lib/ogonek/types'

type Props = {
  open: boolean
  onClose: () => void
  density: FeedDensityId
  soundEnabled: boolean
  hideReactions?: boolean
  hideStories?: boolean
  defaultFeedTab?: string
  onSetDensity: (density: FeedDensityId) => void
  onSetSound: (enabled: boolean) => void
  onToggleHideReactions?: () => void
  onToggleHideStories?: () => void
  onSetDefaultFeedTab?: (tab: string) => void
  onRefreshFeed?: () => void
  onOpenSettings: () => void
  onNotify: (message: string) => void
}

export function FeedSettingsMenu({
  open,
  onClose,
  density,
  soundEnabled,
  hideReactions = false,
  hideStories = false,
  defaultFeedTab = 'Мои гордости',
  onSetDensity,
  onSetSound,
  onToggleHideReactions,
  onToggleHideStories,
  onSetDefaultFeedTab,
  onRefreshFeed,
  onOpenSettings,
  onNotify,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  // Закрытие по клику вне панели и по Escape
  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          className="feed-settings-menu z-50 absolute right-4 top-14 w-72 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl p-2"
          role="menu"
          aria-label="Настройки ленты"
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] mb-1">
            <div className="flex items-center gap-2">
              <Settings2 size={16} className="text-[var(--accent)]" aria-hidden="true" />
              <b className="text-xs text-[var(--text)]">Настройки ленты</b>
            </div>
            <span className="text-[11px] font-semibold text-[var(--text-2)]">
              {getFeedDensityPreset(density).label}
            </span>
          </div>

          {/* Обновить ленту */}
          {onRefreshFeed && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                playClick(soundEnabled)
                onRefreshFeed()
                onClose()
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-left text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <RefreshCw size={14} className="text-[var(--accent)]" />
              <span>Обновить ленту</span>
            </button>
          )}

          {/* Выбор ленты по умолчанию */}
          <div className="px-3 pt-2 pb-1 text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider">
            Лента по умолчанию
          </div>
          <div className="flex items-center gap-1 px-2 pb-2">
            {[
              { id: 'Мои гордости', label: 'Все' },
              { id: 'Соратники', label: 'Соратники' },
              { id: 'Рекомендации', label: 'Рекомендации' },
            ].map((item) => {
              const active = defaultFeedTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    onSetDefaultFeedTab?.(item.id)
                    onNotify(`По умолчанию: ${item.label}`)
                  }}
                  className={`flex-1 py-1 rounded-lg text-xs font-semibold text-center border transition-all ${
                    active
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                      : 'bg-[var(--bg)] text-[var(--text-2)] border-[var(--border)] hover:text-[var(--text)]'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          <div className="border-t border-[var(--border)] my-1" />

          {/* Плотность карточек */}
          <p className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[var(--text-2)] uppercase tracking-wider">
            <Rows3 size={12} aria-hidden="true" /> Плотность карточек
          </p>

          {FEED_DENSITY_PRESETS.map((preset) => {
            const active = preset.id === density
            return (
              <button
                key={preset.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-left text-xs transition-colors ${
                  active ? 'bg-[var(--accent-soft)] text-[var(--text)] font-semibold' : 'hover:bg-[var(--bg-hover)] text-[var(--text-2)]'
                }`}
                onClick={() => {
                  playClick(soundEnabled)
                  onSetDensity(preset.id)
                  onNotify(`Плотность: ${preset.label}`)
                }}
              >
                <span>{preset.label}</span>
                {active && <Check size={14} className="text-[var(--accent)]" aria-hidden="true" />}
              </button>
            )
          })}

          <div className="border-t border-[var(--border)] my-1" />

          {/* Скрыть реакции */}
          {onToggleHideReactions && (
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={hideReactions}
              onClick={() => {
                onToggleHideReactions()
                playClick(soundEnabled)
                onNotify(hideReactions ? 'Реакции показаны' : 'Реакции скрыты')
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <span>Скрыть реакции</span>
              <input
                type="checkbox"
                readOnly
                checked={hideReactions}
                className="w-4 h-4 accent-[var(--accent)] cursor-pointer"
              />
            </button>
          )}

          {/* Скрыть сторис */}
          {onToggleHideStories && (
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={hideStories}
              onClick={() => {
                onToggleHideStories()
                playClick(soundEnabled)
                onNotify(hideStories ? 'Сторис показаны' : 'Сторис скрыты')
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <span>Скрыть сторис</span>
              <input
                type="checkbox"
                readOnly
                checked={hideStories}
                className="w-4 h-4 accent-[var(--accent)] cursor-pointer"
              />
            </button>
          )}

          {/* Звуковые эффекты */}
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={soundEnabled}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
            onClick={() => {
              const next = !soundEnabled
              onSetSound(next)
              if (next) playClick(true)
              onNotify(next ? 'Звук включён' : 'Звук отключён')
            }}
          >
            <span className="flex items-center gap-1.5">
              {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              <span>Звуки</span>
            </span>
            <input
              type="checkbox"
              readOnly
              checked={soundEnabled}
              className="w-4 h-4 accent-[var(--accent)] cursor-pointer"
            />
          </button>

          <div className="border-t border-[var(--border)] my-1" />

          {/* Все настройки */}
          <button
            type="button"
            role="menuitem"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors"
            onClick={() => {
              playClick(soundEnabled)
              onOpenSettings()
              onClose()
            }}
          >
            <Settings2 size={14} aria-hidden="true" />
            <span>Все настройки</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, Rows3, Settings2, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { FEED_DENSITY_PRESETS, getFeedDensityPreset } from '@/lib/ogonek/appearance'
import { playClick } from '@/lib/ogonek/sound'
import type { FeedDensityId } from '@/lib/ogonek/types'

type Props = {
  open: boolean
  onClose: () => void
  density: FeedDensityId
  soundEnabled: boolean
  onSetDensity: (density: FeedDensityId) => void
  onSetSound: (enabled: boolean) => void
  onOpenSettings: () => void
  onNotify: (message: string) => void
}

/**
 * ЭТАП 20 — ЖИВОЕ МЕНЮ НАСТРОЕК ЛЕНТЫ.
 * Выпадающая панель из кнопки «⋯» в шапке ленты: меняет плотность карточек
 * и звук прямо на месте, плюс ведёт в полный центр настроек. Каждое действие
 * пишет в стор и мгновенно перерисовывает интерфейс.
 */
export function FeedSettingsMenu({
  open,
  onClose,
  density,
  soundEnabled,
  onSetDensity,
  onSetSound,
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
          className="feed-settings-menu"
          role="menu"
          aria-label="Настройки ленты"
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          <div className="feed-settings-menu__head">
            <Settings2 size={15} className="text-[#ff6b35]" aria-hidden="true" />
            <b>Настройки ленты</b>
            <span className="feed-settings-menu__current">{getFeedDensityPreset(density).label}</span>
          </div>

          <p className="feed-settings-menu__group">
            <Rows3 size={13} aria-hidden="true" /> Плотность карточек
          </p>

          {FEED_DENSITY_PRESETS.map((preset) => {
            const active = preset.id === density
            return (
              <button
                key={preset.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={`feed-settings-menu__item ${active ? 'is-active' : ''}`}
                onClick={() => {
                  playClick(soundEnabled)
                  onSetDensity(preset.id)
                  onNotify(`Плотность ленты: ${preset.label}`)
                  onClose()
                }}
              >
                <span className="feed-settings-menu__item-text">
                  <b>{preset.label}</b>
                  <small>{preset.hint}</small>
                </span>
                {active && <Check size={15} className="flex-none text-[#ff6b35]" aria-hidden="true" />}
              </button>
            )
          })}

          <div className="feed-settings-menu__divider" aria-hidden="true" />

          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={soundEnabled}
            className="feed-settings-menu__item"
            onClick={() => {
              const next = !soundEnabled
              onSetSound(next)
              if (next) playClick(true)
              onNotify(next ? 'Звуковые эффекты включены' : 'Звук отключён')
            }}
          >
            <span className="feed-settings-menu__item-text">
              <b>
                {soundEnabled ? (
                  <Volume2 size={13} aria-hidden="true" />
                ) : (
                  <VolumeX size={13} aria-hidden="true" />
                )}{' '}
                Звуковые эффекты
              </b>
              <small>Короткие щелчки и звук триумфа</small>
            </span>
            <span className={`switch ${soundEnabled ? 'on' : ''}`} aria-hidden="true">
              <i />
            </span>
          </button>

          <div className="feed-settings-menu__divider" aria-hidden="true" />

          <button
            type="button"
            role="menuitem"
            className="feed-settings-menu__item feed-settings-menu__item--link"
            onClick={() => {
              playClick(soundEnabled)
              onOpenSettings()
              onClose()
            }}
          >
            <Settings2 size={14} aria-hidden="true" />
            <span className="feed-settings-menu__item-text">
              <b>Все настройки</b>
              <small>Тема, акцент, шрифт и синхронизация</small>
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

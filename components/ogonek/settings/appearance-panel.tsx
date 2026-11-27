'use client'

import React, { useEffect, useState } from 'react'
import {
  Check,
  LayoutGrid,
  Moon,
  Palette,
  Pipette,
  RotateCcw,
  Sun,
  SunDim,
  Type,
  Volume2,
} from 'lucide-react'
import {
  ACCENT_PRESETS,
  FEED_DENSITY_PRESETS,
  FONT_SCALE_PRESETS,
  THEME_PRESETS,
} from '@/lib/ogonek/appearance'
import { normalizeTier } from '@/lib/ogonek/permissions'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type {
  AccentId,
  FeedDensityId,
  FontScaleId,
  ThemeMode,
} from '@/lib/ogonek/types'

type Props = {
  theme: ThemeMode
  accent: AccentId
  fontScale: FontScaleId
  feedDensity?: FeedDensityId
  soundEnabled: boolean
  subscriptionTier?: string | null
  subscriptionExpiresAt?: string | null
  subscriptionUsername?: string | null
  onSetTheme: (theme: ThemeMode) => void
  onSetAccent: (accent: AccentId) => void
  onSetFontScale: (scale: FontScaleId) => void
  onSetFeedDensity?: (density: FeedDensityId) => void
  onSetSoundEnabled: (enabled: boolean) => void
  onResetAppearance: () => void
  onNotify: (msg: string) => void
}

const THEME_ICONS: Record<ThemeMode, typeof Moon> = {
  'x-black': Moon,
  'apple-light': Sun,
  dim: SunDim,
}

function HexColorInput({
  currentAccent,
  onSetAccent,
}: {
  currentAccent: string
  onSetAccent: (val: any) => void
}) {
  const [localHex, setLocalHex] = useState(currentAccent.startsWith('#') ? currentAccent : '')

  useEffect(() => {
    if (currentAccent.startsWith('#')) {
      setLocalHex(currentAccent)
    }
  }, [currentAccent])

  return (
    <input
      type="text"
      value={localHex}
      placeholder="#d76737"
      onChange={(e) => {
        const val = e.target.value
        setLocalHex(val)
        const clean = val.trim()
        if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
          onSetAccent(clean)
        }
      }}
      onBlur={() => {
        const clean = localHex.trim()
        if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
          onSetAccent(clean)
        } else if (!clean) {
          setLocalHex('')
        } else if (currentAccent.startsWith('#')) {
          setLocalHex(currentAccent)
        }
      }}
      className="w-24 h-8 px-2.5 text-xs font-mono font-bold rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] outline-none focus:border-[var(--accent)]"
      maxLength={7}
      aria-label="HEX код акцента"
    />
  )
}

export function AppearancePanel({
  theme,
  accent,
  fontScale,
  feedDensity = 'cozy',
  soundEnabled,
  subscriptionTier,
  subscriptionExpiresAt,
  subscriptionUsername,
  onSetTheme,
  onSetAccent,
  onSetFontScale,
  onSetFeedDensity,
  onSetSoundEnabled,
  onResetAppearance,
  onNotify,
}: Props) {
  const isUltra = normalizeTier(subscriptionTier, subscriptionExpiresAt, subscriptionUsername) === 'ultra'

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-5" aria-label="Настройки внешнего вида">
      {/* ── 1. Тема оформления ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
            <Moon size={16} className="text-[var(--accent)]" /> Тема оформления
          </h3>
          <p className="text-[13px] text-[var(--text-2)] mt-0.5">
            Тёмная X Black, Dim или светлая Apple Light
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Тема оформления">
          {THEME_PRESETS.map((t) => {
            const Icon = THEME_ICONS[t.id]
            const active = theme === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  onSetTheme(t.id)
                  playClick(soundEnabled)
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)] shadow-sm'
                    : 'border-[var(--border)] bg-[var(--bg-elev)] text-[var(--text-2)] hover:border-[var(--border-strong)]'
                }`}
              >
                <Icon size={20} className={active ? 'text-[var(--accent)]' : ''} />
                <span className="text-[12px] font-bold mt-1.5">{t.label}</span>
                <span className="text-[10px] text-[var(--text-3)]">{t.code}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 2. Акцентный цвет (доступно только на Ultra) ─────────────── */}
      {isUltra && (
        <div className="flex flex-col gap-3 pt-3 border-t border-[var(--border)]">
          <div>
            <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
              <Palette size={16} className="text-[var(--accent)]" /> Акцентный цвет
            </h3>
            <p className="text-[13px] text-[var(--text-2)] mt-0.5">
              Главный цвет кнопок, бейджей и активных элементов интерфейса
            </p>
          </div>

          {/* 6 Пресетов */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2" role="radiogroup" aria-label="Акцентный цвет">
            {ACCENT_PRESETS.map((a) => {
              const active = accent === a.id
              return (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    onSetAccent(a.id)
                    playClick(soundEnabled)
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
                  <span className="text-[12px] font-semibold text-[var(--text)] text-center w-full break-words">
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
                  id="settings-custom-color-picker"
                  value={accent.startsWith('#') ? accent : '#d76737'}
                  onChange={(e) => {
                    onSetAccent(e.target.value as any)
                  }}
                  className="w-9 h-9 rounded-full cursor-pointer opacity-0 absolute inset-0 z-10"
                  aria-label="Выбрать свой цвет"
                />
                <div
                  className="w-9 h-9 rounded-full border-2 border-white/20 shadow-sm flex items-center justify-center transition-transform hover:scale-105"
                  style={{
                    background: accent.startsWith('#') ? accent : 'var(--accent)',
                  }}
                >
                  <Pipette size={14} className="text-black drop-shadow" />
                </div>
              </div>
              <div>
                <p className="text-[13px] font-bold text-[var(--text)] flex items-center gap-1.5">
                  <span>Свой цвет (HEX)</span>
                </p>
                <p className="text-[12px] text-[var(--text-2)]">
                  {accent.startsWith('#') ? accent.toUpperCase() : 'Выбери любой оттенок'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <HexColorInput
                currentAccent={accent}
                onSetAccent={(val) => {
                  onSetAccent(val)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Размер шрифта ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 pt-3 border-t border-[var(--border)]">
        <div>
          <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
            <Type size={16} className="text-[var(--accent)]" /> Размер шрифта
          </h3>
          <p className="text-[13px] text-[var(--text-2)] mt-0.5">
            Масштабирование текста и пропорций интерфейса
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Размер шрифта">
          {FONT_SCALE_PRESETS.map((f) => {
            const active = fontScale === f.id
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  onSetFontScale(f.id)
                  playClick(soundEnabled)
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

      {/* ── 4. Плотность ленты ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 pt-3 border-t border-[var(--border)]">
        <div>
          <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
            <LayoutGrid size={16} className="text-[var(--accent)]" /> Плотность ленты
          </h3>
          <p className="text-[13px] text-[var(--text-2)] mt-0.5">
            Отступы между записями в хронике и ленте друзей
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Плотность ленты">
          {FEED_DENSITY_PRESETS.map((d) => {
            const active = feedDensity === d.id
            return (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  onSetFeedDensity?.(d.id)
                  playClick(soundEnabled)
                }}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]'
                    : 'border-[var(--border)] bg-[var(--bg-elev)] text-[var(--text-2)]'
                }`}
              >
                <p className="text-[12px] font-bold text-[var(--text)]">{d.label}</p>
                <p className="text-[10px] text-[var(--text-3)] leading-tight break-words mt-0.5">{d.hint}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 5. Тактильные звуки ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
        <div>
          <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
            <Volume2 size={16} className="text-[var(--accent)]" /> Тактильный отклик
          </h3>
          <p className="text-[13px] text-[var(--text-2)] mt-0.5">
            Звуковые щелчки при нажатии на кнопки и переключатели
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={soundEnabled}
          aria-label="Включить тактильный отклик"
          onClick={() => {
            const next = !soundEnabled
            onSetSoundEnabled(next)
            if (next) playClick(true)
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

      {/* ── Сброс внешнего вида ─────────────────────────────────────────── */}
      <div className="pt-2 flex justify-end border-t border-[var(--border)]">
        <button
          type="button"
          onClick={() => {
            onResetAppearance()
            playSuccess(soundEnabled)
            onNotify('Внешний вид сброшен к стандартному')
          }}
          className="px-4 py-2 rounded-full border border-[var(--border)] text-xs font-bold text-[var(--text-2)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition-colors flex items-center gap-1.5"
        >
          <RotateCcw size={13} />
          <span>Сбросить оформление</span>
        </button>
      </div>
    </div>
  )
}

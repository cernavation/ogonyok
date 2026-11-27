'use client'

import React, { useEffect, useState } from 'react'
import {
  Check,
  Flame,
  Loader2,
  Sparkles,
  User,
  MapPin,
  AtSign,
} from 'lucide-react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { OgonekProfile } from '@/lib/ogonek/types'
import { DifficultyLevelPanel } from './difficulty-level-panel'
import { UserAvatar } from '../ui'

const AVATAR_COLORS = [
  { id: '#ff5722', label: 'Огненный' },
  { id: '#ff9800', label: 'Янтарный' },
  { id: '#4caf50', label: 'Изумрудный' },
  { id: '#2196f3', label: 'Сапфировый' },
  { id: '#9c27b0', label: 'Аметистовый' },
  { id: '#e91e63', label: 'Малиновый' },
  { id: '#00bcd4', label: 'Бирюзовый' },
  { id: '#607d8b', label: 'Графитовый' },
]

type Props = {
  profile: OgonekProfile
  soundEnabled?: boolean
  onUpdateProfile?: (patch: Partial<OgonekProfile>) => void
  onNotify: (message: string) => void
}

export function ProfilePanel({
  profile,
  soundEnabled = true,
  onUpdateProfile,
  onNotify,
}: Props) {
  const [displayName, setDisplayName] = useState(profile.displayName || '')
  const [username, setUsername] = useState(profile.username || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [city, setCity] = useState(profile.city || '')
  const [avatarColor, setAvatarColor] = useState(profile.avatarColor || '#ff5722')

  const [usernameChecking, setUsernameChecking] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'valid' | 'taken' | 'invalid'>('idle')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setDisplayName(profile.displayName || '')
    setUsername(profile.username || '')
    setBio(profile.bio || '')
    setCity(profile.city || '')
    setAvatarColor(profile.avatarColor || '#ff5722')
  }, [profile])

  // Живая проверка доступности никнейма с дебаунсом 300мс
  useEffect(() => {
    const clean = username.trim().toLowerCase().replace(/^@/, '')
    if (!clean || clean === (profile.username || '').toLowerCase()) {
      setUsernameStatus('idle')
      setUsernameChecking(false)
      return
    }

    if (clean.length < 3 || clean.length > 20 || !/^[a-z0-9_]+$/.test(clean)) {
      setUsernameStatus('invalid')
      setUsernameChecking(false)
      return
    }

    setUsernameChecking(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(clean)}`)
        const data = await res.json()
        if (data.available) {
          setUsernameStatus('valid')
        } else {
          setUsernameStatus('taken')
        }
      } catch {
        setUsernameStatus('idle')
      } finally {
        setUsernameChecking(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [username, profile.username])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) {
      onNotify('Имя не может быть пустым')
      return
    }
    if (usernameStatus === 'invalid' || usernameStatus === 'taken') {
      onNotify('Выберите допустимый и свободный никнейм')
      return
    }

    setIsSaving(true)
    playClick(soundEnabled)

    const patch: Partial<OgonekProfile> = {
      displayName: displayName.trim(),
      username: username.trim().toLowerCase().replace(/^@/, ''),
      bio: bio.trim(),
      city: city.trim(),
      avatarColor,
    }

    try {
      await onUpdateProfile?.(patch)
      playSuccess(soundEnabled)
      onNotify('Профиль успешно сохранён')
    } catch {
      onNotify('Ошибка при сохранении профиля')
    } finally {
      setIsSaving(false)
    }
  }

  const initial = (displayName.trim()[0] || username.trim()[0] || 'О').toUpperCase()

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-5">
      <form onSubmit={handleSave} className="flex flex-col gap-5">
        {/* Аватар и палитра */}
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)]">
          <UserAvatar
            avatarUrl={profile.avatarImage}
            avatarColor={avatarColor}
            displayName={displayName}
            username={username}
            initials={initial}
            size={64}
            bordered={false}
          />
          <div className="flex flex-col gap-1.5 flex-1 w-full text-center sm:text-left">
            <span className="text-sm font-bold text-[var(--text)]">Цвет аватара</span>
            <p className="text-xs text-[var(--text-2)]">
              Фирменная палитра Priday для монограммы профиля
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap mt-1">
              {AVATAR_COLORS.map((col) => {
                const isSelected = avatarColor === col.id
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => {
                      setAvatarColor(col.id)
                      playClick(soundEnabled)
                    }}
                    title={col.label}
                    aria-label={`Выбрать цвет ${col.label}`}
                    className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                      isSelected ? 'ring-2 ring-white scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: col.id }}
                  >
                    {isSelected && <Check size={14} className="text-white drop-shadow" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Поля профиля: Имя и Никнейм */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-profile-display-name" className="text-sm font-bold text-[var(--text)] flex items-center gap-1.5">
              <User size={15} className="text-[var(--accent)]" /> Отображаемое имя
            </label>
            <input
              id="settings-profile-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              placeholder="Как к вам обращаться"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-profile-username" className="text-sm font-bold text-[var(--text)] flex items-center gap-1.5">
              <AtSign size={15} className="text-[var(--accent)]" /> Никнейм (@username)
            </label>
            <div className="relative">
              <input
                id="settings-profile-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                placeholder="username"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors pr-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                {usernameChecking && <Loader2 size={16} className="animate-spin text-[var(--muted)]" />}
                {!usernameChecking && usernameStatus === 'valid' && <Check size={16} className="text-emerald-500" />}
              </div>
            </div>
            {usernameStatus === 'taken' && (
              <span className="text-xs text-rose-500">Этот никнейм уже занят</span>
            )}
            {usernameStatus === 'invalid' && (
              <span className="text-xs text-rose-500">От 3 до 20 латинских букв, цифр и _</span>
            )}
          </div>
        </div>

        {/* О себе (Bio) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="settings-profile-bio" className="text-sm font-bold text-[var(--text)]">
              О себе (Bio)
            </label>
            <span className="text-xs text-[var(--muted)] font-mono">{bio.length}/160</span>
          </div>
          <textarea
            id="settings-profile-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            rows={3}
            placeholder="Пара слов о ваших стремлениях, целях и жизненных принципах..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors resize-none leading-relaxed"
          />
        </div>

        {/* Город */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="settings-profile-city" className="text-sm font-bold text-[var(--text)] flex items-center gap-1.5">
            <MapPin size={15} className="text-[var(--accent)]" /> Город / Локация
          </label>
          <input
            id="settings-profile-city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={50}
            placeholder="Кишинёв, Молдова"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>

        {/* Кнопка сохранения */}
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            id="settings-profile-save-btn"
            disabled={isSaving}
            className="x-primary-btn px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span>Сохранить профиль</span>
          </button>
        </div>
      </form>

      {/* Уровень сложности */}
      <div className="pt-5 border-t border-[var(--border)]">
        <DifficultyLevelPanel
          currentLevel={profile.level ?? 5}
          levelChangedAtISO={profile.levelChangedAtISO ?? null}
          soundEnabled={soundEnabled}
          onChangeLevel={(newLevel) => {
            onUpdateProfile?.({ level: newLevel, levelChangedAtISO: new Date().toISOString() })
          }}
          onNotify={onNotify}
        />
      </div>
    </div>
  )
}

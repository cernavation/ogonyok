'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Compass,
  Crown,
  Download,
  Eye,
  Flame,
  FolderKanban,
  HelpCircle,
  Info,
  KeyRound,
  Laptop,
  Loader2,
  Lock,
  LogOut,
  Moon,
  Palette,
  Pipette,
  Radio,
  RotateCcw,
  Search,
  Share2,
  Shield,
  Smartphone,
  Sparkles,
  Sun,
  SunDim,
  Trash2,
  Type,
  Upload,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import {
  ACCENT_PRESETS,
  FEED_DENSITY_PRESETS,
  FONT_SCALE_PRESETS,
  THEME_PRESETS,
} from '@/lib/ogonek/appearance'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { exportStoreAsJson, validateAndImportJson } from '@/lib/ogonek/storage'
import { normalizeTier } from '@/lib/ogonek/permissions'
import { dispatchUpgradeModal } from '@/components/ogonek/billing/upgrade-modal'
import { getSupabase } from '@/lib/supabase/browser'
import { SettingRow } from '../settings/setting-row'
import { ListRow, ListEmptyState, ListRowSkeleton } from '../ui/list-row'
import type {
  AccentId,
  FeedDensityId,
  FontScaleId,
  OgonekProfile,
  OgonekStoreState,
  ThemeMode,
  ViewId,
} from '@/lib/ogonek/types'

type Props = {
  state: OgonekStoreState
  onNavigate: (view: ViewId) => void
  onNotify: (msg: string) => void
  onSetSoundEnabled: (enabled: boolean) => void
  onSetTheme: (theme: ThemeMode) => void
  onSetAccent: (accent: AccentId) => void
  onSetFontScale: (scale: FontScaleId) => void
  onSetFeedDensity?: (density: FeedDensityId) => void
  onResetAppearance?: () => void
  onImportState: (newState: OgonekStoreState) => void
  onResetToDefaults: () => void
  onUpdateProfile?: (patch: Partial<OgonekProfile>) => void
}

export type SettingsSectionId =
  | 'profile'
  | 'appearance'
  | 'privacy'
  | 'notifications'
  | 'chats'
  | 'security'
  | 'data'
  | 'subscription'
  | 'tour'
  | 'about'

interface SectionDef {
  id: SettingsSectionId
  label: string
  hint: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const SECTIONS: SectionDef[] = [
  { id: 'profile', label: 'Профиль', hint: 'Имя, никнейм, био, сложность пути', icon: User },
  { id: 'appearance', label: 'Внешний вид', hint: 'Тема, акцент, шрифт, плотность', icon: Palette },
  { id: 'privacy', label: 'Приватность', hint: 'Видимость, поиск, чёрный список', icon: Eye },
  { id: 'notifications', label: 'Уведомления', hint: 'Звук, DND, пуши, Telegram бот', icon: Bell },
  { id: 'chats', label: 'Чаты', hint: 'Папки, автозагрузка, медиа кэш', icon: FolderKanban },
  { id: 'security', label: 'Безопасность', hint: 'ПИН, пароль, активные сессии', icon: Shield },
  { id: 'data', label: 'Данные', hint: 'Экспорт JSON, импорт, удаление аккаунта', icon: Download },
  { id: 'subscription', label: 'Тариф', hint: 'Статус подписки, возможности', icon: Crown },
  { id: 'tour', label: 'Тур по приложению', hint: 'Пройти онбординг заново', icon: Compass },
  { id: 'about', label: 'О приложении', hint: 'Версия 2.0.0, манифест, ссылки', icon: Info },
]

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
      placeholder="var(--accent)"
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
      className="w-24 h-8 px-2.5 text-xs font-mono font-bold rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      maxLength={7}
      aria-label="HEX код акцента"
    />
  )
}

export function SettingsView({
  state,
  onNavigate,
  onNotify,
  onSetSoundEnabled,
  onSetTheme,
  onSetAccent,
  onSetFontScale,
  onSetFeedDensity,
  onImportState,
  onResetToDefaults,
  onUpdateProfile,
}: Props) {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('profile')
  const [mobileSubscreenOpen, setMobileSubscreenOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Profile Form state
  const [displayName, setDisplayName] = useState(state.profile.displayName || '')
  const [username, setUsername] = useState(state.profile.username || '')
  const [bio, setBio] = useState(state.profile.bio || '')
  const [city, setCity] = useState(state.profile.city || '')
  const [website, setWebsite] = useState(state.profile.website || '')
  const [difficultyLevel, setDifficultyLevel] = useState<number>(state.profile.level || 5)
  const [profileSaved, setProfileSaved] = useState(false)

  // Privacy server state
  const [whoCanFind, setWhoCanFind] = useState('everyone')
  const [whoCanMessage, setWhoCanMessage] = useState('everyone')
  const [whoCanCall, setWhoCanCall] = useState('everyone')
  const [whoCanSeeOnline, setWhoCanSeeOnline] = useState('everyone')
  const [defaultAudience, setDefaultAudience] = useState('public')
  const [showStreak, setShowStreak] = useState(true)
  const [searchableByUsername, setSearchableByUsername] = useState(true)
  const [hideFromLeaderboards, setHideFromLeaderboards] = useState(false)
  const [privacySaved, setPrivacySaved] = useState(false)

  // Blocked users state
  const [blockedUsers, setBlockedUsers] = useState<any[]>([])
  const [blockedLoading, setBlockedLoading] = useState(false)

  // Notifications state
  const [notifSound, setNotifSound] = useState(true)
  const [notifVolume, setNotifVolume] = useState(0.4)
  const [dndMode, setDndMode] = useState<'off' | '1h' | '8h' | '24h'>('off')
  const [browserPushEnabled, setBrowserPushEnabled] = useState(false)
  const [notifTypes, setNotifTypes] = useState({
    reactions: true,
    allies: true,
    chats: true,
    milestones: true,
    deadline: true,
  })
  const [notifSaved, setNotifSaved] = useState(false)

  // Chat settings state
  const [mediaQuality, setMediaQuality] = useState<'auto' | 'high' | 'economy'>('auto')
  const [autoDownload, setAutoDownload] = useState<'wifi' | 'always' | 'never'>('wifi')
  const [chatFolders, setChatFolders] = useState(['Все', 'Личные', 'Группы', 'Избранное'])

  // Security state
  const [pinEnabled, setPinEnabled] = useState(Boolean(state.security?.pinHash))
  const [biometricEnabled, setBiometricEnabled] = useState(Boolean(state.security?.biometricEnabled))
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)

  // Delete account modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const userTier = normalizeTier(state.profile?.subscription_tier, state.profile?.subscription_valid_until)
  const isFree = userTier === 'free'

  // Fetch server privacy and blocked users on load
  useEffect(() => {
    let isMounted = true
    async function loadPrivacy() {
      try {
        const res = await fetch('/api/privacy')
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.privacy && isMounted) {
            if (json.privacy.who_can_find) setWhoCanFind(json.privacy.who_can_find)
            if (json.privacy.who_can_message) setWhoCanMessage(json.privacy.who_can_message)
            if (json.privacy.who_can_call) setWhoCanCall(json.privacy.who_can_call)
            if (json.privacy.who_can_see_online) setWhoCanSeeOnline(json.privacy.who_can_see_online)
            if (json.privacy.default_day_visibility) setDefaultAudience(json.privacy.default_day_visibility)
            if (typeof json.privacy.show_streak_publicly === 'boolean') setShowStreak(json.privacy.show_streak_publicly)
            if (typeof json.privacy.searchable_by_username === 'boolean') setSearchableByUsername(json.privacy.searchable_by_username)
            if (typeof json.privacy.hide_from_leaderboards === 'boolean') setHideFromLeaderboards(json.privacy.hide_from_leaderboards)
          }
        }
      } catch {}
    }

    async function loadBlocked() {
      setBlockedLoading(true)
      try {
        const res = await fetch('/api/privacy/blocked')
        if (res.ok) {
          const json = await res.json()
          if (json.success && Array.isArray(json.blocked) && isMounted) {
            setBlockedUsers(json.blocked)
          }
        }
      } catch {} finally {
        if (isMounted) setBlockedLoading(false)
      }
    }

    loadPrivacy()
    loadBlocked()

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPushEnabled(Notification.permission === 'granted')
    }

    return () => {
      isMounted = false
    }
  }, [])

  const handleSaveProfile = () => {
    playClick(state.soundEnabled)
    onUpdateProfile?.({
      displayName: displayName.trim(),
      username: username.trim().replace(/^@/, ''),
      bio: bio.trim(),
      city: city.trim(),
      website: website.trim(),
      level: difficultyLevel,
    })
    setProfileSaved(true)
    playSuccess(state.soundEnabled)
    onNotify('Профиль успешно обновлён')
    setTimeout(() => setProfileSaved(false), 2200)
  }

  const handleSavePrivacy = async (patch: Record<string, any>) => {
    playClick(state.soundEnabled)
    setPrivacySaved(true)
    try {
      const res = await fetch('/api/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        onNotify('Настройки приватности сохранены')
      }
    } catch {
      onNotify('Ошибка при сохранении на сервере')
    }
    setTimeout(() => setPrivacySaved(false), 2200)
  }

  const handleUnblock = async (targetUserId: string) => {
    playClick(state.soundEnabled)
    try {
      const res = await fetch('/api/privacy/blocked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, action: 'unblock' }),
      })
      if (res.ok) {
        setBlockedUsers((prev) => prev.filter((u) => u.blocked_id !== targetUserId))
        onNotify('Пользователь разблокирован')
      }
    } catch {
      onNotify('Не удалось разблокировать')
    }
  }

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

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 8) {
      onNotify('Пароль должен быть не короче 8 символов')
      return
    }
    if (newPassword !== confirmPassword) {
      onNotify('Пароли не совпадают')
      return
    }

    setPasswordLoading(true)
    try {
      const supabase = getSupabase()
      if (!supabase) throw new Error('База данных недоступна')
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPasswordSaved(true)
      setNewPassword('')
      setConfirmPassword('')
      playSuccess(state.soundEnabled)
      onNotify('Пароль успешно изменён')
      setTimeout(() => setPasswordSaved(false), 2200)
    } catch (err: any) {
      onNotify(err.message || 'Ошибка смены пароля')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleLogoutAll = async () => {
    if (confirm('Выйти со всех устройств? Потребуется войти заново.')) {
      playClick(state.soundEnabled)
      try {
        const supabase = getSupabase()
        if (supabase) {
          await supabase.auth.signOut({ scope: 'global' })
        }
        localStorage.clear()
        window.location.href = '/'
      } catch {
        window.location.href = '/'
      }
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'УДАЛИТЬ' && deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Введите подтверждение: УДАЛИТЬ')
      return
    }
    if (!deletePassword) {
      setDeleteError('Введите текущий пароль')
      return
    }

    setDeleteLoading(true)
    setDeleteError('')

    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: deletePassword,
          confirmation: 'УДАЛИТЬ',
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        setDeleteError(json.error?.message || 'Не удалось удалить аккаунт')
        return
      }

      localStorage.clear()
      alert('Ваш аккаунт и все данные успешно удалены.')
      window.location.href = '/'
    } catch (err: any) {
      setDeleteError(err.message || 'Ошибка сетевого запроса')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleRequestPush = async () => {
    if (!('Notification' in window)) {
      onNotify('Браузер не поддерживает push-уведомления')
      return
    }
    try {
      const perm = await Notification.requestPermission()
      setBrowserPushEnabled(perm === 'granted')
      if (perm === 'granted') {
        playSuccess(state.soundEnabled)
        onNotify('Push-уведомления разрешены')
      } else {
        onNotify('В доступе к push-уведомлениям отказано')
      }
    } catch {
      onNotify('Ошибка запроса разрешений')
    }
  }

  // Active section renderer
  const renderDetail = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="flex flex-col gap-4 p-4 sm:p-6 animate-in fade-in duration-150">
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">Профиль пользователя</h2>
              <p className="text-xs text-[var(--text-2)] mt-0.5">
                Основная информация о вас, видимая соратникам и в летописи
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl text-white shrink-0 shadow-sm"
                style={{ background: state.profile.avatarColor || 'var(--accent)' }}
              >
                {(displayName || 'О')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-[var(--text)] truncate">{displayName || 'Имя'}</p>
                <p className="text-xs text-[var(--text-2)] truncate">@{username || 'ник'}</p>
                <p className="text-[11px] text-[var(--accent)] font-semibold mt-1">
                  Уровень пути: {difficultyLevel} из 5
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <SettingRow
                label="Имя"
                description="Отображается в ленте и в шапке профиля"
                control={
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-48 sm:w-64 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    placeholder="Ваше имя"
                  />
                }
              />

              <SettingRow
                label="Никнейм"
                description="Уникальный идентификатор без ведущего @"
                control={
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-[var(--text-2)] font-mono">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-44 sm:w-60 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                      placeholder="username"
                    />
                  </div>
                }
              />

              <SettingRow
                label="О себе"
                description="Пара предложений о вашем пути и дисциплине"
                control={
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-48 sm:w-64 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] resize-none"
                    placeholder="Био..."
                  />
                }
              />

              <SettingRow
                label="Город"
                description="Для поиска соратников поблизости"
                control={
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-48 sm:w-64 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    placeholder="Москва / Кишинёв"
                  />
                }
              />

              <SettingRow
                label="Веб-сайт или канал"
                description="Ссылка в профиле"
                control={
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-48 sm:w-64 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    placeholder="https://t.me/..."
                  />
                }
              />

              <SettingRow
                label="Сложность пути"
                description={`${difficultyLevel} побед и благодарностей каждый день (1 = Лёгкий, 3 = Баланс, 5 = Сталь)`}
                control={
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setDifficultyLevel(lvl)}
                        className={`w-8 h-8 rounded-xl font-bold text-xs transition-all ${
                          difficultyLevel === lvl
                            ? 'bg-[var(--accent)] text-white shadow-sm scale-105'
                            : 'bg-[var(--surface)] text-[var(--text-2)] border border-[var(--border)] hover:text-[var(--text)]'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                }
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={handleSaveProfile}
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-[var(--accent)] text-white hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                {profileSaved ? <Check size={14} /> : null}
                <span>{profileSaved ? 'Сохранено' : 'Сохранить изменения'}</span>
              </button>
            </div>
          </div>
        )

      case 'appearance':
        return (
          <div className="flex flex-col gap-5 p-4 sm:p-6 animate-in fade-in duration-150">
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">Внешний вид</h2>
              <p className="text-xs text-[var(--text-2)] mt-0.5">
                Персонализируйте цветовую гамму, тему и масштаб текста
              </p>
            </div>

            {/* Тема */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider">Тема</p>
              <div className="grid grid-cols-3 gap-2.5">
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
                      className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all ${
                        active
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)] shadow-sm'
                          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <Icon size={22} className={active ? 'text-[var(--accent)]' : ''} />
                      <span className="text-xs font-bold mt-2">{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Акцентный цвет */}
            <div className="flex flex-col gap-2 pt-3 border-t border-[var(--border)]">
              <p className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider">Акцентный цвет</p>
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
                          ? 'border-[var(--text)] bg-[var(--surface)] shadow-sm scale-102'
                          : 'border-[var(--border)] bg-[var(--surface)]/60 hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full shadow-sm mb-1"
                        style={{ background: a.color }}
                      />
                      <span className="text-xs font-semibold text-[var(--text)] truncate w-full">
                        {a.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Кастомный цвет (HEX) */}
              <div
                onClick={() => {
                  if (isFree) {
                    dispatchUpgradeModal({
                      feature: 'customAccent',
                      reason: 'Кастомизация темы доступна в Ultra',
                    })
                  }
                }}
                className={`flex items-center justify-between p-3.5 rounded-2xl bg-[var(--surface)] border mt-1 transition-colors ${
                  isFree ? 'cursor-pointer border-amber-500/20 hover:border-amber-500/40' : 'border-[var(--border)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {!isFree && (
                      <input
                        type="color"
                        value={state.accent.startsWith('#') ? state.accent : 'var(--accent)'}
                        onChange={(e) => onSetAccent(e.target.value as any)}
                        className="w-9 h-9 rounded-full cursor-pointer opacity-0 absolute inset-0 z-10"
                        aria-label="Выбрать свой цвет"
                      />
                    )}
                    <div
                      className="w-9 h-9 rounded-full border-2 border-white/20 shadow-sm flex items-center justify-center"
                      style={{
                        background: state.accent.startsWith('#') ? state.accent : 'var(--accent)',
                      }}
                    >
                      {isFree ? (
                        <Lock size={14} className="text-amber-400 drop-shadow" />
                      ) : (
                        <Pipette size={14} className="text-white drop-shadow" />
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-[var(--text)]">Свой цвет (HEX)</p>
                      {isFree && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                          <Crown size={10} /> Ultra
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-2)] mt-0.5">
                      {isFree ? 'Выбор произвольного цвета палитры' : 'Введите точный HEX-код'}
                    </p>
                  </div>
                </div>

                <div>
                  {isFree ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        dispatchUpgradeModal({
                          feature: 'customAccent',
                          reason: 'Кастомизация темы доступна в Ultra',
                        })
                      }}
                      className="h-8 px-3 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                    >
                      Открыть
                    </button>
                  ) : (
                    <HexColorInput currentAccent={state.accent} onSetAccent={onSetAccent} />
                  )}
                </div>
              </div>
            </div>

            {/* Шрифт и плотность */}
            <div className="flex flex-col gap-3 pt-3 border-t border-[var(--border)]">
              <p className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider">Типографика и плотность</p>

              <SettingRow
                label="Размер шрифта"
                description="Кегль текста для комфортного чтения"
                control={
                  <div className="flex items-center gap-1.5">
                    {FONT_SCALE_PRESETS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => onSetFontScale(f.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          state.fontScale === f.id
                            ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                            : 'bg-[var(--surface)] text-[var(--text-2)] border-[var(--border)] hover:text-[var(--text)]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                }
              />

              <SettingRow
                label="Плотность ленты"
                description="Высота карточек и компактность отступов"
                control={
                  <div className="flex items-center gap-1.5">
                    {FEED_DENSITY_PRESETS.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => onSetFeedDensity?.(d.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          state.feedDensity === d.id
                            ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                            : 'bg-[var(--surface)] text-[var(--text-2)] border-[var(--border)] hover:text-[var(--text)]'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                }
              />
            </div>
          </div>
        )

      case 'privacy':
        return (
          <div className="flex flex-col gap-5 p-4 sm:p-6 animate-in fade-in duration-150">
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">Приватность и доступ</h2>
              <p className="text-xs text-[var(--text-2)] mt-0.5">
                Настройки применяются на сервере и защищены Row Level Security
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <SettingRow
                label="Кто может найти мой профиль"
                description="Поиск по имени, городу и тегам"
                savedStatus={privacySaved}
                control={
                  <select
                    value={whoCanFind}
                    onChange={(e) => {
                      const val = e.target.value
                      setWhoCanFind(val)
                      handleSavePrivacy({ who_can_find: val })
                    }}
                    className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    <option value="everyone">Все пользователи</option>
                    <option value="friends">Только соратники</option>
                    <option value="nobody">Никто (скрыт)</option>
                  </select>
                }
              />

              <SettingRow
                label="Кто может писать в чаты"
                description="Личные сообщения и приглашения"
                savedStatus={privacySaved}
                control={
                  <select
                    value={whoCanMessage}
                    onChange={(e) => {
                      const val = e.target.value
                      setWhoCanMessage(val)
                      handleSavePrivacy({ who_can_message: val })
                    }}
                    className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    <option value="everyone">Все</option>
                    <option value="friends">Только соратники</option>
                    <option value="nobody">Никто</option>
                  </select>
                }
              />

              <SettingRow
                label="Кто может звонить"
                description="Аудио и видеозвонки WebRTC"
                savedStatus={privacySaved}
                control={
                  <select
                    value={whoCanCall}
                    onChange={(e) => {
                      const val = e.target.value
                      setWhoCanCall(val)
                      handleSavePrivacy({ who_can_call: val })
                    }}
                    className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    <option value="everyone">Все</option>
                    <option value="friends">Только соратники</option>
                    <option value="nobody">Никто</option>
                  </select>
                }
              />

              <SettingRow
                label="Кто видит статус «В сети»"
                description="Индикатор активности в хабе"
                savedStatus={privacySaved}
                control={
                  <select
                    value={whoCanSeeOnline}
                    onChange={(e) => {
                      const val = e.target.value
                      setWhoCanSeeOnline(val)
                      handleSavePrivacy({ who_can_see_online: val })
                    }}
                    className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    <option value="everyone">Все</option>
                    <option value="friends">Только соратники</option>
                    <option value="nobody">Никто</option>
                  </select>
                }
              />

              <SettingRow
                label="Аудитория по умолчанию для записей"
                description="Видимость новых дней в летописи"
                savedStatus={privacySaved}
                control={
                  <select
                    value={defaultAudience}
                    onChange={(e) => {
                      const val = e.target.value
                      setDefaultAudience(val)
                      handleSavePrivacy({ default_day_visibility: val })
                    }}
                    className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    <option value="public">Публично</option>
                    <option value="friends">Соратники</option>
                    <option value="private">Только я</option>
                  </select>
                }
              />

              <SettingRow
                label="Показывать длину стрика"
                description="Счётчик серии виден в публичной летописи"
                savedStatus={privacySaved}
                control={
                  <input
                    type="checkbox"
                    checked={showStreak}
                    onChange={(e) => {
                      const next = e.target.checked
                      setShowStreak(next)
                      handleSavePrivacy({ show_streak_publicly: next })
                    }}
                    className="w-5 h-5 rounded accent-[var(--accent)] cursor-pointer"
                  />
                }
              />

              <SettingRow
                label="Поиск по @username"
                description="Разрешить находить меня по нику"
                savedStatus={privacySaved}
                control={
                  <input
                    type="checkbox"
                    checked={searchableByUsername}
                    onChange={(e) => {
                      const next = e.target.checked
                      setSearchableByUsername(next)
                      handleSavePrivacy({ searchable_by_username: next })
                    }}
                    className="w-5 h-5 rounded accent-[var(--accent)] cursor-pointer"
                  />
                }
              />

              <SettingRow
                label="Скрыть из таблицы лидеров"
                description="Не показывать в общем рейтинге дисциплин"
                savedStatus={privacySaved}
                control={
                  <input
                    type="checkbox"
                    checked={hideFromLeaderboards}
                    onChange={(e) => {
                      const next = e.target.checked
                      setHideFromLeaderboards(next)
                      handleSavePrivacy({ hide_from_leaderboards: next })
                    }}
                    className="w-5 h-5 rounded accent-[var(--accent)] cursor-pointer"
                  />
                }
              />
            </div>

            {/* Заблокированные пользователи */}
            <div className="pt-4 border-t border-[var(--border)]">
              <h3 className="text-sm font-bold text-[var(--text)] mb-2">Чёрный список</h3>
              <p className="text-xs text-[var(--text-2)] mb-3">
                Заблокированные пользователи не могут видеть ваш профиль, писать сообщения и звонить
              </p>

              {blockedLoading ? (
                <ListRowSkeleton />
              ) : blockedUsers.length === 0 ? (
                <ListEmptyState
                  title="Чёрный список пуст"
                  description="Вы ещё никого не блокировали"
                />
              ) : (
                <div className="border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)] overflow-hidden">
                  {blockedUsers.map((user) => (
                    <ListRow
                      key={user.blocked_id}
                      avatar={
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white"
                          style={{ background: user.avatar_color || 'var(--accent)' }}
                        >
                          {(user.display_name || 'U')[0].toUpperCase()}
                        </div>
                      }
                      title={user.display_name}
                      subtitle={`@${user.username}`}
                      metadata={
                        <button
                          type="button"
                          onClick={() => handleUnblock(user.blocked_id)}
                          className="px-3 py-1 rounded-full text-xs font-semibold border border-[var(--border)] hover:bg-[var(--bg-hover)] text-[var(--text)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                        >
                          Разблокировать
                        </button>
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )

      case 'notifications':
        return (
          <div className="flex flex-col gap-5 p-4 sm:p-6 animate-in fade-in duration-150">
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">Уведомления и звуки</h2>
              <p className="text-xs text-[var(--text-2)] mt-0.5">
                Настройте звуки, тихий режим и доставку в Telegram
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <SettingRow
                label="Звуковые эффекты приложения"
                description="Щелчки, триумф и тактильные звуки интерфейса"
                savedStatus={notifSaved}
                control={
                  <button
                    type="button"
                    onClick={() => {
                      const next = !state.soundEnabled
                      onSetSoundEnabled(next)
                      setNotifSaved(true)
                      setTimeout(() => setNotifSaved(false), 2000)
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      state.soundEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full bg-white transition-transform block absolute top-0.5 left-0.5 ${
                        state.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                }
              />

              <SettingRow
                label="Громкость уведомлений"
                description={`Текущий уровень: ${Math.round(notifVolume * 100)}%`}
                control={
                  <div className="flex items-center gap-2">
                    <Volume2 size={15} className="text-[var(--text-2)]" />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={notifVolume}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        setNotifVolume(val)
                      }}
                      className="w-28 sm:w-36 accent-[var(--accent)] cursor-pointer"
                    />
                  </div>
                }
              />

              <SettingRow
                label="Режим «Не беспокоить»"
                description="Временно отключает звуки и всплывающие окна"
                control={
                  <div className="flex items-center gap-1.5">
                    {(['off', '1h', '8h', '24h'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setDndMode(mode)
                          onNotify(mode === 'off' ? 'DND отключён' : `DND включён на ${mode}`)
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                          dndMode === mode
                            ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                            : 'bg-[var(--surface)] text-[var(--text-2)] border-[var(--border)] hover:text-[var(--text)]'
                        }`}
                      >
                        {mode === 'off' ? 'Выкл' : mode}
                      </button>
                    ))}
                  </div>
                }
              />

              <SettingRow
                label="Браузерные Push-уведомления"
                description={
                  browserPushEnabled
                    ? 'Уведомления разрешены в браузере'
                    : 'Получать важные напоминания о дедлайне'
                }
                control={
                  browserPushEnabled ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-[var(--success)] bg-[var(--success-soft)] px-2.5 py-1 rounded-full">
                      <Check size={13} /> Включены
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestPush}
                      className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[var(--accent)] text-white hover:opacity-90 active:scale-95 transition-all"
                    >
                      Включить
                    </button>
                  )
                }
              />
            </div>

            <div className="pt-3 border-t border-[var(--border)]">
              <p className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider mb-2">
                Категории уведомлений
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { key: 'reactions', label: 'Огоньки и реакции на записи' },
                  { key: 'allies', label: 'Запросы в соратники' },
                  { key: 'chats', label: 'Сообщения в чатах и группах' },
                  { key: 'milestones', label: 'Вехи и достижения' },
                  { key: 'deadline', label: 'Дедлайн закрытия дня' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={notifTypes[item.key as keyof typeof notifTypes]}
                      onChange={(e) =>
                        setNotifTypes((prev) => ({
                          ...prev,
                          [item.key]: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded accent-[var(--accent)]"
                    />
                    <span className="text-xs font-medium text-[var(--text)]">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )

      case 'chats':
        return (
          <div className="flex flex-col gap-5 p-4 sm:p-6 animate-in fade-in duration-150">
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">Настройки чатов</h2>
              <p className="text-xs text-[var(--text-2)] mt-0.5">
                Папки диалогов, загрузка медиафайлов и локальный кэш
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <SettingRow
                label="Папки чатов"
                description="Вкладки для быстрой фильтрации переписок"
                control={
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {chatFolders.map((f) => (
                      <span
                        key={f}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                }
              />

              <SettingRow
                label="Качество отправки фото"
                description="Баланс между качеством и скоростью отправки"
                control={
                  <select
                    value={mediaQuality}
                    onChange={(e) => setMediaQuality(e.target.value as any)}
                    className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    <option value="auto">Автоматически</option>
                    <option value="high">Высокое (без сжатия)</option>
                    <option value="economy">Экономия трафика</option>
                  </select>
                }
              />

              <SettingRow
                label="Автозагрузка медиа"
                description="Когда загружать фото и голосовые автоматически"
                control={
                  <select
                    value={autoDownload}
                    onChange={(e) => setAutoDownload(e.target.value as any)}
                    className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    <option value="wifi">Только по Wi-Fi</option>
                    <option value="always">Всегда (Wi-Fi + моб.)</option>
                    <option value="never">Никогда (по клику)</option>
                  </select>
                }
              />

              <SettingRow
                label="Очистить кэш медиа"
                description="Освобождает место на диске, не удаляя переписки"
                control={
                  <button
                    type="button"
                    onClick={() => {
                      playClick(state.soundEnabled)
                      onNotify('Кэш чатов успешно очищен')
                    }}
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    Очистить
                  </button>
                }
              />
            </div>
          </div>
        )

      case 'security':
        return (
          <div className="flex flex-col gap-5 p-4 sm:p-6 animate-in fade-in duration-150">
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">Безопасность и вход</h2>
              <p className="text-xs text-[var(--text-2)] mt-0.5">
                Защита паролем, PIN-кодом, биометрией и управление сессиями
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <SettingRow
                label="Быстрый PIN-код"
                description={pinEnabled ? 'ПИН-код активирован' : 'Блокировка дневника 4-значным PIN'}
                control={
                  <button
                    type="button"
                    onClick={() => {
                      setPinEnabled(!pinEnabled)
                      onNotify(pinEnabled ? 'ПИН-код удалён' : 'ПИН-код настроен')
                    }}
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold border border-[var(--border)] hover:bg-[var(--bg-hover)] text-[var(--text)] transition-colors"
                  >
                    {pinEnabled ? 'Отключить' : 'Настроить'}
                  </button>
                }
              />

              <SettingRow
                label="Биометрия (Face ID / Touch ID)"
                description="Быстрая разблокировка через WebAuthn"
                control={
                  <button
                    type="button"
                    onClick={() => {
                      setBiometricEnabled(!biometricEnabled)
                      onNotify(biometricEnabled ? 'Биометрия отключена' : 'Биометрия включена')
                    }}
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold border border-[var(--border)] hover:bg-[var(--bg-hover)] text-[var(--text)] transition-colors"
                  >
                    {biometricEnabled ? 'Отключить' : 'Включить'}
                  </button>
                }
              />
            </div>

            {/* Смена пароля */}
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-3">
              <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                <KeyRound size={16} className="text-[var(--accent)]" /> Смена пароля аккаунта
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="password"
                  placeholder="Новый пароль (от 8 символов)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                />
                <input
                  type="password"
                  placeholder="Повторите новый пароль"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={passwordLoading}
                  onClick={handlePasswordChange}
                  className="px-4 py-2 rounded-full text-xs font-bold bg-[var(--accent)] text-white hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {passwordLoading ? <Loader2 size={13} className="animate-spin" /> : null}
                  <span>Обновить пароль</span>
                </button>
              </div>
            </div>

            {/* Активные сессии */}
            <div className="pt-3 border-t border-[var(--border)] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text)]">Активные сессии</h3>
                  <p className="text-xs text-[var(--text-2)] mt-0.5">Устройства, с которых выполнен вход</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogoutAll}
                  className="px-3 py-1.5 rounded-full text-xs font-bold border border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors inline-flex items-center gap-1.5"
                >
                  <LogOut size={13} />
                  <span>Выйти везде</span>
                </button>
              </div>

              <div className="border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)] overflow-hidden">
                <ListRow
                  avatar={
                    <div className="w-9 h-9 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center">
                      <Laptop size={18} />
                    </div>
                  }
                  title="Текущее устройство"
                  subtitle="macOS • Chrome • Онлайн"
                  metadata={
                    <span className="text-[11px] font-semibold text-[var(--success)] bg-[var(--success-soft)] px-2 py-0.5 rounded-full">
                      Активна
                    </span>
                  }
                />
              </div>
            </div>
          </div>
        )

      case 'data':
        return (
          <div className="flex flex-col gap-5 p-4 sm:p-6 animate-in fade-in duration-150">
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">Управление данными</h2>
              <p className="text-xs text-[var(--text-2)] mt-0.5">
                Резервное копирование, импорт и безвозвратное удаление
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                  <Download size={16} className="text-[var(--accent)]" /> Резервное копирование
                </h3>
                <p className="text-xs text-[var(--text-2)] mt-0.5">
                  Сохранение всех записей, гордостей и благодарностей в локальный JSON файл
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExport}
                  className="px-4 py-2 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <Download size={14} />
                  <span>Скачать JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-full border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)] text-xs font-bold inline-flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <Upload size={14} />
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
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-amber-500">Сброс к демо-данным</h3>
                <p className="text-xs text-[var(--text-2)] mt-0.5">
                  Восстановить примеры записей и настроек
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Сбросить данные к демо? Текущие записи будут заменены образцами.')) {
                    onResetToDefaults()
                    onNotify('Данные сброшены к демо')
                  }
                }}
                className="px-3.5 py-1.5 rounded-full border border-amber-500/40 text-amber-500 hover:bg-amber-500/10 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw size={13} />
                <span>Сбросить</span>
              </button>
            </div>

            {/* Удаление аккаунта */}
            <div className="p-4 rounded-2xl bg-[var(--danger-soft)]/20 border border-[var(--danger)]/30 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--danger)] flex items-center gap-1.5">
                  <Trash2 size={15} /> Удаление аккаунта
                </h3>
                <p className="text-xs text-[var(--text-2)] mt-0.5">
                  Безвозвратное удаление профиля, записей и медиа из базы данных и хранилища
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDeleteError('')
                  setDeletePassword('')
                  setDeleteConfirmText('')
                  setDeleteModalOpen(true)
                }}
                className="px-4 py-2 rounded-full bg-[var(--danger)] text-white hover:opacity-90 active:scale-95 text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm"
              >
                <span>Удалить аккаунт</span>
              </button>
            </div>
          </div>
        )

      case 'subscription':
        return (
          <div className="flex flex-col gap-5 p-4 sm:p-6 animate-in fade-in duration-150">
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">Тариф и подписка</h2>
              <p className="text-xs text-[var(--text-2)] mt-0.5">
                Возможности вашего текущего тарифного плана
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-2)]">
                    Текущий статус
                  </span>
                  <h3 className="text-xl font-extrabold text-[var(--text)] flex items-center gap-2 mt-0.5">
                    {userTier === 'ultra' ? 'Тариф Ultra' : userTier === 'pro' ? 'Тариф Премиум' : 'Базовый тариф (Free)'}
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        userTier === 'ultra'
                          ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                          : userTier === 'pro'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-[var(--border)] text-[var(--text-2)]'
                      }`}
                    >
                      {userTier}
                    </span>
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('premium')}
                  className="px-4 py-2 rounded-full bg-[var(--accent)] text-white hover:opacity-90 text-xs font-bold transition-all shadow-sm"
                >
                  {isFree ? 'Выбрать тариф' : 'Управление'}
                </button>
              </div>

              <div className="border-t border-[var(--border)] pt-3 flex flex-col gap-2 text-xs text-[var(--text-2)]">
                <p>• <b>Базовый (Free)</b>: дневник силы, стрик, 1 фото дня, текстовые чаты.</p>
                <p>• <b>Премиум</b>: аудио/видеозвонки WebRTC, неограниченные группы, ИИ-оценка дня.</p>
                <p>• <b>Ultra</b>: кастомные HEX-акценты, наставления ИИ-ментора, золотой бейдж.</p>
              </div>
            </div>
          </div>
        )

      case 'tour':
        return (
          <div className="flex flex-col gap-5 p-4 sm:p-6 animate-in fade-in duration-150">
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">Тур по приложению</h2>
              <p className="text-xs text-[var(--text-2)] mt-0.5">
                Пройдите интерактивное знакомство с механикой дневника
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-3">
              <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                <Compass size={18} className="text-[var(--accent)]" /> Знакомство с Огоньком
              </h3>
              <p className="text-xs text-[var(--text-2)] leading-relaxed">
                Интерактивный тур покажет, как вести записи, закрывать дедлайн дня,
                находить соратников и соревноваться без токсичной продуктивности.
              </p>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('ogonek:open-onboarding'))
                  onNotify('Онбординг запущен')
                }}
                className="mt-2 px-5 py-2.5 rounded-full bg-[var(--accent)] text-white hover:opacity-90 active:scale-95 text-xs font-bold transition-all shadow-sm self-start focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                Пройти тур заново
              </button>
            </div>
          </div>
        )

      case 'about':
        return (
          <div className="flex flex-col gap-5 p-4 sm:p-6 animate-in fade-in duration-150">
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">О приложении</h2>
              <p className="text-xs text-[var(--text-2)] mt-0.5">
                Информация о версии, манифесте и юридических правилах
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center font-black text-lg shadow-sm">
                    О
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text)]">Огонёк — Дневник силы</h3>
                    <p className="text-xs text-[var(--text-2)]">Версия 2.0.0 (Release Candidate)</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[var(--text-2)] leading-relaxed pt-2 border-t border-[var(--border)]">
                «Огонёк» создан для людей, строящих железную дисциплину. Без выгорания,
                без пустых обещаний, с ежедневной фиксацией побед и благодарностей.
              </p>

              <div className="flex items-center gap-3 flex-wrap pt-2">
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-[var(--accent)] hover:underline"
                >
                  Политика конфиденциальности
                </a>
                <span className="text-[var(--border)]">•</span>
                <a
                  href="/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-[var(--accent)] hover:underline"
                >
                  Условия обслуживания
                </a>
                <span className="text-[var(--border)]">•</span>
                <a
                  href="https://t.me/ogonek_support"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-[var(--accent)] hover:underline"
                >
                  Поддержка в Telegram
                </a>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen pb-24 w-full">
      {/* Top Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--line)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            onClick={() => {
              if (mobileSubscreenOpen) {
                setMobileSubscreenOpen(false)
              } else {
                onNavigate('home')
              }
            }}
            aria-label="Назад"
          >
            <ArrowLeft size={19} />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-[var(--text)]">
              {mobileSubscreenOpen
                ? SECTIONS.find((s) => s.id === activeSection)?.label || 'Настройки'
                : 'Настройки'}
            </h1>
            <p className="text-xs text-[var(--text-2)] font-normal hidden sm:block">
              Персонализация дневника и системы
            </p>
          </div>
        </div>
      </header>

      {/* Layout: Desktop Master-Detail / Mobile Subscreen Navigation */}
      <div className="w-full">
        {/* MOBILE VIEW (sm:hidden) */}
        <div className="sm:hidden">
          {!mobileSubscreenOpen ? (
            <div className="w-full divide-y divide-[var(--border)]" role="list">
              {SECTIONS.map((sec) => {
                const Icon = sec.icon
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      playClick(state.soundEnabled)
                      setActiveSection(sec.id)
                      setMobileSubscreenOpen(true)
                    }}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--accent)] flex items-center justify-center shrink-0">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--text)]">{sec.label}</p>
                        <p className="text-xs text-[var(--text-2)] truncate mt-0.5">{sec.hint}</p>
                      </div>
                    </div>
                    <ChevronRight size={17} className="text-[var(--text-2)] shrink-0" />
                  </button>
                )
              })}
            </div>
          ) : (
            <div>{renderDetail()}</div>
          )}
        </div>

        {/* DESKTOP VIEW (hidden sm:grid) */}
        <div className="hidden sm:grid sm:grid-cols-12 min-h-[calc(100vh-60px)] divide-x divide-[var(--line)]">
          {/* Left Navigation Column (Master) */}
          <nav className="sm:col-span-4 lg:col-span-4 p-3 flex flex-col gap-1" aria-label="Разделы настроек">
            {SECTIONS.map((sec) => {
              const Icon = sec.icon
              const isSelected = activeSection === sec.id
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    playClick(state.soundEnabled)
                    setActiveSection(sec.id)
                  }}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left transition-all ${
                    isSelected
                      ? 'bg-[var(--accent-soft)] text-[var(--text)] font-bold shadow-sm'
                      : 'text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]'
                  }`}
                  aria-selected={isSelected}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)]'
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs ${isSelected ? 'font-bold text-[var(--text)]' : 'font-medium'}`}>
                      {sec.label}
                    </p>
                    <p className="text-[11px] text-[var(--text-2)] truncate mt-0.5">{sec.hint}</p>
                  </div>
                </button>
              )
            })}
          </nav>

          {/* Right Detail Pane */}
          <main className="sm:col-span-8 lg:col-span-8 bg-[var(--bg)] min-w-0">
            {renderDetail()}
          </main>
        </div>
      </div>

      {/* Delete Account Modal */}
      {deleteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--danger)]/40 p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[var(--danger)]">
                <AlertTriangle size={22} />
                <h3 id="delete-account-title" className="text-base font-bold">
                  Удаление аккаунта
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="p-1 rounded-full text-[var(--text-2)] hover:text-[var(--text)]"
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[var(--text-2)] leading-relaxed">
              Это действие необратимо. Все ваши дни, гордости, благодарности, фотографии и личные
              сообщения будут навсегда удалены из базы данных и облачного хранилища.
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-bold text-[var(--text)] block mb-1">
                  Введите ваш пароль:
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Пароль"
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text)] block mb-1">
                  Для подтверждения введите слово <b>УДАЛИТЬ</b>:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="УДАЛИТЬ"
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
                />
              </div>

              {deleteError && (
                <p className="text-xs font-semibold text-[var(--danger)]">{deleteError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)]"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={deleteLoading || !deletePassword || deleteConfirmText.trim().toUpperCase() !== 'УДАЛИТЬ'}
                onClick={handleDeleteAccount}
                className="px-5 py-2 rounded-full text-xs font-bold bg-[var(--danger)] text-white hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all flex items-center gap-2"
              >
                {deleteLoading ? <Loader2 size={13} className="animate-spin" /> : null}
                <span>Безвозвратно удалить</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

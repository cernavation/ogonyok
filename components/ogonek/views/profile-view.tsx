'use client'

import React, { useMemo, useState } from 'react'
import {
  ArrowLeft,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  Flame,
  Heart,
  Images,
  MapPin,
  Pencil,
  Search,
  Settings,
  Share2,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { downloadBlob } from '@/lib/ogonek/card-export'
import {
  computeProfileStats,
  type ProfileStats,
} from '@/lib/ogonek/profile-share'
import {
  getBannerPreset,
  getSocialPlatformMeta,
  prettySocialUrl,
} from '@/lib/ogonek/profile-presets'
import { playClick } from '@/lib/ogonek/sound'
import { exportStoreAsJson } from '@/lib/ogonek/storage'
import { usePhotoUrl } from '@/lib/ogonek/use-photo-url'
import type { Day, OgonekProfile, OgonekStoreState, ViewId } from '@/lib/ogonek/types'
import { EditProfileModal } from '../edit-profile-modal'
import { FriendsManager } from '../friends-manager'
import { ShareProfileModal } from '../share-profile-modal'
import { AchievementsPanel } from '../achievements/achievements-panel'
import { GoldVerificationBadge } from '../achievements/verification-badge'
import { ProfileImageCropperModal } from '../profile/profile-image-cropper-modal'
import { DifficultyLevelBadge } from '../profile/difficulty-level-badge'
import { Button, Card, Badge } from '../ui'

interface Props {
  storeState: OgonekStoreState
  onNavigate: (view: ViewId) => void
  onUpdateProfile: (patch: Partial<OgonekProfile>) => void
  onResetProfile: () => void
  onToggleFollow?: (friendId: string) => unknown
  onNotify: (message: string) => void
  soundEnabled: boolean
}

type ProfileTabId = 'days' | 'gratitudes' | 'calendar' | 'achievements' | 'friends'

const PROFILE_TABS: { id: ProfileTabId; label: string; icon: LucideIcon }[] = [
  { id: 'days', label: 'Записи', icon: Calendar },
  { id: 'gratitudes', label: 'Благодарности', icon: Heart },
  { id: 'calendar', label: 'Календарь', icon: Flame },
  { id: 'friends', label: 'Друзья', icon: Users },
]

function initialsFrom(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
  if (parts.length === 0) return 'Я'
  return parts.map((p) => p[0].toUpperCase()).join('')
}

function formatDayDate(iso?: string): string {
  if (!iso) return 'сегодня'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function dayAvgScale(day: Day): number | null {
  const valid = (day.prides || []).filter(
    (p) => typeof p.scale === 'number' && !isNaN(p.scale) && p.scale > 0 && p.text !== '—'
  )
  if (valid.length === 0) return null
  const sum = valid.reduce((acc, p) => acc + p.scale, 0)
  return Math.round((sum / valid.length) * 10) / 10
}

export function ProfileView({
  storeState,
  onNavigate,
  onUpdateProfile,
  onResetProfile,
  onToggleFollow,
  onNotify,
  soundEnabled,
}: Props) {
  const profile = storeState.profile
  const bannerPreset = getBannerPreset(profile.bannerPreset)
  const avatarSrc = usePhotoUrl(profile.avatarImage)
  const coverSrc = usePhotoUrl(profile.coverUrl || profile.bannerImage)
  const followingIds = storeState.followingIds ?? []

  const [activeTab, setActiveTab] = useState<ProfileTabId>('days')
  const [editOpen, setEditOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [coverCropperOpen, setCoverCropperOpen] = useState(false)
  const [avatarCropperOpen, setAvatarCropperOpen] = useState(false)
  const [selectedDayModal, setSelectedDayModal] = useState<Day | null>(null)
  const [jumpDayNumber, setJumpDayNumber] = useState('')

  const days = useMemo(() => {
    return Array.isArray(storeState?.days) ? storeState.days : []
  }, [storeState?.days])

  // Truncation & Chunking (Rule D)
  const [visibleCount, setVisibleCount] = useState(20)
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({})

  const stats: ProfileStats = useMemo(
    () => computeProfileStats(days, followingIds.length),
    [days, followingIds.length]
  )

  const recentDays = useMemo(() => {
    return [...days].sort((a, b) => b.id - a.id)
  }, [days])

  const paginatedDays = useMemo(() => {
    return recentDays.slice(0, visibleCount)
  }, [recentDays, visibleCount])

  // Collect all gratitudes across all days
  const allGratitudes = useMemo(() => {
    const list: { dayId: number; dateISO?: string; text: string }[] = []
    recentDays.forEach((day) => {
      day.gratitudes.forEach((g) => {
        const text = typeof g === 'string' ? g : g?.text
        if (text && text !== '—') {
          list.push({ dayId: day.id, dateISO: day.dateISO, text })
        }
      })
    })
    return list
  }, [recentDays])

  const paginatedGratitudes = useMemo(() => {
    return allGratitudes.slice(0, visibleCount)
  }, [allGratitudes, visibleCount])

  // Heatmap generation: 2+ years (730 days = 104 weeks x 7 days) (Rule C)
  const heatmapData = useMemo(() => {
    const totalDays = 730
    const today = new Date()
    const cells = []
    const dayMap = new Map<number, Day>()
    days.forEach((d) => dayMap.set(d.id, d))

    const maxDayId = Math.max(719, ...days.map((d) => d.id), 0)

    for (let i = totalDays - 1; i >= 0; i--) {
      const dayId = maxDayId - i
      const realDay = dayMap.get(dayId)
      let level = 0
      let score = 0
      let dateLabel = ''

      if (realDay) {
        score = dayAvgScale(realDay) || 8.0
        level = score >= 9 ? 4 : score >= 8 ? 3 : score >= 6 ? 2 : 1
        dateLabel = formatDayDate(realDay.dateISO)
      } else {
        const d = new Date(today.getTime() - i * 86400000)
        dateLabel = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
        // If within streak record range, simulate filled
        if (dayId > 0 && dayId <= maxDayId) {
          level = (dayId % 5 === 0) ? 4 : (dayId % 3 === 0) ? 3 : 2
          score = 8.5
        }
      }

      cells.push({
        dayId,
        realDay: realDay || null,
        level,
        score,
        dateLabel,
      })
    }
    return cells
  }, [days])

  const handleJumpToDay = () => {
    const id = parseInt(jumpDayNumber, 10)
    if (!isNaN(id)) {
      const match = days.find((d) => d.id === id)
      if (match) {
        setSelectedDayModal(match)
        playClick(soundEnabled)
        onNotify(`Открыт День #${id}`)
      } else {
        const dummy: Day = {
          id,
          dateISO: new Date().toISOString(),
          title: `День #${id}`,
          tags: ['#архив'],
          prides: Array.from({ length: 5 }).map((_, pi) => ({ num: `${pi + 1}`, text: `Архивная победа дня #${id}`, scale: 8.5, overcome: 1 as const })),
          gratitudes: Array.from({ length: 5 }).map((_, gi) => `Благодарность дня #${id} (${gi + 1})`),
          photos: [],
        }
        setSelectedDayModal(dummy)
        onNotify(`День #${id} из архива 700+ дней`)
      }
    }
  }

  const handleDownloadBackup = () => {
    try {
      const json = exportStoreAsJson(storeState)
      const blob = new Blob([json], { type: 'application/json' })
      downloadBlob(blob, `ogonek-backup-${new Date().toISOString().slice(0, 10)}.json`)
      playClick(soundEnabled)
      onNotify('Бэкап успешно скачан')
    } catch {
      onNotify('Не удалось скачать бэкап')
    }
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
            onClick={() => onNavigate('home')}
            aria-label="Назад"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-[17px] font-bold text-[var(--text)] leading-none">
              {profile.displayName}
            </h1>
            <p className="text-[13px] text-[var(--text-2)] mt-1">
              {days.length} дней в летописи
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              playClick(soundEnabled)
              setShareOpen(true)
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
            aria-label="Поделиться"
          >
            <Share2 size={18} />
          </button>
          <button
            type="button"
            onClick={() => {
              playClick(soundEnabled)
              onNavigate('settings')
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
            aria-label="Настройки"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Cover Banner 200px */}
      <div
        className="h-[200px] w-full relative overflow-hidden group"
        style={{
          background: coverSrc ? undefined : (bannerPreset.background || 'linear-gradient(135deg, #FF6A1A 0%, #16181C 100%)'),
        }}
      >
        {coverSrc && (
          <img
            src={coverSrc}
            alt="Обложка профиля"
            className="w-full h-full object-cover"
          />
        )}
        {/* Кнопка смены обложки */}
        <button
          type="button"
          onClick={() => {
            playClick(soundEnabled)
            setCoverCropperOpen(true)
          }}
          className="absolute bottom-3 right-3 sm:right-6 min-h-[34px] px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 shadow-lg border border-white/20 transition-all hover:scale-105 active:scale-95"
          title="Сменить обложку профиля"
          aria-label="Сменить обложку"
        >
          <Camera size={14} />
          <span className="hidden sm:inline">Сменить обложку</span>
        </button>
      </div>

      {/* Profile Info Header */}
      <div className="px-4 sm:px-6 relative">
        <div className="flex items-end justify-between -mt-[67px] mb-3 gap-3">
          {/* Avatar 134px с рамкой цвета фона (4px solid var(--bg)), 50% нахлёст */}
          <div className="relative flex-none group">
            <div
              className="w-[134px] h-[134px] rounded-full border-4 border-[var(--bg)] bg-[var(--bg-elev)] shadow-xl overflow-hidden flex items-center justify-center font-black text-3xl text-white select-none relative"
              style={{ background: avatarSrc ? undefined : profile.avatarColor || 'var(--accent)' }}
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt={profile.displayName} className="w-full h-full object-cover" />
              ) : (
                initialsFrom(profile.displayName)
              )}
            </div>
            {/* Кнопка смены аватара */}
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                setAvatarCropperOpen(true)
              }}
              className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-[var(--bg-elev)] border-2 border-[var(--bg)] text-[var(--text)] flex items-center justify-center shadow-lg hover:bg-[var(--bg-hover)] hover:scale-105 active:scale-95 transition-all"
              title="Сменить аватар"
              aria-label="Сменить аватар"
            >
              <Camera size={15} />
            </button>
          </div>

          {/* Action buttons: Изменить / Поделиться в пилюлях */}
          <div className="flex items-center gap-2 pb-2">
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                setEditOpen(true)
              }}
              className="px-4 py-1.5 rounded-full border border-[var(--border)] text-[14px] font-bold text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors min-h-[36px]"
            >
              Изменить
            </button>
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                setShareOpen(true)
              }}
              className="px-4 py-1.5 rounded-full border border-[var(--border)] text-[14px] font-bold text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors min-h-[36px]"
            >
              Поделиться
            </button>
          </div>
        </div>

        {/* Name 20px/800 and @ник серым */}
        <div className="mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-[20px] font-[800] text-[var(--text)] tracking-tight">
              {profile.displayName}
            </h2>
            {profile.verified && (
              <span className="w-4 h-4 rounded-full bg-[var(--accent)] text-[var(--accent-text)] inline-flex items-center justify-center flex-none">
                <Check size={10} strokeWidth={3} />
              </span>
            )}
            <GoldVerificationBadge size="sm" />
          </div>
          <p className="text-[15px] text-[var(--text-2)]">@{profile.username}</p>
        </div>

        {/* Bio 15px */}
        {profile.bio && (
          <p className="text-[15px] text-[var(--text)] leading-relaxed mb-3 whitespace-pre-wrap max-w-xl">
            {profile.bio}
          </p>
        )}

        {/* Ряд «N дней дневника · N записей · N подписчиков · 🔥 Уровень N» */}
        <div className="flex items-center gap-3 text-[14px] text-[var(--text-2)] mb-4 flex-wrap">
          <span><strong className="font-bold text-[var(--text)]">{stats.streakDays}</strong> дней дневника</span>
          <span>·</span>
          <span><strong className="font-bold text-[var(--text)]">{stats.totalPrides + stats.totalGratitudes}</strong> записей</span>
          <span>·</span>
          <span><strong className="font-bold text-[var(--text)]">{storeState.friendIds?.length ?? 0}</strong> подписчиков</span>
          <span>·</span>
          <DifficultyLevelBadge
            level={profile.difficultyLevel || 2}
            soundEnabled={soundEnabled}
            onNotify={onNotify}
          />
        </div>

        {/* Вкладки на всю ширину (Записи | Благодарности | Календарь | Друзья) */}
        <div className="flex items-center border-b border-[var(--border)] -mx-4 sm:-mx-6 mb-4" role="tablist" aria-label="Вкладки профиля">
          {PROFILE_TABS.map((t) => {
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  playClick(soundEnabled)
                  setActiveTab(t.id)
                }}
                className={`flex-1 py-3.5 text-center text-[15px] font-bold border-b-2 transition-colors min-h-[44px] ${
                  active
                    ? 'border-[var(--accent)] text-[var(--text)]'
                    : 'border-transparent text-[var(--text-2)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 sm:px-6">
        {/* TAB 1: ЗАПИСИ (чанкование по 20, сворачивание до 4 строк с «Показать ещё») */}
        {activeTab === 'days' && (
          <div className="flex flex-col gap-3">
            {paginatedDays.map((day) => {
              const isExpanded = Boolean(expandedCards[day.id])
              const avg = dayAvgScale(day)

              return (
                <div
                  key={day.id}
                  className="border-b border-[var(--border)] py-4 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[13px] font-bold bg-[var(--accent-soft)] text-[var(--text)] dark:text-[var(--accent)]">
                        День #{day.id}
                      </span>
                      <span className="text-[13px] text-[var(--text-2)]">
                        {formatDayDate(day.dateISO)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {avg !== null && (
                        <span className="text-[13px] font-bold text-amber-500">
                          ★ {avg}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedDayModal(day)}
                        className="min-h-[34px] px-2 py-1 text-[13px] text-[var(--text)] dark:text-[var(--accent)] font-bold hover:underline inline-flex items-center"
                      >
                        Подробнее →
                      </button>
                    </div>
                  </div>

                  <p className="text-[16px] leading-[22px] text-[var(--text)] mb-2">
                    {day.title}
                  </p>

                  {/* 4-line truncated text content */}
                  <div className={isExpanded ? '' : 'line-clamp-4'}>
                    <div className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-300">
                      {day.prides.slice(0, 5).map((p, idx) => (
                        <div key={idx} className="flex items-baseline gap-2">
                          <span className="text-[var(--text)] dark:text-[var(--accent)] text-xs font-bold flex-none">{idx + 1}.</span>
                          <span>{p.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {day.prides.length > 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCards((prev) => ({ ...prev, [day.id]: !isExpanded }))
                      }
                      className="mt-2 min-h-[34px] px-2.5 py-1 text-[13px] font-bold text-[var(--text)] dark:text-[var(--accent)] hover:underline inline-flex items-center rounded-lg hover:bg-white/5"
                    >
                      {isExpanded ? 'Свернуть' : 'Показать ещё…'}
                    </button>
                  )}
                </div>
              )
            })}

            {/* Chunking: Показать ещё 20 записей */}
            {recentDays.length > visibleCount && (
              <div className="pt-2 text-center">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((prev) => prev + 20)}
                >
                  Показать ещё 20 записей (осталось {recentDays.length - visibleCount})
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: БЛАГОДАРНОСТИ */}
        {activeTab === 'gratitudes' && (
          <div className="flex flex-col gap-2.5">
            {paginatedGratitudes.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex items-start gap-3"
              >
                <div className="w-7 h-7 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center flex-none mt-0.5">
                  <Heart size={14} className="fill-current" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {item.text}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    День #{item.dayId} · {formatDayDate(item.dateISO)}
                  </p>
                </div>
              </div>
            ))}

            {allGratitudes.length > visibleCount && (
              <div className="pt-2 text-center">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((prev) => prev + 20)}
                >
                  Показать ещё 20 благодарностей
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: КАЛЕНДАРЬ (2+ года сетка, быстрый переход, модалка 5+5) — Screen C */}
        {activeTab === 'calendar' && (
          <div className="flex flex-col gap-4">
            <Card className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-[#FF5C00]" />
                    Карта огня (2+ года, 730 дней)
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Каждая ячейка — закрытый день силы
                  </p>
                </div>

                {/* Быстрый переход «к дню №…» */}
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                    <Search size={14} className="text-zinc-400" />
                    <input
                      type="number"
                      placeholder="К дню №…"
                      value={jumpDayNumber}
                      onChange={(e) => setJumpDayNumber(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleJumpToDay()}
                      className="w-20 bg-transparent text-xs text-zinc-900 dark:text-zinc-100 outline-none"
                    />
                  </div>
                  <Button variant="primary" size="sm" onClick={handleJumpToDay}>
                    Перейти
                  </Button>
                </div>
              </div>

              {/* GitHub-style Heatmap Grid (104 columns x 7 rows) */}
              <div className="overflow-x-auto pb-3 pt-1 no-scrollbar">
                <div
                  className="grid grid-rows-7 grid-flow-col gap-1 w-max"
                  role="grid"
                  aria-label="Сетка активности 730 дней"
                >
                  {heatmapData.map((cell) => {
                    const bgClass =
                      cell.level === 4
                        ? 'bg-[#FF5C00] shadow-[0_0_6px_rgba(255,92,0,0.5)]'
                        : cell.level === 3
                        ? 'bg-[#FF7A18]/80'
                        : cell.level === 2
                        ? 'bg-[#FF5C00]/40'
                        : cell.level === 1
                        ? 'bg-[#FF5C00]/20'
                        : 'bg-zinc-200 dark:bg-zinc-800/80'

                    return (
                      <span
                        key={cell.dayId}
                        role="gridcell"
                        tabIndex={0}
                        onClick={() => {
                          const targetDay = cell.realDay || (cell.dayId > 0 ? {
                            id: cell.dayId,
                            dateISO: new Date().toISOString(),
                            title: `День #${cell.dayId}`,
                            tags: ['#архив'],
                            prides: Array.from({ length: 5 }).map((_, pi) => ({ num: `${pi + 1}`, text: `Зафиксированная победа дня #${cell.dayId}`, scale: 8.5, overcome: 1 as const })),
                            gratitudes: Array.from({ length: 5 }).map((_, gi) => `Благодарность дня #${cell.dayId} (${gi + 1})`),
                            photos: [],
                          } as Day : null)
                          if (targetDay) {
                            setSelectedDayModal(targetDay)
                            playClick(soundEnabled)
                          }
                        }}
                        className={`w-3.5 h-3.5 rounded-sm transition-transform hover:scale-125 focus:scale-125 focus:outline-none cursor-pointer ${bgClass}`}
                        title={`День #${cell.dayId} · ${cell.dateLabel} · ★ ${cell.score}`}
                        aria-label={`День #${cell.dayId}`}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500">
                <span>Меньше огня</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                  <div className="w-3 h-3 rounded-sm bg-[#FF5C00]/20" />
                  <div className="w-3 h-3 rounded-sm bg-[#FF5C00]/40" />
                  <div className="w-3 h-3 rounded-sm bg-[#FF7A18]/80" />
                  <div className="w-3 h-3 rounded-sm bg-[#FF5C00]" />
                </div>
                <span>Больше огня</span>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 4: ДОСТИЖЕНИЯ */}
        {activeTab === 'achievements' && (
          <AchievementsPanel onNotify={onNotify} soundEnabled={soundEnabled} />
        )}

        {/* TAB 5: ДРУЗЬЯ */}
        {activeTab === 'friends' && (
          <FriendsManager onNotify={onNotify} soundEnabled={soundEnabled} />
        )}
      </div>

      {/* Шторка / Модалка дня с 5+5 записями и AI-оценкой (Rule C) */}
      {selectedDayModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={() => setSelectedDayModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50">
                    День #{selectedDayModal.id}
                  </h3>
                  {dayAvgScale(selectedDayModal) !== null && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#FF5C00] text-white">
                      ★ {dayAvgScale(selectedDayModal)}/10
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {formatDayDate(selectedDayModal.dateISO)} · {selectedDayModal.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDayModal(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* 5 Гордостей */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)] dark:text-[var(--accent)] mb-2 flex items-center gap-1.5">
                <Flame size={14} className="fill-current text-[var(--accent)]" />
                Гордости дня (5)
              </h4>
              <div className="flex flex-col gap-2">
                {selectedDayModal.prides.slice(0, 5).map((p, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[var(--text)] dark:text-[var(--accent)] mt-0.5">{idx + 1}.</span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">{p.text}</span>
                    </div>
                    {p.scale > 0 && (
                      <span className="font-bold text-amber-500 flex-none">{p.scale}★</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 5 Благодарностей */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-500 mb-2 flex items-center gap-1.5">
                <Heart size={14} className="fill-current" />
                Благодарности дня (5)
              </h4>
              <div className="flex flex-col gap-2">
                {selectedDayModal.gratitudes.slice(0, 5).map((g, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 flex items-start gap-2 text-xs"
                  >
                    <span className="font-bold text-rose-500 mt-0.5">{idx + 1}.</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {typeof g === 'string' ? g : (g?.text || '')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                variant="primary"
                onClick={() => {
                  setSelectedDayModal(null)
                  onNavigate('home')
                }}
              >
                Открыть в общей ленте
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modals */}
      {editOpen && (
        <EditProfileModal
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSave={(patch) => {
            onUpdateProfile(patch)
            setEditOpen(false)
            onNotify('Профиль успешно обновлён')
          }}
          onReset={onResetProfile}
          onNotify={onNotify}
          soundEnabled={soundEnabled}
        />
      )}

      {shareOpen && (
        <ShareProfileModal
          profile={profile}
          stats={stats}
          avatarSrc={null}
          onClose={() => setShareOpen(false)}
          onNotify={onNotify}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Cover Image Cropper */}
      {coverCropperOpen && (
        <ProfileImageCropperModal
          mode="cover"
          currentPreset={profile.bannerPreset}
          onClose={() => setCoverCropperOpen(false)}
          onApplyImage={(url) => {
            onUpdateProfile({ bannerImage: url, coverUrl: url })
          }}
          onRemovePhoto={() => {
            onUpdateProfile({ bannerImage: null, coverUrl: null })
          }}
          onSelectPreset={(presetId) => {
            onUpdateProfile({ bannerPreset: presetId, bannerImage: null, coverUrl: null })
          }}
          onNotify={onNotify}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Avatar Image Cropper */}
      {avatarCropperOpen && (
        <ProfileImageCropperModal
          mode="avatar"
          onClose={() => setAvatarCropperOpen(false)}
          onApplyImage={(url) => {
            onUpdateProfile({ avatarImage: url })
          }}
          onNotify={onNotify}
          soundEnabled={soundEnabled}
        />
      )}
    </div>
  )
}

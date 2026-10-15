'use client'

import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  Flame,
  Heart,
  Images,
  Lock,
  MapPin,
  Pencil,
  Settings,
  Share2,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useMemo, useState, type ReactNode } from 'react'
import { downloadBlob } from '@/lib/ogonek/card-export'
import {
  buildProfileStories,
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
import { Lightbox } from '../lightbox'
import { ProfileStoryModal } from '../profile-story-modal'
import { ShareProfileModal } from '../share-profile-modal'
import { AchievementsPanel } from '../achievements/achievements-panel'
import { GoldVerificationBadge } from '../achievements/verification-badge'

interface Props {
  storeState: OgonekStoreState
  onNavigate: (view: ViewId) => void
  onUpdateProfile: (patch: Partial<OgonekProfile>) => void
  onResetProfile: () => void
  onToggleFollow?: (friendId: string) => unknown
  onNotify: (message: string) => void
  soundEnabled: boolean
}

type ProfileTabId = 'days' | 'achievements' | 'stories' | 'media' | 'friends'

const PROFILE_TABS: { id: ProfileTabId; label: string; icon: LucideIcon }[] = [
  { id: 'days', label: 'Дни', icon: Calendar },
  { id: 'achievements', label: 'Ачивки', icon: Trophy },
  { id: 'stories', label: 'Сторис', icon: Sparkles },
  { id: 'media', label: 'Медиа-сетка', icon: Images },
  { id: 'friends', label: 'Друзья', icon: Users },
]

type ProfileMetrics = {
  highOvercome: number
  commentCount: number
}

type AchievementDef = {
  id: string
  emoji: string
  title: string
  sub: string
  color: string
  always?: boolean
  check?: (stats: ProfileStats, metrics: ProfileMetrics) => boolean
}

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: 'marathon', emoji: '🏆', title: '42 км босиком', sub: 'Легендарный статус', color: '#f59e0b', always: true },
  { id: 'fire700', emoji: '🔥', title: '700+ дней Огонька', sub: 'Железная дисциплина', color: '#ff6b35', check: (s) => s.totalDays >= 700 },
  { id: 'founder', emoji: '💼', title: 'Основатель Memernity', sub: 'Серийный предприниматель', color: '#1d9bf0', always: true },
  { id: 'chess', emoji: '♟️', title: 'Шахматный триумф', sub: 'Победа над Волошиным', color: '#a855f7', always: true },
  { id: 'fireproof', emoji: '🛡️', title: 'Огнеупорный', sub: 'Рекорд стрика 100+ дней', color: '#f97316', check: (s) => s.best >= 100 },
  { id: 'chronicler', emoji: '📜', title: 'Летописец', sub: '500+ дней в летописи', color: '#0ea5e9', check: (s) => s.totalDays >= 500 },
  { id: 'depth', emoji: '🌊', title: 'Мастер глубины', sub: '10+ дней с преодолением', color: '#06b6d4', check: (_s, m) => m.highOvercome >= 10 },
  { id: 'vault', emoji: '🔐', title: 'Хранитель сейфа', sub: '5+ фактов в Evidence Vault', color: '#a3e635', always: true },
  { id: 'voice', emoji: '💬', title: 'Голос поддержки', sub: '5+ слов поддержки в дневнике', color: '#f472b6', check: (_s, m) => m.commentCount >= 5 },
  { id: 'aiStar', emoji: '⭐', title: 'Высокий балл ИИ', sub: 'Средний балл силы 8.0+', color: '#facc15', check: (s) => s.avgAiScore >= 8 },
]

function initialsFrom(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
  if (parts.length === 0) return 'AC'
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('')
}

function formatDayDate(dateISO?: string): string {
  if (!dateISO) return 'Без даты'
  const date = new Date(dateISO)
  if (Number.isNaN(date.getTime())) return 'Без даты'
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function dayAvgScale(day: Day): number | null {
  const rated = day.prides.filter((p) => typeof p.scale === 'number' && p.scale > 0)
  if (rated.length === 0) return null
  return Math.round((rated.reduce((sum, p) => sum + p.scale, 0) / rated.length) * 10) / 10
}

function StatTile({
  icon,
  color,
  label,
  value,
  sub,
}: {
  icon: ReactNode
  color: string
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="bg-[#16181c] rounded-2xl border border-[#2f3336] p-3">
      <div className="flex items-center gap-1.5 text-[#71767b] text-[11px] leading-[15px] font-bold mb-1.5">
        <span style={{ color }} className="flex-none">
          {icon}
        </span>
        {label}
      </div>
      <p className="text-[#e7e9ea] text-[24px] font-black leading-none tracking-[-0.03em]">
        {value}
      </p>
      <p className="text-[#71767b] text-[11px] leading-[15px] mt-1">{sub}</p>
    </div>
  )
}

function MediaCell({
  src,
  index,
  onOpen,
}: {
  src: string
  index: number
  onOpen: (url: string) => void
}) {
  const resolved = usePhotoUrl(src)
  return (
    <button
      type="button"
      className="prof-media-cell aspect-square"
      onClick={() => resolved && onOpen(resolved)}
      disabled={!resolved}
      aria-label={`Открыть медиа ${index + 1}`}
    >
      {resolved ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolved} alt={`Медиа ${index + 1}`} />
      ) : (
        <span className="block w-full h-full bg-[#16181c]" />
      )}
      <span className="prof-media-cell-veil" aria-hidden="true" />
    </button>
  )
}

export function ProfileView({
  storeState,
  onNavigate,
  onUpdateProfile,
  onResetProfile,
  onNotify,
  soundEnabled,
}: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ProfileTabId>('days')
  const [storyIndex, setStoryIndex] = useState<number | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const profile = storeState.profile
  const followingIds = storeState.followingIds ?? []

  const avatarSrc = usePhotoUrl(profile.avatarImage)
  const bannerSrc = usePhotoUrl(profile.bannerImage)
  const bannerPreset = useMemo(() => getBannerPreset(profile.bannerPreset), [profile.bannerPreset])

  // ── Живая статистика (стрик, балл ИИ, гордости, благодарности) ──────────
  const stats = useMemo(() => computeProfileStats(storeState), [storeState])
  const stories = useMemo(() => buildProfileStories(profile, stats), [profile, stats])

  const metrics = useMemo<ProfileMetrics>(() => {
    let highOvercome = 0
    for (const day of storeState.days) {
      if (day.status === 'missed') continue
      for (const pride of day.prides) {
        if (pride.overcome >= 2) highOvercome++
      }
    }
    const commentCount = Object.values(storeState.comments ?? {}).reduce(
      (total, list) => total + list.length,
      0
    )
    return { highOvercome, commentCount }
  }, [storeState])

  const achievements = useMemo(
    () =>
      ACHIEVEMENT_DEFS.map((def) => ({
        ...def,
        unlocked: def.always ? true : def.check ? def.check(stats, metrics) : false,
      })),
    [stats, metrics]
  )
  const unlockedCount = achievements.filter((a) => a.unlocked).length

  const officiallyVerifiedCount = useMemo(
    () =>
      (storeState.verifiedAchievements ?? []).filter(
        (ach) => ach.submission?.status === 'officially-verified'
      ).length,
    [storeState.verifiedAchievements]
  )

  const recentDays = useMemo(
    () => storeState.days.filter((d) => d.status !== 'missed').slice(0, 12),
    [storeState.days]
  )

  const mediaItems = useMemo(() => {
    const items: { id: string; src: string }[] = []
    if (profile.bannerImage) items.push({ id: 'banner', src: profile.bannerImage })
    if (profile.avatarImage) items.push({ id: 'avatar', src: profile.avatarImage })
    for (const day of storeState.days) {
      const photos = day.photos ?? []
      photos.forEach((photo, i) => {
        items.push({ id: `day-${day.id}-${i}`, src: photo })
      })
    }
    return items.slice(0, 60)
  }, [storeState.days, profile.avatarImage, profile.bannerImage])

  const handleBackup = () => {
    playClick(soundEnabled)
    try {
      const json = exportStoreAsJson(storeState)
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
      downloadBlob(blob, `ogonek-backup-${new Date().toISOString().slice(0, 10)}.json`)
      onNotify('Резервная копия профиля скачана')
    } catch {
      onNotify('Не удалось скачать бэкап')
    }
  }

  const handleOpenDay = (day: Day) => {
    playClick(soundEnabled)
    onNavigate('home')
    onNotify(`Открываю День #${day.id} в ленте`)
  }

  const handleOpenStory = (index: number) => {
    playClick(soundEnabled)
    setStoryIndex(index)
  }

  return (
    <div className="view-profile">
      {/* ── Sticky header ──────────────────────────────────────────────── */}
      <header
        className="flex items-center gap-5 px-4 py-3 sticky top-0 z-10 border-b border-[#2f3336]"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(14px)' }}
      >
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="w-9 h-9 rounded-full flex items-center justify-center text-[#e7e9ea] hover:bg-white/[0.08] transition-colors flex-none"
          aria-label="Назад"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0">
          <p className="text-[#e7e9ea] text-[20px] font-bold leading-[24px] tracking-[-0.02em] truncate">
            {profile.displayName}
          </p>
          <p className="text-[#71767b] text-[13px] leading-[16px]">{stats.totalDays} постов</p>
        </div>
      </header>

      {/* ── Cover banner ───────────────────────────────────────────────── */}
      <div
        className="w-full h-[200px] relative overflow-hidden"
        style={{ background: bannerSrc ? undefined : bannerPreset.background }}
        aria-label="Обложка профиля"
      >
        {bannerSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerSrc} alt="Обложка профиля" className="w-full h-full object-cover" />
        )}
        {!bannerSrc && bannerPreset.mountains && (
          <svg
            className="absolute bottom-0 left-0 right-0 w-full"
            viewBox="0 0 600 80"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0,80 L0,50 L80,20 L160,45 L240,10 L320,35 L380,5 L460,30 L530,15 L600,25 L600,80 Z"
              fill="#0a1929"
              opacity="0.8"
            />
            <path
              d="M0,80 L0,65 L60,40 L140,60 L200,30 L280,55 L360,25 L440,50 L520,35 L600,45 L600,80 Z"
              fill="#050d17"
              opacity="0.6"
            />
          </svg>
        )}
        {!bannerSrc && (
          <>
            {[...Array(18)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  width: i % 3 === 0 ? 2 : 1,
                  height: i % 3 === 0 ? 2 : 1,
                  top: `${10 + ((i * 17) % 55)}%`,
                  left: `${5 + ((i * 23) % 90)}%`,
                  opacity: 0.4 + (i % 4) * 0.15,
                  background: bannerPreset.accent,
                }}
                aria-hidden="true"
              />
            ))}
          </>
        )}
      </div>

      {/* ── Avatar + action buttons ────────────────────────────────────── */}
      <div className="relative px-4 pb-4">
        <div className="flex items-end justify-between -mt-[50px] mb-3 gap-2">
          <div
            className="w-[100px] h-[100px] rounded-full border-4 border-black flex items-center justify-center font-black text-xl select-none flex-none overflow-hidden"
            style={{ background: avatarSrc ? undefined : profile.avatarColor, color: '#fff' }}
            aria-label="Аватар профиля"
          >
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarSrc} alt="Аватар профиля" className="w-full h-full object-cover" />
            ) : (
              <span style={{ textShadow: '0 1px 3px #000' }}>{initialsFrom(profile.displayName)}</span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-auto pb-1 flex-wrap justify-end">
            <button
              type="button"
              className="w-9 h-9 rounded-full border border-[#536471] flex items-center justify-center text-[#e7e9ea] hover:bg-white/[0.06] transition-colors"
              onClick={handleBackup}
              title="Скачать резервную копию JSON"
              aria-label="Скачать бэкап данных"
            >
              <Download size={16} />
            </button>
            <button
              type="button"
              className="w-9 h-9 rounded-full border border-[#536471] flex items-center justify-center text-[#e7e9ea] hover:bg-white/[0.06] transition-colors"
              onClick={() => {
                playClick(soundEnabled)
                onNavigate('settings')
              }}
              aria-label="Настройки профиля"
            >
              <Settings size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                setShareOpen(true)
              }}
              className="h-9 px-4 rounded-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white text-[15px] font-bold transition-colors flex items-center gap-1.5"
              aria-label="Поделиться профилем"
            >
              <Share2 size={15} />
              Поделиться
            </button>
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                setEditOpen(true)
              }}
              className="h-9 px-4 rounded-full border border-[#536471] text-[15px] font-bold text-[#e7e9ea] hover:bg-white/[0.06] transition-colors flex items-center gap-1.5"
              aria-label="Редактировать профиль"
            >
              <Pencil size={14} />
              Edit
            </button>
          </div>
        </div>

        {/* Name + verified + handle */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="text-[#e7e9ea] text-[21px] font-bold tracking-[-0.02em] leading-[25px]">
              {profile.displayName}
            </h1>
            {profile.verified && (
              <span
                className="inline-grid place-items-center rounded-full text-white flex-none"
                style={{ background: '#1d9bf0', width: 20, height: 20, fontSize: 11, fontWeight: 900 }}
                title="Верифицирован"
                aria-label="Верифицирован"
              >
                ✓
              </span>
            )}
            {officiallyVerifiedCount > 0 && (
              <GoldVerificationBadge
                size="sm"
                title={`Достижений, официально подтверждённых модератором: ${officiallyVerifiedCount}`}
              />
            )}
          </div>
          <p className="text-[#71767b] text-[15px] leading-[20px] mt-0.5">@{profile.username}</p>
        </div>

        {/* Bio */}
        <p className="text-[#e7e9ea] text-[15px] leading-[23px] tracking-[-0.015em] mb-3 whitespace-pre-wrap">
          {profile.bio}
        </p>

        {/* Monthly main goal */}
        {profile.monthlyGoal && (
          <div
            className="flex items-start gap-3 rounded-2xl border border-[#3d2000] px-4 py-3 mb-3"
            style={{ background: 'linear-gradient(135deg, rgba(255,107,53,0.10), rgba(255,166,0,0.04))' }}
          >
            <Target size={18} className="text-[#ff6b35] flex-none mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#ff8a50] mb-0.5">
                Главная цель месяца
              </p>
              <p className="text-[#e7e9ea] text-[15px] leading-[21px] font-semibold">
                {profile.monthlyGoal}
              </p>
            </div>
          </div>
        )}

        {/* Meta info row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
          {profile.city && (
            <span className="flex items-center gap-1 text-[#71767b] text-[15px] leading-[20px]">
              <MapPin size={16} className="flex-none" aria-hidden="true" />
              {profile.city}
            </span>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#1d9bf0] text-[15px] leading-[20px] hover:underline"
            >
              <ExternalLink size={16} className="flex-none" aria-hidden="true" />
              {prettySocialUrl(profile.website)}
            </a>
          )}
          <span className="flex items-center gap-1 text-[#71767b] text-[15px] leading-[20px]">
            <Calendar size={16} className="flex-none" aria-hidden="true" />
            Joined {profile.joinedLabel}
          </span>
        </div>

        {/* Social links */}
        {profile.socialLinks.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {profile.socialLinks.map((link) => {
              const meta = getSocialPlatformMeta(link.platform)
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-[#2f3336] px-3 py-1 text-[13px] text-[#e7e9ea] hover:bg-white/[0.06] transition-colors"
                  style={{ borderColor: `${meta.color}55` }}
                  title={link.url}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-none"
                    style={{ background: meta.color }}
                    aria-hidden="true"
                  />
                  {link.label || meta.label}
                </a>
              )
            })}
          </div>
        )}

        {/* Following / Followers */}
        <div className="flex items-center gap-4 mb-4">
          <button type="button" className="flex items-center gap-1 hover:underline">
            <span className="text-[#e7e9ea] text-[15px] font-bold">{48 + followingIds.length}</span>
            <span className="text-[#71767b] text-[15px]">Following</span>
          </button>
          <button type="button" className="flex items-center gap-1 hover:underline">
            <span className="text-[#e7e9ea] text-[15px] font-bold">1</span>
            <span className="text-[#71767b] text-[15px]">Follower</span>
          </button>
        </div>

        {/* ── SaaS Pro stats ──────────────────────────────────────────── */}
        <section aria-label="Статистика профиля" className="mb-4">
          <div
            className="flex items-center gap-3 rounded-2xl border border-[#3d2000] p-4 mb-2"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,107,53,0.16), rgba(255,166,0,0.05))',
            }}
          >
            <Flame size={30} className="text-[#ff6b35] flex-none" fill="currentColor" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[#e7e9ea] text-[32px] font-black leading-none tracking-[-0.03em]">
                {stats.streakDays}+
                <span className="text-[15px] font-bold text-[#71767b] ml-2">дней стрика</span>
              </p>
              <p className="text-[#71767b] text-[12px] leading-[16px] mt-1">
                Рекорд {stats.best} дн. · всего {stats.totalDays} дней в летописи
              </p>
            </div>
            <span
              className="text-[11px] font-black text-[#ff8a50] border border-[#ff8a5055] rounded-full px-2.5 py-1 flex-none"
              title="SaaS-профиль Pro"
            >
              PRO
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatTile
              icon={<Star size={13} />}
              color="#facc15"
              label="Балл ИИ"
              value={stats.avgAiScore.toFixed(1)}
              sub="из 10.0"
            />
            <StatTile
              icon={<Zap size={13} />}
              color="#fbbf24"
              label="Гордости"
              value={stats.totalPrides.toLocaleString('ru-RU')}
              sub="зафиксировано"
            />
            <StatTile
              icon={<Heart size={13} />}
              color="#f91880"
              label="Спасибо"
              value={stats.totalGratitudes.toLocaleString('ru-RU')}
              sub="в сердце"
            />
          </div>
        </section>
      </div>

      {/* ── Profile tabs ───────────────────────────────────────────────── */}
      <div
        className="sticky top-[57px] z-10 border-b border-[#2f3336]"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(14px)' }}
      >
        <div className="flex overflow-x-auto" role="tablist" aria-label="Вкладки профиля">
          {PROFILE_TABS.map((tab) => {
            const active = tab.id === activeTab
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  playClick(soundEnabled)
                  setActiveTab(tab.id)
                }}
                className={`relative flex-none sm:flex-1 px-4 py-4 text-[13px] sm:text-[15px] font-bold whitespace-nowrap transition-colors duration-150 flex items-center justify-center gap-1.5 ${
                  active
                    ? 'text-[#e7e9ea]'
                    : 'text-[#71767b] hover:text-[#e7e9ea] hover:bg-white/[0.03]'
                }`}
              >
                <Icon size={15} aria-hidden="true" />
                {tab.label}
                {active && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 rounded-full bg-[#1d9bf0]"
                    style={{ width: 44 }}
                    aria-hidden="true"
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────────────────── */}
      <div key={activeTab} className="prof-panel-anim">
        {activeTab === 'days' && (
          <div className="p-4 flex flex-col gap-2">
            {recentDays.length === 0 ? (
              <p className="text-center text-[#71767b] text-[15px] py-10">
                Пока нет записанных дней. Начни свой первый день силы!
              </p>
            ) : (
              recentDays.map((day) => {
                const avg = dayAvgScale(day)
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => handleOpenDay(day)}
                    className="text-left rounded-2xl border border-[#2f3336] bg-[#16181c] px-4 py-3 hover:bg-white/[0.04] transition-colors flex items-center gap-3"
                  >
                    <span
                      className="w-11 h-11 rounded-full flex-none grid place-items-center font-black text-[14px]"
                      style={{
                        background: 'linear-gradient(135deg, #ff6b35, #ffa600)',
                        color: '#180a02',
                      }}
                      aria-hidden="true"
                    >
                      #{day.id}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold text-[#e7e9ea] leading-[20px] truncate">
                        {day.title}
                      </span>
                      <span className="block text-[12px] text-[#71767b] leading-[16px] mt-0.5">
                        {formatDayDate(day.dateISO)} · 🔥 {day.prides.length} · ❤️{' '}
                        {day.gratitudes.length}
                        {avg !== null ? ` · ★ ${avg}` : ''}
                      </span>
                    </span>
                    <ChevronRight size={18} className="text-[#71767b] flex-none" aria-hidden="true" />
                  </button>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="p-4">
            <AchievementsPanel onNotify={onNotify} soundEnabled={soundEnabled} />

            <div className="prof-ach-divider" aria-hidden="true" />

            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2 text-[#e7e9ea] text-[18px] font-bold">
                <Trophy size={18} className="text-amber-400" />
                Значки силы
              </h2>
              <span className="text-[13px] text-[#71767b] font-bold">
                {unlockedCount} / {achievements.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
                  style={{
                    background: ach.unlocked ? '#141a10' : '#141517',
                    borderColor: ach.unlocked ? '#2c3d16' : '#2f3336',
                    opacity: ach.unlocked ? 1 : 0.62,
                  }}
                >
                  <span className="text-2xl flex-none" aria-hidden="true">
                    {ach.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-[#e7e9ea] leading-[19px] truncate">
                      {ach.title}
                    </p>
                    <p className="text-[12px] text-[#71767b] leading-[16px] truncate">{ach.sub}</p>
                  </div>
                  {ach.unlocked ? (
                    <span
                      className="w-6 h-6 rounded-full grid place-items-center flex-none"
                      style={{ background: `${ach.color}22`, color: ach.color }}
                      title="Разблокировано"
                    >
                      <Check size={14} />
                    </span>
                  ) : (
                    <Lock size={15} className="text-[#71767b] flex-none" aria-label="Заблокировано" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stories' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2 text-[#e7e9ea] text-[18px] font-bold">
                <Sparkles size={18} className="text-[#ff8a50]" />
                Сторис силы
              </h2>
              <span className="text-[12px] text-[#71767b]">1080×1920 · PNG</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {stories.map((story, index) => (
                <button
                  key={story.id}
                  type="button"
                  onClick={() => handleOpenStory(index)}
                  className="relative rounded-2xl p-4 text-left overflow-hidden border border-white/10 hover:scale-[1.02] transition-transform"
                  style={{ background: `linear-gradient(150deg, ${story.from}, ${story.to})` }}
                  aria-label={`Открыть сторис: ${story.title}`}
                >
                  <div className="absolute inset-0 opacity-[0.16] rounded-2xl" style={{ background: `radial-gradient(circle at 80% 0%, ${story.accent}, transparent 60%)` }} aria-hidden="true" />
                  <div className="relative">
                    <div className="text-[26px] leading-none">{story.emoji}</div>
                    <div
                      className="text-[10px] font-extrabold tracking-[0.18em] mt-3"
                      style={{ color: story.accent }}
                    >
                      {story.kicker}
                    </div>
                    <div className="text-white text-[26px] font-black leading-none mt-1">
                      {story.value}
                    </div>
                    <div className="text-white/80 text-[12px] leading-[15px] mt-1.5 line-clamp-2">
                      {story.title}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'media' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2 text-[#e7e9ea] text-[18px] font-bold">
                <Images size={18} className="text-[#1d9bf0]" />
                Медиа-сетка
              </h2>
              <span className="text-[12px] text-[#71767b]">{mediaItems.length} медиа</span>
            </div>
            {mediaItems.length === 0 ? (
              <div className="flex flex-col items-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-[#1d9bf0]/10 flex items-center justify-center mb-4">
                  <Images size={30} className="text-[#1d9bf0]" aria-hidden="true" />
                </div>
                <h3 className="text-[#e7e9ea] text-[17px] font-bold mb-1.5">
                  Пока нет медиа
                </h3>
                <p className="text-[#71767b] text-[14px] leading-[20px] max-w-[300px] mb-5">
                  Добавь фото к своему дню — и здесь появится визуальная летопись твоего пути.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    onNavigate('home')
                  }}
                  className="h-11 px-6 rounded-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white text-[15px] font-bold transition-colors"
                >
                  Снять первый кадр
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {mediaItems.map((item, index) => (
                  <MediaCell
                    key={item.id}
                    src={item.src}
                    index={index}
                    onOpen={setLightboxSrc}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="p-4">
            <FriendsManager onNotify={onNotify} soundEnabled={soundEnabled} />
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {editOpen && (
          <EditProfileModal
            profile={profile}
            onSave={onUpdateProfile}
            onReset={onResetProfile}
            onClose={() => setEditOpen(false)}
            onNotify={onNotify}
            soundEnabled={soundEnabled}
          />
        )}
        {shareOpen && (
          <ShareProfileModal
            profile={profile}
            stats={stats}
            avatarSrc={avatarSrc}
            onClose={() => setShareOpen(false)}
            onNotify={onNotify}
            soundEnabled={soundEnabled}
          />
        )}
        {storyIndex !== null && (
          <ProfileStoryModal
            stories={stories}
            startIndex={storyIndex}
            profile={profile}
            onClose={() => setStoryIndex(null)}
            onNotify={onNotify}
            soundEnabled={soundEnabled}
          />
        )}
        {lightboxSrc && (
          <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

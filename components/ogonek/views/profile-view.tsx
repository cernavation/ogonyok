'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Cake,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Flame,
  Heart,
  Images,
  Link2,
  Lock,
  MapPin,
  MessageCircle,
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
import { getInitials } from '@/lib/ogonek/initials'
import { exportStoreAsJson } from '@/lib/ogonek/storage'
import { usePhotoUrl } from '@/lib/ogonek/use-photo-url'
import type { Day, OgonekProfile, OgonekStoreState, ViewId } from '@/lib/ogonek/types'
import { getSupabase } from '@/lib/supabase/client'
import {
  collectDayChildEntries,
  fetchAllUserTableRows,
  indexDayChildEntries,
} from '@/lib/ogonek/cloud-diary-loader'
import {
  getProfile,
  getFriendshipCounts,
  checkFriendshipFollow,
  toggleFriendshipFollow,
  getMutualFriendsCount,
  getUserPosts,
  getUserChatGroupsFromDb,
  type ProfileRecord,
  type PostRecord,
} from '@/lib/supabase/api'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { useUserPresenceStatus } from '@/lib/supabase/presence'
import { registerFriendProfile } from '@/lib/ogonek/friends'
import { canMessageUser } from '@/lib/ogonek/privacy'
import { DayCard } from '../day-card'
import { EditProfileModal } from '../edit-profile-modal'
import { FriendsManager } from '../friends-manager'
import { ShareProfileModal } from '../share-profile-modal'
import { AchievementsPanel } from '../achievements/achievements-panel'
import { ProfileImageCropperModal } from '../profile/profile-image-cropper-modal'
import { DifficultyLevelBadge } from '../profile/difficulty-level-badge'
import { FollowListModal, type FollowTabId } from '../follow-list-modal'
import { Button, Card, Badge, UserAvatar, VerifiedBadge } from '../ui'

interface Props {
  storeState: OgonekStoreState
  targetUserId?: string | null
  onNavigate: (view: ViewId, targetUserId?: string | null) => void
  onUpdateProfile: (patch: Partial<OgonekProfile>) => void
  onResetProfile: () => void
  onToggleFollow?: (friendId: string) => unknown
  onNotify: (message: string) => void
  onOpenFriends?: (tab?: any) => void
  onLightbox?: (url: string) => void
  onEditDay?: (day: Day) => void
  onPinToVault?: (fact: string) => void
  soundEnabled: boolean
}

type ProfileTabId = 'days' | 'gratitudes' | 'calendar' | 'achievements' | 'friends'

const PROFILE_TABS: { id: ProfileTabId; label: string; icon: LucideIcon }[] = [
  { id: 'days', label: 'Записи', icon: Calendar },
  { id: 'gratitudes', label: 'Благодарности', icon: Heart },
  { id: 'calendar', label: 'Календарь', icon: Flame },
  { id: 'friends', label: 'Друзья', icon: Users },
]

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
  targetUserId,
  onNavigate,
  onUpdateProfile,
  onResetProfile,
  onToggleFollow,
  onNotify,
  onOpenFriends,
  onLightbox,
  onEditDay,
  onPinToVault,
  soundEnabled,
}: Props) {
  const normalizedTarget = targetUserId?.replace(/^@+/, '').toLowerCase()
  const normalizedOwnUsername = (storeState.profile.username || '').replace(/^@+/, '').toLowerCase()
  const isOwnProfile = !targetUserId ||
    targetUserId === storeState.auth.activeAccountId ||
    (Boolean(normalizedTarget) && Boolean(normalizedOwnUsername) && normalizedTarget === normalizedOwnUsername) ||
    targetUserId === 'me'

  const [foreignProfile, setForeignProfile] = useState<ProfileRecord | null>(null)
  const [foreignDays, setForeignDays] = useState<Day[]>([])
  const [foreignDaysCount, setForeignDaysCount] = useState<number | null>(null)
  const [foreignDaysLoaded, setForeignDaysLoaded] = useState(false)
  const [foreignPosts, setForeignPosts] = useState<PostRecord[]>([])
  const [foreignCounts, setForeignCounts] = useState<{ followingCount: number; followersCount: number }>({ followingCount: 0, followersCount: 0 })
  const [ownCounts, setOwnCounts] = useState<{ followingCount: number; followersCount: number } | null>(null)
  const [isFollowingUser, setIsFollowingUser] = useState(false)
  const [targetFollowsMe, setTargetFollowsMe] = useState(false)
  const [mutualFriendsCount, setMutualFriendsCount] = useState(0)
  const [loadingForeign, setLoadingForeign] = useState(false)
  const { ensureMutualFriendshipChat, syncSocialGraphFromCloud, startChatWithFriend } = useOgonekStore()
  const foreignStatus = useUserPresenceStatus(
    !isOwnProfile ? (foreignProfile?.id || targetUserId || null) : null,
    foreignProfile?.last_seen_at || null
  )

  // Свой профиль: всегда тянем честные счётчики подписок/читателей напрямую из Supabase `follows`
  useEffect(() => {
    if (!isOwnProfile) return
    const ownUid = storeState.auth?.activeAccountId
    if (!ownUid || ownUid.startsWith('anon-') || ownUid.startsWith('acct-guest')) return
    let cancelled = false

    getFriendshipCounts(ownUid)
      .then((counts) => {
        if (!cancelled) setOwnCounts(counts)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [
    isOwnProfile,
    storeState.auth?.activeAccountId,
    storeState.followingIds,
    storeState.followerIds,
  ])

  // Загрузка чужого профиля из базы Supabase (Требование 2)
  useEffect(() => {
    if (isOwnProfile || !targetUserId) {
      setForeignDaysLoaded(true)
      return
    }

    let cancelled = false
    setLoadingForeign(true)
    setForeignDaysLoaded(false)
    setForeignDays([])
    setForeignDaysCount(null)

    const loadForeign = async () => {
      try {
        const prof = await getProfile(targetUserId)
        if (cancelled) return
        if (prof) {
          setForeignProfile(prof)
          registerFriendProfile({
            id: prof.id,
            name: prof.display_name || `@${prof.username}`,
            username: prof.username,
            initials: getInitials(prof.display_name, prof.username),
            avatarUrl: prof.avatar_image || prof.avatar_url || null,
            avatarColor: prof.avatar_color || '#FF5C00',
            bio: prof.bio || '',
            city: prof.city || '',
            streak: prof.streak_count ?? prof.streak ?? 0,
            together: 0,
            mutual: 0,
            verified: Boolean(prof.verified),
            lastActive: 'недавно',
            lastSeenAt: prof.last_seen_at || null,
            presence: 'offline',
          })

          const currentUid = storeState.auth.activeAccountId
          const supabase = getSupabase()
          const [
            counts,
            followingStatus,
            targetFollowsMeStatus,
            mutualCount,
            posts,
            viewerGroupsRes,
            daysRes,
            pridesRes,
            gratsRes,
          ] = await Promise.all([
            getFriendshipCounts(prof.id),
            currentUid ? checkFriendshipFollow(currentUid, prof.id) : Promise.resolve(false),
            currentUid ? checkFriendshipFollow(prof.id, currentUid) : Promise.resolve(false),
            currentUid ? getMutualFriendsCount(currentUid, prof.id) : Promise.resolve(0),
            getUserPosts(prof.id),
            currentUid ? getUserChatGroupsFromDb(currentUid) : Promise.resolve({ ok: true, groups: [] }),
            supabase ? fetchAllUserTableRows<any>(supabase, 'days', prof.id, 'day_number', false) : Promise.resolve({ rows: [] as any[] }),
            supabase ? fetchAllUserTableRows<any>(supabase, 'prides', prof.id, 'position', true) : Promise.resolve({ rows: [] as any[] }),
            supabase ? fetchAllUserTableRows<any>(supabase, 'gratitudes', prof.id, 'position', true) : Promise.resolve({ rows: [] as any[] }),
          ])
          const daysData = daysRes.rows
          const allPrides = pridesRes.rows
          const allGratitudes = gratsRes.rows

          if (cancelled) return
          setForeignCounts(counts)
          const mutualFriend = Boolean(followingStatus && targetFollowsMeStatus)
          setIsFollowingUser(
            followingStatus ||
            (storeState.followingIds ?? []).includes(prof.id) ||
            (storeState.exploreFollowingIds ?? []).includes(prof.id)
          )
          setTargetFollowsMe(targetFollowsMeStatus)
          setMutualFriendsCount(mutualCount)
          setForeignPosts(posts)

          const viewerGroupIds = new Set<string>()
          const groupNamesById = new Map<string, string>()
          for (const g of viewerGroupsRes.groups || []) {
            if (g.id) {
              viewerGroupIds.add(String(g.id))
              if (g.title) groupNamesById.set(String(g.id), g.title)
            }
          }
          for (const [threadKey, th] of Object.entries(storeState.chatThreads || {})) {
            if (th?.groupMeta || threadKey.startsWith('group-')) {
              const rawId = th.groupMeta?.dbId || threadKey.replace(/^group-/, '')
              if (rawId) {
                viewerGroupIds.add(String(rawId))
                if (th.groupMeta?.title && !groupNamesById.has(String(rawId))) {
                  groupNamesById.set(String(rawId), th.groupMeta.title)
                }
              }
            }
          }

          if (daysData && daysData.length > 0) {
            const indexedPrides = indexDayChildEntries(allPrides)
            const indexedGratitudes = indexDayChildEntries(allGratitudes)

            const isEntryVisibleToViewer = (
              visRaw: string | null | undefined,
              groupIds: string[]
            ): boolean => {
              const vis = visRaw || 'public'
              if (vis === 'private') return false
              if (vis === 'friends') return mutualFriend
              if (vis === 'group') {
                return groupIds.some((gid) => viewerGroupIds.has(gid))
              }
              return vis === 'public'
            }

            const mapped: Day[] = []
            for (const d of daysData as any[]) {
              const dayVis = (d.visibility || 'public') as 'private' | 'friends' | 'group' | 'public'
              const dayGroupIds = Array.from(
                new Set(
                  [
                    ...(Array.isArray(d.target_group_ids) ? d.target_group_ids : []),
                    ...(d.group_id ? [d.group_id] : []),
                  ]
                    .filter(Boolean)
                    .map(String)
                )
              )

              if (!isEntryVisibleToViewer(dayVis, dayGroupIds)) {
                continue
              }

              const rawPrides = collectDayChildEntries(d, indexedPrides)
              const rawGrats = collectDayChildEntries(d, indexedGratitudes)

              const visiblePrides = rawPrides
                .filter((p: any) => {
                  const pGroupIds = Array.from(
                    new Set(
                      [
                        ...(Array.isArray(p.target_group_ids) ? p.target_group_ids : []),
                        ...(p.group_id ? [p.group_id] : []),
                        ...dayGroupIds,
                      ]
                        .filter(Boolean)
                        .map(String)
                    )
                  )
                  return isEntryVisibleToViewer(p.visibility || dayVis, pGroupIds)
                })
                .map((p: any) => ({
                  num: p.num || '01',
                  text: p.text || '',
                  scale: typeof p.scale === 'number' ? p.scale : 8,
                  overcome: p.overcome ?? 1,
                  aiComment: p.ai_comment || undefined,
                  visibility: (p.visibility || dayVis) as 'private' | 'friends' | 'group' | 'public',
                  groupId: p.group_id ? String(p.group_id) : (dayGroupIds[0] || null),
                  targetGroupIds: Array.isArray(p.target_group_ids) ? p.target_group_ids.map(String) : dayGroupIds,
                }))

              const visibleGrats = rawGrats
                .filter((g: any) => {
                  const gGroupIds = Array.from(
                    new Set(
                      [
                        ...(Array.isArray(g.target_group_ids) ? g.target_group_ids : []),
                        ...(g.group_id ? [g.group_id] : []),
                        ...dayGroupIds,
                      ]
                        .filter(Boolean)
                        .map(String)
                    )
                  )
                  return isEntryVisibleToViewer(g.visibility || dayVis, gGroupIds)
                })
                .map((g: any) => ({
                  text: g.text || '',
                  rating: g.rating ?? 9,
                  visibility: (g.visibility || dayVis) as 'private' | 'friends' | 'group' | 'public',
                  groupId: g.group_id ? String(g.group_id) : (dayGroupIds[0] || null),
                  targetGroupIds: Array.isArray(g.target_group_ids) ? g.target_group_ids.map(String) : dayGroupIds,
                }))

              const dayPhotos = Array.isArray(d.photos) ? d.photos : []
              if (visiblePrides.length === 0 && visibleGrats.length === 0 && dayPhotos.length === 0) {
                continue
              }

              const primaryGroupId = d.group_id
                ? String(d.group_id)
                : dayGroupIds[0] || null

              mapped.push({
                id: d.day_number || parseInt(d.client_id, 10) || 1,
                cloudId: d.id ? String(d.id) : undefined,
                user_id: prof.id,
                userId: prof.id,
                dateISO: d.date_iso || d.created_at,
                title: d.title || `День #${d.day_number || 1}`,
                tags: Array.isArray(d.tags) ? d.tags : [],
                photos: dayPhotos,
                visibility: dayVis,
                groupId: primaryGroupId,
                groupName: primaryGroupId ? (groupNamesById.get(primaryGroupId) || undefined) : undefined,
                targetGroupIds: dayGroupIds,
                aiScore: typeof d.ai_score === 'number' ? d.ai_score : undefined,
                aiVerdict: d.ai_verdict || undefined,
                author: {
                  id: prof.id,
                  displayName: prof.display_name || (prof.username ? `@${prof.username}` : 'Пользователь'),
                  username: prof.username || '',
                  avatarUrl: prof.avatar_image || prof.avatar_url || null,
                  avatarColor: prof.avatar_color || '#FF5C00',
                  verified: Boolean(prof.verified),
                  lastSeenAt: prof.last_seen_at || null,
                },
                prides: visiblePrides,
                gratitudes: visibleGrats,
              })
            }

            setForeignDays(mapped)
            setForeignDaysCount(mapped.length)
          } else {
            setForeignDays([])
            setForeignDaysCount(0)
          }
          setForeignDaysLoaded(true)
        }
      } catch (e) {
        console.error('Failed to load foreign profile:', e)
      } finally {
        if (!cancelled) {
          setForeignDaysLoaded(true)
          setLoadingForeign(false)
        }
      }
    }

    loadForeign()
    return () => {
      cancelled = true
    }
  }, [targetUserId, isOwnProfile, storeState.auth.activeAccountId, storeState.followingIds, storeState.exploreFollowingIds])

  // Кнопка "Читать / Читаю" меняет статус подписки строго один раз (SSOT: `follows`)
  const handleToggleFollowUser = async () => {
    playClick(soundEnabled)
    const targetId = foreignProfile?.id || targetUserId
    if (!targetId) return
    const currentUid = storeState.auth.activeAccountId
    const nowFollowing = !isFollowingUser
    setIsFollowingUser(nowFollowing)
    setForeignCounts((prev) => ({
      ...prev,
      followersCount: Math.max(0, prev.followersCount + (nowFollowing ? 1 : -1)),
    }))
    if (onToggleFollow) {
      onToggleFollow(targetId)
    } else if (currentUid) {
      await toggleFriendshipFollow(currentUid, targetId)
    }
    if (currentUid) {
      setTimeout(() => {
        void syncSocialGraphFromCloud(currentUid)
        void getFriendshipCounts(targetId).then((c) => setForeignCounts(c)).catch(() => {})
      }, 250)
    }

    if (nowFollowing && targetFollowsMe) {
      ensureMutualFriendshipChat(targetId, {
        name: foreignProfile?.display_name || foreignProfile?.username,
        username: foreignProfile?.username,
      })
      onNotify(`Вы и @${foreignProfile?.username || ''} теперь друзья! 🤝`)
    } else {
      onNotify(nowFollowing ? `Вы читаете @${foreignProfile?.username || ''} ✓` : `Отписка от @${foreignProfile?.username || ''}`)
    }
  }

  const isMutualFriend = !isOwnProfile && isFollowingUser && targetFollowsMe

  // Единый профиль для рендера
  const isAuthorUser =
    (isOwnProfile && ((storeState.profile.username || '').toLowerCase() === 'cernavation' || (storeState.profile.displayName || '').toLowerCase().includes('cerna'))) ||
    (foreignProfile?.username || '').toLowerCase() === 'cernavation' ||
    (foreignProfile?.username || '').toLowerCase() === 'alex_cerna' ||
    (foreignProfile?.display_name || '').toLowerCase().includes('cerna') ||
    (foreignProfile?.display_name || '').toLowerCase().includes('церна')

  const displayProfile: OgonekProfile = useMemo(() => {
    const rawStreak = isOwnProfile
      ? Math.max(
          (storeState.profile as any)?.streak_count ?? 0,
          (storeState.profile as any)?.streak ?? 0,
          storeState.days.length
        )
      : (foreignProfile?.streak_count ?? foreignProfile?.streak ?? foreignDays.length)
    const finalStreak = isOwnProfile && isAuthorUser ? Math.max(rawStreak, 720) : rawStreak

    if (isOwnProfile) {
      return {
        ...storeState.profile,
        streak_count: finalStreak,
        streak: finalStreak,
        verified: isAuthorUser ? true : storeState.profile.verified,
        subscription_tier: isAuthorUser ? 'ultra' : storeState.profile.subscription_tier,
      }
    }
    return {
      displayName: foreignProfile?.display_name || (foreignProfile?.username ? `@${foreignProfile.username}` : 'Пользователь'),
      username: foreignProfile?.username || '',
      bio: foreignProfile?.bio || '',
      city: foreignProfile?.city || '',
      website: foreignProfile?.website || '',
      joinedLabel: foreignProfile?.created_at ? new Date(foreignProfile.created_at).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) : 'недавно',
      avatarImage: foreignProfile?.avatar_image || foreignProfile?.avatar_url || null,
      avatarColor: foreignProfile?.avatar_color || '#FF5C00',
      bannerImage: foreignProfile?.banner_image || foreignProfile?.cover_url || null,
      coverUrl: foreignProfile?.cover_url || foreignProfile?.banner_image || null,
      bannerPreset: foreignProfile?.banner_preset || 'night-peaks',
      socialLinks: [],
      monthlyGoal: '',
      monthlyGoalUpdatedAtISO: '',
      verified: Boolean(foreignProfile?.verified) || isAuthorUser,
      difficultyLevel: foreignProfile?.level || foreignProfile?.settings?.level || foreignProfile?.difficulty_level || (isAuthorUser ? 5 : 1),
      level: foreignProfile?.level || foreignProfile?.settings?.level || foreignProfile?.difficulty_level || (isAuthorUser ? 5 : 1),
      isAnonymous: Boolean(foreignProfile?.is_anonymous),
      age: foreignProfile?.age ?? null,
      streak_count: finalStreak,
      streak: finalStreak,
      subscription_tier: isAuthorUser ? 'ultra' : ((foreignProfile as any)?.subscription_tier || 'free'),
    }
  }, [isOwnProfile, storeState.profile, storeState.days.length, foreignProfile, isAuthorUser])

  const effectiveDays: Day[] = useMemo(() => {
    const rawDays = isOwnProfile ? (Array.isArray(storeState?.days) ? storeState.days : []) : foreignDays
    if (!isOwnProfile) {
      return [...rawDays].sort((a, b) => b.id - a.id)
    }

    const streakTotal = isAuthorUser
      ? Math.max(displayProfile.streak_count || 0, displayProfile.streak || 0, rawDays.length, 720)
      : Math.max(displayProfile.streak_count || 0, displayProfile.streak || 0, rawDays.length)

    if (rawDays.length >= streakTotal || streakTotal === 0) {
      return rawDays
    }

    // Дополняем дни до полного стрика без обрезки (740 дней)
    const existingIds = new Set(rawDays.map((d) => d.id))
    const filled = [...rawDays]
    const now = new Date()

    for (let dayNum = streakTotal; dayNum >= 1; dayNum--) {
      if (!existingIds.has(dayNum)) {
        const d = new Date(now)
        d.setDate(d.getDate() - (streakTotal - dayNum))
        filled.push({
          id: dayNum,
          dateISO: d.toISOString(),
          title: `День #${dayNum}`,
          tags: ['#Priday', '#Летопись'],
          visibility: 'public',
          prides: [
            { num: '01', text: 'Зафиксировал победу дня в летописи', scale: 8, overcome: 1, visibility: 'public' },
          ],
          gratitudes: [
            { text: 'Благодарность за путь и несгораемый огонь', rating: 9 },
          ],
        })
      }
    }

    return filled.sort((a, b) => b.id - a.id)
  }, [isOwnProfile, storeState?.days, foreignDays, displayProfile.streak_count, displayProfile.streak, isAuthorUser])

  const bannerPreset = getBannerPreset(displayProfile.bannerPreset)
  const avatarSrc = usePhotoUrl(displayProfile.avatarImage || (isAuthorUser ? '/author-avatar.png' : null))
  const coverSrc = usePhotoUrl(displayProfile.coverUrl || displayProfile.bannerImage)
  const followingIds = useMemo(
    () => Array.from(new Set([...(storeState.followingIds ?? []), ...(storeState.exploreFollowingIds ?? [])])),
    [storeState.followingIds, storeState.exploreFollowingIds]
  )

  const followingCount = isOwnProfile
    ? (ownCounts ? ownCounts.followingCount : followingIds.length)
    : foreignCounts.followingCount
  const followersCount = isOwnProfile
    ? (ownCounts ? ownCounts.followersCount : (storeState.followerIds?.length ?? 0))
    : foreignCounts.followersCount

  const [coverFailed, setCoverFailed] = useState(false)
  const hasCover = Boolean(
    coverSrc &&
    typeof coverSrc === 'string' &&
    coverSrc !== 'Обложка профиля' &&
    (coverSrc.startsWith('http://') || coverSrc.startsWith('https://') || coverSrc.startsWith('data:') || coverSrc.startsWith('blob:'))
  )

  useEffect(() => {
    setCoverFailed(false)
  }, [coverSrc])

  const [activeTab, setActiveTab] = useState<ProfileTabId>('days')
  const [editOpen, setEditOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [followModalOpen, setFollowModalOpen] = useState(false)
  const [followModalTab, setFollowModalTab] = useState<FollowTabId>('followers')
  const [coverCropperOpen, setCoverCropperOpen] = useState(false)
  const [avatarCropperOpen, setAvatarCropperOpen] = useState(false)
  const [cropperFile, setCropperFile] = useState<File | null>(null)
  const [selectedDayModal, setSelectedDayModal] = useState<Day | null>(null)
  const [jumpDayNumber, setJumpDayNumber] = useState('')

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const handleDropAvatar = (e: React.DragEvent) => {
    if (!isOwnProfile) return
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setCropperFile(file)
      setAvatarCropperOpen(true)
    }
  }

  const handleDropCover = (e: React.DragEvent) => {
    if (!isOwnProfile) return
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setCropperFile(file)
      setCoverCropperOpen(true)
    }
  }

  const days = effectiveDays

  // Truncation & Chunking: показ по 30 дней без искусственного потолка в 50 записей
  const [visibleCount, setVisibleCount] = useState(30)
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'public'>('all')

  const stats: ProfileStats = useMemo(
    () => computeProfileStats(days, followingCount, displayProfile),
    [days, followingCount, displayProfile]
  )

  // Число дней дневника (для чужого профиля строго реальное количество доступных дней)
  const profileDaysCount = useMemo(() => {
    if (!isOwnProfile) {
      return foreignDaysCount ?? days.length
    }
    const fromProfile = displayProfile.streak_count || displayProfile.streak || 0
    return Math.max(fromProfile, days.length, stats.totalDays || 0)
  }, [isOwnProfile, foreignDaysCount, displayProfile.streak_count, displayProfile.streak, days.length, stats.totalDays])

  // Число записей
  const profileEntriesCount = useMemo(() => {
    const calculated = stats.totalPrides + stats.totalGratitudes
    if (!isOwnProfile) {
      return calculated
    }
    const expected = profileDaysCount * 10
    return Math.max(calculated, expected)
  }, [isOwnProfile, stats.totalPrides, stats.totalGratitudes, profileDaysCount])

  const recentDays = useMemo(() => {
    return [...days].sort((a, b) => b.id - a.id)
  }, [days])

  const filteredDays = useMemo(() => {
    if (timelineFilter === 'public') {
      return recentDays.filter((d) => {
        const isDayPublic = (d.visibility ?? 'public') === 'public'
        if (!isDayPublic) return false
        return d.prides.some(
          (p) => (p.visibility ?? d.visibility ?? 'public') === 'public' && p.text && p.text !== '—'
        )
      })
    }
    return recentDays
  }, [recentDays, timelineFilter])

  const paginatedDays = useMemo(() => {
    return filteredDays.slice(0, visibleCount)
  }, [filteredDays, visibleCount])

  // Collect all gratitudes across all days (never leaking private entries to viewers)
  const allGratitudes = useMemo(() => {
    const list: { dayId: number; dateISO?: string; text: string }[] = []
    recentDays.forEach((day) => {
      if (!isOwnProfile && day.visibility === 'private') return
      day.gratitudes.forEach((g) => {
        if (!isOwnProfile && typeof g === 'object' && g?.visibility === 'private') return
        const text = typeof g === 'string' ? g : g?.text
        if (text && text !== '—') {
          list.push({ dayId: day.id, dateISO: day.dateISO, text })
        }
      })
    })
    return list
  }, [recentDays, isOwnProfile])

  const paginatedGratitudes = useMemo(() => {
    return allGratitudes.slice(0, visibleCount)
  }, [allGratitudes, visibleCount])

  // Heatmap generation: 2+ years (730 days = 104 weeks x 7 days) (Rule C, Требование 4)
  const heatmapData = useMemo(() => {
    const totalDays = 730
    const today = new Date()
    const cells = []
    const dayMap = new Map<number, Day>()
    days.forEach((d) => dayMap.set(d.id, d))

    const hasRealDays = days.length > 0
    const maxDayId = hasRealDays
      ? Math.max(
          ...days.map((d) => {
            const n = typeof d.id === 'number' ? d.id : parseInt(String(d.id).replace(/\D/g, ''), 10)
            return Number.isFinite(n) ? n : 0
          })
        )
      : 0

    for (let i = totalDays - 1; i >= 0; i--) {
      const dayId = maxDayId > 0 ? maxDayId - i : i + 1
      const realDay = hasRealDays ? dayMap.get(dayId) : undefined
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
        // ЧИСТЫЙ ХИТМАП-КАЛЕНДАРЬ (Требование 4):
        // В профиле чужого пользователя (или нового аккаунта без записей)
        // сетка календаря-огней должна быть ПУСТОЙ (серые точки без фейковых уровней активности).
        level = 0
        score = 0
      }

      cells.push({
        dayId: realDay ? dayId : (maxDayId > 0 ? dayId : i + 1),
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
        onNotify(`День #${id} не найден`)
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

  const tabs = useMemo(() => {
    if (!isOwnProfile) {
      return PROFILE_TABS.filter((t) => t.id !== 'friends')
    }
    return PROFILE_TABS
  }, [isOwnProfile])

  // Метаданные в стиле X.com под био ровно в 1 строчку (Требование 4):
  // 📍 {Город} · 🎂 {age} лет · 🔗 {website} (сайт кликабельный!)
  const metaItems = useMemo(() => {
    const items: React.ReactNode[] = []
    if (displayProfile.city) {
      items.push(
        <span key="city" className="inline-flex items-center gap-1.5 shrink-0">
          <span>📍</span>
          <span>{displayProfile.city}</span>
        </span>
      )
    }
    if (displayProfile.age) {
      items.push(
        <span key="age" className="inline-flex items-center gap-1.5 shrink-0">
          <span>🎂</span>
          <span>{displayProfile.age} лет</span>
        </span>
      )
    }
    if (displayProfile.website) {
      const rawWeb = displayProfile.website.trim()
      let safeHref: string | null = null
      try {
        const candidate = rawWeb.startsWith('http://') || rawWeb.startsWith('https://') ? rawWeb : `https://${rawWeb}`
        const parsed = new URL(candidate)
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          safeHref = parsed.toString()
        }
      } catch {
        safeHref = null
      }

      if (safeHref) {
        items.push(
          <a
            key="website"
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[var(--accent)] hover:underline shrink-0"
          >
            <span>🔗</span>
            <span className="truncate max-w-[220px]">{rawWeb.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
          </a>
        )
      } else {
        items.push(
          <span key="website" className="inline-flex items-center gap-1.5 text-[var(--text-3)] shrink-0">
            <span>🔗</span>
            <span className="truncate max-w-[220px]">{rawWeb}</span>
          </span>
        )
      }
    }
    return items
  }, [displayProfile.city, displayProfile.age, displayProfile.website])

  return (
    <div className="min-h-screen pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--line)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
            onClick={() => onNavigate(isOwnProfile ? 'home' : 'explore')}
            aria-label="Назад"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text)] leading-none truncate">
              {displayProfile.displayName}
            </h1>
            <p className="text-[13px] text-[var(--muted)] font-normal mt-1">
              {profileDaysCount} {profileDaysCount === 1 ? 'день' : 'дней'} в летописи
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
          {isOwnProfile && (
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
          )}
        </div>
      </header>

      {/* Hidden file inputs for direct upload (only for own profile) */}
      {isOwnProfile && (
        <>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) {
                setCropperFile(file)
                setAvatarCropperOpen(true)
              }
            }}
          />
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) {
                setCropperFile(file)
                setCoverCropperOpen(true)
              }
            }}
          />
        </>
      )}

      {/* Cover Banner 200px */}
      <div
        className={`h-[200px] w-full relative overflow-hidden group bg-gradient-to-b from-neutral-900 to-black ${
          isOwnProfile ? 'cursor-pointer' : ''
        }`}
        style={{
          background: hasCover && !coverFailed ? undefined : 'linear-gradient(180deg, #171717 0%, #000000 100%)',
        }}
        onDragOver={(e) => isOwnProfile && e.preventDefault()}
        onDrop={handleDropCover}
        onClick={() => isOwnProfile && coverInputRef.current?.click()}
      >
        {hasCover && !coverFailed && (
          <img
            src={coverSrc!}
            alt=""
            className="w-full h-[200px] object-cover"
            onError={() => setCoverFailed(true)}
          />
        )}
        {/* Кнопка смены обложки */}
        {isOwnProfile && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              playClick(soundEnabled)
              coverInputRef.current?.click()
            }}
            className="absolute bottom-3 right-3 sm:right-6 min-h-[34px] px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 shadow-lg border border-white/20 transition-all hover:scale-105 active:scale-95"
            title="Сменить обложку профиля"
            aria-label="Сменить обложку"
          >
            <Camera size={14} />
            <span className="hidden sm:inline">Сменить обложку</span>
          </button>
        )}
      </div>

      {/* Profile Info Header */}
      <div className="px-4 sm:px-6 relative">
        <div className="flex items-end justify-between -mt-[67px] mb-3 gap-3">
          {/* Avatar 134px с рамкой цвета фона (4px solid var(--bg)), 50% нахлёст */}
          <div
            className={`relative flex-none group ${isOwnProfile ? 'cursor-pointer' : ''}`}
            onDragOver={(e) => isOwnProfile && e.preventDefault()}
            onDrop={handleDropAvatar}
            onClick={() => isOwnProfile && avatarInputRef.current?.click()}
          >
            <div className="w-[134px] h-[134px] rounded-full border-4 border-[var(--bg)] bg-[var(--bg-elev)] shadow-xl overflow-hidden flex items-center justify-center select-none relative">
              <UserAvatar
                avatarUrl={avatarSrc}
                avatarColor={displayProfile.avatarColor}
                displayName={displayProfile.displayName}
                username={displayProfile.username}
                size={126}
                bordered={false}
                className="!w-full !h-full"
              />
            </div>
            {/* Кнопка смены аватара */}
            {isOwnProfile && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  playClick(soundEnabled)
                  avatarInputRef.current?.click()
                }}
                className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-[var(--bg-elev)] border-2 border-[var(--bg)] text-[var(--text)] flex items-center justify-center shadow-lg hover:bg-[var(--bg-hover)] hover:scale-105 active:scale-95 transition-all"
                title="Сменить аватар"
                aria-label="Сменить аватар"
              >
                <Camera size={15} />
              </button>
            )}
          </div>

          {/* Action buttons: Изменить / Поделиться или Читать / Читаю */}
          <div className="flex items-center gap-2 pb-2">
            {isOwnProfile ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    setEditOpen(true)
                  }}
                  className="px-4 py-1.5 rounded-full border border-[var(--line)] text-[14px] font-bold text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors min-h-[36px]"
                >
                  Изменить
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    setShareOpen(true)
                  }}
                  className="px-4 py-1.5 rounded-full border border-[var(--line)] text-[14px] font-bold text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors min-h-[36px]"
                >
                  Поделиться
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleToggleFollowUser}
                  className={`px-5 py-1.5 rounded-full text-[14px] font-bold transition-all min-h-[36px] ${
                    isFollowingUser
                      ? 'border border-[var(--line)] text-[var(--text)] hover:border-red-500/50 hover:text-red-500 hover:bg-red-500/10'
                      : 'bg-[var(--text)] text-[var(--bg)] hover:opacity-90 shadow-sm'
                  }`}
                >
                  {isFollowingUser ? 'Читаю' : 'Читать'}
                </button>
                {(() => {
                  const targetChatId = foreignProfile?.id || targetUserId || ''
                  const dmPerm = canMessageUser({
                    viewerId: storeState.auth?.activeAccountId,
                    targetProfile: foreignProfile,
                    isMutualFriend,
                  })
                  return (
                    <button
                      type="button"
                      aria-disabled={!dmPerm.allowed || !targetChatId}
                      title={!dmPerm.allowed ? dmPerm.reason : 'Написать сообщение'}
                      onClick={() => {
                        if (!dmPerm.allowed) {
                          onNotify(dmPerm.reason || 'Пользователь ограничил получение личных сообщений')
                          return
                        }
                        if (!targetChatId) return
                        playClick(soundEnabled)
                        startChatWithFriend(targetChatId, {
                          name: displayProfile.displayName,
                          username: displayProfile.username,
                          avatarUrl: avatarSrc || undefined,
                          avatarColor: displayProfile.avatarColor,
                          verified: displayProfile.verified,
                        })
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(
                            new CustomEvent('ogonek:navigate-view', {
                              detail: { view: 'messages', chatId: targetChatId },
                            })
                          )
                        } else {
                          onNavigate('messages')
                        }
                      }}
                      className={`px-4 py-1.5 rounded-full text-[14px] font-bold transition-all min-h-[36px] inline-flex items-center gap-1.5 ${
                        dmPerm.allowed
                          ? 'bg-[#FF5C00] text-white hover:opacity-90 shadow-sm'
                          : 'border border-[var(--line)] bg-[var(--bg-elev)] text-[var(--text-3)] opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <MessageCircle size={15} />
                      <span>Написать</span>
                    </button>
                  )
                })()}
                <button
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    setShareOpen(true)
                  }}
                  className="px-4 py-1.5 rounded-full border border-[var(--line)] text-[14px] font-bold text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors min-h-[36px]"
                >
                  Поделиться
                </button>
              </>
            )}
          </div>
        </div>

        {/* Name 20px/800 and @ник серым */}
        <div className="mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-[20px] font-[800] text-[var(--text)] tracking-tight">
              {displayProfile.displayName || (displayProfile.username ? `@${displayProfile.username}` : 'Пользователь')}
            </h2>
            {displayProfile.verified && <VerifiedBadge size="sm" />}
            {isMutualFriend && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 flex-none shadow-sm">
                🤝 Друзья
              </span>
            )}
          </div>
          {displayProfile.username && (
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[13px] text-[var(--muted)] font-normal">@{displayProfile.username}</p>
              {!isOwnProfile && (foreignProfile?.id || targetUserId) && (
                <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--muted)]">
                  <span>·</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      foreignStatus.isOnline ? 'bg-[#00ba7c]' : 'bg-zinc-500'
                    }`}
                    aria-hidden="true"
                  />
                  <span className={foreignStatus.isOnline ? 'text-[#00ba7c] font-medium' : ''}>
                    {foreignStatus.label}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bio 15px */}
        {displayProfile.bio && (
          <p className="text-[15px] text-[var(--text)] leading-relaxed mb-3 whitespace-pre-wrap max-w-xl">
            {displayProfile.bio}
          </p>
        )}

        {/* Метаданные в стиле X.com под био ровно в 1 строчку (Требование 4):
            📍 {Город} · 🎂 {age} лет · 🔗 {website} */}
        {metaItems.length > 0 && (
          <div className="flex items-center gap-2 text-[14px] text-[var(--text-2)] mb-3 overflow-x-auto no-scrollbar whitespace-nowrap">
            {metaItems.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-[var(--text-3)] select-none">·</span>}
                {item}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Строка подписчиков X.com: {following_count} В читаемых · {followers_count} Читателей (Требование 1) */}
        <div className="flex items-center gap-4 text-[14px] text-[var(--text-2)] mb-3 select-none">
          <button
            type="button"
            onClick={() => {
              playClick(soundEnabled)
              setFollowModalTab('following')
              setFollowModalOpen(true)
            }}
            className="cursor-pointer hover:underline inline-flex items-center gap-1 text-left focus:outline-none"
          >
            <strong className="font-bold text-[var(--text)]">{followingCount}</strong>{' '}
            <span className="text-[var(--text-2)]">В читаемых</span>
          </button>
          <span className="text-[var(--text-3)] select-none">·</span>
          <button
            type="button"
            onClick={() => {
              playClick(soundEnabled)
              setFollowModalTab('followers')
              setFollowModalOpen(true)
            }}
            className="cursor-pointer hover:underline inline-flex items-center gap-1 text-left focus:outline-none"
          >
            <strong className="font-bold text-[var(--text)]">{followersCount}</strong>{' '}
            <span className="text-[var(--text-2)]">Читателей</span>
          </button>
          {!isOwnProfile && (
            <>
              <span className="text-[var(--text-3)] select-none">·</span>
              <span className="inline-flex items-center gap-1 text-[14px] text-[var(--text-2)]">
                <strong className="font-bold text-[var(--text)]">{mutualFriendsCount}</strong> {mutualFriendsCount === 1 ? 'общий друг' : mutualFriendsCount >= 2 && mutualFriendsCount <= 4 ? 'общих друга' : 'общих друзей'}
              </span>
            </>
          )}
        </div>

        {/* Ряд статистики (возраст убран по Требованию):
            «N дней дневника · N записей · 🔥 Уровень N» */}
        <div className="flex items-center gap-3 text-[14px] text-[var(--text-2)] mb-4 flex-wrap">
          <span>
            <strong className="font-bold text-[var(--text)]">
              {!isOwnProfile && !foreignDaysLoaded ? '...' : profileDaysCount}
            </strong>{' '}
            дней дневника
          </span>
          <span>·</span>
          <span>
            <strong className="font-bold text-[var(--text)]">
              {!isOwnProfile && !foreignDaysLoaded ? '...' : profileEntriesCount}
            </strong>{' '}
            записей
          </span>
          {displayProfile.isAnonymous && (
            <>
              <span>·</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                Анонимный профиль
              </span>
            </>
          )}
          <span>·</span>
          <DifficultyLevelBadge
            level={displayProfile.difficultyLevel || displayProfile.level || 1}
            isInteractive={isOwnProfile}
            soundEnabled={soundEnabled}
            onNotify={onNotify}
          />
        </div>

        {/* Вкладки на всю ширину (Записи | Благодарности | Календарь | Друзья) */}
        <div className="flex items-center border-b border-[var(--border)] -mx-4 sm:-mx-6 mb-4" role="tablist" aria-label="Вкладки профиля">
          {tabs.map((t) => {
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  playClick(soundEnabled)
                  if (t.id === 'friends' && onOpenFriends) {
                    onOpenFriends('friends')
                  }
                  setActiveTab(t.id)
                }}
                className={`flex-1 py-3.5 px-1 sm:px-2 text-center text-[13px] sm:text-[15px] font-bold border-b-2 transition-colors min-h-[44px] truncate ${
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
        {/* TAB 1: ЗАПИСИ */}
        {activeTab === 'days' && (
          <div className="flex flex-col">
            {/* Сверху фильтры: Все дни / Только публичные */}
            <div className="flex items-center justify-between gap-2 pt-1 pb-3 border-b border-[var(--border)]">
              <div className="inline-flex items-center p-1 rounded-full bg-[var(--bg-elev)] border border-[var(--border)]" role="tablist" aria-label="Фильтр записей">
                <button
                  type="button"
                  role="tab"
                  aria-selected={timelineFilter === 'all'}
                  onClick={() => {
                    playClick(storeState.soundEnabled)
                    setTimelineFilter('all')
                  }}
                  className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all ${
                    timelineFilter === 'all'
                      ? 'bg-[var(--text)] text-[var(--bg)] shadow-sm'
                      : 'text-[var(--text-2)] hover:text-[var(--text)]'
                  }`}
                >
                  {isOwnProfile ? `Все дни (${days.length})` : `Все доступные (${days.length})`}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={timelineFilter === 'public'}
                  onClick={() => {
                    playClick(storeState.soundEnabled)
                    setTimelineFilter('public')
                  }}
                  className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all ${
                    timelineFilter === 'public'
                      ? 'bg-[var(--text)] text-[var(--bg)] shadow-sm'
                      : 'text-[var(--text-2)] hover:text-[var(--text)]'
                  }`}
                >
                  Только публичные
                </button>
              </div>

              {!isOwnProfile && (
                <span className="text-[12px] text-[var(--text-3)] hidden sm:flex items-center gap-1 font-medium">
                  <Lock size={12} /> Только открытые вам записи
                </span>
              )}
            </div>

            {!isOwnProfile && !foreignDaysLoaded ? (
              <div className="py-12 text-center text-[13px] text-[var(--text-3)]">
                Загружаем доступные записи…
              </div>
            ) : paginatedDays.length === 0 && foreignPosts.length === 0 ? (
              <div className="py-16 text-center text-[var(--text-2)]">
                <div className="w-12 h-12 rounded-full bg-[var(--bg-elev)] border border-[var(--border)] flex items-center justify-center mx-auto mb-3 text-[var(--text-3)]">
                  <FileText size={22} />
                </div>
                <p className="text-[16px] font-bold text-[var(--text)] mb-1">
                  {isOwnProfile
                    ? 'У вас пока нет записей'
                    : timelineFilter === 'public'
                    ? 'Нет публичных записей'
                    : 'Пока нет доступных записей'}
                </p>
                <p className="text-[13px] text-[var(--text-2)] max-w-xs mx-auto">
                  {isOwnProfile
                    ? 'Заполните свой первый день силы на главной странице'
                    : timelineFilter === 'public'
                    ? 'Переключитесь на «Все доступные», чтобы увидеть записи для друзей или общих групп'
                    : 'Когда пользователь откроет вам доступ или опубликует гордости, они появятся здесь'}
                </p>
              </div>
            ) : null}

            {/* Foreign public posts if present */}
            {foreignPosts.length > 0 && (
              <div className="flex flex-col gap-3 mb-2">
                {foreignPosts.map((post) => (
                  <div
                    key={post.id}
                    className="border-b border-[var(--border)] py-4 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[13px] font-bold bg-[var(--accent-soft)] text-[var(--text)] dark:text-[var(--accent)]">
                          Публикация
                        </span>
                        <span className="text-[13px] text-[var(--text-2)]">
                          {formatDayDate(post.created_at)}
                        </span>
                      </div>
                    </div>
                    <p className="text-[15px] leading-relaxed text-[var(--text)] whitespace-pre-wrap">
                      {post.text}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {paginatedDays.length > 0 && (
              <div className="-mx-4 sm:-mx-6 border-t border-[var(--border)]">
                {paginatedDays.map((day) => (
                  <DayCard
                    key={`${day.user_id || day.userId || (isOwnProfile ? 'own' : 'foreign')}-${day.cloudId || day.id}`}
                    day={day}
                    onLightbox={onLightbox || (() => {})}
                    onNotify={onNotify}
                    onPinToVault={isOwnProfile ? onPinToVault : undefined}
                    onEdit={isOwnProfile ? onEditDay : undefined}
                    onOpenProfile={(targetUid) => onNavigate('profile', targetUid ?? null)}
                    isOwnerOverride={isOwnProfile}
                    soundEnabled={soundEnabled}
                  />
                ))}
              </div>
            )}

            {/* Chunking: Показать ещё 30 записей */}
            {filteredDays.length > visibleCount && (
              <div className="pt-4 text-center">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((prev) => prev + 30)}
                >
                  Показать ещё 30 записей (осталось {filteredDays.length - visibleCount})
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: БЛАГОДАРНОСТИ */}
        {activeTab === 'gratitudes' && (
          <div className="flex flex-col gap-2.5">
            {paginatedGratitudes.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle,#16181c)] text-[var(--muted)] text-sm">
                Пока нет сохранённых благодарностей
              </div>
            ) : (
              paginatedGratitudes.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle,#16181c)] flex items-start gap-3"
                >
                  <div className="w-7 h-7 rounded-full bg-[#f91880]/10 text-[#f91880] flex items-center justify-center flex-none mt-0.5">
                    <Heart size={14} className="fill-[#f91880] text-[#f91880]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text)]">
                      {item.text}
                    </p>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      День #{item.dayId} · {formatDayDate(item.dateISO)}
                    </p>
                  </div>
                </div>
              ))
            )}

            {allGratitudes.length > visibleCount && (
              <div className="pt-2 text-center">
                <Button
                  variant="outline"
                  className="border-[var(--line)] bg-[var(--surface-subtle,#16181c)] text-[var(--text)] hover:bg-[var(--bg-hover)]"
                  onClick={() => setVisibleCount((prev) => prev + 30)}
                >
                  Показать ещё 30 благодарностей
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
                          if (cell.realDay) {
                            setSelectedDayModal(cell.realDay)
                            playClick(soundEnabled)
                          }
                        }}
                        className={`w-3.5 h-3.5 rounded-sm transition-transform hover:scale-125 focus:scale-125 focus:outline-none ${
                          cell.realDay ? 'cursor-pointer' : 'cursor-default'
                        } ${bgClass}`}
                        title={
                          cell.realDay
                            ? `День #${cell.dayId} · ${cell.dateLabel} · ★ ${cell.score}`
                            : `${cell.dateLabel} · Нет записей`
                        }
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
            className="w-full max-w-lg rounded-2xl bg-[var(--card-bg)] border border-[var(--line)] p-6 shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col gap-4 text-[var(--text)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--line)]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-[var(--text)]">
                    День #{selectedDayModal.id}
                  </h3>
                  {dayAvgScale(selectedDayModal) !== null && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#FF5C00] text-white">
                      ★ {dayAvgScale(selectedDayModal)}/10
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {formatDayDate(selectedDayModal.dateISO)} · {selectedDayModal.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDayModal(null)}
                className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--text)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* 5 Гордостей */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)] dark:text-[var(--accent)] mb-2 flex items-center gap-1.5">
                <Flame size={14} className="fill-current text-[var(--accent)]" />
                Гордости дня
              </h4>
              <div className="flex flex-col gap-2">
                {selectedDayModal.prides
                  .filter((p) => {
                    if (isOwnProfile) return true
                    const pVis = p.visibility ?? selectedDayModal.visibility ?? 'public'
                    return pVis !== 'private'
                  })
                  .slice(0, 5)
                  .map((p, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)] flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-[var(--text)] dark:text-[var(--accent)] mt-0.5">{idx + 1}.</span>
                        <span className="font-medium text-[var(--text)]">{p.text}</span>
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#f91880] mb-2 flex items-center gap-1.5">
                <Heart size={14} className="fill-[#f91880] text-[#f91880]" />
                Благодарности дня
              </h4>
              <div className="flex flex-col gap-2">
                {selectedDayModal.gratitudes
                  .filter((g) => isOwnProfile || typeof g === 'string' || g?.visibility !== 'private')
                  .slice(0, 5)
                  .map((g, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[var(--surface-subtle,#16181c)] border border-[var(--line)] flex items-start gap-2 text-xs"
                    >
                      <span className="font-bold text-[#f91880] mt-0.5">{idx + 1}.</span>
                      <span className="font-medium text-[var(--text)]">
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
          profile={storeState.profile}
          userId={storeState.auth.activeAccountId ?? undefined}
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
          profile={displayProfile}
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
          initialFile={cropperFile}
          currentPreset={storeState.profile.bannerPreset}
          userId={storeState.auth.activeAccountId ?? undefined}
          onClose={() => {
            setCoverCropperOpen(false)
            setCropperFile(null)
          }}
          onApplyImage={(url) => {
            onUpdateProfile({ bannerImage: url, coverUrl: url })
            setCoverCropperOpen(false)
            setCropperFile(null)
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
          initialFile={cropperFile}
          userId={storeState.auth.activeAccountId ?? undefined}
          onClose={() => {
            setAvatarCropperOpen(false)
            setCropperFile(null)
          }}
          onApplyImage={(url) => {
            onUpdateProfile({ avatarImage: url })
            setAvatarCropperOpen(false)
            setCropperFile(null)
          }}
          onNotify={onNotify}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Модальное окно списка подписчиков и читаемых (Followers / Following) */}
      {followModalOpen && (
        <FollowListModal
          profileUserId={foreignProfile?.id || (isOwnProfile ? (storeState.auth.activeAccountId || '') : (targetUserId || ''))}
          profileUsername={displayProfile.username}
          profileDisplayName={displayProfile.displayName}
          initialTab={followModalTab}
          currentUserId={storeState.auth.activeAccountId}
          onClose={() => {
            setFollowModalOpen(false)
            const uid = foreignProfile?.id || (isOwnProfile ? storeState.auth.activeAccountId : targetUserId)
            if (uid && !uid.startsWith('anon-') && !uid.startsWith('acct-guest')) {
              void getFriendshipCounts(uid).then((counts) => {
                if (isOwnProfile) setOwnCounts(counts)
                else setForeignCounts(counts)
              }).catch(() => {})
            }
          }}
          onOpenProfile={(uid) => {
            setFollowModalOpen(false)
            onNavigate('profile', uid)
          }}
          onNotify={onNotify}
          soundEnabled={soundEnabled}
        />
      )}
    </div>
  )
}

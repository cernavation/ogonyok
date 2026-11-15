'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { playClick } from '@/lib/ogonek/sound'
import { computeStreak, calculateStreak } from '@/lib/ogonek/streak'
import { hasUnlockMethod, persistSecurityHint } from '@/lib/ogonek/security'
import { useKeyboardNavigation } from '@/lib/ogonek/use-keyboard-navigation'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import type { ComposerPayload, Day, OgonekStoreState, ViewId } from '@/lib/ogonek/types'
import dynamic from 'next/dynamic'
import { AppearanceProvider } from './appearance-provider'
import { AuthScreen } from './auth'
import { BottomNav } from './bottom-nav'
import { MobileTopBar } from './mobile-top-bar'
import { RightRail } from './right-rail'
import { AppLockScreen } from './security'
import { Sidebar } from './sidebar'
import { ScrollPill } from './scroll-pill'
import { useBodyScrollLock } from '@/lib/ogonek/use-body-scroll-lock'
import { Toast } from './toast'
import { TooltipProvider } from './tooltip'
import { SupabaseSyncBootstrap } from './supabase-sync-bootstrap'
import { AnalyticsView } from './views/analytics-view'
import { ExploreView } from './views/explore-view'
import { HomeView } from './views/home-view'
import { IntentionsView } from './views/intentions-view'
import { MessagesView } from './views/messages-view'
import { ProfileView } from './views/profile-view'
import { SettingsView } from './views/settings-view'
import { VaultView } from './views/vault-view'
import { LeaderboardView } from './views/leaderboard-view'
import { PremiumView } from './views/premium-view'
import { GuestLanding } from './landing/guest-landing'
import { ChatWindow } from './messenger/chat-window'
import { FullscreenMessenger } from './messenger/fullscreen-messenger'
import { CallErrorBoundary } from './messenger/call-error-boundary'
import { ChatAvatar } from './messenger/chat-avatar'
import { playIncomingRingtone, playEndCallSound, stopCallSounds } from '@/lib/ogonek/call-sound'
import { CALL_RING_TIMEOUT_MS } from '@/lib/ogonek/webrtc'
import { getSupabase } from '@/lib/supabase/client'
import { getProfile, updateCallSessionStatus, type CallSessionRecord, type ProfileRecord } from '@/lib/supabase/api'
import { AlertTriangle, Phone, PhoneOff, Video } from 'lucide-react'
import { DesktopToastStack, type DesktopToast } from './notifications'
import { checkSubscriptionStatus, TIER_NAMES } from '@/lib/ogonek/permissions'
import { canShowUpgradeModal } from './upgrade-modal'
import {
  playChatMessageSound,
  playFriendRequestSound,
  playMissedCallSound,
  playMilestoneSound,
} from '@/lib/ogonek/sound'
import { totalUnread } from '@/lib/ogonek/messenger'

// Динамические импорты тяжелых модальных окон (Zero Initial Lag, 120 FPS сплиттинг)
const Composer = dynamic(() => import('./composer').then((m) => m.Composer), { ssr: false })
const AuthModal = dynamic(() => import('./auth').then((m) => m.AuthModal), { ssr: false })
const ChatCallModal = dynamic(() => import('./messenger/chat-call-modal').then((m) => m.ChatCallModal), { ssr: false })
const HotkeysModal = dynamic(() => import('./hotkeys-modal').then((m) => m.HotkeysModal), { ssr: false })
const Lightbox = dynamic(() => import('./lightbox').then((m) => m.Lightbox), { ssr: false })
const ProfileModal = dynamic(() => import('./profile-modal').then((m) => m.ProfileModal), { ssr: false })
const OnboardingModal = dynamic(() => import('./onboarding-modal').then((m) => m.OnboardingModal), { ssr: false })
const FriendsModal = dynamic(() => import('./friends/friends-modal').then((m) => m.FriendsModal), { ssr: false })
const PremiumModal = dynamic(() => import('./premium-modal').then((m) => m.PremiumModal), { ssr: false })
const UpgradeModal = dynamic(() => import('./upgrade-modal').then((m) => m.UpgradeModal), { ssr: false })
const MilestoneModal = dynamic(
  () => import('./milestones/milestone-modal').then((m) => m.MilestoneModal),
  { ssr: false }
)

export function AppShell() {
  const [view, setView] = useState<ViewId>('home')
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(null)
  const [composer, setComposer] = useState(false)
  const [editingDay, setEditingDay] = useState<Day | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [hotkeysModal, setHotkeysModal] = useState(false)
  const [profileModal, setProfileModal] = useState(false)
  const [friendsModalOpen, setFriendsModalOpen] = useState(false)
  const [friendsModalTab, setFriendsModalTab] = useState<'friends' | 'requests' | 'search' | 'following'>('friends')
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [premiumModalOpen, setPremiumModalOpen] = useState(false)
  const [upgradeModal, setUpgradeModal] = useState<{
    isOpen: boolean
    feature: string | null
    requiredTier?: 'pro' | 'ultra'
    customTitle?: string
    customBenefit?: string
  }>({
    isOpen: false,
    feature: null,
  })
  const [milestoneModal, setMilestoneModal] = useState<{
    isOpen: boolean
    milestoneNumber: number
    initialReview?: any
  }>({
    isOpen: false,
    milestoneNumber: 100,
  })
  const [toast, setToast] = useState('')
  const [locked, setLocked] = useState(false)
  const [lockReason, setLockReason] = useState<'open' | 'idle' | 'manual'>('open')
  const [authModal, setAuthModal] = useState<'signin' | 'register' | null>(null)

  // Аудио и видео звонки: глобальный стейт
  const [incomingCall, setIncomingCall] = useState<{
    sessionId: string
    callerId: string
    callerName: string
    callerAvatar?: string | null
    isVideo: boolean
  } | null>(null)
  const [activeGlobalCall, setActiveGlobalCall] = useState<{
    sessionId: string
    callerId: string
    callerName: string
    callerAvatar?: string | null
    isVideo: boolean
  } | null>(null)
  const [desktopToasts, setDesktopToasts] = useState<DesktopToast[]>([])

  const {
    state,
    currentUser,
    addNewDay,
    updateDayWithPayload,
    saveMorningIntentions,
    markMorningFocusStepDone,
    markMorningFocusStepMissed,
    completeEveningReview,
    reopenEveningReview,
    removeMorningFocusRecord,
    saveComposerDraft,
    clearComposerDraft,
    toggleEvidencePin,
    addEvidenceItem,
    deleteEvidenceItem,
    setSoundEnabled,
    setSoundVolume,
    setTheme,
    setAccent,
    setFontScale,
    setFeedDensity,
    resetAppearance,
    updateProfile,
    resetProfile,
    toggleFollow,
    importState,
    resetToDefaults,
    getNextDayDate,
    getNextDayId,
    lockAppNow,
    provisionDemoAccountSecrets,
    continueAsGuest,
    setActiveCall,
    setActiveChatFriend,
    updateStore,
    sendChatMessage,
    setUnreadChatCount,
    setUnreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useOgonekStore()

  const pendingScrollRef = useRef(false)
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null)
  const reduce = useReducedMotion()

  useBodyScrollLock(
    Boolean(
      composer ||
      authModal ||
      profileModal ||
      friendsModalOpen ||
      hotkeysModal ||
      lightbox ||
      onboardingOpen ||
      incomingCall ||
      premiumModalOpen ||
      upgradeModal.isOpen
    )
  )

  const openFriendsModal = useCallback((tab?: 'friends' | 'requests' | 'search' | 'following') => {
    setFriendsModalTab(tab || 'friends')
    setFriendsModalOpen(true)
  }, [])

  useEffect(() => {
    const handler = (e: any) => {
      openFriendsModal(e?.detail?.tab)
    }
    window.addEventListener('ogonek:open-friends', handler)
    return () => window.removeEventListener('ogonek:open-friends', handler)
  }, [openFriendsModal])

  const notify = useCallback((message: string) => {
    setToast(message)
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = setTimeout(() => {
      setToast('')
    }, 2400)
  }, [])

  // Обработчики открытия модального окна Премиума и Апселла (CONTRACT Шаг 12)
  useEffect(() => {
    const handleOpenPremium = () => {
      setPremiumModalOpen(true)
    }
    const handleOpenUpgrade = (e: any) => {
      const detail = e?.detail || {}
      const feature = detail.feature || 'photos'
      const force = Boolean(detail.force)
      if (canShowUpgradeModal(feature, force)) {
        setUpgradeModal({
          isOpen: true,
          feature,
          requiredTier: detail.requiredTier,
          customTitle: detail.customTitle,
          customBenefit: detail.customBenefit,
        })
      }
    }

    window.addEventListener('ogonek:open-premium', handleOpenPremium)
    window.addEventListener('ogonek:open-upgrade', handleOpenUpgrade)
    const handleOpenMilestone = (e: any) => {
      const detail = e?.detail || {}
      const mNum = typeof detail.milestoneNumber === 'number' ? detail.milestoneNumber : 100
      const currentTier = detail.tier || subStatus.effectiveTier || state.profile.subscription_tier || 'free'
      if (currentTier === 'free') {
        notify(`🔥 Поздравляем! ${mNum} дней подряд. Хочешь увидеть, как ты изменился за эти ${mNum} дней? Премиум`)
      } else {
        setMilestoneModal({
          isOpen: true,
          milestoneNumber: mNum,
          initialReview: detail.reviewData || detail.initialReview,
        })
      }
    }
    window.addEventListener('ogonek:open-milestone', handleOpenMilestone)
    const handleEditDayEvent = (e: any) => {
      const day = e?.detail?.day || state.days[0]
      if (day) {
        setEditingDay(day)
        setComposer(true)
      }
    }
    window.addEventListener('ogonek:edit-day', handleEditDayEvent)
    return () => {
      window.removeEventListener('ogonek:open-premium', handleOpenPremium)
      window.removeEventListener('ogonek:open-upgrade', handleOpenUpgrade)
      window.removeEventListener('ogonek:open-milestone', handleOpenMilestone)
      window.removeEventListener('ogonek:edit-day', handleEditDayEvent)
    }
  }, [state.days, state.profile.subscription_tier, notify])

  // Тосты в стиле Telegram Desktop (максимум 3 в стеке)
  const showDesktopToast = useCallback((toast: Omit<DesktopToast, 'id' | 'createdAt'>) => {
    const newToast: DesktopToast = {
      ...toast,
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    }
    setDesktopToasts((prev) => [...prev.slice(-2), newToast])
  }, [])

  const dismissDesktopToast = useCallback((id: string) => {
    setDesktopToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const handleToastReply = useCallback(
    async (toast: DesktopToast, text: string) => {
      if (toast.peerId) {
        sendChatMessage(toast.peerId, text)
        setUnreadChatCount(Math.max(0, (state.unreadChatCount || 1) - 1))
      }
    },
    [sendChatMessage, setUnreadChatCount, state.unreadChatCount]
  )

  const handleClickToast = useCallback(
    (toast: DesktopToast) => {
      dismissDesktopToast(toast.id)
      if (toast.type === 'friend_request') {
        openFriendsModal('requests')
      } else if (toast.peerId) {
        setView('messages')
        updateStore((prev: OgonekStoreState) => ({
          ...prev,
          chatActiveFriendId: toast.peerId || null,
          unreadChatCount: Math.max(0, (prev.unreadChatCount || 1) - 1),
        }))
      } else {
        setView('home')
      }
    },
    [dismissDesktopToast, openFriendsModal, updateStore]
  )

  // Динамический заголовок вкладки: document.title «(3) Огонёк»
  useEffect(() => {
    const updateTitle = () => {
      const total = Math.max(state.unreadChatCount ?? 0, totalUnread(state.chatThreads ?? {}))
      const targetTitle = total > 0 ? `(${total}) Огонёк` : 'Огонёк — Твой личный дневник силы'
      if (document.title !== targetTitle) {
        document.title = targetTitle
      }
      const titleEl = document.querySelector('title')
      if (titleEl && titleEl.textContent !== targetTitle) {
        titleEl.textContent = targetTitle
      }
    }

    updateTitle()
    const t1 = setTimeout(updateTitle, 100)
    const t2 = setTimeout(updateTitle, 350)
    const t3 = setTimeout(updateTitle, 800)
    const interval = setInterval(updateTitle, 1200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearInterval(interval)
    }
  }, [state.unreadChatCount, state.chatThreads])

  // Загрузка начальных счетчиков с сервера при монтировании и авторизации
  useEffect(() => {
    const myId = currentUser?.id || state.auth?.activeAccountId
    if (!myId) return

    fetch('/api/messages/unread')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.chat_unread === 'number') {
          setUnreadChatCount(data.chat_unread)
          if (typeof data.notifications_unread === 'number') {
            setUnreadNotificationsCount(data.notifications_unread)
          }
        }
      })
      .catch(() => {})

    fetch('/api/notifications')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.notifications && Array.isArray(data.notifications)) {
          updateStore((prev: OgonekStoreState) => ({
            ...prev,
            notifications: data.notifications,
            unreadNotificationsCount:
              typeof data.unread_count === 'number'
                ? data.unread_count
                : prev.unreadNotificationsCount || 0,
          }))
        }
      })
      .catch(() => {})
  }, [
    currentUser?.id,
    state.auth?.activeAccountId,
    setUnreadChatCount,
    setUnreadNotificationsCount,
    updateStore,
  ])

  // Realtime подписка на личные сообщения и уведомления
  useEffect(() => {
    const supabase = getSupabase()
    const myId = currentUser?.id || state.auth?.activeAccountId
    if (!supabase || !myId) return

    const channelName = `global_activity_${myId}_${Math.random().toString(36).slice(2, 7)}`
    const channel = supabase.channel(channelName)

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${myId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any
          if (!newMsg || newMsg.author_id === myId) return

          // Проверяем: открыт ли чат с этим автором прямо сейчас?
          const isCurrentChatOpen =
            view === 'messages' && state.chatActiveFriendId === newMsg.author_id

          if (isCurrentChatOpen) {
            return
          }

          // Увеличиваем счетчик непрочитанных
          setUnreadChatCount((state.unreadChatCount || 0) + 1)

          let authorName = 'Друг'
          let authorAvatar: string | undefined = undefined
          try {
            const profile = await getProfile(newMsg.author_id)
            if (profile) {
              authorName = profile.display_name || profile.username || 'Друг'
              authorAvatar = profile.avatar_url || profile.avatar_image || undefined
            }
          } catch {}

          const isVoice = newMsg.type === 'voice' || (newMsg.media && newMsg.media.type === 'audio')
          const isPhoto = newMsg.type === 'image' || (newMsg.media && newMsg.media.type === 'image')
          const isMissed = newMsg.is_system && newMsg.body?.includes('Пропущенный звонок')

          let previewText = newMsg.body || ''
          let mediaType: 'voice' | 'photo' | 'text' | 'call' = 'text'

          if (isMissed) {
            mediaType = 'call'
            previewText = 'Пропущенный звонок'
            playMissedCallSound(state.soundVolume, state.soundEnabled)
          } else if (isVoice) {
            mediaType = 'voice'
            previewText = '🎤 Голосовое сообщение'
            playChatMessageSound(state.soundVolume, state.soundEnabled)
          } else if (isPhoto) {
            mediaType = 'photo'
            previewText = '📷 Фото'
            playChatMessageSound(state.soundVolume, state.soundEnabled)
          } else {
            playChatMessageSound(state.soundVolume, state.soundEnabled)
          }

          showDesktopToast({
            type: isMissed ? 'missed_call' : 'chat',
            title: authorName,
            body: previewText,
            avatarUrl: authorAvatar,
            mediaType,
            peerId: newMsg.author_id,
            threadKey: newMsg.thread_key,
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${myId}`,
        },
        () => {
          fetch('/api/messages/unread')
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
              if (data && typeof data.chat_unread === 'number') {
                setUnreadChatCount(data.chat_unread)
              }
            })
            .catch(() => {})
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${myId}`,
        },
        (payload) => {
          const notif = payload.new as any
          if (!notif) return
          setUnreadNotificationsCount((state.unreadNotificationsCount || 0) + 1)
          if (notif.type === 'friend_request') {
            playFriendRequestSound(state.soundVolume, state.soundEnabled)
            showDesktopToast({
              type: 'friend_request',
              title: notif.title || 'Новая заявка в друзья',
              body: notif.body || 'Пользователь хочет добавить вас в друзья',
              avatarUrl: notif.data?.fromAvatar,
              mediaType: 'text',
              peerId: notif.data?.fromUserId,
            })
          } else if (notif.type === 'missed_call') {
            playMissedCallSound(state.soundVolume, state.soundEnabled)
            showDesktopToast({
              type: 'missed_call',
              title: notif.title || 'Пропущенный звонок',
              body: notif.body || 'Пропущенный вызов',
              avatarUrl: notif.data?.fromAvatar,
              mediaType: 'call',
              peerId: notif.data?.fromUserId,
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [
    currentUser?.id,
    state.auth?.activeAccountId,
    view,
    state.chatActiveFriendId,
    state.unreadChatCount,
    state.unreadNotificationsCount,
    state.soundVolume,
    state.soundEnabled,
    showDesktopToast,
    setUnreadChatCount,
    setUnreadNotificationsCount,
  ])

  // Событие вех достижения стрика «🔥 Поздравляем! 300 дней»
  useEffect(() => {
    const handleMilestone = (e: any) => {
      const days = e?.detail?.days || 300
      showDesktopToast({
        type: 'milestone',
        title: `🔥 Поздравляем! ${days} дней`,
        body: 'Твой огонь горит непрерывно! Ты доказал силу дисциплины.',
        mediaType: 'milestone',
      })
      playMilestoneSound(state.soundVolume, state.soundEnabled)
    }

    const handleIncomingMessage = (e: any) => {
      const msg = e?.detail
      if (!msg) return
      playChatMessageSound(state.soundVolume, state.soundEnabled)
      showDesktopToast({
        type: 'chat',
        title: msg.senderName || 'Собеседник',
        body: msg.preview || msg.text || 'Новое сообщение',
        avatarUrl: msg.avatarUrl,
        mediaType: msg.mediaType || 'text',
        peerId: msg.senderId,
        threadKey: msg.threadKey,
      })
      setUnreadChatCount((state.unreadChatCount || 0) + 1)
    }

    const handleMissedCall = (e: any) => {
      const call = e?.detail
      if (!call) return
      playMissedCallSound(state.soundVolume, state.soundEnabled)
      showDesktopToast({
        type: 'missed_call',
        title: call.callerName || 'Пропущенный звонок',
        body: 'Пропущенный вызов',
        avatarUrl: call.avatarUrl,
        mediaType: 'call',
        peerId: call.callerId,
      })
      setUnreadNotificationsCount((state.unreadNotificationsCount || 0) + 1)
    }

    window.addEventListener('ogonek:show-milestone', handleMilestone)
    window.addEventListener('ogonek:incoming-message', handleIncomingMessage)
    window.addEventListener('ogonek:missed-call', handleMissedCall)
    return () => {
      window.removeEventListener('ogonek:show-milestone', handleMilestone)
      window.removeEventListener('ogonek:incoming-message', handleIncomingMessage)
      window.removeEventListener('ogonek:missed-call', handleMissedCall)
    }
  }, [
    showDesktopToast,
    state.soundVolume,
    state.soundEnabled,
    state.unreadChatCount,
    state.unreadNotificationsCount,
    setUnreadChatCount,
    setUnreadNotificationsCount,
  ])

  const canLock = hasUnlockMethod(state.security)

  /* ── ЭТАП 18: разово готовим демо-пароли сид-аккаунтов ─────────────────── */
  useEffect(() => {
    void provisionDemoAccountSecrets()
  }, [provisionDemoAccountSecrets])

  // Прямой Realtime Broadcast канал входящих звонков: user_calls_${currentUser.id}
  useEffect(() => {
    const supabase = getSupabase()
    const myId = currentUser?.id || state.auth?.activeAccountId
    if (!supabase || !myId) return

    // 1. Подключаемся к персональному каналу звонков пользователя
    const channelName = `user_calls_${myId}`
    const channel = supabase.channel(channelName)

    channel
      .on('broadcast', { event: 'incoming_call' }, (event) => {
        const payload = event?.payload
        if (payload && payload.callerId !== myId) {
          // CONTRACT Шаг 10: Блок пользователя — не дозванивается
          if (state.blockedUserIds?.includes(payload.callerId)) {
            if (payload.sessionId) {
              const roomChannel = supabase.channel(`call_room_${payload.sessionId}`)
              roomChannel.subscribe((st) => {
                if (st === 'SUBSCRIBED') {
                  roomChannel.send({
                    type: 'broadcast',
                    event: 'call_ended',
                    payload: { sessionId: payload.sessionId, reason: 'busy' },
                  })
                }
              })
            }
            return
          }

          setIncomingCall({
            sessionId: payload.sessionId,
            callerId: payload.callerId,
            callerName: payload.callerName || 'Друг',
            callerAvatar: payload.callerAvatar || null,
            isVideo: Boolean(payload.isVideo),
          })
          if (state.soundEnabled) {
            playIncomingRingtone()
          }
        }
      })
      .on('broadcast', { event: 'call_ended' }, () => {
        stopCallSounds()
        setIncomingCall(null)
      })
      // 2. Двойная страховка через postgres_changes в call_sessions
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_sessions',
          filter: `receiver_id=eq.${myId}`,
        },
        async (payload) => {
          const session = payload.new as CallSessionRecord
          if (session && session.status === 'ringing') {
            const profile = await getProfile(session.caller_id)
            setIncomingCall((curr) => {
              if (curr && curr.sessionId === session.id) return curr
              if (state.soundEnabled) {
                playIncomingRingtone()
              }
              return {
                sessionId: session.id,
                callerId: session.caller_id,
                callerName: profile?.display_name || profile?.username || 'Друг',
                callerAvatar: profile?.avatar_url || null,
                isVideo: Boolean(session.is_video),
              }
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_sessions',
          filter: `receiver_id=eq.${myId}`,
        },
        (payload) => {
          const session = payload.new as CallSessionRecord
          if (session && (session.status === 'rejected' || session.status === 'ended')) {
            setIncomingCall((curr) => {
              if (curr && curr.sessionId === session.id) {
                stopCallSounds()
                playEndCallSound()
                return null
              }
              return curr
            })
          }
        }
      )
      .subscribe()

    return () => {
      stopCallSounds()
      supabase.removeChannel(channel)
    }
  }, [currentUser?.id, state.auth?.activeAccountId, state.soundEnabled])

  // CONTRACT Шаг 10: Таймаут 45 секунд для входящего звонка (автоматический сброс в missed)
  useEffect(() => {
    if (!incomingCall) return
    const timer = setTimeout(() => {
      stopCallSounds()
      playEndCallSound()
      setIncomingCall(null)
    }, CALL_RING_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [incomingCall])

  const handleAcceptIncomingCall = async () => {
    stopCallSounds()
    if (!incomingCall) return
    const accepted = incomingCall
    setIncomingCall(null)
    setActiveGlobalCall(accepted)

    const supabase = getSupabase()
    if (supabase && accepted.sessionId) {
      // 1. Отправляем broadcast call_accepted в единую комнату звонка call_room_${sessionId}
      const roomChannel = supabase.channel(`call_room_${accepted.sessionId}`)
      roomChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          roomChannel.send({
            type: 'broadcast',
            event: 'call_accepted',
            payload: { sessionId: accepted.sessionId },
          })
        }
      })

      // 2. Также отправляем call_accepted на персональный канал звонящего
      const callerChannel = supabase.channel(`user_calls_${accepted.callerId}`)
      callerChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          callerChannel.send({
            type: 'broadcast',
            event: 'call_accepted',
            payload: { sessionId: accepted.sessionId },
          })
          setTimeout(() => {
            supabase.removeChannel(callerChannel)
          }, 1000)
        }
      })
    }

    if (accepted.sessionId) {
      await updateCallSessionStatus(accepted.sessionId, 'accepted')
    }
  }

  const handleRejectIncomingCall = async () => {
    stopCallSounds()
    playEndCallSound()

    if (incomingCall) {
      const callData = incomingCall
      setIncomingCall(null)

      const supabase = getSupabase()
      if (supabase && callData.sessionId) {
        // 1. Отправляем broadcast call_ended в единую комнату звонка call_room_${sessionId}
        const roomChannel = supabase.channel(`call_room_${callData.sessionId}`)
        roomChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            roomChannel.send({
              type: 'broadcast',
              event: 'call_ended',
              payload: { sessionId: callData.sessionId },
            })
          }
        })

        // 2. Отправляем broadcast call_ended звонящему в его канал user_calls_${callData.callerId}
        if (callData.callerId) {
          const callerChannel = supabase.channel(`user_calls_${callData.callerId}`)
          callerChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              callerChannel.send({
                type: 'broadcast',
                event: 'call_ended',
                payload: { sessionId: callData.sessionId },
              })
              setTimeout(() => {
                supabase.removeChannel(callerChannel)
              }, 500)
            }
          })
        }
      }

      // 3. Переводим статус в Supabase в 'rejected' и фиксируем пропущенный звонок
      if (callData.sessionId) {
        await updateCallSessionStatus(callData.sessionId, 'missed')
      }
      try {
        fetch('/api/calls/missed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caller_id: callData.callerId,
            receiver_id: currentUser?.id || state.auth?.activeAccountId,
            call_id: callData.sessionId,
          }),
        }).catch(() => {})
      } catch {}
    }
  }

  const openAuth = useCallback((mode: 'signin' | 'register') => {
    setAuthModal(mode)
  }, [])

  const closeAuth = useCallback(() => setAuthModal(null), [])

  const handleCloseComposer = useCallback(() => {
    setComposer(false)
    setEditingDay(null)
  }, [])

  /* ── ЭТАП 15: экран блокировки, автоблокировка и ручная блокировка ─────── */

  // До гидратации CSS держал контент под чёрной заглушкой — снимаем флаг
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.removeAttribute('data-app-locked')
    }
  }, [])

  // Держим лёгкую подсказку в актуальном состоянии для bootstrap-скрипта
  useEffect(() => {
    persistSecurityHint(state.security)
  }, [state.security])

  // Блокировка при открытии приложения
  useEffect(() => {
    if (hasUnlockMethod(state.security) && state.security.lockOnOpen) {
      setLockReason('open')
      setLocked(true)
    }
    // Проверяем только при первом монтировании
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ручная блокировка из «Настроек» и «Безопасности»
  useEffect(() => {
    const handleLockNow = () => {
      if (!canLock) return
      lockAppNow()
      setLockReason('manual')
      setLocked(true)
    }
    window.addEventListener('ogonek:lock-now', handleLockNow)
    return () => window.removeEventListener('ogonek:lock-now', handleLockNow)
  }, [canLock, lockAppNow])

  // Автоблокировка при бездействии
  useEffect(() => {
    if (locked || !canLock || !state.security.lockOnOpen || state.security.autoLockMinutes <= 0) return
    let timer: number | undefined
    const arm = () => {
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        lockAppNow()
        setLockReason('idle')
        setLocked(true)
      }, state.security.autoLockMinutes * 60_000)
    }
    const events: (keyof WindowEventMap)[] = [
      'pointerdown',
      'keydown',
      'wheel',
      'touchstart',
      'scroll',
    ]
    arm()
    events.forEach((event) => window.addEventListener(event, arm, { passive: true }))
    return () => {
      if (timer) window.clearTimeout(timer)
      events.forEach((event) => window.removeEventListener(event, arm))
    }
  }, [locked, canLock, state.security.lockOnOpen, state.security.autoLockMinutes, lockAppNow])

  const handleUnlocked = useCallback(() => {
    setLocked(false)
    notify('Журнал разблокирован')
  }, [notify])

  const navigate = useCallback(
    (next: ViewId, targetUserId?: string | null) => {
      playClick(state.soundEnabled)
      // CONTRACT Шаг 12: «Премиум» открывается модальным окном (pop-up), а не страницей
      if (next === 'premium') {
        setPremiumModalOpen(true)
        return
      }
      setView(next)
      if (next === 'messages') {
        setUnreadChatCount(0)
      }
      setViewProfileUserId(next === 'profile' ? targetUserId || null : null)
      if (typeof window !== 'undefined') {
        let url = next === 'home' ? '/' : `/?view=${next}`
        if (next === 'profile' && targetUserId) {
          url += `&userId=${encodeURIComponent(targetUserId)}`
        }
        window.history.pushState(null, '', url)
      }
      window.scrollTo(0, 0)
    },
    [state.soundEnabled, setUnreadChatCount]
  )

  // При открытии чатов счетчик непрочитанных сбрасывается в 0
  useEffect(() => {
    if (view === 'messages') {
      setUnreadChatCount(0)
    }
  }, [view, setUnreadChatCount])

  // Синхронизация view с URL (query param ?view=...) и поддержка кнопки «Назад»
  useEffect(() => {
    if (typeof window === 'undefined') return
    const readViewFromUrl = () => {
      const path = window.location.pathname
      if (path.startsWith('/chats/')) {
        const friendId = path.split('/chats/')[1]
        if (friendId) {
          setView('messages')
          setActiveChatFriend(friendId)
          return
        }
      } else if (path === '/chats') {
        setView('messages')
        return
      }

      const params = new URLSearchParams(window.location.search)
      if (params.get('modal') === 'premium') {
        setPremiumModalOpen(true)
        params.delete('modal')
        const newSearch = params.toString() ? `?${params.toString()}` : ''
        window.history.replaceState(null, '', `${window.location.pathname}${newSearch}`)
      }

      if (params.get('modal') === 'milestone') {
        const mNum = parseInt(params.get('milestone') || params.get('number') || '100', 10)
        setMilestoneModal({ isOpen: true, milestoneNumber: mNum })
        params.delete('modal')
        params.delete('milestone')
        params.delete('number')
        const newSearch = params.toString() ? `?${params.toString()}` : ''
        window.history.replaceState(null, '', `${window.location.pathname}${newSearch}`)
      }

      const v = params.get('view') as ViewId | null
      if (v === 'premium') {
        setPremiumModalOpen(true)
        setView('home')
        params.delete('view')
        const newSearch = params.toString() ? `?${params.toString()}` : ''
        window.history.replaceState(null, '', `${window.location.pathname}${newSearch}`)
        return
      }

      const u = params.get('userId') || params.get('user') || params.get('u')
      const validViews: ViewId[] = [
        'home',
        'explore',
        'messages',
        'profile',
        'vault',
        'analytics',
        'leaderboard',
        'settings',
        'intentions',
        'landing',
        'premium',
      ]
      if (v && validViews.includes(v)) {
        setView(v)
        if (v === 'profile') {
          setViewProfileUserId(u || null)
        } else {
          setViewProfileUserId(null)
        }
      }
    }

    readViewFromUrl()
    window.addEventListener('popstate', readViewFromUrl)
    return () => window.removeEventListener('popstate', readViewFromUrl)
  }, [setActiveChatFriend])

  // Single source of truth for streak (PRODUCT_SPEC.md Rule 3: стрик = закрытые дни)
  const streakCount = useMemo(() => {
    return state.days.length || calculateStreak(state.days)
  }, [state.days])

  // Статус подписки и предупреждение за 3 дня (CONTRACT Шаг 12)
  const subStatus = useMemo(() => {
    const rawTier = state.profile.subscription_tier
    const validUntil =
      state.profile.subscription_expires_at ||
      (state.profile as any).subscription_valid_until
    return checkSubscriptionStatus(rawTier, validUntil)
  }, [
    state.profile.subscription_tier,
    state.profile.subscription_expires_at,
    (state.profile as any).subscription_valid_until,
  ])

  // Compute live streak state
  const streakState = useMemo(() => {
    const dates = new Set<string>()
    for (const d of state.days) {
      if (d.dateISO) {
        dates.add(d.dateISO.slice(0, 10))
      }
    }
    const computed = computeStreak(dates, new Date(), {
      tz: state.streak?.timeZone,
      deadlineMinutes: state.streak?.deadlineMinutes,
      weekendBonus: state.streak?.weekendBonus,
    })
    return {
      ...computed,
      streak: streakCount,
      best: Math.max(computed.best, streakCount),
    }
  }, [state.days, state.streak, streakCount])

  // Keyboard navigation shortcuts
  useKeyboardNavigation({
    onOpenComposer: () => {
      if (locked) return
      setComposer(true)
    },
    onNavigateExplore: () => {
      if (locked) return
      navigate('explore')
    },
    onCloseModals: () => {
      if (locked) return
      setComposer(false)
      setEditingDay(null)
      setLightbox(null)
      setHotkeysModal(false)
      setProfileModal(false)
      setAuthModal(null)
    },
    onToggleHotkeysModal: () => {
      if (locked) return
      setHotkeysModal((prev) => !prev)
    },
  })

  // Auto-seed history ТОЛЬКО в тестовом демо-режиме (Требование 3)
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === '1' && state.days.length <= 2) {
      fetch('/seeds/ogonek-import.v1.json')
        .then((res) => {
          if (!res.ok) throw new Error('Not found')
          return res.json()
        })
        .then((data) => {
          if (data && Array.isArray(data.days) && data.days.length > 2) {
            importState(data)
            notify(`Загружена летопись демо-режима (${data.days.length} дней)!`)
          }
        })
        .catch(() => {})
    }
  }, [state.days.length, importState, notify])

  // Onboarding event listener & automation events
  useEffect(() => {
    const handleOpenOnboarding = () => setOnboardingOpen(true)
    const handleNavigate = (e: Event) => {
      const custom = e as CustomEvent<ViewId>
      if (custom.detail) navigate(custom.detail)
    }
    const handleOpenComposer = () => setComposer(true)
    const handleCloseComposerEvent = () => {
      setComposer(false)
      setEditingDay(null)
    }
    const handleOpenAuth = (e: Event) => {
      const custom = e as CustomEvent<'signin' | 'register'>
      setAuthModal(custom.detail || 'signin')
    }
    const handleCloseAuth = () => setAuthModal(null)
    const handleCloseOnboarding = () => setOnboardingOpen(false)

    window.addEventListener('ogonek:open-onboarding', handleOpenOnboarding)
    window.addEventListener('ogonek:close-onboarding', handleCloseOnboarding)
    window.addEventListener('ogonek:navigate', handleNavigate)
    window.addEventListener('ogonek:open-composer', handleOpenComposer)
    window.addEventListener('ogonek:close-composer', handleCloseComposerEvent)
    window.addEventListener('ogonek:open-auth', handleOpenAuth)
    window.addEventListener('ogonek:close-auth', handleCloseAuth)

    return () => {
      window.removeEventListener('ogonek:open-onboarding', handleOpenOnboarding)
      window.removeEventListener('ogonek:close-onboarding', handleCloseOnboarding)
      window.removeEventListener('ogonek:navigate', handleNavigate)
      window.removeEventListener('ogonek:open-composer', handleOpenComposer)
      window.removeEventListener('ogonek:close-composer', handleCloseComposerEvent)
      window.removeEventListener('ogonek:open-auth', handleOpenAuth)
      window.removeEventListener('ogonek:close-auth', handleCloseAuth)
    }
  }, [navigate])

  // Key 'p' to open profile modal (legacy — keep for hotkey compat)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (locked) return
      const activeTag = document.activeElement?.tagName?.toLowerCase()
      if (activeTag === 'input' || activeTag === 'textarea') return

      if (e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З') {
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault()
          navigate('profile')
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [navigate, locked])

  const handleFocusIntentions = useCallback(() => {
    // Navigate to the dedicated Intentions view
    navigate('intentions')
  }, [navigate])

  const handleEditDay = useCallback((day: Day) => {
    setEditingDay(day)
    setComposer(true)
  }, [])

  const handleScrollBottom = useCallback(() => {
    window.dispatchEvent(new CustomEvent('ogonek:scroll-bottom'))
    setTimeout(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
    }, 80)
  }, [])

  const handleSelectDay = useCallback(
    (dayId: number) => {
      navigate('home')
      setTimeout(() => {
        const cards = Array.from(document.querySelectorAll<HTMLElement>('.day-card'))
        const card = cards.find((c) => c.innerText.includes(`День #${dayId}`))
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    },
    [navigate]
  )

  const handlePinToVault = useCallback(
    (fact: string) => {
      addEvidenceItem({
        title: fact,
        description: 'Сохранено из записи дня в Огоньке',
        category: 'Спорт',
        date: new Date().toLocaleDateString('ru-RU'),
        pinned: true,
      })
      notify('⚡ Сохранено в Evidence Vault')
    },
    [addEvidenceItem, notify]
  )

  useEffect(() => {
    if (view === 'home' && pendingScrollRef.current) {
      pendingScrollRef.current = false
      const timer = setTimeout(() => {
        document.getElementById('focus')?.scrollIntoView({ behavior: 'smooth' })
      }, 70)
      return () => clearTimeout(timer)
    }
  }, [view])

  const handleSaveComposer = useCallback(
    (payload: ComposerPayload, editingDayId?: number, dateISO?: string) => {
      if (editingDayId != null) {
        updateDayWithPayload(editingDayId, payload)
        notify(`День #${editingDayId} успешно сохранён!`)
      } else {
        addNewDay(payload, dateISO)
        notify('День сохранён в локальное хранилище. Стрик продолжается!')
        const nextCount = state.days.length + 1
        if (nextCount > 0 && nextCount % 100 === 0) {
          const currentTier = subStatus.effectiveTier || state.profile.subscription_tier || 'free'
          if (currentTier === 'free') {
            notify(`🔥 Поздравляем! ${nextCount} дней подряд. Хочешь увидеть, как ты изменился за эти ${nextCount} дней? Премиум`)
          } else {
            setMilestoneModal({ isOpen: true, milestoneNumber: nextCount })
          }
        }
      }
      setComposer(false)
      setEditingDay(null)
    },
    [updateDayWithPayload, addNewDay, notify, state.days.length, state.profile.subscription_tier]
  )

  const content: Record<ViewId, ReactNode> = useMemo(
    () => ({
      home: (
        <HomeView
          userId={state.auth.activeAccountId ?? undefined}
          currentUsername={state.auth.accounts.find((a) => a.id === state.auth.activeAccountId)?.snapshot?.username || state.profile.username}
          days={state.days}
          morningIntentions={state.morningIntentions}
          morningFocusHistory={state.morningFocusHistory}
          onSaveMorningIntentions={saveMorningIntentions}
          onMarkMorningFocusDone={markMorningFocusStepDone}
          onMarkMorningFocusMissed={markMorningFocusStepMissed}
          onCompleteEveningReview={completeEveningReview}
          onReopenEveningReview={reopenEveningReview}
          onRemoveMorningFocus={removeMorningFocusRecord}
          onLightbox={setLightbox}
          onNotify={notify}
          onPinToVault={handlePinToVault}
          onEditDay={handleEditDay}
          streak={streakState.streak}
          streakStatus={streakState.status}
          hoursLeft={streakState.hoursLeft}
          onOpenProfile={() => navigate('profile')}
          onOpenFriends={openFriendsModal}
          onCompose={() => {
            setEditingDay(null)
            setComposer(true)
          }}
          onNavigate={navigate}
          soundEnabled={state.soundEnabled}
        />
      ),
      explore: (
        <ExploreView
          days={state.days}
          onNavigate={navigate}
          onLightbox={setLightbox}
          onNotify={notify}
          onSelectDay={handleSelectDay}
          onEditDay={handleEditDay}
          onOpenFriends={openFriendsModal}
          soundEnabled={state.soundEnabled}
        />
      ),
      messages: !currentUser ? (
        <div className="w-full h-full min-h-[460px] flex flex-col items-center justify-center p-8 bg-[var(--bg)] text-center select-none">
          <div className="w-10 h-10 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin mb-3 shadow-lg" />
          <p className="text-sm font-medium text-[var(--text-2)]">Загрузка мессенджера...</p>
        </div>
      ) : (
        <MessagesView
          onNavigate={navigate}
          onNotify={notify}
          soundEnabled={state.soundEnabled}
          currentUserId={currentUser.id}
          currentUser={currentUser}
        />
      ),
      vault: (
        <VaultView
          evidenceItems={state.evidenceItems}
          onNavigate={navigate}
          onTogglePin={toggleEvidencePin}
          onAddEvidence={addEvidenceItem}
          onDeleteEvidence={deleteEvidenceItem}
          onNotify={notify}
          soundEnabled={state.soundEnabled}
        />
      ),
      premium: (
        <PremiumView
          onNavigate={navigate}
          onUpdateProfile={updateProfile}
          onNotify={notify}
          soundEnabled={state.soundEnabled}
          verified={state.profile.verified}
          subscriptionTier={state.profile.subscription_tier}
        />
      ),
      analytics: (
        <AnalyticsView
          days={state.days}
          onNavigate={navigate}
          onSelectDay={handleSelectDay}
          onNotify={notify}
          soundEnabled={state.soundEnabled}
        />
      ),
      settings: (
        <SettingsView
          state={state}
          onNavigate={navigate}
          onNotify={notify}
          onSetSoundEnabled={setSoundEnabled}
          onSetSoundVolume={setSoundVolume}
          onSetTheme={setTheme}
          onSetAccent={setAccent}
          onSetFontScale={setFontScale}
          onSetFeedDensity={setFeedDensity}
          onResetAppearance={resetAppearance}
          onImportState={importState}
          onResetToDefaults={resetToDefaults}
          onUpdateProfile={updateProfile}
        />
      ),
      profile: (
        <ProfileView
          storeState={state}
          targetUserId={viewProfileUserId}
          onNavigate={navigate}
          onUpdateProfile={updateProfile}
          onResetProfile={resetProfile}
          onToggleFollow={toggleFollow}
          onNotify={notify}
          onOpenFriends={openFriendsModal}
          soundEnabled={state.soundEnabled}
        />
      ),
      intentions: (
        <IntentionsView
          morningIntentions={state.morningIntentions}
          morningFocusHistory={state.morningFocusHistory}
          onNavigate={navigate}
          onSave={saveMorningIntentions}
          notify={notify}
          soundEnabled={state.soundEnabled}
        />
      ),
      leaderboard: (
        <LeaderboardView
          onNavigate={navigate}
          onNotify={notify}
          soundEnabled={state.soundEnabled}
        />
      ),
      landing: (
        <GuestLanding
          onEnterDemo={() => {
            continueAsGuest()
            notify('Включён демонстрационный режим')
          }}
          onNotify={notify}
        />
      ),
    }),
    [
      state,
      streakState,
      navigate,
      viewProfileUserId,
      notify,
      saveMorningIntentions,
      markMorningFocusStepDone,
      markMorningFocusStepMissed,
      completeEveningReview,
      reopenEveningReview,
      removeMorningFocusRecord,
      handleSelectDay,
      handlePinToVault,
      toggleEvidencePin,
      addEvidenceItem,
      setSoundEnabled,
      setTheme,
      setAccent,
      setFontScale,
      setFeedDensity,
      resetAppearance,
      updateProfile,
      resetProfile,
      toggleFollow,
      importState,
      resetToDefaults,
      handleEditDay,
    ]
  )

  // Гостевой лендинг для неавторизованных посетителей (?view=landing)
  if (view === 'landing') {
    return (
      <GuestLanding
        onEnterDemo={() => {
          continueAsGuest()
          notify('Включён демонстрационный режим')
        }}
        onNotify={notify}
      />
    )
  }

  // Если пользователь не вошёл (currentUser === null) — показываем экран авторизации AuthForm, кроме прямого перехода в чаты
  if (!currentUser) {
    if (view === 'messages') {
      return (
        <FullscreenMessenger
          initialThreadId={state.chatActiveFriendId || undefined}
          currentUserId={state.auth?.activeAccountId || 'local-user'}
          onNavigate={navigate}
          onCompose={() => setComposer(true)}
          onOpenProfile={() => navigate('profile')}
          onOpenAuth={openAuth}
          onFocusIntentions={handleFocusIntentions}
        />
      )
    }
    return (
      <TooltipProvider>
        <AppearanceProvider
          theme={state.theme}
          accent={state.accent}
          fontScale={state.fontScale}
          feedDensity={state.feedDensity}
        />
        <AuthScreen
          onAuthenticated={() => {
            navigate('home')
          }}
          onNotify={notify}
        />

        {/* Модальное окно тарифов Премиум при открытии через /premium (CONTRACT Шаг 12) */}
        {premiumModalOpen && (
          <PremiumModal
            isOpen={premiumModalOpen}
            onClose={() => setPremiumModalOpen(false)}
            onNotify={notify}
          />
        )}

        {/* Всплывающие уведомления в стиле Telegram Desktop (максимум 3 в стеке) */}
        <DesktopToastStack
          toasts={desktopToasts}
          onDismiss={dismissDesktopToast}
          onClickToast={handleClickToast}
          onSendReply={handleToastReply}
        />

        <Toast message={toast} />
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      {/* ЭТАП 19: фоновый offline-first планировщик синхронизации с Supabase.
          Без ключей в .env.local делает ровно ничего. */}
      <SupabaseSyncBootstrap />
      <AppearanceProvider
        theme={state.theme}
        accent={state.accent}
        fontScale={state.fontScale}
        feedDensity={state.feedDensity}
      />
      <main className="w-full min-h-screen bg-[var(--bg)] text-[var(--text)] overflow-x-clip" data-locked={locked ? 'true' : undefined}>
        {view === 'messages' ? (
          <FullscreenMessenger
            initialThreadId={state.chatActiveFriendId || undefined}
            currentUserId={currentUser?.id || state.auth?.activeAccountId || 'local-user'}
            onNavigate={navigate}
            onCompose={() => setComposer(true)}
            onOpenProfile={() => navigate('profile')}
            onOpenAuth={openAuth}
            onFocusIntentions={handleFocusIntentions}
          />
        ) : (
          <div className="flex justify-center min-h-screen bg-[var(--bg)] text-[var(--text)] w-full">
            <div className="flex flex-row w-full max-w-[1265px] justify-center">
              <Sidebar
                className="hidden md:flex w-[72px] xl:w-[275px] shrink-0 sticky top-0 h-screen overflow-y-auto select-none border-r border-[var(--line)]"
                view={view}
                onNavigate={navigate}
                onFocusIntentions={handleFocusIntentions}
                onCompose={() => setComposer(true)}
                onOpenProfile={() => navigate('profile')}
                onOpenAuth={openAuth}
                onNotify={notify}
                streak={streakState.streak}
              />

              {/* Центральная колонка */}
              <section
                className="w-full max-w-[600px] md:w-[600px] shrink-0 min-h-screen border-r border-[var(--line)] pb-[calc(53px+env(safe-area-inset-bottom)+70px)] md:pb-0"
                aria-label="Основное содержимое"
              >
                {view === 'home' && (
                  <MobileTopBar
                    onNavigate={navigate}
                    onNotify={notify}
                    onOpenFriends={openFriendsModal}
                    streak={streakState.streak}
                    streakStatus={streakState.status}
                    hoursLeft={streakState.hoursLeft}
                  />
                )}

                {/* Предупреждение об истечении подписки за 3 дня (CONTRACT Шаг 12) */}
                {view === 'home' && subStatus.isExpiringSoon && (
                  <div
                    id="subscription-expiring-soon-banner"
                    className="mx-4 mt-3 mb-1 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 text-amber-300 min-w-0">
                      <AlertTriangle size={16} className="shrink-0 text-amber-400" />
                      <span className="truncate">
                        Подписка <b>{TIER_NAMES[subStatus.effectiveTier]}</b> истекает через{' '}
                        <b>{subStatus.daysRemaining} {subStatus.daysRemaining === 1 ? 'день' : 'дня'}</b>
                      </span>
                    </div>
                    <button
                      type="button"
                      id="renew-expiring-subscription-btn"
                      onClick={() => setPremiumModalOpen(true)}
                      className="px-3 py-1 rounded-full bg-[var(--accent,#FF6A1A)] text-white font-bold hover:opacity-90 transition-opacity shrink-0 shadow-sm"
                    >
                      Продлить
                    </button>
                  </div>
                )}
                <motion.div
                  key={view}
                  className="view w-full"
                  initial={{ opacity: 0.95 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.04 }}
                >
                  {content[view]}
                </motion.div>
              </section>

              <RightRail
                className="right-rail w-[350px] shrink-0 sticky top-0 h-screen overflow-y-auto select-none pl-6 hidden lg:block"
                onNavigate={navigate}
                onCompose={() => setComposer(true)}
                streak={streakState.streak}
                streakStatus={streakState.status}
                hoursLeft={streakState.hoursLeft}
                isDemo={state.isDemo}
                onNotify={notify}
                onOpenFriends={openFriendsModal}
                soundEnabled={state.soundEnabled}
              />
            </div>

            <ScrollPill onScrollBottom={handleScrollBottom} />

            <BottomNav
              view={view}
              onNavigate={navigate}
              onCompose={() => setComposer(true)}
            />
          </div>
        )}

        <AnimatePresence>
          {composer && (
            <Composer
              key={editingDay ? `composer-day-${editingDay.id}` : 'composer-day-new'}
              initialDraft={state.composerDraft}
              editingDay={editingDay}
              nextDayId={editingDay ? undefined : getNextDayId()}
              nextDayDateISO={editingDay ? undefined : getNextDayDate()}
              onSaveDraft={saveComposerDraft}
              onClearDraft={clearComposerDraft}
              onClose={handleCloseComposer}
              onSaved={handleSaveComposer}
              soundEnabled={state.soundEnabled}
              onNotify={notify}
            />
          )}
          {lightbox && (
            <Lightbox
              src={lightbox}
              onClose={() => setLightbox(null)}
            />
          )}
          {hotkeysModal && (
            <HotkeysModal
              onClose={() => setHotkeysModal(false)}
            />
          )}
          {profileModal && (
            <ProfileModal
              storeState={state}
              onClose={() => setProfileModal(false)}
              onNavigate={navigate}
            />
          )}
          {friendsModalOpen && (
            <FriendsModal
              initialTab={friendsModalTab}
              onClose={() => setFriendsModalOpen(false)}
              onNavigateToUser={(uid) => {
                setFriendsModalOpen(false)
                navigate('profile', uid)
              }}
              onStartChatWithUser={(uid) => {
                setFriendsModalOpen(false)
                navigate('messages')
              }}
              onNotify={notify}
              soundEnabled={state.soundEnabled}
            />
          )}
          {onboardingOpen && (
            <OnboardingModal
              isOpen={onboardingOpen}
              initialUsername={state.profile.username}
              onClose={() => setOnboardingOpen(false)}
              onSave={(newUsername, level, text) => {
                updateProfile({
                  username: newUsername,
                  level,
                  levelChangedAtISO: new Date().toISOString(),
                })
                addNewDay({
                  prides: [
                    text,
                    'Зафиксировал цель вести летопись 700 дней',
                  ],
                  gratitudes: [
                    'Благодарен себе за решимость начать новый путь',
                    'Благодарен этому дню за возможности',
                  ],
                  photo: null,
                  ratings: {
                    0: { scale: 9.0, overcome: 1 },
                  },
                })
              }}
              onSaveFirstPride={(text, level) => {
                updateProfile({ level, levelChangedAtISO: new Date().toISOString() })
                addNewDay({
                  prides: [
                    text,
                    'Зафиксировал цель вести летопись 700 дней',
                  ],
                  gratitudes: [
                    'Благодарен себе за решимость начать новый путь',
                    'Благодарен этому дню за возможности',
                  ],
                  photo: null,
                  ratings: {
                    0: { scale: 9.0, overcome: 1 },
                  },
                })
              }}
              onNotify={notify}
              soundEnabled={state.soundEnabled}
            />
          )}

          {/* Модальное окно тарифов Премиум (CONTRACT Шаг 12) */}
          {premiumModalOpen && (
            <PremiumModal
              isOpen={premiumModalOpen}
              onClose={() => setPremiumModalOpen(false)}
              onNotify={notify}
            />
          )}

          {/* Единая модалка апселла UpgradeModal (CONTRACT Шаг 12) */}
          {upgradeModal.isOpen && (
            <UpgradeModal
              isOpen={upgradeModal.isOpen}
              feature={upgradeModal.feature}
              requiredTier={upgradeModal.requiredTier}
              customTitle={upgradeModal.customTitle}
              customBenefit={upgradeModal.customBenefit}
              onClose={() => setUpgradeModal((prev) => ({ ...prev, isOpen: false }))}
              onOpenPremiumModal={() => {
                setUpgradeModal((prev) => ({ ...prev, isOpen: false }))
                setPremiumModalOpen(true)
              }}
            />
          )}

          {/* Модальное окно юбилея вехи 100/200/300 (CONTRACT Шаг 13) */}
          {milestoneModal.isOpen && (
            <MilestoneModal
              isOpen={milestoneModal.isOpen}
              milestoneNumber={milestoneModal.milestoneNumber}
              tier={subStatus.effectiveTier}
              initialReview={milestoneModal.initialReview}
              onClose={() => setMilestoneModal((prev) => ({ ...prev, isOpen: false }))}
              onUpgrade={() => {
                setMilestoneModal((prev) => ({ ...prev, isOpen: false }))
                setPremiumModalOpen(true)
              }}
              onNotify={notify}
              soundEnabled={state.soundEnabled}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {locked && <AppLockScreen onUnlocked={handleUnlocked} reason={lockReason} />}
        </AnimatePresence>

        <AnimatePresence>
          {authModal && (
            <AuthModal
              initialMode={authModal}
              onClose={closeAuth}
              onNotify={notify}
              onAuthenticated={() => {
                navigate('home')
              }}
            />
          )}
        </AnimatePresence>

        {/* Модалка входящего звонка (на любом экране приложения) */}
        <AnimatePresence>
          {incomingCall && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none"
            >
              <div className="bg-[var(--bg)] border-2 border-[var(--accent)]/50 rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-[0_0_50px_rgba(255,107,53,0.3)] flex flex-col items-center text-center relative animate-in fade-in zoom-in-95">
                {/* Верхняя плашка */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-bold tracking-wide uppercase mb-5 border border-[var(--accent)]/20">
                  {incomingCall.isVideo ? <Video size={13} /> : <Phone size={13} />}
                  <span>{incomingCall.isVideo ? 'Входящий видеовызов' : 'Входящий аудиовызов'}</span>
                </div>

                {/* Аватар с крупной неоновой пульсацией */}
                <div className="relative mb-5 flex items-center justify-center">
                  <div className="absolute inset-[-14px] rounded-full border-2 border-[var(--accent)] animate-ping opacity-40" />
                  <div className="absolute inset-[-6px] rounded-full bg-[var(--accent)]/20 animate-pulse" />
                  <ChatAvatar
                    friendId={incomingCall.callerId}
                    size={96}
                    ringColor="var(--accent)"
                    fallbackAvatar={incomingCall.callerAvatar}
                    fallbackName={incomingCall.callerName}
                  />
                </div>

                <h3 className="text-xl sm:text-2xl font-[900] text-[var(--text)] tracking-tight">
                  {incomingCall.callerName}
                </h3>
                <p className="text-xs text-[var(--text-2)] mt-1.5 font-medium">
                  {incomingCall.isVideo ? 'Входящий видеозвонок...' : 'Входящий аудиозвонок...'}
                </p>

                {/* Кнопки Отклонить (красная) и Принять (зеленая) */}
                <div className="mt-7 flex items-center justify-center gap-6 w-full">
                  <button
                    type="button"
                    onClick={handleRejectIncomingCall}
                    className="w-16 h-16 rounded-full bg-[#f4212e] hover:bg-[#dc1e29] text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all"
                    aria-label="Отклонить"
                    title="Отклонить вызов"
                  >
                    <PhoneOff size={28} />
                  </button>

                  <button
                    type="button"
                    onClick={handleAcceptIncomingCall}
                    className="w-16 h-16 rounded-full bg-[#00ba7c] hover:bg-[#00a36d] text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all animate-bounce"
                    aria-label="Принять"
                    title="Принять вызов"
                  >
                    <Phone size={28} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Активное окно звонка после принятия вызова на уровне Shell с локальным ErrorBoundary */}
        {(activeGlobalCall || state.activeCall) && (
          <CallErrorBoundary onReset={() => setActiveGlobalCall(null)}>
            <ChatCallModal
              isOpen={true}
              sessionId={state.activeCall?.sessionId || activeGlobalCall?.sessionId}
              callerId={state.activeCall?.callerId || activeGlobalCall?.callerId}
              receiverId={state.activeCall?.receiverId || currentUser?.id || state.auth?.activeAccountId || undefined}
              friendId={state.activeCall?.friendId || activeGlobalCall?.callerId || ''}
              friendName={state.activeCall?.friendName || activeGlobalCall?.callerName}
              friendUsername={state.activeCall?.friendUsername}
              callerName={state.activeCall?.callerName || activeGlobalCall?.callerName}
              callerAvatar={state.activeCall?.callerAvatar || activeGlobalCall?.callerAvatar}
              friendAvatar={state.activeCall?.friendAvatar || activeGlobalCall?.callerAvatar}
              isVideo={state.activeCall ? state.activeCall.isVideo : Boolean(activeGlobalCall?.isVideo)}
              isIncoming={state.activeCall ? state.activeCall.isIncoming : true}
              initialConnected={state.activeCall ? state.activeCall.initialConnected : true}
              onClose={() => {
                setActiveGlobalCall(null)
                setActiveCall(null)
              }}
              onEndCall={() => {
                setActiveGlobalCall(null)
                setActiveCall(null)
              }}
              soundEnabled={state.soundEnabled}
            />
          </CallErrorBoundary>
        )}

        {/* Всплывающие уведомления в стиле Telegram Desktop (максимум 3 в стеке) */}
        <DesktopToastStack
          toasts={desktopToasts}
          onDismiss={dismissDesktopToast}
          onClickToast={handleClickToast}
          onSendReply={handleToastReply}
        />

        <Toast message={toast} />
      </main>

      {/* ЭТАП 18: полноэкранный шлюз авторизации, когда пользователь вышел */}
      <AnimatePresence>
        {!state.auth.signedIn && !locked && (
          <AuthScreen
            onAuthenticated={() => {
              navigate('home')
            }}
            onNotify={notify}
          />
        )}
      </AnimatePresence>
    </TooltipProvider>
  )
}

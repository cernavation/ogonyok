'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { playClick } from '@/lib/ogonek/sound'
import { computeStreak, calculateStreak } from '@/lib/ogonek/streak'
import { hasUnlockMethod, persistSecurityHint } from '@/lib/ogonek/security'
import { useKeyboardNavigation } from '@/lib/ogonek/use-keyboard-navigation'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import type { ComposerPayload, Day, ViewId } from '@/lib/ogonek/types'
import dynamic from 'next/dynamic'
import { AppearanceProvider } from './appearance-provider'
import { AuthModal, AuthScreen } from './auth'
import { BottomNav } from './bottom-nav'
import { Composer } from './composer'
import { RightRail } from './right-rail'
import { AppLockScreen } from './security'
import { Sidebar } from './sidebar'
import { ScrollPill } from './scroll-pill'
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
import { GuestLanding } from './landing/guest-landing'
import { ChatWindow, FullscreenMessenger } from './messenger'

const HotkeysModal = dynamic(() => import('./hotkeys-modal').then((m) => m.HotkeysModal), { ssr: false })
const Lightbox = dynamic(() => import('./lightbox').then((m) => m.Lightbox), { ssr: false })
const ProfileModal = dynamic(() => import('./profile-modal').then((m) => m.ProfileModal), { ssr: false })
const OnboardingModal = dynamic(() => import('./onboarding-modal').then((m) => m.OnboardingModal), { ssr: false })

export function AppShell() {
  const [view, setView] = useState<ViewId>('home')
  const [composer, setComposer] = useState(false)
  const [editingDay, setEditingDay] = useState<Day | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [hotkeysModal, setHotkeysModal] = useState(false)
  const [profileModal, setProfileModal] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [locked, setLocked] = useState(false)
  const [lockReason, setLockReason] = useState<'open' | 'idle' | 'manual'>('open')
  const [authModal, setAuthModal] = useState<'signin' | 'register' | null>(null)

  const {
    state,
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
    getNextDayDate,
    getNextDayId,
    lockAppNow,
    provisionDemoAccountSecrets,
    continueAsGuest,
    setActiveChatFriend,
  } = useOgonekStore()

  const pendingScrollRef = useRef(false)
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null)
  const reduce = useReducedMotion()

  const notify = useCallback((message: string) => {
    setToast(message)
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = setTimeout(() => {
      setToast('')
    }, 2400)
  }, [])

  const canLock = hasUnlockMethod(state.security)

  /* ── ЭТАП 18: разово готовим демо-пароли сид-аккаунтов ─────────────────── */
  useEffect(() => {
    void provisionDemoAccountSecrets()
  }, [provisionDemoAccountSecrets])

  const openAuth = useCallback((mode: 'signin' | 'register') => {
    setAuthModal(mode)
  }, [])

  const closeAuth = useCallback(() => setAuthModal(null), [])

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

  const navigate = useCallback((next: ViewId) => {
    playClick(state.soundEnabled)
    setView(next)
    window.scrollTo(0, 0)
  }, [state.soundEnabled])

  // Поддержка кнопки «Назад» в браузере для полноэкранного чата
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return
      const path = window.location.pathname
      if (path.startsWith('/chats/')) {
        const friendId = path.split('/chats/')[1]
        if (friendId) {
          navigate('messages')
          setActiveChatFriend(friendId)
        }
      } else {
        if (state.chatActiveFriendId) {
          setActiveChatFriend(null)
        }
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [state.chatActiveFriendId, setActiveChatFriend, navigate])

  // Single source of truth for streak (PRODUCT_SPEC.md Rule 3: стрик = закрытые дни)
  const streakCount = useMemo(() => {
    return calculateStreak(state.days)
  }, [state.days])

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
    const handleCloseComposer = () => {
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
    window.addEventListener('ogonek:close-composer', handleCloseComposer)
    window.addEventListener('ogonek:open-auth', handleOpenAuth)
    window.addEventListener('ogonek:close-auth', handleCloseAuth)

    return () => {
      window.removeEventListener('ogonek:open-onboarding', handleOpenOnboarding)
      window.removeEventListener('ogonek:close-onboarding', handleCloseOnboarding)
      window.removeEventListener('ogonek:navigate', handleNavigate)
      window.removeEventListener('ogonek:open-composer', handleOpenComposer)
      window.removeEventListener('ogonek:close-composer', handleCloseComposer)
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
      }
      setComposer(false)
      setEditingDay(null)
    },
    [updateDayWithPayload, addNewDay, notify]
  )

  const content: Record<ViewId, ReactNode> = useMemo(
    () => ({
      home: (
        <HomeView
          userId={state.auth.activeAccountId ?? undefined}
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
          soundEnabled={state.soundEnabled}
        />
      ),
      messages: (
        <MessagesView
          onNavigate={navigate}
          onNotify={notify}
          soundEnabled={state.soundEnabled}
        />
      ),
      vault: (
        <VaultView
          evidenceItems={state.evidenceItems}
          onNavigate={navigate}
          onTogglePin={toggleEvidencePin}
          onAddEvidence={addEvidenceItem}
          onNotify={notify}
          soundEnabled={state.soundEnabled}
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
          onNavigate={navigate}
          onUpdateProfile={updateProfile}
          onResetProfile={resetProfile}
          onToggleFollow={toggleFollow}
          onNotify={notify}
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
    }),
    [
      state,
      streakState,
      navigate,
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

  // Неавторизованный гость видит ТОЛЬКО лендинг в стиле X.com (Требование 2)
  if (!state.auth.signedIn && process.env.NEXT_PUBLIC_DEMO_MODE !== '1') {
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
      <main className="app-shell" data-locked={locked ? 'true' : undefined}>
        {view === 'messages' ? (
          <FullscreenMessenger initialThreadId={state.chatActiveFriendId || undefined} />
        ) : (
          <>
            <Sidebar
              view={view}
              onNavigate={navigate}
              onFocusIntentions={handleFocusIntentions}
              onCompose={() => setComposer(true)}
              onOpenProfile={() => navigate('profile')}
              onOpenAuth={openAuth}
              onNotify={notify}
              streak={streakState.streak}
            />

            <section
              className="feed"
              aria-label="Основное содержимое"
            >
              <motion.div
                key={view}
                className="view"
                initial={{ opacity: 0.95 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.04 }}
              >
                {content[view]}
              </motion.div>
            </section>

            <RightRail
                onNavigate={navigate}
                onCompose={() => setComposer(true)}
                streak={streakState.streak}
                streakStatus={streakState.status}
                hoursLeft={streakState.hoursLeft}
                isDemo={state.isDemo}
                onNotify={notify}
                soundEnabled={state.soundEnabled}
              />

            <ScrollPill onScrollBottom={handleScrollBottom} />

            <BottomNav
              view={view}
              onNavigate={navigate}
              onCompose={() => setComposer(true)}
            />
          </>
        )}

        <AnimatePresence>
          {composer && (
            <Composer
              initialDraft={state.composerDraft}
              editingDay={editingDay}
              nextDayId={editingDay ? undefined : getNextDayId()}
              nextDayDateISO={editingDay ? undefined : getNextDayDate()}
              onSaveDraft={saveComposerDraft}
              onClearDraft={clearComposerDraft}
              onClose={() => {
                setComposer(false)
                setEditingDay(null)
              }}
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

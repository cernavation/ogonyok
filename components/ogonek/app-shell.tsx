'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { playClick } from '@/lib/ogonek/sound'
import { computeStreak } from '@/lib/ogonek/streak'
import { useKeyboardNavigation } from '@/lib/ogonek/use-keyboard-navigation'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import type { ComposerPayload, Day, ViewId } from '@/lib/ogonek/types'
import dynamic from 'next/dynamic'
import { BottomNav } from './bottom-nav'
import { Composer } from './composer'
import { RightRail } from './right-rail'

const HotkeysModal = dynamic(() => import('./hotkeys-modal').then((m) => m.HotkeysModal), { ssr: false })
const Lightbox = dynamic(() => import('./lightbox').then((m) => m.Lightbox), { ssr: false })
const ProfileModal = dynamic(() => import('./profile-modal').then((m) => m.ProfileModal), { ssr: false })
import { Sidebar } from './sidebar'
import { ScrollPill } from './scroll-pill'
import { Toast } from './toast'
import { TooltipProvider } from './tooltip'
import { AnalyticsView } from './views/analytics-view'
import { ExploreView } from './views/explore-view'
import { HomeView } from './views/home-view'
import { SettingsView } from './views/settings-view'
import { VaultView } from './views/vault-view'

export function AppShell() {
  const [view, setView] = useState<ViewId>('home')
  const [composer, setComposer] = useState(false)
  const [editingDay, setEditingDay] = useState<Day | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [hotkeysModal, setHotkeysModal] = useState(false)
  const [profileModal, setProfileModal] = useState(false)
  const [toast, setToast] = useState('')

  const {
    state,
    addEntryToCurrentDay,
    updateDayWithPayload,
    saveMorningIntentions,
    saveComposerDraft,
    clearComposerDraft,
    toggleEvidencePin,
    addEvidenceItem,
    setSoundEnabled,
    setPinEnabled,
    importState,
    resetToDefaults,
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

  const navigate = useCallback((next: ViewId) => {
    playClick(state.soundEnabled)
    setView(next)
    window.scrollTo(0, 0)
  }, [state.soundEnabled])

  // Compute live streak state
  const streakState = useMemo(() => {
    const dates = new Set<string>()
    for (const d of state.days) {
      if (d.dateISO) {
        dates.add(d.dateISO.slice(0, 10))
      }
    }
    return computeStreak(dates, new Date())
  }, [state.days])

  // Keyboard navigation shortcuts
  useKeyboardNavigation({
    onOpenComposer: () => setComposer(true),
    onNavigateExplore: () => navigate('explore'),
    onCloseModals: () => {
      setComposer(false)
      setEditingDay(null)
      setLightbox(null)
      setHotkeysModal(false)
      setProfileModal(false)
    },
    onToggleHotkeysModal: () => setHotkeysModal((prev) => !prev),
  })

  // Auto-seed real history if store is in initial single-day state
  useEffect(() => {
    if (state.days.length <= 1) {
      fetch('/seeds/ogonek-import.v1.json')
        .then((res) => {
          if (!res.ok) throw new Error('Not found')
          return res.json()
        })
        .then((data) => {
          if (data && Array.isArray(data.days) && data.days.length > 1) {
            importState(data)
            notify(`Загружена подлинная летопись (${data.days.length} дней)!`)
          }
        })
        .catch(() => {})
    }
  }, [state.days.length, importState, notify])

  // Key 'p' to open profile modal
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase()
      if (activeTag === 'input' || activeTag === 'textarea') return

      if (e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З') {
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault()
          setProfileModal((prev) => !prev)
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const handleFocusIntentions = useCallback(() => {
    if (view === 'home') {
      document.getElementById('focus')?.scrollIntoView({ behavior: 'smooth' })
    } else {
      pendingScrollRef.current = true
      navigate('home')
    }
  }, [view, navigate])

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
    (payload: ComposerPayload, editingDayId?: number) => {
      if (editingDayId != null) {
        updateDayWithPayload(editingDayId, payload)
        notify(`День #${editingDayId} успешно сохранён!`)
      } else {
        addEntryToCurrentDay(payload)
        notify('День сохранён в локальное хранилище. Стрик продолжается!')
      }
      setComposer(false)
      setEditingDay(null)
    },
    [updateDayWithPayload, addEntryToCurrentDay, notify]
  )

  const content: Record<ViewId, ReactNode> = useMemo(
    () => ({
      home: (
        <HomeView
          days={state.days}
          morningIntentions={state.morningIntentions}
          onSaveMorningIntentions={saveMorningIntentions}
          onLightbox={setLightbox}
          onNotify={notify}
          onPinToVault={handlePinToVault}
          onEditDay={handleEditDay}
          streak={streakState.streak}
          streakStatus={streakState.status}
          hoursLeft={streakState.hoursLeft}
          onOpenProfile={() => setProfileModal(true)}
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
        />
      ),
      settings: (
        <SettingsView
          state={state}
          onNavigate={navigate}
          onNotify={notify}
          onSetSoundEnabled={setSoundEnabled}
          onSetPinEnabled={setPinEnabled}
          onImportState={importState}
          onResetToDefaults={resetToDefaults}
        />
      ),
    }),
    [
      state,
      streakState,
      navigate,
      notify,
      saveMorningIntentions,
      handleSelectDay,
      handlePinToVault,
      toggleEvidencePin,
      addEvidenceItem,
      setSoundEnabled,
      setPinEnabled,
      importState,
      resetToDefaults,
    ]
  )

  return (
    <TooltipProvider>
      <main className="app-shell">
        <Sidebar
          view={view}
          onNavigate={navigate}
          onFocusIntentions={handleFocusIntentions}
          onCompose={() => setComposer(true)}
          onOpenProfile={() => setProfileModal(true)}
          streak={streakState.streak}
        />

        <section className="feed" aria-label="Основное содержимое">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              className="view"
              initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.14, ease: 'easeOut' }}
            >
              {content[view]}
            </motion.div>
          </AnimatePresence>
        </section>

        <RightRail
          onNavigate={navigate}
          onCompose={() => setComposer(true)}
          streak={streakState.streak}
          streakStatus={streakState.status}
          hoursLeft={streakState.hoursLeft}
          isDemo={state.isDemo}
        />

        <ScrollPill onScrollBottom={handleScrollBottom} />

        <BottomNav
          view={view}
          onNavigate={navigate}
          onCompose={() => setComposer(true)}
        />

        <AnimatePresence>
          {composer && (
            <Composer
              initialDraft={state.composerDraft}
              editingDay={editingDay}
              onSaveDraft={saveComposerDraft}
              onClearDraft={clearComposerDraft}
              onClose={() => {
                setComposer(false)
                setEditingDay(null)
              }}
              onSaved={handleSaveComposer}
              soundEnabled={state.soundEnabled}
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
        </AnimatePresence>

        <Toast message={toast} />
      </main>
    </TooltipProvider>
  )
}

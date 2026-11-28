'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOgonekStore, syncSupabaseAuthNow } from '@/lib/ogonek/use-ogonek-store'
import { resolveBrowserSession } from '@/lib/ogonek/client-session'
import {
  markPridaySystemMessagesReadDb,
  subscribeToDirectMessages,
  subscribeToOfficialBroadcasts,
  subscribeToUserGroups,
} from '@/lib/supabase/api'
import { Sidebar } from '../sidebar'
import { CURRENT_DAY } from '@/lib/ogonek/data'
import type { ViewId } from '@/lib/ogonek/types'
import { MessengerDialogList } from './messenger-dialog-list'
import { MessengerChatPane } from './messenger-chat-pane'
import { NewChatModal } from './new-chat-modal'
import { MessengerErrorBoundary } from './messenger-error-boundary'
import { AppearanceProvider } from '../appearance-provider'
import { TooltipProvider } from '../tooltip'
import { Toast } from '../toast'
import { BottomNav } from '../bottom-nav'

type Props = {
  embedded?: boolean
  initialThreadId?: string
  currentUserId?: string
  onNavigate?: (view: ViewId) => void
  onCompose?: () => void
  onOpenProfile?: () => void
  onOpenAuth?: (mode: 'signin' | 'register') => void
  onFocusIntentions?: () => void
}

function sanitizeThreadId(id: unknown): string | null {
  if (typeof id !== 'string') return null
  const trimmed = id.trim()
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return null
  return trimmed
}

export function FullscreenMessenger({
  embedded = false,
  initialThreadId,
  currentUserId,
  onNavigate,
  onCompose,
  onOpenProfile,
  onOpenAuth,
  onFocusIntentions,
}: Props) {
  const router = useRouter()
  const {
    state,
    currentUser,
    setActiveChatFriend,
    loadChatThreadsFromCloud,
    receiveIncomingChatMessage,
    receiveOfficialBroadcast,
    removeOfficialBroadcast,
    updateIncomingChatMessage,
    removeDeletedChatMessage,
  } = useOgonekStore()

  const [standaloneChecking, setStandaloneChecking] = useState(!embedded)
  const [standaloneAuthed, setStandaloneAuthed] = useState(embedded)

  const cleanInitial = sanitizeThreadId(initialThreadId)
  const cleanStore = sanitizeThreadId(state?.chatActiveFriendId)
  const activeThreadRef = useRef<string | null>(cleanInitial || cleanStore || null)
  const resolvedUserId = currentUserId || currentUser?.id || state.auth?.activeAccountId || 'local-user'

  // Auth gate for standalone /chats and /chats/[id] routes so reloads preserve session
  useEffect(() => {
    if (embedded) return
    let active = true
    ;(async () => {
      const synced = await syncSupabaseAuthNow()
      const session = synced ? { authenticated: true } : await resolveBrowserSession()
      if (!active) return
      if (!session.authenticated) {
        window.location.replace('/ru')
        return
      }
      setStandaloneAuthed(true)
      setStandaloneChecking(false)
    })()
    return () => {
      active = false
    }
  }, [embedded])

  // Load real Supabase chat threads & subscribe globally only on standalone /chats routes (AppShell already handles embedded /app)
  useEffect(() => {
    if (!standaloneAuthed && !embedded) return
    const uid = resolvedUserId
    if (!uid || uid === 'local-user' || uid.startsWith('anon-') || uid.startsWith('acct-guest')) return
    void loadChatThreadsFromCloud?.(uid)

    if (embedded) return

    const unsubscribe = subscribeToDirectMessages(
      (incoming) => {
        const isGroupMsg =
          typeof incoming.thread_key === 'string' && incoming.thread_key.startsWith('group')
        if (incoming.author_id === uid || incoming.recipient_id === uid || isGroupMsg) {
          receiveIncomingChatMessage(incoming)
        }
      },
      (updated) => {
        const isGroupMsg =
          typeof updated.thread_key === 'string' && updated.thread_key.startsWith('group')
        if (updated.author_id === uid || updated.recipient_id === uid || isGroupMsg) {
          updateIncomingChatMessage(updated)
        }
      },
      (oldRecord) => {
        if (oldRecord?.id) {
          removeDeletedChatMessage(oldRecord.id)
        }
      }
    )

    let groupSyncTimer: ReturnType<typeof setTimeout> | null = null
    const triggerGroupSync = () => {
      if (groupSyncTimer) clearTimeout(groupSyncTimer)
      groupSyncTimer = setTimeout(() => {
        void loadChatThreadsFromCloud?.(uid)
      }, 180)
    }
    const unsubGroups = subscribeToUserGroups(triggerGroupSync)
    const unsubBroadcasts = subscribeToOfficialBroadcasts(
      (broadcast) => {
        const viewingPriday = activeThreadRef.current === 'priday-official'
        const isAuthorSelf = Boolean(uid && broadcast.author_id && broadcast.author_id === uid)
        receiveOfficialBroadcast(broadcast, { markRead: viewingPriday || isAuthorSelf })
        if (viewingPriday && !isAuthorSelf) {
          markPridaySystemMessagesReadDb(uid).catch(() => {})
        }
      },
      (oldRow) => {
        if (oldRow?.id) {
          removeOfficialBroadcast(oldRow.id)
        }
      }
    )
    const onSyncEvent = () => triggerGroupSync()
    if (typeof window !== 'undefined') {
      window.addEventListener('ogonek:sync-chat-threads', onSyncEvent)
    }

    return () => {
      unsubscribe()
      unsubGroups()
      unsubBroadcasts()
      if (groupSyncTimer) clearTimeout(groupSyncTimer)
      if (typeof window !== 'undefined') {
        window.removeEventListener('ogonek:sync-chat-threads', onSyncEvent)
      }
    }
  }, [
    embedded,
    standaloneAuthed,
    resolvedUserId,
    loadChatThreadsFromCloud,
    receiveIncomingChatMessage,
    receiveOfficialBroadcast,
    removeOfficialBroadcast,
    updateIncomingChatMessage,
    removeDeletedChatMessage,
  ])

  // Track active thread id
  const [activeThreadId, setActiveId] = useState<string | null>(
    cleanInitial || cleanStore || null
  )
  activeThreadRef.current = activeThreadId

  // Keep activeThreadId valid if store deletes the active thread
  useEffect(() => {
    if (cleanStore !== activeThreadId && cleanStore !== null) {
      setActiveId(cleanStore)
    }
  }, [cleanStore, activeThreadId])

  // On desktop (>= 1024px) auto-select first available dialog when none is selected
  useEffect(() => {
    if (!cleanInitial && !cleanStore && typeof window !== 'undefined' && window.innerWidth >= 1024) {
      const defaultId = Object.keys(state.chatThreads || {})[0] || null
      if (defaultId) {
        setActiveId((curr) => (curr && state.chatThreads?.[curr] ? curr : defaultId))
      }
    }
  }, [cleanInitial, cleanStore, state.chatThreads])

  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const [newChatInitialMode, setNewChatInitialMode] = useState<'direct' | 'group'>('direct')
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [toastSeq, setToastSeq] = useState(0)

  useEffect(() => {
    const onOpenGroup = () => {
      setNewChatInitialMode('group')
      setIsNewChatOpen(true)
    }
    window.addEventListener('ogonek:open-group-creator', onOpenGroup)
    return () => window.removeEventListener('ogonek:open-group-creator', onOpenGroup)
  }, [])

  const notify = useCallback((message: string) => {
    setToastMsg(message)
    setToastSeq((n) => n + 1)
  }, [])

  useEffect(() => {
    if (initialThreadId) {
      setActiveId(initialThreadId)
      setActiveChatFriend(initialThreadId)
    }
  }, [initialThreadId, setActiveChatFriend])

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return
      const path = window.location.pathname
      const match = path.match(/^\/chats\/([^/?#]+)/)
      if (match && match[1]) {
        const decoded = decodeURIComponent(match[1])
        setActiveId(decoded)
        setActiveChatFriend(decoded)
        return
      }
      if (path === '/chats') {
        setActiveId(null)
        setActiveChatFriend(null)
        return
      }
      const params = new URLSearchParams(window.location.search)
      const chatParam = sanitizeThreadId(params.get('chat') || params.get('thread'))
      setActiveId(chatParam)
      setActiveChatFriend(chatParam)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [setActiveChatFriend])

  // Select a thread
  const handleSelectThread = useCallback(
    (threadId: string) => {
      setActiveId(threadId)
      setActiveChatFriend(threadId)
      if (typeof window !== 'undefined') {
        if (embedded) {
          window.history.pushState(null, '', `/app?view=messages&chat=${encodeURIComponent(threadId)}`)
        } else {
          window.history.pushState(null, '', `/chats/${encodeURIComponent(threadId)}`)
        }
      }
    },
    [embedded, setActiveChatFriend]
  )

  // Back to dialog list
  const handleBackToList = useCallback(() => {
    setActiveId(null)
    setActiveChatFriend(null)
    if (typeof window !== 'undefined') {
      if (embedded) {
        window.history.pushState(null, '', '/app?view=messages')
      } else {
        window.history.pushState(null, '', '/chats')
      }
    }
  }, [embedded, setActiveChatFriend])

  // Navigate home or other app view (always inside /app)
  const navigateToView = useCallback(
    (v: ViewId) => {
      if (onNavigate) {
        onNavigate(v)
        return
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: v }))
      }
      router.push(v === 'home' ? '/app' : `/app?view=${v}`)
    },
    [onNavigate, router]
  )

  const handleNavigateHome = useCallback(() => {
    navigateToView('home')
  }, [navigateToView])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isNewChatOpen) {
          setIsNewChatOpen(false)
          return
        }
        if (activeThreadId && typeof window !== 'undefined' && window.innerWidth < 1024) {
          handleBackToList()
          return
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isNewChatOpen, activeThreadId, handleBackToList])

  if (!embedded && (standaloneChecking || !standaloneAuthed)) {
    return (
      <div className="w-full min-h-screen bg-black flex items-center justify-center select-none">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-[#ff6b35] animate-spin" />
      </div>
    )
  }

  const rootClass = embedded
    ? 'w-full h-full overflow-hidden bg-[var(--bg)] text-[var(--text)] flex flex-row select-text'
    : 'fixed inset-0 w-[100vw] h-[100dvh] overflow-hidden bg-[var(--bg)] text-[var(--text)] flex flex-row select-text z-40'

  const messengerBody = (
    <div
      className={rootClass}
      style={{
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      }}
    >
      {/* DESKTOP (>= 1024px) */}
      <div className="hidden lg:flex w-full h-full flex-row min-w-0">
        {!embedded && (
          <Sidebar
            view="messages"
            onNavigate={navigateToView}
            onFocusIntentions={() => {
              if (onFocusIntentions) {
                onFocusIntentions()
              } else {
                navigateToView('intentions')
              }
            }}
            onCompose={() => {
              if (onCompose) {
                onCompose()
              } else if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('ogonek:compose'))
              }
            }}
            onOpenProfile={() => {
              if (onOpenProfile) {
                onOpenProfile()
              } else {
                navigateToView('profile')
              }
            }}
            onOpenAuth={onOpenAuth || (() => {})}
            onNotify={notify}
            streak={CURRENT_DAY}
            isCollapsed={true}
          />
        )}

        {/* Column 2: Dialog List */}
        <aside className="w-[340px] xl:w-[380px] shrink-0 h-full border-r border-[var(--border)] overflow-hidden flex flex-col min-w-0">
          <MessengerDialogList
            activeThreadId={activeThreadId || null}
            onSelectThread={handleSelectThread}
            onNewChat={() => setIsNewChatOpen(true)}
            onNotify={notify}
            soundEnabled={state?.soundEnabled ?? true}
            className="w-full h-full"
          />
        </aside>

        {/* Column 3: Chat Stream & Composer */}
        <main className="flex-1 h-full min-w-0 bg-[var(--bg)]">
          <MessengerChatPane
            key={activeThreadId || 'none'}
            friendId={activeThreadId || null}
            currentUserId={resolvedUserId}
            onBack={undefined}
            onNotify={notify}
            soundEnabled={state?.soundEnabled ?? true}
          />
        </main>
      </div>

      {/* TABLET & MOBILE (< 1024px): Master-Detail */}
      <div className="flex lg:hidden w-full h-full flex-col relative overflow-hidden">
        {!activeThreadId ? (
          <div className="w-full h-full flex flex-col relative min-w-0">
            <div className="flex-1 min-h-0 overflow-hidden">
              <MessengerDialogList
                activeThreadId={null}
                onSelectThread={handleSelectThread}
                onNewChat={() => setIsNewChatOpen(true)}
                onNotify={notify}
                soundEnabled={state?.soundEnabled ?? true}
                className="w-full h-full pb-14 md:pb-0"
              />
            </div>
            <div className="md:hidden">
              <BottomNav
                view="messages"
                onNavigate={navigateToView}
                onCompose={() => {
                  if (onCompose) {
                    onCompose()
                  } else if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('ogonek:compose'))
                  }
                }}
              />
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col min-w-0">
            <MessengerChatPane
              key={activeThreadId}
              friendId={activeThreadId}
              currentUserId={resolvedUserId}
              onBack={handleBackToList}
              onNotify={notify}
              soundEnabled={state?.soundEnabled ?? true}
            />
          </div>
        )}
      </div>

      {/* Modal: New Chat / Group Wizard */}
      {isNewChatOpen && (
        <NewChatModal
          initialMode={newChatInitialMode}
          onClose={() => {
            setIsNewChatOpen(false)
            setNewChatInitialMode('direct')
          }}
          onOpenThread={handleSelectThread}
          onNotify={notify}
          soundEnabled={state?.soundEnabled ?? true}
        />
      )}

      {toastMsg && (
        <Toast message={toastMsg} toastKey={toastSeq} onClose={() => setToastMsg(null)} />
      )}
    </div>
  )

  return (
    <MessengerErrorBoundary onNavigateHome={handleNavigateHome}>
      {embedded ? (
        messengerBody
      ) : (
        <TooltipProvider>
          <AppearanceProvider
            theme={state.theme}
            accent={state.accent}
            fontScale={state.fontScale}
            feedDensity={state.feedDensity}
          />
          {messengerBody}
        </TooltipProvider>
      )}
    </MessengerErrorBoundary>
  )
}

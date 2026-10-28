'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, Menu, PenSquare, X } from 'lucide-react'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
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

type Props = {
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
  initialThreadId,
  currentUserId,
  onNavigate,
  onCompose,
  onOpenProfile,
  onOpenAuth,
  onFocusIntentions,
}: Props) {
  const router = useRouter()
  const { state, currentUser, setActiveChatFriend } = useOgonekStore()

  const cleanInitial = sanitizeThreadId(initialThreadId)
  const cleanStore = sanitizeThreadId(state?.chatActiveFriendId)
  const resolvedUserId = currentUserId || currentUser?.id || state.auth?.activeAccountId || 'local-user'

  // Track active thread id
  const [activeThreadId, setActiveId] = useState<string | null>(
    cleanInitial || cleanStore || null
  )

  // На десктопе (>= 1024px) по умолчанию открываем первый диалог, чтобы сразу отображалось окно переписки и поле ввода
  useEffect(() => {
    if (!cleanInitial && !cleanStore && typeof window !== 'undefined' && window.innerWidth >= 1024) {
      const defaultId = Object.keys(state.chatThreads || {})[0] || null
      setActiveId((curr) => curr || defaultId)
    }
  }, [cleanInitial, cleanStore, state.chatThreads])

  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // Notify helper
  const notify = useCallback((message: string) => {
    setToastMsg(message)
    setTimeout(() => {
      setToastMsg((prev) => (prev === message ? null : prev))
    }, 2500)
  }, [])

  // Sync initialThreadId
  useEffect(() => {
    if (initialThreadId) {
      setActiveId(initialThreadId)
      setActiveChatFriend(initialThreadId)
    }
  }, [initialThreadId, setActiveChatFriend])

  // Browser popstate handler
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return
      const path = window.location.pathname
      const match = path.match(/^\/chats\/([^/?#]+)/)
      if (match && match[1]) {
        setActiveId(match[1])
        setActiveChatFriend(match[1])
      } else if (path === '/chats') {
        setActiveId(null)
        setActiveChatFriend(null)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [setActiveChatFriend])

  // Select a thread
  const handleSelectThread = useCallback((threadId: string) => {
    setActiveId(threadId)
    setActiveChatFriend(threadId)
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `/chats/${threadId}`)
    }
  }, [setActiveChatFriend])

  // Back to dialog list
  const handleBackToList = useCallback(() => {
    setActiveId(null)
    setActiveChatFriend(null)
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/chats')
    }
  }, [setActiveChatFriend])

  // Navigate home
  const handleNavigateHome = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'home' }))
    }
    router.push('/')
  }, [router])

  // Keyboard navigation (Escape key returns back or home)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isNewChatOpen) {
          setIsNewChatOpen(false)
          return
        }
        if (activeThreadId) {
          handleBackToList()
          return
        }
        handleNavigateHome()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isNewChatOpen, activeThreadId, handleBackToList, handleNavigateHome])

  return (
    <MessengerErrorBoundary onNavigateHome={handleNavigateHome}>
      <TooltipProvider>
        <AppearanceProvider
          theme={state.theme}
          accent={state.accent}
          fontScale={state.fontScale}
          feedDensity={state.feedDensity}
        />
        <div
          className="fixed inset-0 w-[100vw] h-[100dvh] overflow-hidden bg-[var(--bg)] text-[var(--text)] flex flex-row select-text z-40"
          style={{
            fontFamily: 'var(--font-sans, system-ui, sans-serif)',
          }}
        >
          {/* DESKTOP (>= 1024px): 3 columns via CSS responsive display */}
          <div className="hidden lg:flex w-full h-full flex-row">
            {/* Column 1: Unified Collapsible Sidebar (68px) */}
            <Sidebar
              view="messages"
              onNavigate={(v) => {
                if (onNavigate) {
                  onNavigate(v)
                } else {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: v }))
                  }
                  router.push(v === 'home' ? '/' : `/?view=${v}`)
                }
              }}
              onFocusIntentions={() => {
                if (onFocusIntentions) {
                  onFocusIntentions()
                } else {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'intentions' }))
                  }
                  router.push('/?view=intentions')
                }
              }}
              onCompose={() => {
                if (onCompose) {
                  onCompose()
                } else {
                  window.dispatchEvent(new CustomEvent('ogonek:compose'))
                }
              }}
              onOpenProfile={() => {
                if (onOpenProfile) {
                  onOpenProfile()
                } else {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('ogonek:navigate', { detail: 'profile' }))
                  }
                  router.push('/?view=profile')
                }
              }}
              onOpenAuth={onOpenAuth || (() => {})}
              onNotify={notify}
              streak={CURRENT_DAY}
              className="w-[72px] pl-3 pr-2 shrink-0 border-r border-[var(--line)]"
              isCollapsed={true}
            />

            {/* Column 2: Dialog List (360-420px) */}
            <aside className="w-[360px] lg:w-[380px] xl:w-[420px] shrink-0 h-full border-r border-[var(--border)] overflow-hidden flex flex-col min-w-0">
              <MessengerDialogList
                activeThreadId={activeThreadId || null}
                onSelectThread={handleSelectThread}
                onNewChat={() => setIsNewChatOpen(true)}
                onNavigateHome={handleNavigateHome}
                soundEnabled={state?.soundEnabled ?? true}
                className="w-full h-full"
              />
            </aside>

            {/* Column 3: Chat Stream & Composer (Remaining space) */}
            <main className="flex-1 h-full min-w-0 overflow-hidden bg-[var(--bg)]">
              <MessengerChatPane
                friendId={activeThreadId || null}
                currentUserId={resolvedUserId}
                onBack={handleBackToList}
                onNavigateHome={handleNavigateHome}
                onNotify={notify}
                soundEnabled={state?.soundEnabled ?? true}
              />
            </main>
          </div>

          {/* TABLET & MOBILE (< 1024px): Master-Detail views via CSS responsive display */}
          <div className="flex lg:hidden w-full h-full flex-col relative overflow-hidden">
            {!activeThreadId ? (
              // View 1: Dialog List with single unified Header with Home and New Chat
              <div className="w-full h-full flex flex-col relative min-w-0">
                <MessengerDialogList
                  activeThreadId={null}
                  onSelectThread={handleSelectThread}
                  onNewChat={() => setIsNewChatOpen(true)}
                  onNavigateHome={handleNavigateHome}
                  soundEnabled={state?.soundEnabled ?? true}
                  className="w-full h-full"
                />
              </div>
            ) : (
              // View 2: Chat Pane
              <div className="w-full h-full flex flex-col min-w-0">
                <MessengerChatPane
                  friendId={activeThreadId}
                  currentUserId={resolvedUserId}
                  onBack={handleBackToList}
                  onNavigateHome={handleNavigateHome}
                  onNotify={notify}
                  soundEnabled={state?.soundEnabled ?? true}
                />
              </div>
            )}
          </div>

          {/* Modal: New Chat / Group Wizard */}
          {isNewChatOpen && (
            <NewChatModal
              onClose={() => setIsNewChatOpen(false)}
              onOpenThread={handleSelectThread}
              onNotify={notify}
              soundEnabled={state?.soundEnabled ?? true}
            />
          )}

          {/* Global Toast */}
          {toastMsg && <Toast message={toastMsg} />}
        </div>
      </TooltipProvider>
    </MessengerErrorBoundary>
  )
}

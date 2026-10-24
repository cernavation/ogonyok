'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, Menu, PenSquare, X } from 'lucide-react'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { MessengerIconRail } from './messenger-icon-rail'
import { MessengerDialogList } from './messenger-dialog-list'
import { MessengerChatPane } from './messenger-chat-pane'
import { NewChatModal } from './new-chat-modal'
import { AppearanceProvider } from '../appearance-provider'
import { TooltipProvider } from '../tooltip'
import { Toast } from '../toast'

type Props = {
  initialThreadId?: string
}

export function FullscreenMessenger({ initialThreadId }: Props) {
  const router = useRouter()
  const { state, setActiveChatFriend } = useOgonekStore()

  // Track active thread id
  const [activeThreadId, setActiveId] = useState<string | null>(
    initialThreadId || state.chatActiveFriendId || null
  )

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
          {/* Column 1: Icon Rail (88px) */}
          <MessengerIconRail
            activeSection="chats"
            onNewChat={() => setIsNewChatOpen(true)}
            onOpenProfile={() => router.push('/?view=profile')}
            soundEnabled={state.soundEnabled}
          />

          {/* Column 2: Dialog List (clamp 340-440px) */}
          <aside
            className="flex-shrink-0 h-full border-r border-[var(--border)] overflow-hidden"
            style={{ width: 'clamp(340px, 28vw, 440px)' }}
          >
            <MessengerDialogList
              activeThreadId={activeThreadId}
              onSelectThread={handleSelectThread}
              onNewChat={() => setIsNewChatOpen(true)}
              soundEnabled={state.soundEnabled}
              className="h-full"
            />
          </aside>

          {/* Column 3: Chat Stream & Composer (Remaining space) */}
          <main className="flex-1 h-full min-w-0 overflow-hidden bg-[var(--bg)]">
            <MessengerChatPane
              friendId={activeThreadId}
              onBack={handleBackToList}
              onNavigateHome={handleNavigateHome}
              onNotify={notify}
              soundEnabled={state.soundEnabled}
            />
          </main>
        </div>

        {/* TABLET & MOBILE (< 1024px): Master-Detail views via CSS responsive display */}
        <div className="flex lg:hidden w-full h-full flex-col relative overflow-hidden">
          {!activeThreadId ? (
            // View 1: Dialog List with prominent Header and Back/Home
            <div className="w-full h-full flex flex-col relative">
              <header className="flex-shrink-0 h-14 px-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg)]/90 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleNavigateHome}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text)] hover:bg-[var(--bg-hover)] active:scale-95 transition-all -ml-2"
                    aria-label="На главную"
                    title="На главную"
                  >
                    <Home size={22} className="text-[var(--accent)]" />
                  </button>
                  <h1 className="text-lg font-[800] text-[var(--text)] tracking-tight">Чаты</h1>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewChatOpen(true)}
                    className="h-9 px-3.5 rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    aria-label="Новый чат"
                  >
                    <PenSquare size={15} />
                    <span>Написать</span>
                  </button>
                </div>
              </header>

              <div className="flex-1 overflow-hidden">
                <MessengerDialogList
                  activeThreadId={null}
                  onSelectThread={handleSelectThread}
                  onNewChat={() => setIsNewChatOpen(true)}
                  soundEnabled={state.soundEnabled}
                  className="h-full"
                />
              </div>
            </div>
          ) : (
            // View 2: Chat Pane
            <div className="w-full h-full flex flex-col">
              <MessengerChatPane
                friendId={activeThreadId}
                onBack={handleBackToList}
                onNavigateHome={handleNavigateHome}
                onNotify={notify}
                soundEnabled={state.soundEnabled}
              />
            </div>
          )}
        </div>

        {/* Modal: New Chat / Group Wizard */}
        {isNewChatOpen && (
          <NewChatModal
            onClose={() => setIsNewChatOpen(false)}
            onNotify={notify}
            soundEnabled={state.soundEnabled}
          />
        )}

        {/* Global Toast */}
        {toastMsg && <Toast message={toastMsg} />}
      </div>
    </TooltipProvider>
  )
}

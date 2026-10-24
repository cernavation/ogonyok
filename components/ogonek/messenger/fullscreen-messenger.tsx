'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, X } from 'lucide-react'
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
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  )

  // Notify helper
  const notify = useCallback((message: string) => {
    setToastMsg(message)
    setTimeout(() => {
      setToastMsg((prev) => (prev === message ? null : prev))
    }, 2500)
  }, [])

  // Sync window width
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isDesktop = windowWidth >= 1024
  const isTablet = windowWidth >= 768 && windowWidth < 1024
  const isMobile = windowWidth < 768

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
  const handleSelectThread = (threadId: string) => {
    setActiveId(threadId)
    setActiveChatFriend(threadId)
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `/chats/${threadId}`)
    }
  }

  // Back to dialog list
  const handleBackToList = () => {
    setActiveId(null)
    setActiveChatFriend(null)
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/chats')
    }
  }

  // Navigate home
  const handleNavigateHome = () => {
    router.push('/')
  }

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
        {/* DESKTOP (>= 1024px): 3 columns */}
        {isDesktop && (
          <>
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
          </>
        )}

        {/* TABLET & MOBILE (< 1024px): Master-Detail views */}
        {!isDesktop && (
          <div className="w-full h-full flex flex-col relative overflow-hidden">
            {!activeThreadId ? (
              // View 1: Dialog List
              <div className="w-full h-full flex flex-col relative">
                {isTablet && (
                  <header className="flex-shrink-0 h-12 px-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg)]">
                    <button
                      type="button"
                      onClick={() => setIsDrawerOpen(true)}
                      className="p-2 -ml-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-elev)]"
                      aria-label="Меню"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Огонёк Чаты
                    </span>
                    <div className="w-5" />
                  </header>
                )}

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

            {/* Tablet Menu Drawer */}
            {isTablet && isDrawerOpen && (
              <div
                className="fixed inset-0 z-50 bg-black/60 flex"
                onClick={() => setIsDrawerOpen(false)}
              >
                <div
                  className="w-72 h-full bg-[var(--bg)] border-r border-[var(--border)] p-4 flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
                    <span className="font-bold text-lg">Навигация</span>
                    <button
                      type="button"
                      onClick={() => setIsDrawerOpen(false)}
                      className="p-2 rounded-full hover:bg-[var(--bg-elev)]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <nav className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDrawerOpen(false)
                        router.push('/')
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--bg-elev)] text-left font-semibold"
                    >
                      🏠 Главная
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDrawerOpen(false)
                        router.push('/?view=explore')
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--bg-elev)] text-left font-semibold"
                    >
                      🔍 Поиск
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDrawerOpen(false)
                        router.push('/?view=profile')
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--bg-elev)] text-left font-semibold"
                    >
                      👤 Профиль
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDrawerOpen(false)
                        router.push('/?view=vault')
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--bg-elev)] text-left font-semibold"
                    >
                      ⚡ Evidence Vault
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDrawerOpen(false)
                        router.push('/?view=analytics')
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--bg-elev)] text-left font-semibold"
                    >
                      📊 Статистика
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDrawerOpen(false)
                        router.push('/?view=leaderboard')
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--bg-elev)] text-left font-semibold"
                    >
                      🏆 Рейтинг
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDrawerOpen(false)
                        router.push('/?view=settings')
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--bg-elev)] text-left font-semibold"
                    >
                      ⚙️ Настройки
                    </button>
                  </nav>
                </div>
              </div>
            )}
          </div>
        )}

        {/* New Chat Modal */}
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

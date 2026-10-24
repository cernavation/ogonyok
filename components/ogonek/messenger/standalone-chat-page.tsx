'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { ChatWindow } from './chat-window'
import { Toast } from '../toast'
import { TooltipProvider } from '../tooltip'
import { AppearanceProvider } from '../appearance-provider'

export function StandaloneChatPage({ friendId }: { friendId: string }) {
  const router = useRouter()
  const { state, setActiveChatFriend } = useOgonekStore()
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  useEffect(() => {
    setActiveChatFriend(friendId)
  }, [friendId, setActiveChatFriend])

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back()
    } else {
      router.push('/?view=messages')
    }
  }

  const showNotify = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }

  return (
    <TooltipProvider>
      <AppearanceProvider
        theme={state.theme}
        accent={state.accent}
        fontScale={state.fontScale}
        feedDensity={state.feedDensity}
      />
      <div className="w-full h-[100dvh] flex flex-col items-center justify-center bg-[var(--bg)] select-none">
        <div className="w-full max-w-[720px] h-full flex flex-col bg-[var(--bg)] sm:border-x sm:border-[var(--border)] shadow-2xl relative select-text">
          <ChatWindow
            friendId={friendId}
            onNotify={showNotify}
            onBack={handleBack}
            soundEnabled={state.soundEnabled}
          />
        </div>
        {toastMsg && <Toast message={toastMsg} />}
      </div>
    </TooltipProvider>
  )
}

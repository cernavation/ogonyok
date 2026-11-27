'use client'

import React, { useEffect, useState } from 'react'
import { LandingPage } from './landing-page'
import type { Locale } from '@/src/content/i18n'
import { resolveBrowserSession } from '@/lib/ogonek/client-session'
import { syncSupabaseAuthNow } from '@/lib/ogonek/use-ogonek-store'

interface LocaleLandingViewProps {
  locale: Locale
}

export function LocaleLandingView({ locale }: LocaleLandingViewProps) {
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true
    // Если пользователь запросил лендинг явно через query (?landing=1) — не редиректим
    const isExplicitLanding =
      window.location.search.includes('landing=1') ||
      window.location.search.includes('view=landing')

    if (isExplicitLanding) {
      setChecking(false)
      return
    }

    ;(async () => {
      const synced = await syncSupabaseAuthNow()
      const session = synced ? { authenticated: true } : await resolveBrowserSession()
      if (!active) return

      if (session.authenticated) {
        const search = window.location.search || ''
        const target = search.includes('view=') ? `/app${search}` : '/app'
        window.location.replace(target)
        return
      }

      setChecking(false)
    })()

    return () => {
      active = false
    }
  }, [])

  if (checking) {
    return (
      <div className="w-full min-h-screen bg-black flex items-center justify-center select-none">
        <div className="w-6 h-6 rounded-full border-2 border-white/15 border-t-[#ff6b35] animate-spin" />
      </div>
    )
  }

  return (
    <LandingPage
      locale={locale}
      onAuthenticated={() => {
        window.location.href = '/app'
      }}
    />
  )
}

'use client'

import React, { useEffect, useState } from 'react'
import { LandingPage } from './landing-page'
import type { Locale } from '@/src/content/i18n'

interface LocaleLandingViewProps {
  locale: Locale
}

export function LocaleLandingView({ locale }: LocaleLandingViewProps) {
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Если пользователь запросил лендинг явно через query (?landing=1) — не редиректим
    const isExplicitLanding =
      window.location.search.includes('landing=1') ||
      window.location.search.includes('view=landing')

    if (!isExplicitLanding) {
      try {
        const raw = localStorage.getItem('ogonek.store.v1')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed?.auth?.signedIn && parsed?.auth?.activeAccountId) {
            window.location.replace('/app')
            return
          }
        }
      } catch {}
    }

    setChecking(false)
  }, [])

  if (checking) {
    // Минималистичный пустой экран на 50мс пока синхронно читается localStorage
    return <div className="w-full min-h-screen bg-black" />
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

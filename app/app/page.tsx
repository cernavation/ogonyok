'use client'

import React, { useEffect, useState } from 'react'
import { AppShell } from '@/components/ogonek/app-shell'

export default function AppPage() {
  const [checking, setChecking] = useState(true)
  const [hasAuth, setHasAuth] = useState(false)

  useEffect(() => {
    let authed = false
    try {
      const raw = localStorage.getItem('ogonek.store.v1')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.auth?.signedIn && parsed?.auth?.activeAccountId) {
          authed = true
        }
      }
      if (!authed) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.startsWith('sb-') && key.endsWith('-auth-token'))) {
            const val = localStorage.getItem(key)
            if (val && val !== 'null') authed = true
          }
        }
      }
    } catch {}

    if (!authed) {
      // Неавторизованного пользователя со страницы /app переводим на лендинг /ru
      window.location.replace('/ru')
      return
    }

    setHasAuth(true)
    setChecking(false)
  }, [])

  if (checking || !hasAuth) {
    return (
      <div className="w-full min-h-screen bg-black flex items-center justify-center select-none">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-[#ff6b35] animate-spin" />
      </div>
    )
  }

  return <AppShell initialView="home" />
}

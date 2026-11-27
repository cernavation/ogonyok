'use client'

import React, { useEffect, useState } from 'react'
import { AppShell } from '@/components/ogonek/app-shell'
import { resolveBrowserSession } from '@/lib/ogonek/client-session'
import { syncSupabaseAuthNow } from '@/lib/ogonek/use-ogonek-store'

export default function AppPage() {
  const [checking, setChecking] = useState(true)
  const [hasAuth, setHasAuth] = useState(false)

  useEffect(() => {
    let active = true

    ;(async () => {
      const synced = await syncSupabaseAuthNow()
      const session = synced ? { authenticated: true } : await resolveBrowserSession()
      if (!active) return

      if (!session.authenticated) {
        // Неавторизованного пользователя со страницы /app переводим на лендинг /ru
        window.location.replace('/ru')
        return
      }

      setHasAuth(true)
      setChecking(false)
    })()

    return () => {
      active = false
    }
  }, [])

  if (checking || !hasAuth) {
    return (
      <div className="w-full min-h-screen bg-black flex items-center justify-center select-none">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-[#d76737] animate-spin" />
      </div>
    )
  }

  return <AppShell initialView="home" />
}

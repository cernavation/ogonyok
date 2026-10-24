'use client'

import React, { useState, useEffect } from 'react'
import { WifiOff, X } from 'lucide-react'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateStatus = () => {
      const offline = !navigator.onLine
      setIsOffline(offline)
      if (!offline) {
        setDismissed(false)
      }
    }

    updateStatus()
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)

    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
    }
  }, [])

  if (!isOffline || dismissed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[calc(100%-2rem)] px-4 py-2.5 rounded-2xl bg-[var(--bg-elev)]/95 border border-[var(--border)] backdrop-blur-md shadow-xl flex items-center justify-between gap-3 text-xs text-[var(--text)] transition-all animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
          <WifiOff size={14} />
        </div>
        <span className="truncate">
          Офлайн-режим: изменения сохранятся локально и синхронизируются при появлении связи
        </span>
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--text)] transition-colors shrink-0"
        aria-label="Закрыть уведомление об офлайн-режиме"
      >
        <X size={14} />
      </button>
    </div>
  )
}

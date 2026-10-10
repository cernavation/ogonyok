'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      // Register after page load for optimal TTI
      const handleLoad = () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
          // Ignore registration failures in development or unsupported contexts
        })
      }

      if (document.readyState === 'complete') {
        handleLoad()
      } else {
        window.addEventListener('load', handleLoad)
        return () => window.removeEventListener('load', handleLoad)
      }
    }
  }, [])

  return null
}

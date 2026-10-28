'use client'

import { useEffect } from 'react'

let activeLockCount = 0
let originalOverflow = ''

export function lockBodyScroll() {
  if (typeof document === 'undefined') return
  if (activeLockCount === 0) {
    originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  activeLockCount++
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return
  activeLockCount = Math.max(0, activeLockCount - 1)
  if (activeLockCount === 0) {
    document.body.style.overflow = originalOverflow || ''
  }
}

export function useBodyScrollLock(locked: boolean = true) {
  useEffect(() => {
    if (!locked) return
    lockBodyScroll()
    return () => {
      unlockBodyScroll()
    }
  }, [locked])
}

'use client'

import { useEffect } from 'react'

let activeLockCount = 0
let originalBodyOverflow = ''
let originalDocOverflow = ''

export function lockBodyScroll() {
  if (typeof document === 'undefined') return
  if (activeLockCount === 0) {
    originalBodyOverflow = document.body.style.overflow
    originalDocOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
  }
  activeLockCount++
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return
  activeLockCount = Math.max(0, activeLockCount - 1)
  if (activeLockCount === 0) {
    document.documentElement.style.overflow = originalDocOverflow || ''
    document.body.style.overflow = originalBodyOverflow || ''
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


'use client'

import { useEffect } from 'react'

let activeLockCount = 0
let originalBodyOverflow = ''
let originalDocOverflow = ''
let originalBodyPosition = ''
let originalBodyTop = ''
let originalBodyWidth = ''
let savedScrollY = 0

export function lockBodyScroll() {
  if (typeof document === 'undefined') return
  if (activeLockCount === 0) {
    savedScrollY = window.scrollY || window.pageYOffset || 0
    originalBodyOverflow = document.body.style.overflow
    originalDocOverflow = document.documentElement.style.overflow
    originalBodyPosition = document.body.style.position
    originalBodyTop = document.body.style.top
    originalBodyWidth = document.body.style.width

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${savedScrollY}px`
    document.body.style.width = '100%'
  }
  activeLockCount++
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return
  activeLockCount = Math.max(0, activeLockCount - 1)
  if (activeLockCount === 0) {
    document.documentElement.style.overflow = originalDocOverflow || ''
    document.body.style.overflow = originalBodyOverflow || ''
    document.body.style.position = originalBodyPosition || ''
    document.body.style.top = originalBodyTop || ''
    document.body.style.width = originalBodyWidth || ''
    window.scrollTo(0, savedScrollY)
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

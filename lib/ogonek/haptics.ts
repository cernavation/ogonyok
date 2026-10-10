'use client'

export type HapticType = 'light' | 'medium' | 'success' | 'warning'

export function triggerHaptic(type: HapticType = 'light'): void {
  if (typeof window === 'undefined' || !navigator.vibrate) return

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(10)
        break
      case 'medium':
        navigator.vibrate(20)
        break
      case 'success':
        navigator.vibrate([15, 30, 20])
        break
      case 'warning':
        navigator.vibrate([25, 40, 25])
        break
    }
  } catch {
    // Ignore environments where vibrate is restricted or disabled
  }
}

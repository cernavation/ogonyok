'use client'

import { triggerHaptic } from './haptics'

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null

  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext

    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {
      // AudioContext resume failed or blocked by autoplay policy
    })
  }

  return audioCtx
}

/**
 * Проверка тумблера «Звуковые эффекты» из настроек.
 * Если передан явный флаг — используем его.
 * Иначе читаем актуальное состояние из localStorage (ogonek.v2).
 */
export function isSoundEnabled(override?: boolean): boolean {
  if (typeof override === 'boolean') {
    return override
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('ogonek.v2')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (typeof parsed?.soundEnabled === 'boolean') {
          return parsed.soundEnabled
        }
      }
    } catch {
      // Игнорируем ошибки парсинга
    }
  }

  return true
}

/**
 * Еле слышный, благородный ультра-короткий щелчок
 * Длительность ~15ms, 1200Hz с мягким экспоненциальным спадом.
 * При выключенном звуке — абсолютная тишина.
 */
export function playClick(soundEnabled?: boolean): void {
  if (!isSoundEnabled(soundEnabled)) return

  triggerHaptic('light')

  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    const now = ctx.currentTime

    osc.type = 'sine'
    osc.frequency.setValueAtTime(1200, now)
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.015)

    gain.gain.setValueAtTime(0.04, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.016)
  } catch {
    // Graceful fallback if Web Audio is unsupported or blocked
  }
}

/**
 * Приятный, глубокий двухтоновый звук триумфа при публикации дня в Composer.
 * Перелив тонов D5 (587.33Hz) -> A5 (880Hz) с бархатным затуханием.
 * При выключенном звуке — абсолютная тишина.
 */
export function playSuccess(soundEnabled?: boolean): void {
  if (!isSoundEnabled(soundEnabled)) return

  triggerHaptic('success')

  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // First tone (587.33 Hz - D5)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()

    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(587.33, now)

    gain1.gain.setValueAtTime(0.08, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

    osc1.connect(gain1)
    gain1.connect(ctx.destination)

    osc1.start(now)
    osc1.stop(now + 0.19)

    // Second tone (880 Hz - A5) slightly offset
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()

    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880, now + 0.06)

    gain2.gain.setValueAtTime(0.001, now)
    gain2.gain.setValueAtTime(0.1, now + 0.06)
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.32)

    osc2.connect(gain2)
    gain2.connect(ctx.destination)

    osc2.start(now + 0.06)
    osc2.stop(now + 0.33)
  } catch {
    // Graceful fallback
  }
}

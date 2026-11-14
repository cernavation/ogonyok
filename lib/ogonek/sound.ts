'use client'

import { triggerHaptic } from './haptics.ts'

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
 * Проверка уровня громкости звуковых эффектов (0.0 .. 1.0).
 */
export function getSoundVolume(override?: number): number {
  if (typeof override === 'number' && Number.isFinite(override)) {
    return Math.max(0, Math.min(1, override))
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('ogonek.v2')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (typeof parsed?.soundVolume === 'number' && Number.isFinite(parsed.soundVolume)) {
          return Math.max(0, Math.min(1, parsed.soundVolume))
        }
      }
    } catch {
      // Игнорируем ошибки парсинга
    }
  }

  return 0.8
}

function notifySoundPlayed(soundName: string, detail: Record<string, any> = {}): void {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('ogonek:sound-played', {
          detail: { sound: soundName, timestamp: Date.now(), ...detail },
        })
      )
    } catch {
      // Игнорируем в окружениях без CustomEvent
    }
  }
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

/**
 * Мягкий звук нового личного сообщения в чате (Web Audio).
 * Играет только если чат не открыт или вкладка не в фокусе.
 * Деликатный бархатный всплеск 780Hz -> 1040Hz с мягким спадом.
 */
export function playChatMessageSound(volume?: number, soundEnabled?: boolean): void {
  if (!isSoundEnabled(soundEnabled)) return

  notifySoundPlayed('chat-message')
  triggerHaptic('light')

  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const vol = getSoundVolume(volume)
    if (vol <= 0.001) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(780, now)
    osc.frequency.exponentialRampToValueAtTime(1040, now + 0.06)

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.linearRampToValueAtTime(0.12 * vol, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.17)
  } catch {
    // Autoplay or Web Audio error suppressed
  }
}

/**
 * Звук входящей заявки в друзья (Web Audio).
 * Радостный мажорный перелив E5 (659Hz) -> G#5 (830Hz) -> B5 (987Hz).
 */
export function playFriendRequestSound(volume?: number, soundEnabled?: boolean): void {
  if (!isSoundEnabled(soundEnabled)) return

  notifySoundPlayed('friend-request')
  triggerHaptic('success')

  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const vol = getSoundVolume(volume)
    if (vol <= 0.001) return

    const now = ctx.currentTime
    const notes = [659.25, 830.61, 987.77] // E5, G#5, B5

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const noteStart = now + idx * 0.07

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, noteStart)

      gain.gain.setValueAtTime(0.001, noteStart)
      gain.gain.linearRampToValueAtTime(0.08 * vol, noteStart + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.22)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(noteStart)
      osc.stop(noteStart + 0.23)
    })
  } catch {
    // Autoplay or Web Audio error suppressed
  }
}

/**
 * Звук пропущенного звонка (Web Audio).
 * Мягкий нисходящий аккорд-напоминание A5 (880Hz) -> F5 (698Hz) -> D5 (587Hz).
 */
export function playMissedCallSound(volume?: number, soundEnabled?: boolean): void {
  if (!isSoundEnabled(soundEnabled)) return

  notifySoundPlayed('missed-call')
  triggerHaptic('medium')

  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const vol = getSoundVolume(volume)
    if (vol <= 0.001) return

    const now = ctx.currentTime
    const notes = [880, 698.46, 587.33] // A5, F5, D5

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const noteStart = now + idx * 0.09

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, noteStart)

      gain.gain.setValueAtTime(0.001, noteStart)
      gain.gain.linearRampToValueAtTime(0.09 * vol, noteStart + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.25)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(noteStart)
      osc.stop(noteStart + 0.26)
    })
  } catch {
    // Autoplay or Web Audio error suppressed
  }
}

/**
 * Звук триумфа и достижения вехи (Web Audio).
 * Праздничный восходящий аккорд победы C5 -> E5 -> G5 -> C6.
 */
export function playMilestoneSound(volume?: number, soundEnabled?: boolean): void {
  if (!isSoundEnabled(soundEnabled)) return

  notifySoundPlayed('milestone')
  triggerHaptic('success')

  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const vol = getSoundVolume(volume)
    if (vol <= 0.001) return

    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const noteStart = now + idx * 0.06

      osc.type = idx === 3 ? 'sine' : 'triangle'
      osc.frequency.setValueAtTime(freq, noteStart)

      gain.gain.setValueAtTime(0.001, noteStart)
      gain.gain.linearRampToValueAtTime(0.1 * vol, noteStart + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.35)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(noteStart)
      osc.stop(noteStart + 0.36)
    })
  } catch {
    // Autoplay or Web Audio error suppressed
  }
}

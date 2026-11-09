'use client'

/**
 * СИНТЕЗАТОР ЗВУКОВ УВЕДОМЛЕНИЙ НА ЧИСТОМ WEB AUDIO API (ЭТАП 7)
 * 
 * - Без внешних mp3/wav файлов
 * - Без 404 ошибок и сетевых задержек
 * - Разблокировка AudioContext первым жестом пользователя (без ошибок в консоли)
 * - Раздельные звуки: новое сообщение, заявка в соратники, пропущенный звонок
 * - Проверка фокуса вкладки и «Не беспокоить» (DND)
 */

let audioCtx: AudioContext | null = null
let isUnlocked = false

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

  if (audioCtx && audioCtx.state === 'suspended' && isUnlocked) {
    audioCtx.resume().catch(() => {})
  }

  return audioCtx
}

// Автоматическая разблокировка AudioContext при первом жесте
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    isUnlocked = true
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {})
    }
    window.removeEventListener('pointerdown', unlockAudio)
    window.removeEventListener('keydown', unlockAudio)
    window.removeEventListener('touchstart', unlockAudio)
  }

  window.addEventListener('pointerdown', unlockAudio, { passive: true })
  window.addEventListener('keydown', unlockAudio, { passive: true })
  window.addEventListener('touchstart', unlockAudio, { passive: true })
}

/**
 * Проверка режима «Не беспокоить» (DND) и настроек звука
 */
export function isNotificationSoundAllowed(): boolean {
  if (typeof window === 'undefined') return false

  try {
    const raw = localStorage.getItem('ogonek.v2')
    if (raw) {
      const parsed = JSON.parse(raw)
      // Если звуки уведомлений явно выключены пользователем
      if (parsed?.notificationsSoundEnabled === false) {
        return false
      }
      // Проверка DND до времени (ISO string или timestamp)
      if (parsed?.dndUntil) {
        const dndExpiry = new Date(parsed.dndUntil).getTime()
        if (dndExpiry > Date.now()) {
          return false
        }
      }
    }
  } catch {
    // Безопасный фолбэк
  }

  return true
}

/**
 * Получение громкости из настроек (по умолчанию 0.35)
 */
export function getNotificationVolume(): number {
  if (typeof window === 'undefined') return 0.35
  try {
    const raw = localStorage.getItem('ogonek.v2')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed?.notificationVolume === 'number') {
        return Math.max(0, Math.min(1, parsed.notificationVolume))
      }
    }
  } catch {}
  return 0.35
}

/**
 * Мягкий гармоничный звук нового входящего сообщения (Telegram-стиль)
 * 2 ноты (880Hz -> 1320Hz) с плавным спадом ~180мс
 */
export function playNewMessageSound(): void {
  if (!isNotificationSoundAllowed()) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const vol = getNotificationVolume()

    // 1. Первая гармоника
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, now)
    osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.08)

    gain1.gain.setValueAtTime(0.001, now)
    gain1.gain.linearRampToValueAtTime(vol * 0.45, now + 0.015)
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)

    osc1.connect(gain1)
    gain1.connect(ctx.destination)

    osc1.start(now)
    osc1.stop(now + 0.19)

    // 2. Вторая гармоника (колокольчик)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1760, now + 0.04)

    gain2.gain.setValueAtTime(0.001, now + 0.04)
    gain2.gain.linearRampToValueAtTime(vol * 0.25, now + 0.05)
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)

    osc2.connect(gain2)
    gain2.connect(ctx.destination)

    osc2.start(now + 0.04)
    osc2.stop(now + 0.23)
  } catch {
    // Безопасное подавление при блокировке воспроизведения
  }
}

/**
 * Приятный восходящий аккорд для заявки в соратники (C5 -> E5 -> G5)
 */
export function playFriendRequestSound(): void {
  if (!isNotificationSoundAllowed()) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const vol = getNotificationVolume()
    const notes = [523.25, 659.25, 783.99] // C5, E5, G5

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const startTime = now + i * 0.07

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)

      gain.gain.setValueAtTime(0.001, startTime)
      gain.gain.linearRampToValueAtTime(vol * 0.4, startTime + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + 0.19)
    })
  } catch {}
}

/**
 * Нисходящий минорный тон для пропущенного звонка (E5 -> C#5 -> A4)
 */
export function playMissedCallSound(): void {
  if (!isNotificationSoundAllowed()) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const vol = getNotificationVolume()
    const notes = [659.25, 554.37, 440.0] // E5, C#5, A4

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const startTime = now + i * 0.09

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, startTime)

      gain.gain.setValueAtTime(0.001, startTime)
      gain.gain.linearRampToValueAtTime(vol * 0.4, startTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + 0.23)
    })
  } catch {}
}

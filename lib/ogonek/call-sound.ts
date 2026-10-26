'use client'

/**
 * Синтезатор звуков звонков на чистом Web Audio API
 * Работает без внешних mp3/wav файлов, без 404 ошибок, на любых устройствах.
 */

let audioCtx: AudioContext | null = null

// Активные таймеры и интервалы для мгновенной остановки
const activeTimeouts: ReturnType<typeof setTimeout>[] = []
const activeIntervals: ReturnType<typeof setInterval>[] = []
const activeOscillators: { osc: OscillatorNode; gain: GainNode }[] = []

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
    audioCtx.resume().catch(() => {})
  }

  return audioCtx
}

/**
 * Мгновенная остановка всех звуков звонка и очистка таймеров
 */
export function stopCallSounds(): void {
  // Очищаем все таймауты
  while (activeTimeouts.length > 0) {
    const tid = activeTimeouts.pop()
    if (tid) clearTimeout(tid)
  }

  // Очищаем все интервалы
  while (activeIntervals.length > 0) {
    const iid = activeIntervals.pop()
    if (iid) clearInterval(iid)
  }

  // Плавный и быстрый сброс всех активных генераторов звука
  if (audioCtx && activeOscillators.length > 0) {
    const now = audioCtx.currentTime
    while (activeOscillators.length > 0) {
      const item = activeOscillators.pop()
      if (item) {
        try {
          item.gain.gain.cancelScheduledValues(now)
          item.gain.gain.setValueAtTime(item.gain.gain.value, now)
          item.gain.gain.linearRampToValueAtTime(0.0001, now + 0.02)
          item.osc.stop(now + 0.025)
        } catch {
          // Игнорируем если уже остановлен
        }
      }
    }
  }
}

/**
 * Проигрывает единичный тон заданной частоты и длительности
 */
function playTone(
  freq: number,
  startTime: number,
  duration: number,
  maxGain = 0.08,
  type: OscillatorType = 'sine'
) {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(freq, startTime)

    // Мягкая огибающая ADSR (Attack -> Decay)
    gain.gain.setValueAtTime(0.0001, startTime)
    gain.gain.exponentialRampToValueAtTime(maxGain, startTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(startTime)
    osc.stop(startTime + duration + 0.01)

    activeOscillators.push({ osc, gain })

    // Удаляем из списка по завершению
    const tid = setTimeout(() => {
      const idx = activeOscillators.findIndex((i) => i.osc === osc)
      if (idx !== -1) activeOscillators.splice(idx, 1)
    }, (duration + 0.05) * 1000)
    activeTimeouts.push(tid)
  } catch {
    // Web Audio fallback
  }
}

/**
 * 1. Гудки исходящего вызова (playOutgoingRing)
 * Мягкие классические двойные гудки (425Hz) с интервалом, циклично повторяющиеся
 */
export function playOutgoingRing(): void {
  try {
    stopCallSounds()

    const ctx = getAudioContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const triggerBeepCycle = () => {
      try {
        if (!ctx) return
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {})
        }
        const now = ctx.currentTime

        // Первый мягкий гудок (425Hz, 0.4 сек)
        playTone(425, now, 0.38, 0.09, 'sine')

        // Второй мягкий гудок через 0.22 сек (425Hz, 0.4 сек)
        playTone(425, now + 0.55, 0.38, 0.09, 'sine')
      } catch {
        // Autoplay or audio context error protection
      }
    }

    // Играем немедленно
    triggerBeepCycle()

    // Повторяем цикл каждые 3.4 секунды
    const intervalId = setInterval(triggerBeepCycle, 3400)
    activeIntervals.push(intervalId)
  } catch {
    // Autoplay or audio policy protection
  }
}

/**
 * 2. Мелодия входящего звонка (playIncomingRingtone)
 * Стильный гармоничный перезвон (marimba/chime 520Hz -> 660Hz -> 780Hz -> 880Hz),
 * циклично играющий, пока трубку не снимут или не сбросят.
 */
export function playIncomingRingtone(): void {
  try {
    stopCallSounds()

    const ctx = getAudioContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    // Последовательность стильного перезвона:
    // C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> A5 (880Hz) + финал C6 (1046Hz)
    const notes = [
      { freq: 520, delay: 0.0, dur: 0.22, gain: 0.12 },
      { freq: 660, delay: 0.18, dur: 0.22, gain: 0.13 },
      { freq: 780, delay: 0.36, dur: 0.24, gain: 0.14 },
      { freq: 880, delay: 0.54, dur: 0.38, gain: 0.15 },
      // Ответная мелодическая фраза
      { freq: 780, delay: 1.0, dur: 0.2, gain: 0.11 },
      { freq: 880, delay: 1.18, dur: 0.22, gain: 0.13 },
      { freq: 1046, delay: 1.36, dur: 0.45, gain: 0.15 },
    ]

    const triggerRingtoneCycle = () => {
      try {
        if (!ctx) return
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {})
        }
        const now = ctx.currentTime

        notes.forEach((n) => {
          playTone(n.freq, now + n.delay, n.dur, n.gain, 'triangle')
        })
      } catch {
        // Autoplay or audio context error protection
      }
    }

    // Играем сразу
    triggerRingtoneCycle()

    // Повторяем гармоничный цикл каждые 2.8 секунды
    const intervalId = setInterval(triggerRingtoneCycle, 2800)
    activeIntervals.push(intervalId)
  } catch {
    // Autoplay or audio policy protection
  }
}

/**
 * 3. Звук отбоя (playEndCallSound)
 * Короткий двухтоновый сигнал завершения вызова (480Hz -> 360Hz)
 */
export function playEndCallSound(): void {
  try {
    stopCallSounds()

    const ctx = getAudioContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime
    playTone(480, now, 0.12, 0.1, 'sine')
    playTone(360, now + 0.14, 0.16, 0.1, 'sine')
  } catch {
    // Autoplay or audio policy protection
  }
}

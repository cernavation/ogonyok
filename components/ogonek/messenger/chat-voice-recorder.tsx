'use client'

import { AlertCircle, Check, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { playClick } from '@/lib/ogonek/sound'
import type { ChatMessageMedia } from '@/lib/ogonek/types'

type Props = {
  onSendVoice: (media: ChatMessageMedia) => void
  onCancel: () => void
  soundEnabled?: boolean
}

export function ChatVoiceRecorder({ onSendVoice, onCancel, soundEnabled = true }: Props) {
  const [seconds, setSeconds] = useState(0)
  const [micBlocked, setMicBlocked] = useState(false)
  const [liveBars, setLiveBars] = useState<number[]>(() => Array.from({ length: 18 }).map(() => 4))

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordedWaveformRef = useRef<number[]>([])
  const sampleTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 1. Инициализация реального микрофона, анализатора звука и MediaRecorder
  useEffect(() => {
    let isCancelled = false

    async function startRecording() {
      try {
        if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
          throw new Error('getUserMedia not supported')
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream

        // Web Audio API анализатор частот для "живой волны"
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtxClass) {
          const audioCtx = new AudioCtxClass()
          audioContextRef.current = audioCtx
          const source = audioCtx.createMediaStreamSource(stream)
          const analyser = audioCtx.createAnalyser()
          analyser.fftSize = 64
          analyser.smoothingTimeConstant = 0.5
          source.connect(analyser)
          analyserRef.current = analyser

          const bufferLength = analyser.frequencyBinCount
          const dataArray = new Uint8Array(bufferLength)

          const updateLiveWaveform = () => {
            if (isCancelled) return
            analyser.getByteFrequencyData(dataArray)

            // Распределяем частоты по 18 полосам визуализатора
            const barsCount = 18
            const step = Math.max(1, Math.floor(bufferLength / barsCount))
            const nextBars: number[] = []

            for (let i = 0; i < barsCount; i++) {
              const val = dataArray[i * step] || 0
              // Нормализуем высоту от 4px до 24px
              const height = Math.max(4, Math.min(24, Math.round((val / 255) * 20) + 4))
              nextBars.push(height)
            }

            setLiveBars(nextBars)
            animFrameRef.current = requestAnimationFrame(updateLiveWaveform)
          }

          animFrameRef.current = requestAnimationFrame(updateLiveWaveform)

          // Периодическое накопление точек амплитуды для финальной формы волны сообщения
          sampleTimerRef.current = setInterval(() => {
            if (analyserRef.current) {
              analyserRef.current.getByteFrequencyData(dataArray)
              let sum = 0
              for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i]
              }
              const avg = sum / bufferLength
              // Масштабируем до диапазона [15..95]
              const sample = Math.max(15, Math.min(95, Math.round((avg / 255) * 80) + 15))
              recordedWaveformRef.current.push(sample)
            }
          }, 120)
        }

        // Выбираем лучший поддерживаемый формат MediaRecorder
        let mimeType = 'audio/webm;codecs=opus'
        if (typeof MediaRecorder !== 'undefined') {
          if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            if (MediaRecorder.isTypeSupported('audio/webm')) {
              mimeType = 'audio/webm'
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
              mimeType = 'audio/mp4'
            } else {
              mimeType = ''
            }
          }
        }

        const options = mimeType ? { mimeType } : undefined
        const recorder = new MediaRecorder(stream, options)
        mediaRecorderRef.current = recorder
        chunksRef.current = []

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data)
          }
        }

        recorder.start(100)
      } catch (err) {
        console.warn('[VoiceRecorder] Micro access denied or unavailable:', err)
        setMicBlocked(true)
      }
    }

    void startRecording()

    // Таймер продолжительности записи
    timerRef.current = setInterval(() => {
      setSeconds((s) => s + 1)
    }, 1000)

    return () => {
      isCancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
      if (sampleTimerRef.current) clearInterval(sampleTimerRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close()
        } catch {}
        audioContextRef.current = null
      }
    }
  }, [])

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Остановка и отправка реальной голосовой записи
  const handleSend = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (sampleTimerRef.current) clearInterval(sampleTimerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    playClick(soundEnabled)

    const dur = Math.max(1, seconds)
    const recorder = mediaRecorderRef.current

    // Формируем финальную форму волны из реальных записанных сэмплов (28 полос)
    const targetBarsCount = 28
    const recorded = recordedWaveformRef.current
    let waveform: number[] = []

    if (recorded.length > 0) {
      for (let i = 0; i < targetBarsCount; i++) {
        const idx = Math.floor((i / targetBarsCount) * recorded.length)
        waveform.push(recorded[idx] ?? 35)
      }
    } else {
      waveform = Array.from({ length: targetBarsCount }).map(() =>
        Math.floor(25 + Math.random() * 65)
      )
    }

    const finalizeAndSend = (audioUrl: string) => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close()
        } catch {}
        audioContextRef.current = null
      }

      onSendVoice({
        type: 'audio',
        url: audioUrl,
        durationSec: dur,
        waveform,
        name: `Голосовое (${formatTimer(dur)})`,
      })
    }

    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm'
        const audioBlob = new Blob(chunksRef.current, { type: mimeType })

        // Конвертируем реальный аудио Blob в Base64 Data URL для моментального воспроизведения и передачи
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64Url = typeof reader.result === 'string' ? reader.result : 'mock-audio.webm'
          finalizeAndSend(base64Url)
        }
        reader.onerror = () => {
          finalizeAndSend('mock-audio.webm')
        }
        reader.readAsDataURL(audioBlob)
      }

      try {
        recorder.stop()
      } catch {
        finalizeAndSend('mock-audio.webm')
      }
    } else {
      // Страховочный фоллбэк если медиа-рекордер не запустился
      finalizeAndSend('mock-audio.webm')
    }
  }

  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (sampleTimerRef.current) clearInterval(sampleTimerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close()
      } catch {}
      audioContextRef.current = null
    }
    playClick(soundEnabled)
    onCancel()
  }

  return (
    <div className="flex flex-1 items-center justify-between rounded-xl border border-red-500/30 bg-red-950/20 px-3 py-1.5 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-3">
        {/* Пульсирующая красная точка записи */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
          <span className="font-mono text-xs font-semibold text-red-400">
            {formatTimer(seconds)}
          </span>
        </div>

        {/* ЖИВАЯ ЗВУКОВАЯ ВОЛНА: реагирует на реальный голос через микрофон */}
        {!micBlocked ? (
          <div className="flex h-6 items-center gap-[3px] px-2">
            {liveBars.map((height, i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-gradient-to-t from-red-500 to-amber-400 transition-all duration-75"
                style={{
                  height: `${height}px`,
                  opacity: Math.max(0.4, height / 24),
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 text-xs text-amber-300 font-medium">
            <AlertCircle size={14} className="shrink-0" />
            <span>Микрофон заблокирован</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleCancel}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71767b] hover:bg-red-500/20 hover:text-red-400 transition-colors"
          title="Отменить запись"
          aria-label="Отменить запись"
        >
          <Trash2 size={16} />
        </button>

        <button
          type="button"
          onClick={handleSend}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff7a18] text-white hover:bg-[#ff8a3d] shadow-sm transition-transform active:scale-95"
          title="Отправить голосовое"
          aria-label="Отправить голосовое"
        >
          <Check size={16} />
        </button>
      </div>
    </div>
  )
}

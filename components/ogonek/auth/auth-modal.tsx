'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Flame,
  Lock,
  UserRound,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  Sparkles,
  ArrowRight,
  Loader2,
  KeyRound,
  Compass,
} from 'lucide-react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { useBodyScrollLock } from '@/lib/ogonek/use-body-scroll-lock'
import {
  validateUsername,
  validatePassword,
  isUsernameAvailable,
  signInWithUsername,
  signUpWithUsername,
  getSupabase,
} from '@/lib/ogonek/supabase-client'

export type AuthMode = 'signin' | 'register'

type Props = {
  onClose: () => void
  onNotify?: (message: string) => void
  initialMode?: AuthMode
  onAuthenticated?: (accountId: string) => void
}

const AVATAR_PALETTE = [
  { name: 'Огонь', color: '#FF6A1A' },
  { name: 'Янтарь', color: '#F59E0B' },
  { name: 'Сапфир', color: '#3B82F6' },
  { name: 'Изумруд', color: '#10B981' },
  { name: 'Аметист', color: '#8B5CF6' },
  { name: 'Роза', color: '#EC4899' },
  { name: 'Бирюза', color: '#06B6D4' },
  { name: 'Графит', color: '#64748B' },
]

export function AuthModal({ onClose, onNotify, initialMode = 'signin', onAuthenticated }: Props) {
  useBodyScrollLock(true)

  const { state, continueAsGuest, applyUserSession } = useOgonekStore()
  const sound = state.soundEnabled

  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Registration specifics
  const [selectedAvatarColor, setSelectedAvatarColor] = useState<string>('#FF6A1A')
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true)

  // Live username availability check
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [usernameReason, setUsernameReason] = useState<string | null>(null)
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Honeypot for spam bots
  const [honeypot, setHoneypot] = useState('')
  const formStartTimeRef = useRef<number>(Date.now())
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === '1'

  // Input validations
  const usernameCheck = validateUsername(username)
  const passwordCheck = validatePassword(password)

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Reset state when switching between signin and register
  const switchMode = (newMode: AuthMode) => {
    if (newMode === mode) return
    playClick(sound)
    setMode(newMode)
    setError(null)
    formStartTimeRef.current = Date.now()
  }

  // Debounced live username check
  useEffect(() => {
    if (mode !== 'register' || !usernameCheck.valid) {
      setCheckingUsername(false)
      setIsAvailable(null)
      setUsernameReason(null)
      return
    }

    setCheckingUsername(true)
    setIsAvailable(null)
    setUsernameReason(null)

    if (checkTimerRef.current) clearTimeout(checkTimerRef.current)

    checkTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(usernameCheck.clean)}`)
        const data = await res.json()
        if (data.ok && data.available) {
          setIsAvailable(true)
          setUsernameReason(null)
        } else {
          setIsAvailable(false)
          setUsernameReason(data.reason || 'Этот никнейм уже занят')
        }
      } catch {
        const avail = await isUsernameAvailable(usernameCheck.clean)
        setIsAvailable(avail)
        setUsernameReason(avail ? null : 'Этот никнейм уже занят')
      } finally {
        setCheckingUsername(false)
      }
    }, 320)

    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current)
    }
  }, [username, mode, usernameCheck.valid, usernameCheck.clean])

  const finish = (accountId: string, message: string) => {
    playSuccess(sound)
    onNotify?.(message)
    onAuthenticated?.(accountId)
    onClose()
  }

  // Guest login
  const handleGuest = () => {
    playClick(sound)
    const result = continueAsGuest()
    if (result.ok && result.accountId) {
      finish(result.accountId, 'Включён гостевой режим')
    } else {
      setError('Не удалось войти в гостевой режим')
    }
  }

  // Handle Sign In submission
  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return

    const cleanNick = username.replace(/^@+/, '').trim().toLowerCase()
    if (!usernameCheck.valid) {
      setError(usernameCheck.error || 'Укажи корректный никнейм')
      return
    }
    if (!password) {
      setError('Введи пароль')
      return
    }

    playClick(sound)
    setBusy(true)
    setError(null)

    try {
      const res = await signInWithUsername({ username: cleanNick, password })
      if (!res.ok) {
        const authError = (res as any).error
        setError(
          typeof authError === 'object' && authError !== null
            ? authError.message || JSON.stringify(authError)
            : authError || 'Неверный никнейм или пароль'
        )
        return
      }

      const userId = res.user?.id || `user-${cleanNick}`
      await applyUserSession({
        userId,
        username: cleanNick,
        displayName: res.user?.user_metadata?.display_name || cleanNick,
        email: `${cleanNick}@ogonek.app`,
      })

      finish(userId, `С возвращением, @${cleanNick}!`)
    } catch (err: any) {
      setError(err?.message || 'Ошибка при входе в аккаунт')
    } finally {
      setBusy(false)
    }
  }

  // Handle Register submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return

    // Honeypot bot protection
    if (honeypot && honeypot.trim() !== '') {
      setError('Автоматическая регистрация отклонена')
      return
    }

    if (!usernameCheck.valid) {
      setError(usernameCheck.error || 'Укажи корректный никнейм')
      return
    }
    if (!passwordCheck.valid) {
      setError(passwordCheck.error || 'Пароль должен содержать минимум 8 символов')
      return
    }
    if (isAvailable === false) {
      setError(usernameReason || 'Этот никнейм уже занят')
      return
    }
    if (!agreedToTerms) {
      setError('Примите условия использования и политику приватности')
      return
    }

    // Minimum form filling duration check (≥ 2.5 seconds)
    const elapsed = Date.now() - formStartTimeRef.current
    if (elapsed < 2500 && !isDemo) {
      setError('Пожалуйста, заполняйте форму без спешки (защита от ботов)')
      return
    }

    playClick(sound)
    setBusy(true)
    setError(null)

    const cleanNick = username.replace(/^@+/, '').trim().toLowerCase()
    const nameToUse = (displayName || cleanNick).trim()

    try {
      const res = await signUpWithUsername({
        username: cleanNick,
        password: password,
        displayName: nameToUse,
        avatarColor: selectedAvatarColor,
      })

      if (!res.ok) {
        const authError = (res as any).error
        setError(
          typeof authError === 'object' && authError !== null
            ? authError.message || JSON.stringify(authError)
            : authError || 'Ошибка при создании аккаунта'
        )
        return
      }

      const userId = res.user?.id || `user-${cleanNick}`

      await applyUserSession({
        userId,
        username: cleanNick,
        displayName: nameToUse,
        email: `${cleanNick}@ogonek.app`,
      })

      const supabase = getSupabase()
      if (supabase) {
        try {
          await supabase.from('profiles').upsert(
            {
              id: userId,
              username: cleanNick,
              display_name: nameToUse,
              avatar_color: selectedAvatarColor,
              subscription_tier: 'free',
              tour_completed: false,
              onboarding_completed: false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )
        } catch {
          // Profile sync will proceed locally if network drops
        }
      }

      finish(userId, `Добро пожаловать в Огонёк, @${cleanNick}!`)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ogonek:open-tour'))
      }
    } catch (err: any) {
      setError(err?.message || 'Ошибка при создании профиля')
    } finally {
      setBusy(false)
    }
  }

  // Password strength calculation
  const passwordStrength = (() => {
    if (!password) return { level: 0, label: '', color: 'bg-zinc-800' }
    if (password.length < 8) return { level: 1, label: 'Короткий (мин. 8 символов)', color: 'bg-rose-500' }
    const hasLetters = /[a-zA-Zа-яА-Я]/.test(password)
    const hasDigits = /[0-9]/.test(password)
    const hasSpecial = /[^a-zA-Zа-яА-Я0-9]/.test(password)
    const hasUpperAndLower = /[a-zа-я]/.test(password) && /[A-ZА-Я]/.test(password)

    if (password.length >= 10 && hasLetters && hasDigits && (hasSpecial || hasUpperAndLower)) {
      return { level: 3, label: 'Надёжный мастер-пароль', color: 'bg-emerald-500' }
    }
    if (hasLetters && hasDigits) {
      return { level: 2, label: 'Хороший (добавь спецсимвол)', color: 'bg-amber-500' }
    }
    return { level: 1, label: 'Слабый (добавь цифры)', color: 'bg-rose-500' }
  })()

  // Image and text configuration based on mode
  const isRegister = mode === 'register'
  const activeImage = isRegister ? '/media/landing/finish.jpg' : '/media/landing/ritual.jpg'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/80 backdrop-blur-2xl overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={isRegister ? 'Регистрация в Огоньке' : 'Вход в Огонёк'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Ambient background glow orb */}
      <div
        className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[140px] opacity-20 -z-10"
        style={{
          background: isRegister
            ? 'radial-gradient(circle, #f56900 0%, #0071e3 70%, transparent 100%)'
            : 'radial-gradient(circle, #0071e3 0%, #f56900 70%, transparent 100%)',
        }}
      />

      {/* Main Glass Dialog Window */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[960px] max-h-[92vh] sm:max-h-[88vh] rounded-[28px] sm:rounded-[36px] bg-[#121214]/95 border border-white/[0.12] shadow-[0_32px_100px_rgba(0,0,0,0.9),0_0_50px_rgba(255,106,26,0.12)] overflow-hidden flex flex-col md:flex-row text-white my-auto"
      >
        {/* ── LEFT COLUMN: Cinematic Art Showcase (finish.jpg / ritual.jpg) ── */}
        <div className="relative md:w-[44%] shrink-0 overflow-hidden select-none bg-black flex flex-col justify-between">
          {/* Dynamic Cross-fading Background Image */}
          <div className="absolute inset-0 z-0">
            <AnimatePresence mode="wait">
              <motion.img
                key={activeImage}
                src={activeImage}
                alt={isRegister ? 'Финиш и преодоление' : 'Вечерний ритуал силы'}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.45, ease: 'easeInOut' }}
                className="w-full h-full object-cover object-center"
              />
            </AnimatePresence>

            {/* Dark Apple Cinematic Gradient Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-[#121214]/55 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#121214]/80 hidden md:block" />
          </div>

          {/* Top Banner Content */}
          <div className="relative z-10 p-5 sm:p-7 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-mono tracking-wider uppercase text-[#f5f5f7]">
              {isRegister ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f56900] animate-pulse" />
                  <span>Старт летописи · Local-first</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2997ff] animate-pulse" />
                  <span>Вечерний ритуал · 5 минут</span>
                </>
              )}
            </div>

            {/* Mobile-only close button on top of banner */}
            <button
              type="button"
              onClick={onClose}
              className="md:hidden w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white/80 hover:text-white flex items-center justify-center border border-white/15 cursor-pointer transition-transform active:scale-90"
              aria-label="Закрыть"
            >
              <X size={16} />
            </button>
          </div>

          {/* Bottom Art Typography (Hidden on compact mobile height) */}
          <div className="relative z-10 p-5 sm:p-7 hidden sm:flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="modalFlameArt" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffa600" />
                    <stop offset="100%" stopColor="#ff6b35" />
                  </linearGradient>
                </defs>
                <path
                  d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                  fill="url(#modalFlameArt)"
                />
              </svg>
              <span className="text-[13px] font-semibold tracking-wide uppercase text-white/90">
                Огонёк · 2026
              </span>
            </div>

            <p className="text-[15px] sm:text-[17px] font-medium text-[#f5f5f7] leading-snug tracking-tight">
              {isRegister
                ? '«Характер куётся не в триумфе, а в тихом вечернем преодолении.»'
                : '«5 минут вечерней тишины. Время зафиксировать победы дня.»'}
            </p>

            <div className="flex items-center gap-3 text-[11px] font-mono text-white/60 pt-1">
              <span>0% рекламы</span>
              <span>·</span>
              <span>Сквозной шифр</span>
              <span>·</span>
              <span>Твой чип</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Interactive Apple Auth Interface ── */}
        <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 md:p-10 overflow-y-auto bg-[#141416]/95 backdrop-blur-xl relative">
          {/* Honeypot field for bot trapping */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ display: 'none' }}
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />

          {/* Top Bar: Apple Segmented Pill & Desktop Close Button */}
          <div className="flex items-center justify-between gap-4 mb-6">
            {/* iOS-Grade Segmented Control */}
            <div
              className="inline-flex p-1 rounded-full bg-white/[0.06] border border-white/[0.08]"
              role="tablist"
              aria-label="Выбор действия: вход или регистрация"
            >
              <button
                type="button"
                role="tab"
                aria-selected={!isRegister}
                onClick={() => switchMode('signin')}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 cursor-pointer border-none ${
                  !isRegister
                    ? 'bg-[#2c2c2e] text-[#f5f5f7] shadow-[0_2px_8px_rgba(0,0,0,0.5)] font-semibold'
                    : 'bg-transparent text-[#86868b] hover:text-[#f5f5f7]'
                }`}
              >
                Вход
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isRegister}
                onClick={() => switchMode('register')}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 cursor-pointer border-none ${
                  isRegister
                    ? 'bg-[#0071e3] text-white shadow-[0_2px_12px_rgba(0,113,227,0.4)] font-semibold'
                    : 'bg-transparent text-[#86868b] hover:text-[#f5f5f7]'
                }`}
              >
                Регистрация
              </button>
            </div>

            {/* Desktop Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="hidden md:flex w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-[#86868b] hover:text-[#f5f5f7] items-center justify-center border border-white/5 cursor-pointer transition-all active:scale-95"
              aria-label="Закрыть окно"
            >
              <X size={16} />
            </button>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-[24px] sm:text-[28px] font-bold text-[#f5f5f7] tracking-tight">
              {isRegister ? 'Создай личный дневник' : 'С возвращением в летопись'}
            </h2>
            <p className="text-[13px] sm:text-[14px] text-[#86868b] mt-1.5">
              {isRegister
                ? 'Данные шифруются на твоём устройстве. Без рекламы и передачи третьим лицам.'
                : 'Введи свой никнейм и мастер-пароль для расшифровки локального сейфа.'}
            </p>
          </div>

          {/* Error Message Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[13px] flex items-center gap-2.5"
              role="alert"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={isRegister ? handleRegister : handleSignin} noValidate className="space-y-4">
            {/* Username Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="auth-username"
                  className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wider flex items-center gap-1.5"
                >
                  <UserRound size={13} />
                  Никнейм
                </label>
                {isRegister && (
                  <div className="text-[11px] font-mono">
                    {checkingUsername && <span className="text-[#86868b]">проверяем...</span>}
                    {!checkingUsername && isAvailable === true && (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Check size={11} /> свободен
                      </span>
                    )}
                    {!checkingUsername && isAvailable === false && (
                      <span className="text-rose-400">занят</span>
                    )}
                  </div>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-[#86868b] font-mono text-[14px] select-none pointer-events-none">
                  @
                </span>
                <input
                  id="auth-username"
                  type="text"
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  placeholder="alex_cerna"
                  onChange={(e) => {
                    const clean = e.target.value
                      .replace(/^@+/, '')
                      .trim()
                      .toLowerCase()
                      .replace(/[^a-z0-9_]/g, '')
                    setUsername(clean)
                    if (error) setError(null)
                  }}
                  className="w-full pl-8 pr-4 py-3 rounded-2xl bg-[#1c1c1f] border border-white/[0.08] text-[#f5f5f7] text-[14px] outline-none focus:border-[#f56900] focus:ring-1 focus:ring-[#f56900]/30 transition-all font-mono"
                />
              </div>
            </div>

            {/* Display Name Input (Only on Register) */}
            {isRegister && (
              <div>
                <label
                  htmlFor="auth-display-name"
                  className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wider block mb-1.5"
                >
                  Имя летописца (необязательно)
                </label>
                <input
                  id="auth-display-name"
                  type="text"
                  name="displayName"
                  autoComplete="name"
                  value={displayName}
                  placeholder="Алексей"
                  onChange={(e) => {
                    setDisplayName(e.target.value)
                    if (error) setError(null)
                  }}
                  className="w-full px-4 py-3 rounded-2xl bg-[#1c1c1f] border border-white/[0.08] text-[#f5f5f7] text-[14px] outline-none focus:border-[#f56900] focus:ring-1 focus:ring-[#f56900]/30 transition-all"
                />
              </div>
            )}

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="auth-password"
                  className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Lock size={13} />
                  Мастер-пароль
                </label>
                {isRegister && password && (
                  <span className={`text-[11px] font-mono ${passwordStrength.color.replace('bg-', 'text-')}`}>
                    {passwordStrength.label}
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  value={password}
                  placeholder="Минимум 8 символов"
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError(null)
                  }}
                  className="w-full pl-4 pr-11 py-3 rounded-2xl bg-[#1c1c1f] border border-white/[0.08] text-[#f5f5f7] text-[14px] outline-none focus:border-[#f56900] focus:ring-1 focus:ring-[#f56900]/30 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-[#86868b] hover:text-[#f5f5f7] p-1 cursor-pointer transition-colors"
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength 3-bar indicator (on register) */}
              {isRegister && password && (
                <div className="flex items-center gap-1.5 mt-2">
                  <div
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      passwordStrength.level >= 1 ? passwordStrength.color : 'bg-white/10'
                    }`}
                  />
                  <div
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      passwordStrength.level >= 2 ? passwordStrength.color : 'bg-white/10'
                    }`}
                  />
                  <div
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      passwordStrength.level >= 3 ? passwordStrength.color : 'bg-white/10'
                    }`}
                  />
                </div>
              )}
            </div>

            {/* Avatar Color Picker (Only on Register) */}
            {isRegister && (
              <div className="pt-1">
                <label className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wider block mb-2">
                  Цвет персонального пламени
                </label>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {AVATAR_PALETTE.map((item) => {
                    const isSelected = selectedAvatarColor === item.color
                    return (
                      <button
                        key={item.color}
                        type="button"
                        onClick={() => setSelectedAvatarColor(item.color)}
                        className={`w-7 h-7 rounded-full transition-transform cursor-pointer relative flex items-center justify-center ${
                          isSelected ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#121214]' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: item.color }}
                        title={item.name}
                        aria-label={`Выбрать цвет: ${item.name}`}
                      >
                        {isSelected && <Check size={12} className="text-white drop-shadow" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Privacy Agreement Checkbox (Only on Register) */}
            {isRegister && (
              <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded bg-[#1c1c1f] border border-white/20 accent-[#f56900] cursor-pointer"
                />
                <span className="text-[12px] text-[#86868b] leading-tight">
                  Согласен с{' '}
                  <span className="text-[#2997ff] hover:underline">Условиями использования</span> и{' '}
                  <span className="text-[#2997ff] hover:underline">Политикой Local-first приватности</span>
                </span>
              </label>
            )}

            {/* Primary Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={busy}
                className={`w-full py-3.5 px-6 rounded-full text-[14px] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border-none shadow-lg active:scale-[0.98] ${
                  isRegister
                    ? 'bg-[#f56900] hover:bg-[#ff7b1a] text-white shadow-[0_4px_24px_rgba(245,105,0,0.35)]'
                    : 'bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-[0_4px_20px_rgba(0,113,227,0.35)]'
                }`}
              >
                {busy ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Подождите...</span>
                  </>
                ) : isRegister ? (
                  <>
                    <span>Зажечь огонёк и начать</span>
                    <ArrowRight size={15} />
                  </>
                ) : (
                  <>
                    <span>Войти в летопись</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>

            {/* Guest Mode Shortcut */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleGuest}
                className="text-[12px] text-[#86868b] hover:text-[#f5f5f7] transition-colors cursor-pointer bg-transparent border-none py-1 hover:underline"
              >
                Или войти как гость (быстрый демо-режим без пароля)
              </button>
            </div>
          </form>

          {/* Security Guarantee Banner */}
          <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center gap-2 text-[11px] font-mono text-[#86868b]">
            <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
            <span>Local-first: Web Crypto API на твоём чипе. Мы не читаем твои записи.</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

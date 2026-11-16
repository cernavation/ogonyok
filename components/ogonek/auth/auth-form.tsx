'use client'

import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  UserRound,
  ArrowRight,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import {
  isSupabaseConfigured,
  isUsernameAvailable,
  signInWithUsername,
  signUpWithUsername,
  validatePassword,
  validateUsername,
  getSupabase,
} from '@/lib/ogonek/supabase-client'

export type AuthMode = 'signin' | 'register'

type Props = {
  variant?: 'screen' | 'modal'
  initialMode?: AuthMode
  onAuthenticated?: (accountId: string) => void
  onNotify?: (message: string) => void
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

export function AuthForm({ variant = 'screen', initialMode = 'signin', onAuthenticated, onNotify }: Props) {
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

  // Live debounced username validation (300ms)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [usernameReason, setUsernameReason] = useState<string | null>(null)
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Honeypot & timing security protection
  const [honeypot, setHoneypot] = useState('')
  const formStartTimeRef = useRef<number>(Date.now())

  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === '1'

  // Live validation
  const usernameCheck = validateUsername(username)
  const passwordCheck = validatePassword(password)

  // Password strength classification
  const passwordStrength = (() => {
    if (!password) return { level: 0, label: '', color: 'bg-zinc-800' }
    if (password.length < 8) {
      return { level: 1, label: 'Слабый пароль (мин. 8 симв.)', color: 'bg-rose-500' }
    }
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
    return { level: 1, label: 'Слабый пароль (добавь цифры)', color: 'bg-rose-500' }
  })()

  // Reset state when switching mode
  useEffect(() => {
    setError(null)
    formStartTimeRef.current = Date.now()
  }, [mode])

  // Debounced check of username availability via /api/auth/check-username (300ms)
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

    if (checkTimerRef.current) {
      clearTimeout(checkTimerRef.current)
    }

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
    }, 300)

    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current)
    }
  }, [username, mode, usernameCheck.valid, usernameCheck.clean])

  const finish = (accountId: string, message: string) => {
    playSuccess(sound)
    onNotify?.(message)
    onAuthenticated?.(accountId)
  }

  const handleGuest = () => {
    playClick(sound)
    const result = continueAsGuest()
    if (result.ok && result.accountId) {
      finish(result.accountId, 'Включён гостевой режим')
    } else {
      setError('Не удалось войти как гость')
    }
  }

  // Registration submit
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return

    // Honeypot check
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
      setError('Необходимо принять условия использования и политику приватности')
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
            : authError || 'Ошибка при регистрации'
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
          // Profile sync will be handled by background synchronization if network drops
        }
      }

      finish(userId, `Добро пожаловать в Огонёк, @${cleanNick}!`)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ogonek:open-tour'))
      }
    } catch (err: any) {
      setError(err?.message || 'Ошибка при регистрации аккаунта')
    } finally {
      setBusy(false)
    }
  }

  // Signin handler
  const handleSignin = async (e: FormEvent) => {
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

  const isRegister = mode === 'register'

  return (
    <div className={`auth-form auth-form--${variant} max-w-md mx-auto w-full text-white`}>
      {/* Honeypot поле для ботов */}
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

      {/* Фирменный логотип 🔥 и название ОГОНЁК */}
      <div className="flex flex-col items-center justify-center gap-1.5 mb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="authFlameLogo" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffa600" />
                <stop offset="100%" stopColor="#ff6b35" />
              </linearGradient>
            </defs>
            <path
              d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
              fill="url(#authFlameLogo)"
            />
          </svg>
          <span className="text-[13px] font-semibold tracking-wider text-[#f5f5f7] uppercase font-mono">
            ОГОНЁК · 2026
          </span>
        </div>
        <p className="text-[13px] text-[#86868b] font-normal">
          {isRegister ? 'Создай личный дневник силы и побед' : 'Личный вход в зашифрованную летопись'}
        </p>
      </div>

      {/* Вкладки в стиле Apple Segmented Control */}
      <div
        className="flex p-1 rounded-full bg-white/[0.06] border border-white/[0.08] mb-6 max-w-[280px] mx-auto w-full"
        role="tablist"
        aria-label="Вход или регистрация"
      >
        <button
          type="button"
          role="tab"
          aria-label="Вход"
          aria-selected={!isRegister}
          onClick={() => {
            playClick(sound)
            setMode('signin')
            setError(null)
          }}
          className={`flex-1 py-1.5 text-[13px] font-medium text-center rounded-full transition-all cursor-pointer border-none ${
            !isRegister
              ? 'bg-[#2c2c2e] text-[#f5f5f7] shadow-sm font-semibold'
              : 'text-[#86868b] hover:text-[#f5f5f7]'
          }`}
        >
          Вход
        </button>
        <button
          type="button"
          role="tab"
          aria-label="Регистрация"
          aria-selected={isRegister}
          onClick={() => {
            playClick(sound)
            setMode('register')
            setError(null)
          }}
          className={`flex-1 py-1.5 text-[13px] font-medium text-center rounded-full transition-all cursor-pointer border-none ${
            isRegister
              ? 'bg-[#0071e3] text-white shadow-[0_2px_12px_rgba(0,113,227,0.4)] font-semibold'
              : 'text-[#86868b] hover:text-[#f5f5f7]'
          }`}
        >
          Регистрация
        </button>
      </div>

      {/* Сообщение об ошибке */}
      {error && (
        <motion.div
          className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[13px] flex items-center gap-2"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* ── ФОРМА ── */}
      <form onSubmit={isRegister ? handleRegister : handleSignin} noValidate className="flex flex-col gap-4">
        {/* Поле @никнейм */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="authform-username" className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wider flex items-center gap-1.5">
              <UserRound size={13} /> Никнейм
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
              id="authform-username"
              type="text"
              name="username"
              aria-label="Никнейм"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              placeholder="alex_cerna"
              onChange={(e) => {
                const cleanUsername = e.target.value.replace(/^@+/, '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
                setUsername(cleanUsername)
                if (error) setError(null)
              }}
              className="w-full pl-8 pr-4 py-3 rounded-2xl bg-[#1c1c1f] border border-white/[0.08] text-[#f5f5f7] text-[14px] outline-none focus:border-[#f56900] focus:ring-1 focus:ring-[#f56900]/30 transition-all font-mono"
            />
          </div>
        </div>

        {/* Поле «Имя» (только при регистрации) */}
        {isRegister && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="authform-display-name" className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wider">
              Имя летописца (необязательно)
            </label>
            <input
              id="authform-display-name"
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

        {/* Поле «Пароль» */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="authform-password" className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wider flex items-center gap-1.5">
              <Lock size={13} /> Мастер-пароль
            </label>
            {isRegister && password && (
              <span className={`text-[11px] font-mono ${passwordStrength.color.replace('bg-', 'text-')}`}>
                {passwordStrength.label}
              </span>
            )}
          </div>
          <div className="relative flex items-center">
            <input
              id="authform-password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              aria-label="Пароль"
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
              className="absolute right-3 text-[#86868b] hover:text-[#f5f5f7] p-1.5 cursor-pointer transition-colors"
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Индикатор надёжности (при регистрации) */}
          {isRegister && password && (
            <div className="flex items-center gap-1.5 mt-1.5">
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

        {/* Выбор цвета аватара (только при регистрации) */}
        {isRegister && (
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wider">
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

        {/* Согласие с правилами (только при регистрации) */}
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
              <Link href="/terms" className="text-[#2997ff] hover:underline">
                Условиями сервиса
              </Link>{' '}
              и{' '}
              <Link href="/privacy" className="text-[#2997ff] hover:underline">
                Политикой Local-first
              </Link>
            </span>
          </label>
        )}

        {/* Кнопка отправки */}
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

        {/* Гостевой режим */}
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

      {/* Безопасность */}
      <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center gap-2 text-[11px] font-mono text-[#86868b]">
        <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
        <span>Local-first: Web Crypto API на твоём чипе. Мы не читаем твои записи.</span>
      </div>
    </div>
  )
}

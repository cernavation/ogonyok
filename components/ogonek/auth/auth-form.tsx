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

  // Registration 2-step flow (Шаг 14)
  const [registrationStep, setRegistrationStep] = useState<1 | 2>(1)
  const [selectedAvatarColor, setSelectedAvatarColor] = useState<string>('#FF6A1A')
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(true)

  // Live debounced username validation (300ms)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [usernameReason, setUsernameReason] = useState<string | null>(null)
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Honeypot & timing security protection (Шаг 5 / Шаг 14)
  const [honeypot, setHoneypot] = useState('')
  const formStartTimeRef = useRef<number>(Date.now())

  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === '1'

  // Live validation
  const usernameCheck = validateUsername(username)
  const passwordCheck = validatePassword(password)

  // Password strength classification (1: weak, 2: medium, 3: strong)
  const passwordStrength = (() => {
    if (!password) return { level: 0, label: '', color: 'bg-zinc-700' }
    if (password.length < 8) {
      return { level: 1, label: 'Слабый пароль (мин. 8 симв.)', color: 'bg-rose-500' }
    }
    const hasLetters = /[a-zA-Zа-яА-Я]/.test(password)
    const hasDigits = /[0-9]/.test(password)
    const hasSpecial = /[^a-zA-Zа-яА-Я0-9]/.test(password)
    const hasUpperAndLower = /[a-zа-я]/.test(password) && /[A-ZА-Я]/.test(password)

    if (password.length >= 10 && hasLetters && hasDigits && (hasSpecial || hasUpperAndLower)) {
      return { level: 3, label: 'Надёжный пароль', color: 'bg-emerald-500' }
    }
    if (hasLetters && hasDigits) {
      return { level: 2, label: 'Средний пароль', color: 'bg-amber-500' }
    }
    return { level: 1, label: 'Слабый пароль (добавь цифры)', color: 'bg-rose-500' }
  })()

  // Reset registration step when switching mode
  useEffect(() => {
    setRegistrationStep(1)
    setError(null)
    formStartTimeRef.current = Date.now()
  }, [mode])

  // Debounced check of username availability via /api/auth/check-username (300ms)
  useEffect(() => {
    if (mode !== 'register' || registrationStep !== 1 || !usernameCheck.valid) {
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
  }, [username, mode, registrationStep, usernameCheck.valid, usernameCheck.clean])

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

  // Step 1: validate fields, advance to Step 2
  const handleStep1Advance = (e: FormEvent) => {
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

    playClick(sound)
    setError(null)
    setRegistrationStep(2)
  }

  // Step 2: finalize registration (avatar + agreement)
  const handleStep2Submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return

    if (!agreedToTerms) {
      setError('Необходимо принять Условия использования и Политику конфиденциальности')
      return
    }

    // Minimum form filling duration check (≥ 3 seconds)
    const elapsed = Date.now() - formStartTimeRef.current
    if (elapsed < 3000 && !isDemo) {
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
          await supabase
            .from('profiles')
            .upsert(
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

  const monogram = (displayName || username || '✦').trim().charAt(0).toUpperCase()

  const isStep1Disabled =
    busy ||
    !usernameCheck.valid ||
    !passwordCheck.valid ||
    isAvailable === false ||
    checkingUsername

  return (
    <div className={`auth-form auth-form--${variant} max-w-md mx-auto w-full`}>
      {/* Honeypot поле для ботов (Шаг 5) */}
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
      <div className="flex flex-col items-center justify-center gap-1 mb-5 text-center">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🔥</span>
          <span className="text-2xl font-black tracking-tight text-[var(--text)] uppercase">
            ОГОНЁК
          </span>
        </div>
        <p className="text-[12px] text-[var(--text-2)] font-medium">
          Дневник силы и летопись побед
        </p>
      </div>

      {/* Вкладки «Вход» / «Регистрация» в стиле X.com */}
      <div className="flex border-b border-[var(--border)] mb-5" role="tablist" aria-label="Вход или регистрация">
        <button
          type="button"
          role="tab"
          aria-label="Вход"
          aria-selected={mode === 'signin'}
          onClick={() => {
            playClick(sound)
            setMode('signin')
            setError(null)
          }}
          className={`flex-1 py-3 text-[15px] font-bold text-center border-b-2 transition-colors min-h-[44px] cursor-pointer ${
            mode === 'signin'
              ? 'border-[var(--accent)] text-[var(--text)]'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Вход
        </button>
        <button
          type="button"
          role="tab"
          aria-label="Регистрация"
          aria-selected={mode === 'register'}
          onClick={() => {
            playClick(sound)
            setMode('register')
            setError(null)
          }}
          className={`flex-1 py-3 text-[15px] font-bold text-center border-b-2 transition-colors min-h-[44px] cursor-pointer ${
            mode === 'register'
              ? 'border-[var(--accent)] text-[var(--text)]'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Регистрация
        </button>
      </div>

      {/* Сообщение об ошибке */}
      {error && (
        <motion.div
          className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[13px] flex items-center gap-2"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
        >
          <span>{error}</span>
        </motion.div>
      )}

      {/* ——— SIGN IN ——— */}
      {mode === 'signin' && (
        <form onSubmit={handleSignin} noValidate className="flex flex-col gap-4">
          {/* Поле @никнейм */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="signin-username" className="text-[13px] font-bold text-zinc-300 flex items-center gap-1.5">
              <UserRound size={14} className="text-zinc-400" /> Никнейм
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-zinc-400 font-mono text-[15px] select-none">
                @
              </span>
              <input
                id="signin-username"
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
                className="w-full pl-8 pr-4 py-3 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text)] text-[15px] outline-none focus:border-[var(--accent)] transition-colors font-mono"
              />
            </div>
          </div>

          {/* Поле Пароль */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="signin-password" className="text-[13px] font-bold text-zinc-300 flex items-center gap-1.5">
              <KeyRound size={14} className="text-zinc-400" /> Пароль
            </label>
            <div className="relative flex items-center">
              <input
                id="signin-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                aria-label="Пароль"
                autoComplete="current-password"
                value={password}
                placeholder="Твой пароль"
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError(null)
                }}
                className="w-full pl-4 pr-11 py-3 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text)] text-[15px] outline-none focus:border-[var(--accent)] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            aria-label="Войти в аккаунт"
            disabled={busy || !usernameCheck.valid || !password}
            className="x-primary-btn w-full py-3.5 px-5 rounded-2xl text-[15px] font-bold mt-2 shadow-md disabled:opacity-40 flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
          >
            {busy ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Входим…</span>
              </>
            ) : (
              <span>Войти</span>
            )}
          </button>
        </form>
      )}

      {/* ——— REGISTER STEP 1: username + displayName + password + security ——— */}
      {mode === 'register' && registrationStep === 1 && (
        <form onSubmit={handleStep1Advance} noValidate className="flex flex-col gap-4">
          {/* Индикатор шагов (2 шага) */}
          <div className="flex items-center gap-2 mb-1" aria-hidden="true">
            <div className="h-1.5 flex-1 rounded-full bg-[var(--accent)]" />
            <div className="h-1.5 flex-1 rounded-full bg-[var(--border)]" />
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-400 -mt-2">
            <span>Шаг 1 из 2 — Данные аккаунта</span>
            <span>Далее: выбор аватара</span>
          </div>

          {/* Поле @никнейм с живой проверкой */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reg-username" className="text-[13px] font-bold text-zinc-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UserRound size={14} className="text-zinc-400" /> Никнейм
              </span>
              {username.length > 0 && (
                <span className="text-[12px] font-normal">
                  {checkingUsername ? (
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" /> проверяем…
                    </span>
                  ) : isAvailable === true ? (
                    <span className="text-emerald-500 flex items-center gap-1 font-bold">
                      <Check size={12} /> свободен
                    </span>
                  ) : isAvailable === false ? (
                    <span className="text-rose-400 flex items-center gap-1 font-bold">
                      <X size={12} /> {usernameReason || 'занят'}
                    </span>
                  ) : null}
                </span>
              )}
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-zinc-400 font-mono text-[15px] select-none">
                @
              </span>
              <input
                id="reg-username"
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
                className="w-full pl-8 pr-4 py-3 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text)] text-[15px] outline-none focus:border-[var(--accent)] transition-colors font-mono"
              />
            </div>
            <p className="text-[11px] text-zinc-400 px-1">
              От 3 до 20 символов: латиница, цифры и _
            </p>
          </div>

          {/* Поле Имя / Псевдоним */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reg-displayName" className="text-[13px] font-bold text-zinc-300">
              Имя или псевдоним
            </label>
            <input
              id="reg-displayName"
              type="text"
              name="displayName"
              aria-label="Имя или псевдоним"
              value={displayName}
              placeholder="Как к тебе обращаться"
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text)] text-[15px] outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          {/* Поле Пароль с индикатором надёжности */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reg-password" className="text-[13px] font-bold text-zinc-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound size={14} className="text-zinc-400" /> Пароль
              </span>
              {password.length > 0 && (
                <span
                  className={`text-[12px] font-bold ${
                    passwordStrength.level === 1
                      ? 'text-rose-400'
                      : passwordStrength.level === 2
                      ? 'text-amber-500'
                      : 'text-emerald-500'
                  }`}
                >
                  {passwordStrength.label}
                </span>
              )}
            </label>
            <div className="relative flex items-center">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                aria-label="Пароль"
                autoComplete="new-password"
                value={password}
                placeholder="Минимум 8 символов"
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError(null)
                }}
                className="w-full pl-4 pr-11 py-3 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text)] text-[15px] outline-none focus:border-[var(--accent)] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {/* 3-сегментный визуальный индикатор надёжности */}
            <div className="flex gap-1.5 h-1 mt-1 px-1" aria-hidden="true">
              {[1, 2, 3].map((lvl) => (
                <div
                  key={lvl}
                  className={`flex-1 rounded-full transition-colors ${
                    lvl <= passwordStrength.level
                      ? passwordStrength.color
                      : 'bg-zinc-800'
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            aria-label="Далее: выбор аватара"
            disabled={isStep1Disabled}
            className="x-primary-btn w-full py-3.5 px-5 rounded-2xl text-[15px] font-bold mt-2 shadow-md disabled:opacity-40 flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
          >
            <span>Далее</span>
            <ChevronRight size={18} />
          </button>
        </form>
      )}

      {/* ——— REGISTER STEP 2: avatar color + terms agreement ——— */}
      {mode === 'register' && registrationStep === 2 && (
        <form onSubmit={handleStep2Submit} noValidate className="flex flex-col gap-5">
          {/* Индикатор шагов */}
          <div className="flex items-center gap-2 mb-1" aria-hidden="true">
            <div className="h-1.5 flex-1 rounded-full bg-[var(--accent)]" />
            <div className="h-1.5 flex-1 rounded-full bg-[var(--accent)]" />
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-400 -mt-3">
            <span>Шаг 2 из 2 — Аватар и завершение</span>
            <span className="text-[var(--accent)] font-semibold">Финал</span>
          </div>

          {/* Предпросмотр аватара */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)]">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shrink-0 transition-colors"
              style={{ backgroundColor: selectedAvatarColor }}
            >
              {monogram}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-[15px] text-zinc-100 truncate">
                {displayName || username}
              </div>
              <div className="text-xs text-zinc-400 font-mono truncate">
                @{username}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">
                Цвет монограммы в профиле и чатах
              </div>
            </div>
          </div>

          {/* Палитра выбора цвета */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-bold text-zinc-300">
              Выбери цвет профиля
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {AVATAR_PALETTE.map((item) => (
                <button
                  key={item.color}
                  type="button"
                  aria-label={`Выбрать цвет ${item.name}`}
                  onClick={() => {
                    playClick(sound)
                    setSelectedAvatarColor(item.color)
                  }}
                  className={`h-11 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold text-white transition-all cursor-pointer border ${
                    selectedAvatarColor === item.color
                      ? 'border-white scale-105 shadow-md'
                      : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: item.color }}
                >
                  {selectedAvatarColor === item.color && (
                    <Check size={15} strokeWidth={3} className="text-white drop-shadow" />
                  )}
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Чекбокс согласия с условиями и политикой */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-start gap-3">
            <input
              id="terms-agree-cb"
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              aria-label="Согласие с условиями использования и политикой конфиденциальности"
              className="mt-0.5 w-4 h-4 rounded text-[var(--accent)] accent-[var(--accent)] cursor-pointer"
            />
            <label htmlFor="terms-agree-cb" className="text-xs text-zinc-300 leading-relaxed cursor-pointer select-none">
              Я принимаю{' '}
              <Link
                href="/terms"
                target="_blank"
                aria-label="Условия использования сервиса Огонёк"
                className="text-[var(--accent)] hover:underline font-semibold"
              >
                Условия использования
              </Link>{' '}
              и{' '}
              <Link
                href="/privacy"
                target="_blank"
                aria-label="Политика конфиденциальности сервиса Огонёк"
                className="text-[var(--accent)] hover:underline font-semibold"
              >
                Политику конфиденциальности
              </Link>
              . Записи остаются моей собственностью.
            </label>
          </div>

          {/* Кнопки Назад / Завершить */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              aria-label="Вернуться к шагу 1"
              onClick={() => {
                playClick(sound)
                setRegistrationStep(1)
              }}
              className="py-3 px-4 rounded-2xl border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Назад</span>
            </button>

            <button
              type="submit"
              aria-label="Завершить регистрацию"
              disabled={busy || !agreedToTerms}
              className="x-primary-btn flex-1 py-3.5 px-5 rounded-2xl text-[15px] font-bold shadow-md disabled:opacity-40 flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
            >
              {busy ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Создаём аккаунт…</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Создать аккаунт</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Демо-вход для гостя / автотестов */}
      {isDemo && (
        <div className="mt-4 pt-3 border-t border-[var(--border)] text-center">
          <button
            type="button"
            aria-label="Войти в демонстрационном режиме"
            onClick={handleGuest}
            className="text-[13px] text-amber-500 hover:text-amber-400 font-semibold inline-flex items-center gap-1.5 py-2 px-3 rounded-lg hover:bg-amber-500/10 transition-colors min-h-[40px] cursor-pointer"
          >
            <Sparkles size={14} /> Войти в демо-режиме (без регистрации)
          </button>
        </div>
      )}

      {/* Подсказка о безопасности */}
      <div className="mt-4 pt-3 border-t border-[var(--border)]/40 text-center flex items-center justify-center gap-1.5 text-xs text-zinc-400">
        <ShieldCheck size={13} className="text-emerald-500" />
        <span>Защищено Supabase Row Level Security & Signal Privacy</span>
      </div>
    </div>
  )
}

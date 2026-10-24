'use client'

import { motion } from 'framer-motion'
import {
  Check,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  Loader2,
  Lock,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import {
  isGoogleAuthEnabled,
  isSupabaseConfigured,
  isUsernameAvailable,
  signInWithGoogle,
  signInWithUsername,
  signUpWithUsername,
  validatePassword,
  validateUsername,
} from '@/lib/ogonek/supabase-client'
import { GoogleIcon } from './google-icon'

export type AuthMode = 'signin' | 'register'

type Props = {
  variant?: 'screen' | 'modal'
  initialMode?: AuthMode
  onAuthenticated?: (accountId: string) => void
  onNotify?: (message: string) => void
}

export function AuthForm({ variant = 'screen', initialMode = 'signin', onAuthenticated, onNotify }: Props) {
  const { state, continueAsGuest, registerWithEmail, signInWithEmail } = useOgonekStore()
  const sound = state.soundEnabled

  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Проверка уникальности никнейма на лету (debounce 400ms)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Включён ли Google Provider в Supabase
  const [googleEnabled, setGoogleEnabled] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)

  const hasSupabase = isSupabaseConfigured()
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === '1'

  useEffect(() => {
    let active = true
    isGoogleAuthEnabled().then((enabled) => {
      if (active) setGoogleEnabled(enabled)
    })
    return () => {
      active = false
    }
  }, [])

  // Валидация на лету
  const usernameCheck = validateUsername(username)
  const passwordCheck = validatePassword(password)

  // Debounced проверка доступности ника при регистрации
  useEffect(() => {
    if (mode !== 'register' || !usernameCheck.valid) {
      setCheckingUsername(false)
      setIsAvailable(null)
      return
    }

    setCheckingUsername(true)
    setIsAvailable(null)

    if (checkTimerRef.current) {
      clearTimeout(checkTimerRef.current)
    }

    checkTimerRef.current = setTimeout(async () => {
      const avail = await isUsernameAvailable(usernameCheck.clean)
      setIsAvailable(avail)
      setCheckingUsername(false)
    }, 400)

    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current)
    }
  }, [username, mode, usernameCheck.valid, usernameCheck.clean])

  const finish = (accountId: string, message: string) => {
    playSuccess(sound)
    onNotify?.(message)
    onAuthenticated?.(accountId)
  }

  const handleGoogleSignIn = async () => {
    playClick(sound)
    setError(null)
    setGoogleBusy(true)
    try {
      const res = await signInWithGoogle()
      if (!res.ok) {
        setError(res.error || 'Не удалось войти через Google')
      }
    } finally {
      setGoogleBusy(false)
    }
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return

    if (!usernameCheck.valid) {
      setError(usernameCheck.error || 'Укажи корректный ник')
      return
    }

    if (mode === 'register') {
      if (!passwordCheck.valid) {
        setError(passwordCheck.error || 'Пароль должен содержать минимум 8 символов')
        return
      }
      if (isAvailable === false) {
        setError('Этот ник уже занят')
        return
      }
    } else {
      if (!password) {
        setError('Введи пароль')
        return
      }
    }

    playClick(sound)
    setBusy(true)
    setError(null)

    try {
      if (hasSupabase) {
        if (mode === 'register') {
          const res = await signUpWithUsername({
            username: usernameCheck.clean,
            password,
            displayName: usernameCheck.clean,
          })
          if (res.ok && res.user) {
            // Синхронизируем с локальным стором
            await registerWithEmail({
              email: `${usernameCheck.clean}@ogonek.app`,
              displayName: usernameCheck.clean,
              password,
            })
            finish(res.user.id, `Добро пожаловать в Огонёк, @${usernameCheck.clean}!`)
          } else {
            setError(res.error || 'Не удалось зарегистрироваться')
          }
        } else {
          const res = await signInWithUsername({
            username: usernameCheck.clean,
            password,
          })
          if (res.ok && res.user) {
            await signInWithEmail(`${usernameCheck.clean}@ogonek.app`, password)
            finish(res.user.id, `С возвращением, @${usernameCheck.clean}!`)
          } else {
            setError(res.error || 'Неверный ник или пароль')
          }
        }
      } else {
        // Локальный автономный режим (без ключей Supabase)
        if (mode === 'register') {
          const res = await registerWithEmail({
            email: `${usernameCheck.clean}@ogonek.app`,
            displayName: usernameCheck.clean,
            password,
          })
          if (res.ok && res.accountId) {
            finish(res.accountId, `Аккаунт @${usernameCheck.clean} создан локально`)
          } else {
            setError(res.error || 'Не удалось создать локальный аккаунт')
          }
        } else {
          const res = await signInWithEmail(`${usernameCheck.clean}@ogonek.app`, password)
          if (res.ok && res.accountId) {
            finish(res.accountId, `Вход выполнен: @${usernameCheck.clean}`)
          } else {
            setError(res.error || 'Неверный ник или пароль')
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Произошла непредвиденная ошибка')
    } finally {
      setBusy(false)
    }
  }

  // Блокировка кнопки отправки
  const isSubmitDisabled =
    busy ||
    !usernameCheck.valid ||
    (mode === 'register' && (!passwordCheck.valid || isAvailable === false || checkingUsername)) ||
    (mode === 'signin' && !password)

  return (
    <div className={`auth-form auth-form--${variant} max-w-md mx-auto w-full`}>
      {/* Вкладки «Вход» / «Регистрация» в стиле X.com */}
      <div className="flex border-b border-[var(--border)] mb-5" role="tablist" aria-label="Вход или регистрация">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signin'}
          onClick={() => {
            playClick(sound)
            setMode('signin')
            setError(null)
          }}
          className={`flex-1 py-3 text-[15px] font-bold text-center border-b-2 transition-colors ${
            mode === 'signin'
              ? 'border-[var(--accent)] text-[var(--text)]'
              : 'border-transparent text-[var(--text-3)] hover:text-[var(--text-2)]'
          }`}
        >
          Вход
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          onClick={() => {
            playClick(sound)
            setMode('register')
            setError(null)
          }}
          className={`flex-1 py-3 text-[15px] font-bold text-center border-b-2 transition-colors ${
            mode === 'register'
              ? 'border-[var(--accent)] text-[var(--text)]'
              : 'border-transparent text-[var(--text-3)] hover:text-[var(--text-2)]'
          }`}
        >
          Регистрация
        </button>
      </div>

      {/* Ошибка */}
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

      {/* Форма логина и пароля */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {/* Поле @никнейм */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-bold text-[var(--text-2)] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <UserRound size={14} /> Никнейм
            </span>
            {mode === 'register' && username.length > 0 && (
              <span className="text-[12px] font-normal">
                {checkingUsername ? (
                  <span className="text-[var(--text-3)] flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin" /> проверяем…
                  </span>
                ) : isAvailable === true ? (
                  <span className="text-emerald-500 flex items-center gap-1 font-bold">
                    <Check size={12} /> свободен
                  </span>
                ) : isAvailable === false ? (
                  <span className="text-rose-400 flex items-center gap-1 font-bold">
                    <X size={12} /> занят
                  </span>
                ) : null}
              </span>
            )}
          </label>

          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-[var(--text-3)] font-mono text-[15px] select-none">
              @
            </span>
            <input
              type="text"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              placeholder="alex_cerna"
              onChange={(e) => {
                const clean = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                setUsername(clean)
                if (error) setError(null)
              }}
              className="w-full pl-8 pr-4 py-3 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text)] text-[15px] outline-none focus:border-[var(--accent)] transition-colors font-mono"
            />
          </div>
          <p className="text-[11px] text-[var(--text-3)] px-1">
            От 3 до 20 символов: латиница, цифры и _
          </p>
        </div>

        {/* Поле Пароль */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-bold text-[var(--text-2)] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <KeyRound size={14} /> Пароль
            </span>
            {mode === 'register' && password.length > 0 && (
              <span className={`text-[12px] font-bold ${
                passwordCheck.score <= 2 ? 'text-amber-500' : 'text-emerald-500'
              }`}>
                {passwordCheck.label}
              </span>
            )}
          </label>

          <div className="relative flex items-center">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              value={password}
              placeholder={mode === 'register' ? 'Минимум 8 символов' : 'Твой пароль'}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError(null)
              }}
              className="w-full pl-4 pr-11 py-3 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text)] text-[15px] outline-none focus:border-[var(--accent)] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Индикатор сложности пароля при регистрации */}
          {mode === 'register' && password.length > 0 && (
            <div className="flex gap-1 h-1 mt-1 px-1">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <div
                  key={lvl}
                  className={`flex-1 rounded-full transition-colors ${
                    lvl <= passwordCheck.score
                      ? passwordCheck.score <= 2
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                      : 'bg-[var(--border)]'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Главная кнопка Вход / Зарегистрироваться */}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="x-primary-btn w-full py-3.5 px-5 rounded-2xl text-[15px] font-bold mt-2 shadow-md disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>{mode === 'register' ? 'Создаём аккаунт…' : 'Входим…'}</span>
            </>
          ) : (
            <span>{mode === 'register' ? 'Зарегистрироваться' : 'Войти'}</span>
          )}
        </button>
      </form>

      {/* Кнопка Google OAuth (показывается ТОЛЬКО если провайдер включён) */}
      {googleEnabled && (
        <div className="mt-4 pt-4 border-t border-[var(--border)] flex flex-col gap-2">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleBusy}
            className="w-full flex items-center justify-center gap-3 py-3 px-5 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-sm transition-all shadow-sm border border-zinc-200"
          >
            {googleBusy ? (
              <Loader2 size={17} className="animate-spin text-zinc-700" />
            ) : (
              <GoogleIcon size={17} />
            )}
            <span>Войти через Google</span>
          </button>
        </div>
      )}

      {/* Демо-вход для гостя / автотестов */}
      {isDemo && (
        <div className="mt-4 pt-3 border-t border-[var(--border)] text-center">
          <button
            type="button"
            onClick={handleGuest}
            className="text-[13px] text-amber-500 hover:text-amber-400 font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <Sparkles size={14} /> Войти в демо-режиме (без регистрации)
          </button>
        </div>
      )}
    </div>
  )
}

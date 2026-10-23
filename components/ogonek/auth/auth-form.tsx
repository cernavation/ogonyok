'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  Loader2,
  Lock,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  AUTH_PROVIDER_META,
  accountHandle,
  accountSubtitle,
} from '@/lib/ogonek/accounts'
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  evaluatePasswordStrength,
} from '@/lib/ogonek/security'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import {
  isSupabaseConfigured,
  signInWithGoogle,
  signInWithUsername,
  signUpWithUsername,
  usernameToEmail,
} from '@/lib/supabase/client'
import type { AuthAccount } from '@/lib/ogonek/types'
import { AccountAvatar } from './account-avatar'
import { GoogleIcon } from './google-icon'

export type AuthMode = 'signin' | 'register'

type Props = {
  /** Экранная (полноэкранная) или модальная компоновка */
  variant?: 'screen' | 'modal'
  initialMode?: AuthMode
  onAuthenticated?: (accountId: string) => void
  onNotify?: (message: string) => void
}

const LEVEL_DESCRIPTIONS = [
  { level: 1, label: '1 гордость + 1 благодарность', hint: 'Лёгкий старт — 2 минуты в день' },
  { level: 2, label: '2 гордости + 2 благодарности', hint: 'Комфортный ритм' },
  { level: 3, label: '3 гордости + 3 благодарности', hint: 'Оптимальный баланс (рекомендуется)' },
  { level: 4, label: '4 гордости + 4 благодарности', hint: 'Высокая планка дисциплины' },
  { level: 5, label: '5 гордостей + 5 благодарностей', hint: 'Максимальный фокус — самый жёсткий' },
]

export function AuthForm({ variant = 'screen', initialMode = 'signin', onAuthenticated, onNotify }: Props) {
  const {
    state,
    registerWithEmail,
    signInWithEmail,
    continueAsGuest,
    switchAccount,
  } = useOgonekStore()
  const sound = state.soundEnabled
  const accounts = state.auth.accounts
  const activeId = state.auth.activeAccountId

  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [chosenLevel, setChosenLevel] = useState<number>(3)
  const [showPassword, setShowPassword] = useState(false)
  const [showAlternativeLogin, setShowAlternativeLogin] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasSupabase = isSupabaseConfigured()
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === '1'

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
      if (!hasSupabase) {
        // Если ключи ещё не добавлены — подсказываем
        setGoogleBusy(false)
        setError('Supabase пока не настроен. Добавьте ключи в .env.local согласно ИНСТРУКЦИЯ_GOOGLE.md.')
        return
      }
      const res = await signInWithGoogle()
      if (!res.ok) {
        setGoogleBusy(false)
        setError(res.error || 'Не удалось открыть окно входа Google')
      }
      // При успехе Supabase OAuth перенаправит браузер в Google
    } catch (err: any) {
      setGoogleBusy(false)
      setError(err?.message || 'Ошибка запуска Google OAuth')
    }
  }

  const switchMode = (next: AuthMode) => {
    if (next === mode) return
    playClick(sound)
    setMode(next)
    setError(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const cleanNick = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
    if (cleanNick.length < 3) {
      setError('Никнейм должен быть не короче 3 символов (латиница, цифры, _ или -)')
      return
    }
    if (password.length < 6) {
      setError('Пароль должен содержать не менее 6 символов')
      return
    }

    setBusy(true)

    // 1. Если подключён Supabase — авторизуем через Supabase Auth
    if (hasSupabase) {
      if (mode === 'register') {
        const res = await signUpWithUsername({
          username: cleanNick,
          password,
          level: chosenLevel,
          displayName: cleanNick,
        })
        setBusy(false)
        if (res.ok && res.user) {
          await registerWithEmail({
            displayName: cleanNick,
            email: usernameToEmail(cleanNick),
            password,
          }).catch(() => null)
          finish(res.user.id, `Добро пожаловать в Огонёк, @${cleanNick}!`)
        } else {
          setError(res.error || 'Не удалось зарегистрироваться в базе данных')
        }
        return
      } else {
        const res = await signInWithUsername({
          username: cleanNick,
          password,
        })
        setBusy(false)
        if (res.ok && res.user) {
          await signInWithEmail(usernameToEmail(cleanNick), password).catch(() => null)
          finish(res.user.id, `С возвращением, @${cleanNick}!`)
        } else {
          setError(res.error || 'Неверный никнейм или пароль')
        }
        return
      }
    }

    // 2. Локальный fallback (если ключи Supabase не указаны)
    const simulatedEmail = usernameToEmail(cleanNick)
    if (mode === 'register') {
      const result = await registerWithEmail({
        displayName: cleanNick,
        email: simulatedEmail,
        password,
      })
      setBusy(false)
      if (result.ok && result.accountId) {
        finish(result.accountId, `Аккаунт создан (@${cleanNick})`)
      } else {
        setError(result.error ?? 'Не удалось создать локальный аккаунт')
      }
      return
    }

    const result = await signInWithEmail(simulatedEmail, password)
    setBusy(false)
    if (result.ok && result.accountId) {
      finish(result.accountId, `Вы вошли как @${cleanNick}`)
    } else {
      setError(result.error ?? 'Неверный никнейм или пароль')
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

  const handleQuickLogin = (account: AuthAccount) => {
    playClick(sound)
    const ok = switchAccount(account.id)
    if (ok) {
      finish(account.id, `Вы вошли как ${account.snapshot.displayName}`)
    }
  }

  const quickAccounts = accounts.filter((a) => a.id !== activeId).slice(0, 3)

  return (
    <div className={`auth-form auth-form--${variant}`}>
      {/* ГЛАВНОЕ ДЕЙСТВИЕ: Войти через Google */}
      <div className="flex flex-col gap-3 mb-4">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleBusy}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-sm transition-all shadow-md active:scale-[0.99] disabled:opacity-70 border border-zinc-200"
        >
          {googleBusy ? (
            <>
              <Loader2 size={18} className="animate-spin text-zinc-700" />
              <span>Подключение к Google...</span>
            </>
          ) : (
            <>
              <GoogleIcon size={18} />
              <span>Войти через Google</span>
            </>
          )}
        </button>

        <p className="text-center text-xs text-white/50 leading-relaxed px-2">
          Вход без пароля. Профиль и летопись привязываются к твоему Google-аккаунту.
        </p>
      </div>

      {error && (
        <motion.p
          className="auth-error text-xs p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-3"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
        >
          {error}
        </motion.p>
      )}

      {/* ДЕМО-РЕЖИМ / АВТОТЕСТЫ */}
      {isDemo && (
        <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-400 mb-2">
            <Sparkles size={14} /> Тестовый демо-режим активен
          </div>
          <button
            type="button"
            onClick={handleGuest}
            className="w-full py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold transition-colors"
          >
            Войти без Google (для автотестов)
          </button>
        </div>
      )}

      {/* РЕЗЕРВ: «Другие способы входа» (скрыто за спойлером) */}
      <div className="pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={() => setShowAlternativeLogin(!showAlternativeLogin)}
          className="w-full flex items-center justify-between py-2 text-xs text-white/50 hover:text-white/80 transition-colors"
        >
          <span>Другие способы входа</span>
          {showAlternativeLogin ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <AnimatePresence>
          {showAlternativeLogin && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden pt-3 flex flex-col gap-3"
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="auth-tabs" role="tablist" aria-label="Вход или регистрация">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signin'}
                  className={mode === 'signin' ? 'is-active' : ''}
                  onClick={() => switchMode('signin')}
                >
                  Войти
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'register'}
                  className={mode === 'register' ? 'is-active' : ''}
                  onClick={() => switchMode('register')}
                >
                  Регистрация
                </button>
              </div>

              {/* Никнейм */}
              <label className="auth-field">
                <span>
                  <UserRound size={13} /> Никнейм
                </span>
                <div className="auth-input">
                  <input
                    type="text"
                    value={username}
                    autoComplete="username"
                    autoCapitalize="none"
                    placeholder="Например: alex_cerna"
                    onChange={(event) => {
                      setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                      if (error) setError(null)
                    }}
                  />
                </div>
              </label>

              {/* Пароль */}
              <label className="auth-field">
                <span>
                  <KeyRound size={13} /> Пароль
                </span>
                <div className="auth-input">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    placeholder="Минимум 6 символов"
                    onChange={(event) => {
                      setPassword(event.target.value)
                      if (error) setError(null)
                    }}
                  />
                  <button
                    type="button"
                    className="auth-input__toggle"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              {mode === 'register' && (
                <div className="auth-field">
                  <span className="flex items-center gap-1 font-medium text-[13px] mb-1.5">
                    <Flame size={14} className="text-[var(--accent)]" /> Уровень сложности
                  </span>
                  <div className="grid grid-cols-5 gap-2 mb-2" role="group">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setChosenLevel(lvl)}
                        className={`py-2 rounded-xl text-[13px] font-bold transition-all border min-h-[36px] flex items-center justify-center ${
                          chosenLevel === lvl
                            ? 'bg-[var(--accent)] text-[var(--accent-text)] font-extrabold border-[var(--accent)] shadow-sm'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                  <p className="text-[12px] text-white/60">
                    {LEVEL_DESCRIPTIONS[chosenLevel - 1]?.label}
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="auth-submit min-h-[42px] text-sm font-bold"
                disabled={busy}
              >
                {busy ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Подождите...
                  </>
                ) : mode === 'register' ? (
                  'Зарегистрироваться'
                ) : (
                  'Войти по нику'
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Быстрый вход в уже сохранённые профили */}
      {quickAccounts.length > 0 && (
        <div className="auth-quick mt-4">
          <p className="auth-quick__title">Сохранённые профили:</p>
          <div className="auth-quick__list">
            {quickAccounts.map((account) => (
              <button
                key={account.id}
                type="button"
                className="auth-quick__item"
                onClick={() => handleQuickLogin(account)}
              >
                <AccountAvatar account={account} size={30} />
                <div className="auth-quick__info">
                  <strong>{account.snapshot.displayName}</strong>
                  <span>{accountHandle(account)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

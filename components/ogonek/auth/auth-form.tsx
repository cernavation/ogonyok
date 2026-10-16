'use client'

import { motion } from 'framer-motion'
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  AUTH_PROVIDER_META,
  DEMO_ACCOUNT_PASSWORD,
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

const GOOGLE_IDENTITIES: { email: string; displayName: string; hint: string }[] = [
  { email: 'daniil.sokolov@gmail.com', displayName: 'Даниил Соколов', hint: 'Сохранённый аккаунт' },
  { email: 'sasha.volkova@gmail.com', displayName: 'Саша Волкова', hint: 'Другой аккаунт' },
]

/**
 * ЭТАП 18 — ФОРМА ВХОДА И РЕГИСТРАЦИИ.
 * Общая для полноэкранного AuthScreen и модального AuthModal:
 * почта + пароль, Google OAuth (симуляция), гостевой режим и быстрый
 * вход в демо-личности. Все кнопки реально меняют состояние стора.
 */
export function AuthForm({ variant = 'screen', initialMode = 'signin', onAuthenticated, onNotify }: Props) {
  const {
    state,
    registerWithEmail,
    signInWithEmail,
    signInWithGoogle,
    continueAsGuest,
    switchAccount,
  } = useOgonekStore()
  const sound = state.soundEnabled
  const accounts = state.auth.accounts
  const activeId = state.auth.activeAccountId

  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [googleOpen, setGoogleOpen] = useState(false)

  const strength = useMemo(() => evaluatePasswordStrength(password), [password])
  const matches = password.length > 0 && password === confirm

  const switchMode = (next: AuthMode) => {
    if (next === mode) return
    playClick(sound)
    setMode(next)
    setError(null)
    setGoogleOpen(false)
  }

  const finish = (accountId: string, message: string) => {
    playSuccess(sound)
    onNotify?.(message)
    onAuthenticated?.(accountId)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (mode === 'register') {
      if (!displayName.trim()) {
        setError('Укажите имя или ник')
        return
      }
      if (password !== confirm) {
        setError('Пароли не совпадают')
        return
      }
      if (!agreed) {
        setError('Подтвердите согласие с условиями и приватностью')
        return
      }
      setBusy(true)
      const result = await registerWithEmail({ displayName, email, password })
      setBusy(false)
      if (result.ok && result.accountId) {
        finish(result.accountId, `Аккаунт создан. Добро пожаловать, ${displayName.trim()}!`)
      } else {
        setError(result.error ?? 'Не удалось создать аккаунт')
      }
      return
    }

    setBusy(true)
    const result = await signInWithEmail(email, password)
    setBusy(false)
    if (result.ok && result.accountId) {
      finish(result.accountId, 'Вы вошли в Огонёк')
    } else {
      setError(result.error ?? 'Не удалось войти')
    }
  }

  const handleGoogle = (identity: { email: string; displayName: string }) => {
    playClick(sound)
    const result = signInWithGoogle(identity)
    if (result.ok && result.accountId) {
      finish(result.accountId, `Вход через Google: ${identity.email}`)
    } else {
      setError('Не удалось войти через Google')
    }
  }

  const handleGuest = () => {
    playClick(sound)
    const result = continueAsGuest()
    if (result.ok && result.accountId) {
      finish(result.accountId, 'Включён гостевой демо-режим')
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
    <form className={`auth-form auth-form--${variant}`} onSubmit={handleSubmit} noValidate>
      {variant === 'modal' && (
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
      )}

      <p className="auth-intro">
        <Lock size={13} className="inline -mt-0.5 mr-1" />
        {mode === 'register'
          ? 'Создайте аккаунт — данные остаются на устройстве, пароль хранится только как SHA-256 хэш.'
          : 'Войдите по почте и паролю, через Google или включите гостевой демо-режим.'}
      </p>

      {mode === 'register' && (
        <label className="auth-field">
          <span>
            <UserRound size={13} /> Имя или ник
          </span>
          <div className="auth-input">
            <input
              type="text"
              value={displayName}
              autoComplete="name"
              placeholder="Как вас зовут?"
              onChange={(event) => {
                setDisplayName(event.target.value)
                if (error) setError(null)
              }}
            />
          </div>
        </label>
      )}

      <label className="auth-field">
        <span>
          <Mail size={13} /> Почта
        </span>
        <div className="auth-input">
          <input
            type="email"
            value={email}
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            onChange={(event) => {
              setEmail(event.target.value)
              if (error) setError(null)
            }}
          />
        </div>
      </label>

      <label className="auth-field">
        <span>
          <KeyRound size={13} /> Пароль
        </span>
        <div className="auth-input">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            placeholder={`От ${MIN_PASSWORD_LENGTH} до ${MAX_PASSWORD_LENGTH} символов`}
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
        <>
          <div className={`pw-strength pw-strength--${strength.score}`}>
            <div className="pw-strength__bars" aria-hidden="true">
              {[0, 1, 2, 3].map((index) => (
                <i key={index} className={index < strength.score ? 'is-on' : ''} />
              ))}
            </div>
            <span className="pw-strength__label">{password ? strength.label : 'Надёжность пароля'}</span>
          </div>

          <label className="auth-field">
            <span>
              <ShieldCheck size={13} /> Повторите пароль
            </span>
            <div className={`auth-input ${confirm && !matches ? 'is-invalid' : ''}`}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                autoComplete="new-password"
                placeholder="Повторите пароль"
                onChange={(event) => {
                  setConfirm(event.target.value)
                  if (error) setError(null)
                }}
              />
              {matches && <Check size={16} className="auth-check" />}
            </div>
          </label>

          <label className="auth-agree">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => {
                setAgreed(event.target.checked)
                if (error) setError(null)
              }}
            />
            <span>
              Согласен с локальным хранением данных и правилами Огонька. Это демо-симуляция.
            </span>
          </label>
        </>
      )}

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="auth-submit" disabled={busy}>
        {busy ? (
          <Loader2 size={17} className="animate-spin" />
        ) : mode === 'register' ? (
          <Sparkles size={17} />
        ) : (
          <ArrowRight size={17} />
        )}
        <span>{mode === 'register' ? 'Создать аккаунт' : 'Войти в Огонёк'}</span>
      </button>

      <div className="auth-divider">
        <span>или</span>
      </div>

      <button type="button" className="auth-google" onClick={() => setGoogleOpen((v) => !v)}>
        <GoogleIcon size={18} />
        <span>Продолжить с Google</span>
      </button>

      {googleOpen && (
        <motion.div
          className="auth-google-pop"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="auth-google-pop__head">
            <GoogleIcon size={16} />
            <b>Выберите аккаунт Google</b>
          </div>
          {GOOGLE_IDENTITIES.map((identity) => (
            <button
              key={identity.email}
              type="button"
              className="auth-google-pop__item"
              onClick={() => handleGoogle(identity)}
            >
              <span className="auth-google-pop__avatar">
                {identity.displayName.charAt(0).toUpperCase()}
              </span>
              <span className="auth-google-pop__meta">
                <b>{identity.displayName}</b>
                <small>{identity.email}</small>
              </span>
              <em>{identity.hint}</em>
            </button>
          ))}
          <p className="auth-google-pop__note">
            Симуляция OAuth: реальный Google-попап не открывается, аккаунт создаётся на устройстве.
          </p>
        </motion.div>
      )}

      <button type="button" className="auth-guest" onClick={handleGuest}>
        <Sparkles size={15} />
        <span>Гостевой демо-режим</span>
      </button>

      {variant === 'screen' && (
        <p className="auth-switch">
          {mode === 'signin' ? (
            <>
              Нет аккаунта?{' '}
              <button type="button" onClick={() => switchMode('register')}>
                Зарегистрироваться
              </button>
            </>
          ) : (
            <>
              Уже есть аккаунт?{' '}
              <button type="button" onClick={() => switchMode('signin')}>
                Войти
              </button>
            </>
          )}
        </p>
      )}

      {quickAccounts.length > 0 && (
        <div className="auth-quick">
          <div className="auth-quick__head">
            <b>Быстрый вход в демо-личности</b>
            <small>Переключение в один клик</small>
          </div>
          <div className="auth-quick__list">
            {quickAccounts.map((account) => (
              <button
                key={account.id}
                type="button"
                className="auth-quick__chip"
                onClick={() => handleQuickLogin(account)}
              >
                <AccountAvatar account={account} size={26} />
                <span className="auth-quick__meta">
                  <b>{account.snapshot.displayName}</b>
                  <small>
                    {accountSubtitle(account)} · {AUTH_PROVIDER_META[account.provider].short}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'signin' && (
        <p className="auth-demo-hint">
          Демо-доступ: <code>{'alexei@memernity.com'}</code> · пароль{' '}
          <code>{DEMO_ACCOUNT_PASSWORD}</code>
        </p>
      )}

      {activeId && mode === 'register' && (
        <p className="auth-demo-hint">
          Сейчас активен: <b>{accountHandle(accounts.find((a) => a.id === activeId) ?? accounts[0])}</b>
        </p>
      )}
    </form>
  )
}

'use client'

import { motion } from 'framer-motion'
import { Eye, EyeOff, Fingerprint, KeyRound, Loader2, LockKeyhole, ShieldCheck, Timer } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  authenticateWithBiometric,
  attemptsLeft,
  computeLockout,
  hasAccountPassword,
  hasBiometric,
  hasSecurityPin,
} from '@/lib/ogonek/security'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { getInitials } from '@/lib/ogonek/initials'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { usePhotoUrl } from '@/lib/ogonek/use-photo-url'
import { PinPad } from './pin-pad'

type Props = {
  onUnlocked: () => void
  /** Причина блокировки: запуск, бездействие или ручная блокировка */
  reason?: 'open' | 'idle' | 'manual'
}

const REASON_TEXT: Record<'open' | 'idle' | 'manual', string> = {
  open: 'Введите код, чтобы открыть личный журнал силы',
  idle: 'Приложение заблокировано после бездействия',
  manual: 'Журнал заблокирован вручную',
}

/**
 * ЭТАП 15 — ЭКРАН БЛОКИРОВКИ ПРИЛОЖЕНИЯ.
 * Полностью перекрывает интерфейс, пока пользователь не подтвердит личность
 * PIN-кодом, паролем аккаунта или биометрией Touch ID / Face ID (WebAuthn).
 * Защищён от перебора: после 5 промахов вход временно закрывается.
 */
export function AppLockScreen({ onUnlocked, reason = 'open' }: Props) {
  const { state, verifyPin, verifyPassword, unlockWithBiometric } = useOgonekStore()
  const security = state.security
  const sound = state.soundEnabled
  const avatarUrl = usePhotoUrl(state.profile.avatarImage)

  const pinAvailable = hasSecurityPin(security)
  const passwordAvailable = hasAccountPassword(security)
  const biometricAvailable = hasBiometric(security)

  const [method, setMethod] = useState<'pin' | 'password'>(pinAvailable ? 'pin' : 'password')
  const [pin, setPin] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [bioBusy, setBioBusy] = useState(false)
  const [bioError, setBioError] = useState<string | null>(null)
  const [autoTried, setAutoTried] = useState(false)

  const lockout = useMemo(
    () => computeLockout(security.lockedUntilISO, new Date(now)),
    [security.lockedUntilISO, now]
  )
  const remainingSeconds = Math.ceil(lockout.remainingMs / 1000)
  const left = attemptsLeft(security.failedAttempts)

  // Пока действует временная блокировка — обновляем обратный отсчёт
  useEffect(() => {
    if (!lockout.isLocked) return
    const timer = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(timer)
  }, [lockout.isLocked])

  const initials = useMemo(() => {
    return getInitials(state.profile.displayName, state.profile.username)
  }, [state.profile.displayName, state.profile.username])

  const triggerShake = useCallback(() => {
    setShaking(true)
    window.setTimeout(() => setShaking(false), 520)
  }, [])

  const failWith = useCallback(
    (message: string) => {
      setError(message)
      setPin('')
      setPassword('')
      triggerShake()
      playClick(sound)
    },
    [sound, triggerShake]
  )

  const submitPin = useCallback(
    async (candidate: string) => {
      if (busy || lockout.isLocked) return
      setBusy(true)
      setError(null)
      const ok = await verifyPin(candidate)
      setBusy(false)
      if (ok) {
        playSuccess(sound)
        onUnlocked()
      } else {
        failWith('Неверный PIN-код')
      }
    },
    [busy, lockout.isLocked, verifyPin, sound, onUnlocked, failWith]
  )

  const submitPassword = useCallback(async () => {
    if (busy || lockout.isLocked || !password) return
    setBusy(true)
    setError(null)
    const ok = await verifyPassword(password)
    setBusy(false)
    if (ok) {
      playSuccess(sound)
      onUnlocked()
    } else {
      failWith('Неверный пароль')
    }
  }, [busy, lockout.isLocked, password, verifyPassword, sound, onUnlocked, failWith])

  const submitBiometric = useCallback(async () => {
    if (bioBusy || lockout.isLocked || !security.biometricCredentialId) return
    setBioBusy(true)
    setBioError(null)
    const result = await authenticateWithBiometric(security.biometricCredentialId)
    setBioBusy(false)
    if (result.ok) {
      unlockWithBiometric()
      playSuccess(sound)
      onUnlocked()
    } else {
      setBioError(result.error ?? 'Не удалось подтвердить биометрию')
    }
  }, [bioBusy, lockout.isLocked, security.biometricCredentialId, unlockWithBiometric, sound, onUnlocked])

  // Если биометрия — единственный способ, предлагаем её сразу при открытии
  useEffect(() => {
    if (autoTried) return
    if (biometricAvailable && !pinAvailable && !passwordAvailable && !lockout.isLocked) {
      setAutoTried(true)
      void submitBiometric()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <motion.div
      className="app-lock-screen"
      role="dialog"
      aria-modal="true"
      aria-label="Огонёк заблокирован"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className={`app-lock-card ${shaking ? 'is-shaking' : ''}`}>
        <span className="app-lock-flame" aria-hidden="true">
          🔥
        </span>
        <p className="app-lock-brand">Огонёк</p>

        <span
          className="app-lock-avatar"
          style={avatarUrl ? undefined : { background: state.profile.avatarColor }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" />
          ) : (
            <span>{initials}</span>
          )}
        </span>

        <h1 className="app-lock-name">{state.profile.displayName || 'Огонёк'}</h1>
        <p className="app-lock-reason">
          <LockKeyhole size={13} /> {REASON_TEXT[reason]}
        </p>

        {lockout.isLocked ? (
          <div className="app-lock-lockout" role="alert">
            <Timer size={18} />
            <div>
              <b>Слишком много попыток</b>
              <span>Вход временно заблокирован. Повторите через {remainingSeconds} с.</span>
            </div>
          </div>
        ) : (
          <>
            {(pinAvailable || passwordAvailable) && (
              <div className="app-lock-methods" role="tablist" aria-label="Способ входа">
                {pinAvailable && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={method === 'pin'}
                    className={`app-lock-method ${method === 'pin' ? 'is-active' : ''}`}
                    onClick={() => {
                      setMethod('pin')
                      setError(null)
                    }}
                  >
                    <KeyRound size={14} /> PIN-код
                  </button>
                )}
                {passwordAvailable && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={method === 'password'}
                    className={`app-lock-method ${method === 'password' ? 'is-active' : ''}`}
                    onClick={() => {
                      setMethod('password')
                      setError(null)
                    }}
                  >
                    <ShieldCheck size={14} /> Пароль
                  </button>
                )}
              </div>
            )}

            {method === 'pin' && pinAvailable ? (
              <PinPad
                value={pin}
                onChange={(next) => {
                  setPin(next)
                  if (error) setError(null)
                }}
                onComplete={submitPin}
                disabled={busy}
                error={error}
                size="lg"
                hint="4-значный код быстрого входа"
              />
            ) : (
              <form
                className="app-lock-password"
                onSubmit={(event) => {
                  event.preventDefault()
                  void submitPassword()
                }}
              >
                <div className="app-lock-password__field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      if (error) setError(null)
                    }}
                    placeholder="Пароль аккаунта"
                    autoComplete="current-password"
                    aria-label="Пароль аккаунта"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {error && (
                  <p className="app-lock-error" role="alert">
                    {error}
                  </p>
                )}
                <button type="submit" className="app-lock-submit" disabled={busy || !password}>
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  <span>Открыть журнал</span>
                </button>
              </form>
            )}

            {biometricAvailable && (
              <button
                type="button"
                className="app-lock-biometric"
                onClick={() => void submitBiometric()}
                disabled={bioBusy}
              >
                {bioBusy ? <Loader2 size={20} className="animate-spin" /> : <Fingerprint size={20} />}
                <span>{security.biometricLabel || 'Face ID / Touch ID'}</span>
              </button>
            )}

            {bioError && (
              <p className="app-lock-error" role="alert">
                {bioError}
              </p>
            )}

            {pinAvailable && passwordAvailable && method === 'pin' && (
              <button
                type="button"
                className="app-lock-link"
                onClick={() => {
                  setMethod('password')
                  setError(null)
                }}
              >
                Забыли PIN? Войти паролем
              </button>
            )}

            {left <= 2 && security.failedAttempts > 0 && (
              <p className="app-lock-warning" role="alert">
                Осталось попыток: {left}
              </p>
            )}
          </>
        )}

        <p className="app-lock-footnote">
          <ShieldCheck size={12} /> Данные хранятся только на этом устройстве
        </p>
      </div>
    </motion.div>
  )
}

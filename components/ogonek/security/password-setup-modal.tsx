'use client'

import { Check, Eye, EyeOff, KeyRound, Loader2, ShieldAlert, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  evaluatePasswordStrength,
  isValidPassword,
  verifySecret,
} from '@/lib/ogonek/security'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { ModalShell } from '../modal-shell'

type Props = {
  onClose: () => void
  onNotify: (message: string) => void
}

/**
 * ЭТАП 15 — ПАРОЛЬ АККАУНТА.
 * Установка, смена и удаление пароля. Показывает живой индикатор надёжности
 * и требует подтверждения текущим паролем при смене/удалении.
 */
export function PasswordSetupModal({ onClose, onNotify }: Props) {
  const { state, setAccountPassword, clearAccountPassword } = useOgonekStore()
  const security = state.security
  const hasPassword = Boolean(security.passwordHash && security.passwordSalt)

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const strength = useMemo(() => evaluatePasswordStrength(next), [next])
  const matches = next.length > 0 && next === confirm

  const handleSubmit = async () => {
    setError(null)
    if (!isValidPassword(next)) {
      setError(`Пароль должен быть от ${MIN_PASSWORD_LENGTH} до ${MAX_PASSWORD_LENGTH} символов`)
      return
    }
    if (!matches) {
      setError('Пароли не совпадают')
      return
    }

    setBusy(true)
    if (hasPassword) {
      const validCurrent = await verifySecret(current, security.passwordSalt, security.passwordHash)
      if (!validCurrent) {
        setBusy(false)
        setError('Неверный текущий пароль')
        return
      }
    }
    const result = await setAccountPassword(next)
    setBusy(false)
    if (result.ok) {
      playSuccess(state.soundEnabled)
      onNotify(hasPassword ? 'Пароль аккаунта изменён' : 'Пароль аккаунта установлен')
      onClose()
    } else {
      setError(result.error ?? 'Не удалось сохранить пароль')
    }
  }

  const handleRemove = async () => {
    if (typeof window === 'undefined') return
    if (!window.confirm('Удалить пароль аккаунта? Вход останется доступен по другим способам.')) return
    setError(null)
    setBusy(true)
    const result = await clearAccountPassword(current)
    setBusy(false)
    if (result.ok) {
      playClick(state.soundEnabled)
      onNotify('Пароль аккаунта удалён')
      onClose()
    } else {
      setError(result.error ?? 'Не удалось удалить пароль')
    }
  }

  return (
    <ModalShell title={hasPassword ? 'Смена пароля аккаунта' : 'Пароль аккаунта'} onClose={onClose}>
      <p className="modal-intro">
        <KeyRound size={13} className="inline -mt-0.5 mr-1" />
        Основной пароль для входа в Огонёк. Служит аварийным способом доступа, если вы забыли
        PIN-код.
      </p>

      {hasPassword && (
        <label className="pw-field">
          <span>Текущий пароль</span>
          <div className="pw-field__input">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              placeholder="Введите текущий пароль"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((value) => !value)}
              aria-label={showCurrent ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </label>
      )}

      <label className="pw-field">
        <span>{hasPassword ? 'Новый пароль' : 'Пароль'}</span>
        <div className="pw-field__input">
          <input
            type={show ? 'text' : 'password'}
            value={next}
            onChange={(event) => {
              setNext(event.target.value)
              if (error) setError(null)
            }}
            placeholder={`От ${MIN_PASSWORD_LENGTH} до ${MAX_PASSWORD_LENGTH} символов`}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShow((value) => !value)}
            aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </label>

      <div className={`pw-strength pw-strength--${strength.score}`}>
        <div className="pw-strength__bars" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => (
            <i key={index} className={index < strength.score ? 'is-on' : ''} />
          ))}
        </div>
        <span className="pw-strength__label">
          {next ? strength.label : 'Надёжность пароля'}
        </span>
      </div>

      {next.length > 0 && strength.hints.length > 0 && (
        <ul className="pw-hints">
          {strength.hints.map((hint) => (
            <li key={hint}>
              <ShieldAlert size={12} /> {hint}
            </li>
          ))}
        </ul>
      )}

      <label className="pw-field">
        <span>Повторите пароль</span>
        <div className={`pw-field__input ${confirm && !matches ? 'is-invalid' : ''}`}>
          <input
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(event) => {
              setConfirm(event.target.value)
              if (error) setError(null)
            }}
            placeholder="Повторите пароль"
            autoComplete="new-password"
          />
          {matches && <Check size={15} className="pw-field__check" />}
        </div>
      </label>

      {error && (
        <p className="pw-error" role="alert">
          {error}
        </p>
      )}

      <footer className="pw-actions">
        {hasPassword ? (
          <button
            type="button"
            className="secondary-btn flex items-center gap-2 text-xs py-2 px-3"
            onClick={() => void handleRemove()}
            disabled={busy}
            style={{ color: '#f4212e', borderColor: 'rgba(244,33,46,0.5)' }}
          >
            <Trash2 size={14} /> Удалить пароль
          </button>
        ) : (
          <span />
        )}

        <button type="button" className="save-button" onClick={() => void handleSubmit()} disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={15} />}
          <span>{hasPassword ? 'Сменить пароль' : 'Сохранить пароль'}</span>
        </button>
      </footer>
    </ModalShell>
  )
}

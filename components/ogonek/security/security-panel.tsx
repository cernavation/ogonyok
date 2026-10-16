'use client'

import {
  AlarmClock,
  BadgeCheck,
  Check,
  Fingerprint,
  KeyRound,
  KeySquare,
  Loader2,
  Lock,
  LockKeyhole,
  LockOpen,
  ShieldAlert,
  ShieldCheck,
  Timer,
  Trash2,
} from 'lucide-react'
import { useMemo, useState, type ComponentType } from 'react'
import {
  AUTO_LOCK_OPTIONS,
  SECURITY_METHOD_META,
  activeUnlockMethods,
  authenticateWithBiometric,
  evaluateSecurityLevel,
  hasAccountPassword,
  hasBiometric,
  hasSecurityPin,
  hasUnlockMethod,
} from '@/lib/ogonek/security'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import type { SecurityAuditKind, SecurityMethod } from '@/lib/ogonek/types'
import { BiometricSetupModal } from './biometric-setup-modal'
import { PasswordSetupModal } from './password-setup-modal'
import { PinSetupModal } from './pin-setup-modal'

type Props = {
  onNotify: (message: string) => void
}

type ModalKind = 'pin' | 'password' | 'biometric' | null

const RING_RADIUS = 52
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

const AUDIT_META: Record<SecurityAuditKind, { icon: ComponentType<{ size?: number }>; color: string }> = {
  'password-set': { icon: KeySquare, color: '#53d3a3' },
  'password-changed': { icon: KeySquare, color: '#53d3a3' },
  'password-removed': { icon: Trash2, color: '#f5b942' },
  'pin-set': { icon: KeyRound, color: '#53d3a3' },
  'pin-changed': { icon: KeyRound, color: '#53d3a3' },
  'pin-removed': { icon: Trash2, color: '#f5b942' },
  'biometric-enabled': { icon: Fingerprint, color: '#53d3a3' },
  'biometric-disabled': { icon: Fingerprint, color: '#f5b942' },
  'lock-enabled': { icon: Lock, color: 'var(--accent)' },
  'lock-disabled': { icon: LockOpen, color: '#f5b942' },
  unlocked: { icon: Check, color: '#53d3a3' },
  'failed-attempt': { icon: ShieldAlert, color: '#f4212e' },
  lockout: { icon: Timer, color: '#f4212e' },
  'lock-now': { icon: LockKeyhole, color: 'var(--accent)' },
}

const METHOD_ICONS: Record<SecurityMethod, ComponentType<{ size?: number }>> = {
  pin: KeyRound,
  biometric: Fingerprint,
  password: KeySquare,
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const diff = Date.now() - then
  const minutes = Math.round(diff / 60_000)
  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} мин назад`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ч назад`
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

/**
 * ЭТАП 15 — РАЗДЕЛ «БЕЗОПАСНОСТЬ И ВХОД».
 * Установка пароля аккаунта, PIN-код быстрого входа, биометрия WebAuthn
 * (Touch ID / Face ID), автоблокировка и экран блокировки приложения.
 */
export function SecurityPanel({ onNotify }: Props) {
  const {
    state,
    setLockOnOpen,
    setPinQuickUnlock,
    setAutoLockMinutes,
    clearSecurityPin,
    setBiometricEnabled,
    resetSecurity,
  } = useOgonekStore()
  const security = state.security
  const sound = state.soundEnabled

  const [modal, setModal] = useState<ModalKind>(null)
  const [testing, setTesting] = useState(false)

  const level = useMemo(() => evaluateSecurityLevel(security), [security])
  const methods = useMemo(() => activeUnlockMethods(security), [security])
  const pinReady = hasSecurityPin(security)
  const biometricReady = hasBiometric(security)
  const passwordReady = hasAccountPassword(security)
  const canLock = hasUnlockMethod(security)

  const handleToggleLock = (next: boolean) => {
    const applied = setLockOnOpen(next)
    playClick(sound)
    if (next && !applied) {
      onNotify('Сначала задайте PIN-код, пароль или включите биометрию')
      setModal('pin')
      return
    }
    onNotify(next ? 'Блокировка при открытии включена' : 'Блокировка при открытии выключена')
  }

  const handleLockNow = () => {
    if (!canLock) {
      onNotify('Нет ни одного способа входа — сначала задайте код')
      setModal('pin')
      return
    }
    playClick(sound)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ogonek:lock-now'))
    }
    onNotify('Журнал заблокирован')
  }

  const handleTestBiometric = async () => {
    if (!security.biometricCredentialId) return
    setTesting(true)
    const result = await authenticateWithBiometric(security.biometricCredentialId)
    setTesting(false)
    if (result.ok) {
      playSuccess(sound)
      onNotify('Биометрия подтверждена — вход работает')
    } else {
      onNotify(result.error ?? 'Не удалось подтвердить биометрию')
    }
  }

  const handleRemovePin = async () => {
    if (typeof window === 'undefined') return
    if (!window.confirm('Убрать PIN-код быстрого входа?')) return
    const result = await clearSecurityPin()
    playClick(sound)
    if (result.ok) onNotify('PIN-код удалён')
    else onNotify(result.error ?? 'Не удалось убрать PIN-код')
  }

  const handleDisableBiometric = () => {
    if (typeof window !== 'undefined' && !window.confirm('Отключить вход по Face ID / Touch ID?')) return
    setBiometricEnabled(false)
    playClick(sound)
    onNotify('Биометрический вход отключён')
  }

  const handleResetSecurity = () => {
    if (typeof window === 'undefined') return
    if (!window.confirm('Полностью снять защиту? Будут удалены пароль, PIN-код и биометрия.')) return
    resetSecurity()
    playClick(sound)
    onNotify('Защита снята — журнал снова открыт')
  }

  const methodCard = (method: SecurityMethod, active: boolean) => {
    const Icon = METHOD_ICONS[method]
    const meta = SECURITY_METHOD_META[method]
    return (
      <article key={method} className={`security-method ${active ? 'is-on' : ''}`}>
        <span className="security-method__icon" aria-hidden="true">
          <Icon size={16} />
        </span>
        <div className="security-method__body">
          <b>
            {meta.label}
            {active && (
              <span className="security-method__badge">
                <Check size={11} /> Активно
              </span>
            )}
          </b>
          <small>
            {method === 'password' && passwordReady && security.passwordUpdatedAtISO
              ? `Обновлён ${formatRelative(security.passwordUpdatedAtISO)}`
              : meta.description}
          </small>
        </div>

        <div className="security-method__actions">
          {method === 'pin' &&
            (active ? (
              <>
                <button type="button" className="sec-mini-btn" onClick={() => setModal('pin')}>
                  Изменить
                </button>
                <button
                  type="button"
                  className="sec-mini-btn sec-mini-btn--danger"
                  onClick={() => void handleRemovePin()}
                  aria-label="Убрать PIN-код"
                >
                  <Trash2 size={13} />
                </button>
              </>
            ) : (
              <button type="button" className="sec-mini-btn sec-mini-btn--accent" onClick={() => setModal('pin')}>
                Задать PIN
              </button>
            ))}

          {method === 'biometric' &&
            (active ? (
              <>
                <button
                  type="button"
                  className="sec-mini-btn"
                  onClick={() => void handleTestBiometric()}
                  disabled={testing}
                >
                  {testing ? <Loader2 size={13} className="animate-spin" /> : <BadgeCheck size={13} />}
                  Проверить
                </button>
                <button
                  type="button"
                  className="sec-mini-btn sec-mini-btn--danger"
                  onClick={handleDisableBiometric}
                  aria-label="Отключить биометрию"
                >
                  <Trash2 size={13} />
                </button>
              </>
            ) : (
              <button
                type="button"
                className="sec-mini-btn sec-mini-btn--accent"
                onClick={() => setModal('biometric')}
              >
                Включить
              </button>
            ))}

          {method === 'password' &&
            (active ? (
              <button type="button" className="sec-mini-btn" onClick={() => setModal('password')}>
                Сменить
              </button>
            ) : (
              <button
                type="button"
                className="sec-mini-btn sec-mini-btn--accent"
                onClick={() => setModal('password')}
              >
                Задать пароль
              </button>
            ))}
        </div>
      </article>
    )
  }

  return (
    <section className="settings-section security-panel" aria-labelledby="security-title">
      <div className="appearance-section-head">
        <div>
          <b id="security-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={16} style={{ color: 'var(--accent)' }} /> Безопасность и Вход
          </b>
          <small>
            {canLock
              ? 'Журнал защищён — вход по коду подтверждается на этом устройстве'
              : 'Личный журнал пока открыт для всех, у кого есть устройство'}
          </small>
        </div>
        <span
          className={`security-state-badge security-state-badge--${level.level}`}
          title={level.label}
        >
          {level.level === 'none' ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
          {level.label}
        </span>
      </div>

      {/* ── Статус-карточка с кольцом защиты ─────────────────────────────── */}
      <div className="security-hero">
        <div className="security-ring" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <circle className="security-ring__track" cx="60" cy="60" r={RING_RADIUS} />
            <circle
              className="security-ring__value"
              cx="60"
              cy="60"
              r={RING_RADIUS}
              style={{
                strokeDasharray: `${(level.percent / 100) * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`,
              }}
            />
          </svg>
          <span className="security-ring__label">
            <b>{level.percent}%</b>
            <small>защита</small>
          </span>
        </div>

        <div className="security-hero__info">
          <b className="security-hero__title">{level.label}</b>
          <p className="security-hero__text">
            Активные способы: {methods.length > 0
              ? methods.map((method) => SECURITY_METHOD_META[method].short).join(' · ')
              : 'нет'}
          </p>
          <div className="security-hero__toggles">
            <span className={`security-chip ${security.lockOnOpen ? 'is-on' : ''}`}>
              <Lock size={12} /> {security.lockOnOpen ? 'Блокировка вкл' : 'Блокировка выкл'}
            </span>
            <span className={`security-chip ${security.autoLockMinutes > 0 ? 'is-on' : ''}`}>
              <AlarmClock size={12} />
              {security.autoLockMinutes > 0 ? `${security.autoLockMinutes} мин простоя` : 'Автоблокировка выкл'}
            </span>
          </div>
        </div>

        <button type="button" className="security-lock-now" onClick={handleLockNow}>
          <LockKeyhole size={15} />
          <span>Заблокировать сейчас</span>
        </button>
      </div>

      {/* ── Способы входа ────────────────────────────────────────────────── */}
      <div className="security-methods">
        {methodCard('pin', pinReady)}
        {methodCard('biometric', biometricReady)}
        {methodCard('password', passwordReady)}
      </div>

      {/* ── Тумблеры ─────────────────────────────────────────────────────── */}
      <div className="security-switches">
        <div className="setting-row">
          <div>
            <b>Блокировать при открытии</b>
            <small>Показывать экран входа каждый раз при запуске приложения</small>
          </div>
          <button
            type="button"
            className={`switch ${security.lockOnOpen ? 'on' : ''}`}
            onClick={() => handleToggleLock(!security.lockOnOpen)}
            aria-label={security.lockOnOpen ? 'Отключить блокировку при открытии' : 'Включить блокировку при открытии'}
            aria-pressed={security.lockOnOpen}
          >
            <i />
          </button>
        </div>

        <div className="setting-row">
          <div>
            <b>Быстрый вход по PIN</b>
            <small>{pinReady ? 'Мгновенный вход 4-значным кодом' : 'Сначала задайте PIN-код выше'}</small>
          </div>
          <button
            type="button"
            className={`switch ${security.pinQuickUnlockEnabled ? 'on' : ''}`}
            onClick={() => {
              if (!pinReady) {
                onNotify('Сначала задайте PIN-код')
                setModal('pin')
                return
              }
              const enabled = setPinQuickUnlock(!security.pinQuickUnlockEnabled)
              playClick(sound)
              if (enabled) onNotify('Быстрый вход по PIN включён')
              else onNotify('Быстрый вход по PIN выключен')
            }}
            aria-label={security.pinQuickUnlockEnabled ? 'Отключить быстрый вход по PIN' : 'Включить быстрый вход по PIN'}
            aria-pressed={security.pinQuickUnlockEnabled}
          >
            <i />
          </button>
        </div>
      </div>

      {/* ── Автоблокировка ───────────────────────────────────────────────── */}
      <div className="security-autolock">
        <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlarmClock size={14} /> Автоблокировка при бездействии
        </b>
        <div className="segmented security-autolock__row" role="radiogroup" aria-label="Автоблокировка">
          {AUTO_LOCK_OPTIONS.map((option) => {
            const active = security.autoLockMinutes === option.minutes
            return (
              <button
                key={option.minutes}
                type="button"
                role="radio"
                aria-checked={active}
                className={active ? 'selected' : ''}
                onClick={() => {
                  if (!canLock && option.minutes > 0) {
                    onNotify('Сначала задайте способ входа')
                    setModal('pin')
                    return
                  }
                  setAutoLockMinutes(option.minutes)
                  playClick(sound)
                  onNotify(option.minutes === 0 ? 'Автоблокировка выключена' : `Автоблокировка через ${option.label} простоя`)
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Журнал безопасности ──────────────────────────────────────────── */}
      <div className="security-audit">
        <div className="appearance-section-head">
          <div>
            <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Timer size={14} /> Журнал безопасности
            </b>
            <small>Последние события входа и настроек защиты</small>
          </div>
        </div>

        {security.auditLog.length === 0 ? (
          <p className="security-audit__empty">События появятся после первого входа по коду или изменения настроек.</p>
        ) : (
          <ul className="security-audit__list">
            {security.auditLog.slice(0, 6).map((event) => {
              const meta = AUDIT_META[event.kind]
              const Icon = meta.icon
              return (
                <li key={event.id}>
                  <span className="security-audit__icon" style={{ color: meta.color }} aria-hidden="true">
                    <Icon size={14} />
                  </span>
                  <span className="security-audit__note">{event.note}</span>
                  <time className="security-audit__time">{formatRelative(event.atISO)}</time>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* ── Опасная зона ─────────────────────────────────────────────────── */}
      {canLock && (
        <div className="security-danger">
          <button type="button" className="security-danger__btn" onClick={handleResetSecurity}>
            <Trash2 size={13} /> Снять всю защиту
          </button>
        </div>
      )}

      {modal === 'pin' && <PinSetupModal onClose={() => setModal(null)} onNotify={onNotify} />}
      {modal === 'password' && <PasswordSetupModal onClose={() => setModal(null)} onNotify={onNotify} />}
      {modal === 'biometric' && <BiometricSetupModal onClose={() => setModal(null)} onNotify={onNotify} />}
    </section>
  )
}

'use client'

import { Check, Fingerprint, Info, Loader2, ScanFace, ShieldAlert, ShieldOff, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  authenticateWithBiometric,
  detectBiometricLabel,
  isPlatformAuthenticatorAvailable,
  isWebAuthnSupported,
  registerBiometricCredential,
} from '@/lib/ogonek/security'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { ModalShell } from '../modal-shell'

type Props = {
  onClose: () => void
  onNotify: (message: string) => void
}

type Support = 'checking' | 'ready' | 'unsupported' | 'no-platform'

/**
 * ЭТАП 15 — БИОМЕТРИЧЕСКИЙ КЛЮЧ WEBAUTHN (TOUCH ID / FACE ID).
 * Регистрирует платформенный ключ браузера и позволяет входить одним касанием.
 */
export function BiometricSetupModal({ onClose, onNotify }: Props) {
  const { state, setBiometricEnabled } = useOgonekStore()
  const security = state.security
  const alreadyEnabled = Boolean(security.biometricEnabled && security.biometricCredentialId)

  const [support, setSupport] = useState<Support>('checking')
  const [busy, setBusy] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      if (!isWebAuthnSupported()) {
        if (!cancelled) setSupport('unsupported')
        return
      }
      const available = await isPlatformAuthenticatorAvailable()
      if (!cancelled) setSupport(available ? 'ready' : 'no-platform')
    }
    void check()
    return () => {
      cancelled = true
    }
  }, [])

  const handleEnable = async () => {
    setError(null)
    setBusy(true)
    const result = await registerBiometricCredential({
      userName: state.profile.username || 'ogonek',
      displayName: state.profile.displayName || 'Огонёк',
    })
    setBusy(false)
    if (result.ok) {
      setBiometricEnabled(true, { id: result.data.credentialId, label: result.data.label })
      playSuccess(state.soundEnabled)
      onNotify(`Биометрия включена: ${result.data.label}`)
      onClose()
    } else {
      setError(result.error)
    }
  }

  const handleVerify = async () => {
    if (!security.biometricCredentialId) return
    setVerified(false)
    setError(null)
    setVerifying(true)
    const result = await authenticateWithBiometric(security.biometricCredentialId)
    setVerifying(false)
    if (result.ok) {
      setVerified(true)
      playSuccess(state.soundEnabled)
      onNotify('Биометрия подтверждена')
    } else {
      setError(result.error ?? 'Не удалось подтвердить биометрию')
    }
  }

  const handleDisable = () => {
    setBiometricEnabled(false)
    playClick(state.soundEnabled)
    onNotify('Биометрический вход отключён')
    onClose()
  }

  return (
    <ModalShell title="Face ID / Touch ID" onClose={onClose}>
      <p className="modal-intro">
        <Fingerprint size={13} className="inline -mt-0.5 mr-1" />
        Браузерный биометрический ключ WebAuthn. Отпечаток или лицо никогда не покидают
        устройство — Огонёк получает только подтверждение «это действительно вы».
      </p>

      <div className="bio-visual" aria-hidden="true">
        <ScanFace size={34} />
        <span className="bio-visual__pulse" />
      </div>

      {support === 'checking' && (
        <p className="bio-status">
          <Loader2 size={15} className="animate-spin" /> Проверяем поддержку на устройстве…
        </p>
      )}

      {support === 'unsupported' && (
        <div className="bio-note bio-note--warn" role="alert">
          <ShieldAlert size={16} />
          <div>
            <b>WebAuthn недоступен</b>
            <span>Этот браузер не поддерживает биометрический вход. Попробуйте Safari или Chrome.</span>
          </div>
        </div>
      )}

      {support === 'no-platform' && (
        <div className="bio-note bio-note--warn" role="alert">
          <ShieldAlert size={16} />
          <div>
            <b>Биометрический ключ не найден</b>
            <span>На устройстве нет Touch ID / Face ID. Включите биометрию в настройках системы.</span>
          </div>
        </div>
      )}

      {support === 'ready' && (
        <div className="bio-note bio-note--ok">
          <Info size={16} />
          <div>
            <b>Устройство поддерживает {detectBiometricLabel()}</b>
            <span>Один взгляд или касание — и журнал открыт. Пароль и PIN останутся запасными способами.</span>
          </div>
        </div>
      )}

      {error && (
        <p className="pw-error" role="alert">
          {error}
        </p>
      )}

      {alreadyEnabled ? (
        <div className="bio-enabled">
          <p className="bio-enabled__row">
            <Check size={15} /> Включено: <strong>{security.biometricLabel || detectBiometricLabel()}</strong>
          </p>
          {security.biometricRegisteredAtISO && (
            <small>
              Зарегистрировано{' '}
              {new Date(security.biometricRegisteredAtISO).toLocaleString('ru-RU', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </small>
          )}
          {verified && (
            <span className="bio-verified">
              <Check size={14} /> Проверка пройдена
            </span>
          )}
        </div>
      ) : null}

      <footer className="bio-actions">
        {alreadyEnabled ? (
          <>
            <button
              type="button"
              className="secondary-btn flex items-center gap-2 text-xs py-2 px-3"
              onClick={() => void handleVerify()}
              disabled={verifying}
            >
              {verifying ? <Loader2 size={14} className="animate-spin" /> : <Fingerprint size={14} />}
              Проверить
            </button>
            <button
              type="button"
              className="secondary-btn flex items-center gap-2 text-xs py-2 px-3"
              onClick={handleDisable}
              style={{ color: '#f4212e', borderColor: 'rgba(244,33,46,0.5)' }}
            >
              <Trash2 size={14} /> Отключить
            </button>
          </>
        ) : (
          <button
            type="button"
            className="save-button w-full"
            onClick={() => void handleEnable()}
            disabled={busy || support !== 'ready'}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Fingerprint size={16} />}
            <span>Включить {detectBiometricLabel()}</span>
          </button>
        )}
      </footer>

      {!alreadyEnabled && support === 'ready' && (
        <p className="bio-footnote">
          <ShieldOff size={12} /> Если вы отключите биометрию позже, ключ будет удалён с этого устройства.
        </p>
      )}
    </ModalShell>
  )
}

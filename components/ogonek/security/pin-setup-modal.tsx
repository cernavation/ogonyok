'use client'

import { ArrowLeft, Check, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { PIN_LENGTH } from '@/lib/ogonek/security'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { ModalShell } from '../modal-shell'
import { PinPad } from './pin-pad'

type Props = {
  onClose: () => void
  onNotify: (message: string) => void
}

type Step = 'verify' | 'create' | 'confirm'

/**
 * ЭТАП 15 — УСТАНОВКА И СМЕНА 4-ЗНАЧНОГО PIN-КОДА.
 * Если PIN уже задан — сначала просим текущий, затем дважды новый.
 */
export function PinSetupModal({ onClose, onNotify }: Props) {
  const { state, setSecurityPin, verifyPin } = useOgonekStore()
  const hasPin = Boolean(state.security.pinHash && state.security.pinSalt)

  const [step, setStep] = useState<Step>(hasPin ? 'verify' : 'create')
  const [firstPin, setFirstPin] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reset = (next: Step) => {
    setStep(next)
    setValue('')
    setError(null)
  }

  const handleComplete = async (candidate: string) => {
    playClick(state.soundEnabled)

    if (step === 'verify') {
      setBusy(true)
      const ok = await verifyPin(candidate)
      setBusy(false)
      if (ok) {
        reset('create')
      } else {
        setError('Неверный текущий PIN-код')
        setValue('')
      }
      return
    }

    if (step === 'create') {
      setFirstPin(candidate)
      reset('confirm')
      return
    }

    // confirm
    if (candidate !== firstPin) {
      setError('PIN-коды не совпадают — начните заново')
      setFirstPin('')
      reset('create')
      return
    }

    setBusy(true)
    const result = await setSecurityPin(candidate, { quickUnlock: true })
    setBusy(false)
    if (result.ok) {
      playSuccess(state.soundEnabled)
      onNotify(hasPin ? 'PIN-код успешно изменён' : 'PIN-код установлен — журнал под защитой')
      onClose()
    } else {
      setError(result.error ?? 'Не удалось сохранить PIN-код')
      reset('create')
    }
  }

  const stepIndex = step === 'verify' ? 0 : step === 'create' ? 1 : 2

  return (
    <ModalShell title={hasPin ? 'Смена PIN-кода' : 'Установка PIN-кода'} onClose={onClose}>
      <p className="modal-intro">
        <KeyRound size={13} className="inline -mt-0.5 mr-1" />
        4-значный код для мгновенного входа. Хранится только как хэш — восстановить его
        невозможно, но можно изменить, подтвердив текущий.
      </p>

      <div className="pin-setup-steps" aria-hidden="true">
        {(hasPin ? ['Текущий', 'Новый', 'Повтор'] : ['Новый', 'Повтор']).map((label, index) => {
          const position = hasPin ? index : index + 1
          const active = position === stepIndex
          const done = position < stepIndex
          return (
            <span key={label} className={`pin-setup-step ${active ? 'is-active' : ''} ${done ? 'is-done' : ''}`}>
              {done ? <Check size={12} /> : index + 1}
              <em>{label}</em>
            </span>
          )
        })}
      </div>

      <p className="pin-setup-caption">
        {step === 'verify' && 'Введите текущий PIN-код, чтобы задать новый'}
        {step === 'create' && 'Придумайте новый PIN-код из 4 цифр'}
        {step === 'confirm' && 'Повторите новый PIN-код для подтверждения'}
      </p>

      <PinPad
        value={value}
        maxLength={PIN_LENGTH}
        onChange={(next) => {
          setValue(next)
          if (error) setError(null)
        }}
        onComplete={(candidate) => void handleComplete(candidate)}
        disabled={busy}
        error={error}
        size="lg"
      />

      <footer className="pin-setup-footer">
        {step !== (hasPin ? 'verify' : 'create') ? (
          <button
            type="button"
            className="secondary-btn flex items-center gap-2 text-xs py-2 px-3"
            onClick={() => reset(hasPin ? 'verify' : 'create')}
            disabled={busy}
          >
            <ArrowLeft size={14} /> Назад
          </button>
        ) : (
          <span className="pin-setup-secure">
            <ShieldCheck size={13} /> Секрет не покидает устройство
          </span>
        )}

        {busy && (
          <span className="pin-setup-secure">
            <Loader2 size={13} className="animate-spin" /> Сохраняем…
          </span>
        )}
      </footer>
    </ModalShell>
  )
}

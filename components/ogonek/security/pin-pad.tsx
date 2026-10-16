'use client'

import { Delete, RotateCcw } from 'lucide-react'
import { useEffect } from 'react'

type Props = {
  /** Текущее значение PIN-кода */
  value: string
  /** Сколько цифр ожидается (по умолчанию 4) */
  maxLength?: number
  onChange: (value: string) => void
  /** Вызывается, когда введены все цифры */
  onComplete?: (value: string) => void
  disabled?: boolean
  /** Текст ошибки под точками (подсвечивает панель красным) */
  error?: string | null
  /** Показывать введённые цифры вместо точек */
  showDigits?: boolean
  /** Слушать физическую клавиатуру (цифры + Backspace) */
  captureKeyboard?: boolean
  size?: 'md' | 'lg'
  hint?: string
}

const DIGIT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

/**
 * Цифровая клавиатура для ввода 4-значного PIN-кода.
 * Используется и на экране блокировки, и при установке PIN в настройках.
 */
export function PinPad({
  value,
  maxLength = 4,
  onChange,
  onComplete,
  disabled = false,
  error,
  showDigits = false,
  captureKeyboard = true,
  size = 'md',
  hint,
}: Props) {
  const push = (digit: string) => {
    if (disabled || value.length >= maxLength) return
    const next = value + digit
    onChange(next)
    if (next.length === maxLength) onComplete?.(next)
  }

  const back = () => {
    if (disabled) return
    onChange(value.slice(0, -1))
  }

  const clear = () => {
    if (disabled || value.length === 0) return
    onChange('')
  }

  useEffect(() => {
    if (!captureKeyboard || disabled) return
    const handleKeyDown = (event: KeyboardEvent) => {
      const active = document.activeElement
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable)
      ) {
        return
      }
      if (/^\d$/.test(event.key)) {
        event.preventDefault()
        push(event.key)
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        back()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, maxLength, disabled, captureKeyboard])

  return (
    <div className={`pinpad pinpad--${size} ${error ? 'is-error' : ''}`}>
      <div
        className="pinpad__dots"
        role="status"
        aria-live="polite"
        aria-label={`Введено ${value.length} из ${maxLength} цифр`}
      >
        {Array.from({ length: maxLength }).map((_, index) => {
          const filled = index < value.length
          return (
            <span
              key={index}
              className={`pinpad__dot ${filled ? 'is-filled' : ''}`}
              aria-hidden="true"
            >
              {showDigits && filled ? value[index] : ''}
            </span>
          )
        })}
      </div>

      {error ? (
        <p className="pinpad__message pinpad__message--error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="pinpad__message">{hint}</p>
      ) : null}

      <div className="pinpad__grid" role="group" aria-label="Цифровая клавиатура">
        {DIGIT_KEYS.map((digit) => (
          <button
            key={digit}
            type="button"
            className="pinpad__key"
            onClick={() => push(digit)}
            disabled={disabled}
            aria-label={`Цифра ${digit}`}
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          className="pinpad__key pinpad__key--ghost"
          onClick={clear}
          disabled={disabled || value.length === 0}
          aria-label="Очистить ввод"
        >
          <RotateCcw size={size === 'lg' ? 22 : 18} aria-hidden="true" />
        </button>

        <button
          type="button"
          className="pinpad__key"
          onClick={() => push('0')}
          disabled={disabled}
          aria-label="Цифра 0"
        >
          0
        </button>

        <button
          type="button"
          className="pinpad__key pinpad__key--ghost"
          onClick={back}
          disabled={disabled || value.length === 0}
          aria-label="Удалить последнюю цифру"
        >
          <Delete size={size === 'lg' ? 22 : 18} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

'use client'

import React from 'react'
import { Check } from 'lucide-react'

export interface ToastAction {
  label: string
  onClick: () => void
}

export type ToastMessage =
  | string
  | {
      text: string
      action?: ToastAction
    }

type Props = {
  message: ToastMessage
}

export function Toast({ message }: Props) {
  if (!message) return null

  const text = typeof message === 'string' ? message : message.text
  const action = typeof message === 'object' ? message.action : undefined

  if (!text) return null

  return (
    <div className="toast" role="status" aria-live="polite">
      <Check size={16} className="text-[var(--accent)] shrink-0" />
      <span className="truncate">{text}</span>
      {action && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            action.onClick()
          }}
          className="ml-2 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--accent)] text-white hover:opacity-90 active:scale-95 transition-all shrink-0"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

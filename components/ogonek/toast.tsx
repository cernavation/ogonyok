'use client'

import { Check } from 'lucide-react'

type Props = {
  message: string
}

export function Toast({ message }: Props) {
  if (!message) return null

  return (
    <div className="toast" role="status" aria-live="polite">
      <Check size={16} />
      <span>{message}</span>
    </div>
  )
}

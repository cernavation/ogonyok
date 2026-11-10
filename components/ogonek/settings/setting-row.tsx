'use client'

import React, { useEffect, useState } from 'react'
import { Check } from 'lucide-react'

export interface SettingRowProps {
  label: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  control?: React.ReactNode
  savedStatus?: boolean
  danger?: boolean
  disabled?: boolean
  className?: string
  onClick?: () => void
}

export function SettingRow({
  label,
  description,
  icon,
  control,
  savedStatus,
  danger,
  disabled,
  className = '',
  onClick,
}: SettingRowProps) {
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    if (savedStatus) {
      setShowSaved(true)
      const timer = setTimeout(() => setShowSaved(false), 2200)
      return () => clearTimeout(timer)
    }
  }, [savedStatus])

  const isInteractive = Boolean(onClick) && !disabled

  return (
    <div
      onClick={isInteractive ? onClick : undefined}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      className={`relative flex items-center justify-between gap-4 py-3.5 px-4 transition-colors rounded-xl
        ${isInteractive ? 'cursor-pointer hover:bg-[var(--bg-hover)] active:bg-[var(--bg-hover-post)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]' : ''}
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
        ${className}
      `}
    >
      <div className="flex items-start gap-3.5 min-w-0 flex-1">
        {icon && (
          <div
            className={`shrink-0 mt-0.5 ${
              danger ? 'text-[var(--danger)]' : 'text-[var(--accent)]'
            }`}
          >
            {icon}
          </div>
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-semibold truncate ${
                danger ? 'text-[var(--danger)]' : 'text-[var(--text)]'
              }`}
            >
              {label}
            </span>
            {showSaved && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--success)] bg-[var(--success-soft)] px-2 py-0.5 rounded-full animate-in fade-in zoom-in-90 duration-200">
                <Check size={11} strokeWidth={3} />
                Сохранено
              </span>
            )}
          </div>
          {description && (
            <div className="text-xs text-[var(--text-2)] mt-0.5 leading-relaxed">
              {description}
            </div>
          )}
        </div>
      </div>

      {control && <div className="shrink-0 flex items-center gap-2">{control}</div>}
    </div>
  )
}

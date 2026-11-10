'use client'

import React, { forwardRef, useState, useRef, useEffect } from 'react'
import { MoreHorizontal, AlertCircle, RefreshCw } from 'lucide-react'

export interface ListRowAction {
  id: string
  label: string
  icon?: React.ReactNode
  danger?: boolean
  onClick: () => void
}

export interface ListRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  avatar?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  metadata?: React.ReactNode
  actions?: ListRowAction[]
  menuContent?: React.ReactNode
  menuAriaLabel?: string
  selected?: boolean
  disabled?: boolean
  interactive?: boolean
  onActionClick?: (actionId: string) => void
}

export const ListRow = forwardRef<HTMLDivElement, ListRowProps>(function ListRow(
  {
    avatar,
    title,
    subtitle,
    metadata,
    actions,
    menuContent,
    menuAriaLabel = 'Действия',
    selected = false,
    disabled = false,
    interactive = true,
    onClick,
    className = '',
    ...rest
  },
  ref
) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !menuButtonRef.current?.contains(e.target as Node)
      ) {
        setMenuOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    if ((e.key === 'Enter' || e.key === ' ') && onClick && e.target === e.currentTarget) {
      e.preventDefault()
      onClick(e as any)
    }
  }

  const isClickable = Boolean(onClick) && !disabled

  return (
    <div
      ref={ref}
      role={isClickable ? 'button' : 'listitem'}
      tabIndex={isClickable ? 0 : undefined}
      aria-selected={selected || undefined}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      onKeyDown={handleKeyDown}
      className={`group relative flex items-center justify-between gap-3 px-4 py-3 transition-colors outline-none
        ${isClickable ? 'cursor-pointer hover:bg-[var(--bg-hover)] active:bg-[var(--bg-hover-post)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset' : ''}
        ${selected ? 'bg-[var(--accent-soft)]' : ''}
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
        ${className}
      `}
      {...rest}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {avatar && <div className="shrink-0">{avatar}</div>}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-[var(--text)] truncate">{title}</span>
          </div>
          {subtitle && (
            <div className="text-xs text-[var(--text-2)] truncate mt-0.5">{subtitle}</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {metadata && <div className="text-xs text-[var(--text-2)]">{metadata}</div>}

        {(actions || menuContent) && (
          <div className="relative">
            <button
              ref={menuButtonRef}
              type="button"
              aria-label={menuAriaLabel}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen((prev) => !prev)
              }}
              className="p-1.5 rounded-full text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <MoreHorizontal size={18} />
            </button>

            {menuOpen && (
              <div
                ref={menuRef}
                role="menu"
                aria-label={menuAriaLabel}
                className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-xl p-1 animate-in fade-in zoom-in-95"
              >
                {menuContent}
                {actions?.map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation()
                      act.onClick()
                      setMenuOpen(false)
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg text-left transition-colors
                      ${
                        act.danger
                          ? 'text-[var(--danger)] hover:bg-[var(--danger-soft)]'
                          : 'text-[var(--text)] hover:bg-[var(--bg-hover)]'
                      }
                    `}
                  >
                    {act.icon && <span className="shrink-0">{act.icon}</span>}
                    <span>{act.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

export function ListRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 animate-pulse">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-full bg-[var(--border)] shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="h-3.5 bg-[var(--border)] rounded w-2/5" />
          <div className="h-2.5 bg-[var(--border)] rounded w-3/5" />
        </div>
      </div>
      <div className="w-12 h-3 bg-[var(--border)] rounded shrink-0" />
    </div>
  )
}

export function ListEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 min-h-[220px]">
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mb-3">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-[var(--text)]">{title}</h3>
      {description && (
        <p className="text-xs text-[var(--text-2)] mt-1 max-w-xs">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-full text-xs font-semibold bg-[var(--accent)] text-white hover:opacity-90 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export function ListErrorState({
  message = 'Не удалось загрузить данные',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-6 bg-[var(--danger-soft)]/20 rounded-2xl m-4 border border-[var(--danger)]/30">
      <AlertCircle className="w-8 h-8 text-[var(--danger)] mb-2" />
      <p className="text-xs font-medium text-[var(--text)] mb-3">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <RefreshCw size={13} />
          Повторить
        </button>
      )}
    </div>
  )
}

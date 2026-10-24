'use client'

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
  padding?: 'sm' | 'md' | 'lg' | 'none'
  interactive?: boolean
  className?: string
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      padding = 'md',
      interactive = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const padStyles = {
      none: 'p-0',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-5 sm:p-6',
    }[padding]

    const baseStyles =
      'rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] text-[var(--text)] transition-colors duration-150'

    const hoverStyles = interactive
      ? 'hover:bg-[var(--bg-hover)] cursor-pointer'
      : ''

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${padStyles} ${hoverStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

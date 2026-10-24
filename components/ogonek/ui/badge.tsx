'use client'

import type { ReactNode } from 'react'

export type BadgeVariant = 'neutral' | 'flame' | 'success' | 'outline'

export type BadgeProps = {
  children: ReactNode
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  icon?: ReactNode
  className?: string
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  className = '',
}: BadgeProps) {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-[13px] px-2.5 py-1 gap-1.5',
  }[size]

  const variantStyles = {
    neutral: 'bg-white/10 text-[#F4F4F5] border border-white/5',
    flame: 'bg-[#FF5C00]/15 text-[#FF7A18] border border-[#FF5C00]/25 font-semibold',
    success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
    outline: 'border border-white/20 text-[#A1A1AA]',
  }[variant]

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium leading-none ${sizeStyles} ${variantStyles} ${className}`}
    >
      {icon && <span>{icon}</span>}
      <span>{children}</span>
    </span>
  )
}

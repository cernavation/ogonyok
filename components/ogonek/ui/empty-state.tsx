'use client'

import type { ReactNode } from 'react'

export type EmptyStateProps = {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl border border-dashed border-white/10 bg-[#121215]/50 ${className}`}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF5C00]/10 text-[#FF7A18]">
          {icon}
        </div>
      )}
      <h3 className="text-[18px] font-bold text-white tracking-tight">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-[14px] text-[#A1A1AA] leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

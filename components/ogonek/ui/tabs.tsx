'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export type TabItem<T extends string = string> = {
  id: T
  label: string
  icon?: ReactNode
  badge?: string | number
}

export type TabsProps<T extends string = string> = {
  items: readonly TabItem<T>[]
  activeId: T
  onChange: (id: T) => void
  layoutId?: string
  className?: string
  fullWidth?: boolean
}

export function Tabs<T extends string = string>({
  items,
  activeId,
  onChange,
  layoutId = 'tabs-line',
  className = '',
  fullWidth = true,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={`flex items-center border-b border-[var(--border)] bg-transparent select-none ${
        fullWidth ? 'w-full' : 'inline-flex'
      } ${className}`}
    >
      {items.map((tab) => {
        const isActive = activeId === tab.id
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center justify-center min-h-[48px] px-4 text-[15px] transition-colors duration-150 cursor-pointer hover:bg-[var(--bg-hover)] ${
              fullWidth ? 'flex-1' : ''
            } ${
              isActive
                ? 'font-bold text-[var(--text)]'
                : 'font-medium text-[var(--text-2)] hover:text-[var(--text)]'
            }`}
          >
            <div className="relative inline-flex items-center gap-2 py-3.5">
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="rounded-full bg-[var(--bg-hover)] px-1.5 py-0.5 text-[13px] font-bold">
                  {tab.badge}
                </span>
              )}
              {/* X.com underline indicator */}
              {isActive && (
                <motion.div
                  layoutId={layoutId}
                  className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--accent)] rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

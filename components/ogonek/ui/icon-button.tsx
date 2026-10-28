'use client'

import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Tooltip } from '../tooltip'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
  tooltip?: ReactNode
  count?: number | string
  active?: boolean
  variant?: 'default' | 'accent' | 'danger' | 'success' | 'blue'
  size?: 'sm' | 'md'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      label,
      tooltip,
      count,
      active = false,
      variant = 'default',
      size = 'md',
      className = '',
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    // Touch targets: desktop 34-36px, mobile 40px
    const circleSize = size === 'sm' 
      ? 'w-10 h-10 sm:w-[34px] sm:h-[34px]' 
      : 'w-10 h-10 sm:w-9 sm:h-9'

    const colorVariants = {
      default: {
        normal: 'text-[var(--text-2)] hover:text-[var(--text)] group-hover:text-[var(--text)]',
        hoverBg: 'group-hover:bg-[var(--bg-hover)]',
        active: 'text-[var(--accent)]',
      },
      accent: {
        normal: 'text-[var(--text-2)] hover:text-[var(--accent)] group-hover:text-[var(--accent)]',
        hoverBg: 'group-hover:bg-[var(--accent-soft)]',
        active: 'text-[var(--accent)]',
      },
      danger: {
        normal: 'text-[var(--text-2)] hover:text-[var(--danger)] group-hover:text-[var(--danger)]',
        hoverBg: 'group-hover:bg-[var(--danger-soft)]',
        active: 'text-[var(--danger)]',
      },
      success: {
        normal: 'text-[var(--text-2)] hover:text-[var(--success)] group-hover:text-[var(--success)]',
        hoverBg: 'group-hover:bg-[var(--success-soft)]',
        active: 'text-[var(--success)]',
      },
      blue: {
        normal: 'text-[var(--text-2)] hover:text-sky-500 group-hover:text-sky-500',
        hoverBg: 'group-hover:bg-sky-500/10',
        active: 'text-sky-500',
      },
    }[variant]

    const textColor = active ? colorVariants.active : colorVariants.normal

    const btn = (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        aria-label={label}
        onClick={onClick}
        className={`group inline-flex items-center gap-1.5 select-none transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${textColor} ${className}`}
        {...props}
      >
        <motion.span
          whileTap={{ scale: 1.25 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          className={`flex items-center justify-center rounded-full transition-colors duration-150 ${circleSize} ${colorVariants.hoverBg}`}
        >
          {icon}
        </motion.span>
        {count !== undefined && count !== null && (
          <span className="text-[13px] font-normal leading-none pr-1">
            {count}
          </span>
        )}
      </button>
    )

    const resolvedTooltip = tooltip !== undefined ? tooltip : label

    if (resolvedTooltip) {
      return (
        <Tooltip content={resolvedTooltip} side="top">
          {btn}
        </Tooltip>
      )
    }

    return btn
  }
)

IconButton.displayName = 'IconButton'

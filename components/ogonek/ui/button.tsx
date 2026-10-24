'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children?: ReactNode
  icon?: ReactNode
  trailingIcon?: ReactNode
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      children,
      icon,
      trailingIcon,
      fullWidth = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center select-none transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 rounded-full cursor-pointer'

    const sizeStyles = {
      sm: 'text-[13px] sm:text-[14px] min-h-[36px] sm:h-9 h-10 px-4 gap-2',
      md: 'text-[15px] min-h-[40px] sm:h-11 h-11 px-5 gap-2.5 font-bold',
      lg: 'text-[17px] min-h-[48px] sm:h-[52px] h-[52px] px-6 gap-3 font-bold',
      icon: 'min-h-[36px] min-w-[36px] sm:h-9 sm:w-9 h-10 w-10 p-0',
    }[size]

    const variantStyles = {
      primary:
        'bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)] font-bold border-0 shadow-none',
      secondary:
        'bg-white text-black hover:bg-neutral-200 dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-bold border-0 shadow-none',
      outline:
        'bg-transparent border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)] font-bold',
      ghost:
        'bg-transparent text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] border-0',
      danger:
        'bg-transparent text-[var(--danger)] hover:bg-[var(--danger-soft)] border border-[var(--danger)]/30 font-bold',
    }[variant]

    const widthStyle = fullWidth ? 'w-full' : ''

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${widthStyle} ${className}`}
        {...props}
      >
        {icon && <span className="shrink-0 flex items-center">{icon}</span>}
        {children && <span>{children}</span>}
        {trailingIcon && <span className="shrink-0 flex items-center">{trailingIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'

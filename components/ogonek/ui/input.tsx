'use client'

import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode
  action?: ReactNode
  error?: string
  pill?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, action, error, pill = false, className = '', ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-2)] pointer-events-none flex items-center">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`w-full ${
            pill ? 'rounded-full h-11 px-4' : 'rounded-xl h-11 px-3.5'
          } border border-[var(--border)] bg-[var(--bg-elev)] text-[15px] text-[var(--text)] placeholder:text-[var(--text-2)] outline-none transition-colors duration-150 focus:border-[var(--accent)] ${
            icon ? 'pl-11' : ''
          } ${action ? 'pr-11' : ''} ${error ? 'border-[var(--danger)]' : ''} ${className}`}
          {...props}
        />
        {action && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {action}
          </div>
        )}
        {error && (
          <p className="mt-1 text-[13px] font-medium text-[var(--danger)]">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          className={`w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-3.5 text-[15px] leading-relaxed text-[var(--text)] placeholder:text-[var(--text-2)] outline-none transition-colors duration-150 focus:border-[var(--accent)] resize-none ${
            error ? 'border-[var(--danger)]' : ''
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-[13px] font-medium text-[var(--danger)]">{error}</p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

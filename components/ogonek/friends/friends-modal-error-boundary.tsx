'use client'

import React, { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw, X } from 'lucide-react'

interface Props {
  children: ReactNode
  onClose?: () => void
}

interface State {
  hasError: boolean
  error?: Error | null
}

/**
 * Локальный предохранитель для модального окна «Друзья».
 * Изолирует любой сбой внутри списка друзей или групп, чтобы не падало всё приложение.
 */
export class FriendsModalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[FriendsModalErrorBoundary Caught Error]:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  handleClose = () => {
    this.setState({ hasError: false, error: null })
    this.props.onClose?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={this.handleClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Ошибка окна друзей"
            className="w-full max-w-sm rounded-3xl bg-[var(--card-bg,#16181c)] border border-red-500/40 p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 mx-auto flex items-center justify-center mb-3">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-base font-bold text-[var(--text,#fff)] mb-1.5">
              Не удалось открыть окно «Друзья»
            </h3>
            <p className="text-xs text-[var(--muted,#71767b)] mb-4 leading-relaxed">
              Произошла ошибка при загрузке данных друзей. Приложение продолжает работать в штатном режиме.
              {this.state.error?.message ? (
                <span className="block mt-2 font-mono text-[11px] text-red-300 bg-red-950/40 p-2 rounded-lg border border-red-900/50 break-all text-left">
                  {this.state.error.message}
                </span>
              ) : null}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="px-4 py-2 rounded-full text-xs font-bold bg-[#FF5C00] hover:opacity-90 text-white inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Повторить</span>
              </button>
              <button
                type="button"
                onClick={this.handleClose}
                className="px-4 py-2 rounded-full text-xs font-bold bg-[var(--surface2,#202327)] hover:bg-white/10 text-[var(--text,#fff)] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <X size={14} />
                <span>Закрыть</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

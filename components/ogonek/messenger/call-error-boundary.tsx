'use client'

import React, { Component, type ReactNode } from 'react'
import { PhoneOff, AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error?: Error | null
}

export class CallErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[CallErrorBoundary Caught Error]:', error, errorInfo)
  }

  handleClose = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 select-none animate-in fade-in">
          <div className="bg-[#16181c] border border-red-500/40 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 mx-auto flex items-center justify-center mb-4 ring-2 ring-red-500/30">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Сбой сессии вызова</h3>
            <p className="text-sm text-white/70 mb-6">
              Произошла непредвиденная ошибка при инициализации медиа или компонентов звонка.
              {this.state.error?.message ? (
                <span className="block mt-2 font-mono text-xs text-red-300 bg-red-950/40 p-2 rounded-lg border border-red-900/50 break-all text-left">
                  {this.state.error.message}
                </span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={this.handleClose}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#f4212e] hover:bg-[#dc1e29] text-white font-semibold text-sm transition-all shadow-lg hover:scale-105 active:scale-95"
            >
              <PhoneOff size={18} />
              <span>Закрыть звонок</span>
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

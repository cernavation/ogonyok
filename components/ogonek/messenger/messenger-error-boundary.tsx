'use client'

import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle, RotateCcw, Trash2, Home } from 'lucide-react'

type Props = {
  children: ReactNode
  onReset?: () => void
  onNavigateHome?: () => void
}

type State = {
  hasError: boolean
  error: Error | null
}

/**
 * ЛОКАЛЬНЫЙ ERROR BOUNDARY ДЛЯ ЧАТОВ:
 * Изолирует любые ошибки рендера или гидратации мессенджера,
 * предотвращая падение всего приложения с экраном «Сбой интерфейса».
 * Предоставляет кнопку сброса кэша чатов и подробное логирование в консоль.
 */
export class MessengerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Messenger Crash Details]:', error, errorInfo)
  }

  handleResetCache = () => {
    try {
      localStorage.removeItem('ogonek_messenger_state')
      // Также безопасно очищаем закэшированные треды в основном хранилище
      const keys = ['ogonyok.v3.store', 'ogonek.v3', 'ogonek.v2']
      for (const k of keys) {
        const raw = localStorage.getItem(k)
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            delete parsed.chatThreads
            delete parsed.chatActiveFriendId
            delete parsed.chatFolders
            delete parsed.chatTags
            delete parsed.chatSettings
            localStorage.setItem(k, JSON.stringify(parsed))
          } catch {}
        }
      }
    } catch (e) {
      console.warn('Error clearing localStorage:', e)
    }

    if (this.props.onReset) {
      this.props.onReset()
    } else {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[460px] flex-1 flex flex-col items-center justify-center p-6 sm:p-8 bg-[var(--bg)] text-[var(--text)] select-none">
          <div className="max-w-md w-full text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <AlertCircle size={32} />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono font-bold tracking-widest text-amber-500 uppercase">
                Изоляция сбоя мессенджера
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text)]">
                Ошибка отображения чатов
              </h2>
              <p className="text-sm text-[var(--text-2)] leading-relaxed">
                В кэше переписок обнаружены повреждённые данные. Приложение продолжает работать в штатном режиме, ваши записи дневника и профиль сохранены.
              </p>
              {this.state.error && (
                <div className="mt-3 p-3 rounded-xl bg-[var(--bg-elev)] border border-[var(--border)] text-left text-xs font-mono text-red-400 overflow-x-auto max-h-28">
                  {this.state.error.message || String(this.state.error)}
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleResetCache}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[var(--accent)] hover:opacity-90 text-[var(--accent-text)] font-bold text-sm transition-all active:scale-95 shadow-md shadow-[var(--accent)]/20 cursor-pointer"
              >
                <Trash2 size={16} />
                <span>Сбросить кэш чатов</span>
              </button>

              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] hover:bg-[var(--bg-hover)] text-[var(--text)] font-semibold text-sm transition-colors cursor-pointer"
              >
                <RotateCcw size={16} />
                <span>Повторить</span>
              </button>

              {this.props.onNavigateHome && (
                <button
                  type="button"
                  onClick={this.props.onNavigateHome}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl border border-[var(--border)] hover:bg-[var(--bg-hover)] text-[var(--text)] font-semibold text-sm transition-colors cursor-pointer"
                >
                  <Home size={16} />
                  <span>В ленту</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

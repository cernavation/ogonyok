'use client'

import { useEffect } from 'react'
import { AlertCircle, RotateCcw, Home } from 'lucide-react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Логируем ошибку на клиенте для отладки без показа пользователю
    console.error('Приложение перехватило ошибку:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col items-center justify-center p-6 selection:bg-[var(--accent)]/30">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/15">
          <AlertCircle size={32} />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold tracking-widest text-rose-500 uppercase">
            Сбой интерфейса
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Что-то пошло не так
          </h1>
          <p className="text-sm text-[var(--text-2)] leading-relaxed">
            Произошла непредвиденная ошибка отображения. Не волнуйся: все записи дневника сохранены локально в браузере.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] font-bold text-sm transition-all active:scale-95 shadow-md shadow-[var(--accent)]/20 cursor-pointer"
          >
            <RotateCcw size={16} />
            <span>Попробовать снова</span>
          </button>

          <button
            type="button"
            onClick={() => { window.location.href = '/' }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-[var(--border)] hover:bg-[var(--bg-hover)] text-[var(--text)] font-semibold text-sm transition-colors cursor-pointer"
          >
            <Home size={16} />
            <span>На главную</span>
          </button>
        </div>
      </div>
    </div>
  )
}

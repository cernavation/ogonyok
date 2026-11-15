'use client'

import React, { useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  Download,
  FileJson,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { exportStoreAsJson, validateAndImportJson } from '@/lib/ogonek/storage'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { OgonekStoreState } from '@/lib/ogonek/types'

type Props = {
  state: OgonekStoreState
  onImportState: (newState: OgonekStoreState) => void
  onResetToDefaults: () => void
  onNotify: (msg: string) => void
}

export function DataPanel({
  state,
  onImportState,
  onResetToDefaults,
  onNotify,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sound = state.soundEnabled

  // Состояние модалки удаления аккаунта
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleExport = () => {
    try {
      const json = exportStoreAsJson(state)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ogonek-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      playSuccess(sound)
      onNotify('Резервная копия сохранена в файл')
    } catch {
      onNotify('Ошибка при экспорте данных')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const raw = event.target?.result as string
      const res = validateAndImportJson(raw)
      if (res.success) {
        onImportState(res.data)
        playSuccess(sound)
        onNotify('Данные успешно импортированы')
      } else {
        onNotify(res.error || 'Неверный формат файла бэкапа')
      }
    }
    reader.readAsText(file)
  }

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deletePassword) {
      setDeleteError('Введите пароль от аккаунта')
      return
    }
    if (deleteConfirmText.trim().toUpperCase() !== 'УДАЛИТЬ') {
      setDeleteError('Введите подтверждающее слово «УДАЛИТЬ»')
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: deletePassword,
          userId: state.auth.activeAccountId || undefined,
          username: state.profile.username || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setDeleteError(data.error || 'Ошибка при удалении аккаунта')
        setIsDeleting(false)
        return
      }

      // Успешно удалено
      playSuccess(sound)
      onNotify('Аккаунт и все данные успешно удалены')
      setDeleteModalOpen(false)

      // Очистка локального хранилища и редирект
      if (typeof window !== 'undefined') {
        localStorage.clear()
        window.location.href = '/'
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Сетевая ошибка при удалении')
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-5" aria-label="Управление данными">
      {/* ── 1. Экспорт и импорт данных ──────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex flex-col gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
            <Download size={16} className="text-[var(--accent)]" /> Резервное копирование и экспорт
          </h3>
          <p className="text-[13px] text-[var(--text-2)] mt-0.5">
            Сохраните все дни летописи, гордости, оценки и благодарности в локальный JSON файл
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)] flex-wrap">
          <button
            type="button"
            onClick={handleExport}
            className="h-9 px-4 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <Download size={14} />
            <span>Скачать JSON</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-9 px-4 rounded-full border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)] text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <Upload size={14} />
            <span>Импортировать JSON</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* ── 2. Сброс к демо-данным ──────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex items-center justify-between">
        <div className="min-w-0 pr-3">
          <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
            <RotateCcw size={16} className="text-amber-500" /> Сброс к демо-данным
          </h3>
          <p className="text-[13px] text-[var(--text-2)] mt-0.5">
            Возвращает локальный дневник в исходное состояние с примерами записей
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (confirm('Сбросить все данные дневника к демо-состоянию?')) {
              onResetToDefaults()
              playSuccess(sound)
              onNotify('Данные сброшены к демо')
            }
          }}
          className="h-8 px-4 rounded-full border border-amber-500/40 text-amber-500 hover:bg-amber-500/10 text-xs font-bold inline-flex items-center gap-1.5 transition-colors shrink-0"
        >
          <RotateCcw size={13} />
          <span>Сбросить</span>
        </button>
      </div>

      {/* ── 3. Опасная зона: Удаление аккаунта ───────────────────────────── */}
      <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 pr-3">
            <h3 className="text-[15px] font-bold text-rose-500 flex items-center gap-2">
              <ShieldAlert size={16} /> Удаление аккаунта навсегда
            </h3>
            <p className="text-[13px] text-[var(--text-2)] mt-1 leading-relaxed">
              Безвозвратное удаление профиля, всех записей гордостей, благодарностей, Evidence Vault,
              чатов и медиафайлов из базы данных и облачного хранилища.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-rose-500/20 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setDeleteModalOpen(true)
              setDeletePassword('')
              setDeleteConfirmText('')
              setDeleteError(null)
            }}
            className="h-9 px-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <Trash2 size={14} />
            <span>Удалить аккаунт навсегда</span>
          </button>
        </div>
      </div>

      {/* Модальное окно подтверждения удаления аккаунта */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-[var(--bg-elev)] border border-rose-500/40 shadow-2xl flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="absolute top-4 right-4 text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text)]">Удаление аккаунта</h3>
                <p className="text-xs text-rose-400">Действие необратимо</p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-2)] leading-relaxed">
              Вы собираетесь навсегда удалить аккаунт <b className="text-[var(--text)]">@{state.profile.username}</b>.
              Все данные в базе PostgreSQL и файлы в Storage будут стёрты немедленно.
            </p>

            {deleteError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteAccount} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-2)] mb-1 block">
                  Пароль от аккаунта для подтверждения
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-9 px-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-xs outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-2)] mb-1 block">
                  Для подтверждения введите слово <span className="font-mono text-rose-400 font-bold">УДАЛИТЬ</span>:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="УДАЛИТЬ"
                  className="w-full h-9 px-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-xs font-mono outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="h-8 px-4 rounded-full border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)] text-xs font-bold transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isDeleting || !deletePassword || deleteConfirmText.trim().toUpperCase() !== 'УДАЛИТЬ'}
                  className="h-8 px-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-40"
                >
                  {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  <span>{isDeleting ? 'Удаление...' : 'Да, удалить навсегда'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

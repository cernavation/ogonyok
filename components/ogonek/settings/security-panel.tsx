'use client'

import React, { useState } from 'react'
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Laptop,
  Lock,
  LogOut,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Timer,
  Trash2,
} from 'lucide-react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { hasSecurityPin } from '@/lib/ogonek/security'
import { getSupabase } from '@/lib/supabase/browser'
import { PinSetupModal } from '../security/pin-setup-modal'
import { PasswordSetupModal } from '../security/password-setup-modal'

type Props = {
  onNotify: (msg: string) => void
}

function evaluatePasswordStrength(pass: string): { score: number; label: string; color: string } {
  if (!pass) return { score: 0, label: 'Пустой', color: '#71767b' }
  let score = 0
  if (pass.length >= 8) score += 1
  if (pass.length >= 12) score += 1
  if (/[0-9]/.test(pass)) score += 1
  if (/[A-ZА-Я]/.test(pass)) score += 1
  if (/[^a-zA-Z0-9а-яА-Я]/.test(pass)) score += 1

  if (score <= 1) return { score: 1, label: 'Слабый', color: '#ef4444' }
  if (score <= 3) return { score: 2, label: 'Средний', color: '#f59e0b' }
  return { score: 3, label: 'Надёжный', color: '#22c55e' }
}

export function SecurityPanel({ onNotify }: Props) {
  const {
    state,
    setAutoLockMinutes,
    clearSecurityPin,
    lockAppNow,
  } = useOgonekStore()

  const security = state.security
  const sound = state.soundEnabled
  const isPinActive = hasSecurityPin(security)

  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)

  // Форма быстрой смены пароля
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Сессии
  const [otherSessionsTerminated, setOtherSessionsTerminated] = useState(false)

  const passwordStrength = evaluatePasswordStrength(newPassword)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword) {
      onNotify('Введите новый пароль')
      return
    }
    if (newPassword.length < 8) {
      onNotify('Пароль должен содержать не менее 8 символов')
      return
    }
    if (newPassword !== confirmPassword) {
      onNotify('Пароли не совпадают')
      return
    }

    setIsChangingPassword(true)
    playClick(sound)
    try {
      const supabase = getSupabase()
      if (supabase) {
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) {
          onNotify(error.message || 'Ошибка при обновлении пароля')
          setIsChangingPassword(false)
          return
        }
      }
      playSuccess(sound)
      onNotify('Пароль успешно изменён')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      onNotify('Ошибка при смене пароля')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleTerminateOtherSessions = async () => {
    playClick(sound)
    try {
      const supabase = getSupabase()
      if (supabase) {
        try {
          await supabase.auth.signOut({ scope: 'others' })
        } catch {}
      }
      setOtherSessionsTerminated(true)
      playSuccess(sound)
      onNotify('Все другие сессии успешно завершены')
    } catch {
      onNotify('Не удалось завершить сессии')
    }
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-5" aria-label="Настройки безопасности">
      {/* ── 1. ПИН-код и блокировка ─────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
              <KeyRound size={16} className="text-[var(--accent)]" /> ПИН-код приложения
            </h3>
            <p className="text-[13px] text-[var(--text-2)] mt-0.5">
              4-значный код для защиты от подглядывания при открытии Priday
            </p>
          </div>

          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold border border-[var(--border)] shrink-0"
            style={{
              background: isPinActive ? 'rgba(34,197,94,0.1)' : 'rgba(113,118,123,0.1)',
              color: isPinActive ? '#22c55e' : 'var(--text-2)',
            }}
          >
            {isPinActive ? 'Включён' : 'Выключен'}
          </span>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)] flex-wrap">
          {isPinActive ? (
            <>
              <button
                type="button"
                onClick={() => setPinModalOpen(true)}
                className="h-8 px-4 rounded-full border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg-hover)] text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                Изменить ПИН-код
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Удалить ПИН-код приложения?')) {
                    clearSecurityPin()
                    playSuccess(sound)
                    onNotify('ПИН-код удалён')
                  }
                }}
                className="h-8 px-4 rounded-full border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={13} />
                <span>Удалить ПИН</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  lockAppNow()
                  onNotify('Приложение заблокировано')
                }}
                className="h-8 px-4 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-bold inline-flex items-center gap-1.5 transition-colors ml-auto"
              >
                <Lock size={13} />
                <span>Заблокировать сейчас</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setPinModalOpen(true)}
              className="h-8 px-4 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
            >
              <KeyRound size={13} />
              <span>Установить ПИН-код</span>
            </button>
          )}
        </div>

        {isPinActive && (
          <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
            <span className="text-xs text-[var(--text-2)] flex items-center gap-1.5">
              <Timer size={14} className="text-[var(--text-3)]" /> Автоблокировка при неактивности:
            </span>
            <select
              value={security.autoLockMinutes}
              onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
              className="px-2.5 py-1 text-xs rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] font-semibold outline-none focus:border-[var(--accent)]"
            >
              <option value={0}>Сразу при сворачивании</option>
              <option value={1}>Через 1 минуту</option>
              <option value={5}>Через 5 минут</option>
              <option value={15}>Через 15 минут</option>
              <option value={60}>Через 1 час</option>
            </select>
          </div>
        )}
      </div>

      {/* ── 2. Смена пароля ─────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex flex-col gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
            <ShieldCheck size={16} className="text-[var(--accent)]" /> Смена пароля аккаунта
          </h3>
          <p className="text-[13px] text-[var(--text-2)] mt-0.5">
            Используйте надёжный пароль не менее 8 символов с цифрами и буквами
          </p>
        </div>

        <form onSubmit={handleChangePassword} className="flex flex-col gap-3 pt-2 border-t border-[var(--border)]">
          <div>
            <label className="text-xs font-semibold text-[var(--text-2)] mb-1 block">Новый пароль</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-9 px-3 pr-9 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-xs outline-none focus:border-[var(--accent)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2 text-[var(--text-3)] hover:text-[var(--text)]"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Индикатор надёжности пароля */}
            {newPassword && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-[var(--border)] overflow-hidden flex gap-1">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: passwordStrength.score === 1 ? '33%' : passwordStrength.score === 2 ? '66%' : '100%',
                      background: passwordStrength.color,
                    }}
                  />
                </div>
                <span className="text-[11px] font-bold" style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-2)] mb-1 block">Повторите новый пароль</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-9 px-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-xs outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isChangingPassword || !newPassword || newPassword !== confirmPassword}
              className="h-8 px-4 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              {isChangingPassword ? 'Сохранение...' : 'Обновить пароль'}
            </button>
          </div>
        </form>
      </div>

      {/* ── 3. Активные сессии ───────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex flex-col gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
            <Laptop size={16} className="text-[var(--accent)]" /> Активные сессии
          </h3>
          <p className="text-[13px] text-[var(--text-2)] mt-0.5">
            Устройства, с которых выполнен вход в ваш аккаунт
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]">
          {/* Текущая сессия */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <Laptop size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                  <span>macOS • Web Browser</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="В сети" />
                </p>
                <p className="text-[11px] text-[var(--text-3)]">Это устройство • Текущая активная сессия</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-400">Онлайн</span>
          </div>

          {/* Другая сессия (если не завершена) */}
          {!otherSessionsTerminated && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] opacity-80">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
                  <Smartphone size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--text)]">Мобильный Safari • iOS</p>
                  <p className="text-[11px] text-[var(--text-3)]">Активно 3 часа назад</p>
                </div>
              </div>
              <span className="text-[11px] text-[var(--text-3)]">3 ч назад</span>
            </div>
          )}
        </div>

        {!otherSessionsTerminated ? (
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleTerminateOtherSessions}
              className="h-8 px-4 rounded-full border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
            >
              <LogOut size={13} />
              <span>Завершить все другие сессии</span>
            </button>
          </div>
        ) : (
          <p className="text-xs text-emerald-400 text-right font-medium">Другие сессии завершены</p>
        )}
      </div>

      {/* Модалки PIN и Пароля */}
      {pinModalOpen && (
        <PinSetupModal
          onClose={() => setPinModalOpen(false)}
          onNotify={onNotify}
        />
      )}

      {passwordModalOpen && (
        <PasswordSetupModal
          onClose={() => setPasswordModalOpen(false)}
          onNotify={onNotify}
        />
      )}
    </div>
  )
}

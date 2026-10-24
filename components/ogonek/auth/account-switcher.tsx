'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  HelpCircle,
  LogIn,
  LogOut,
  Settings,
  UserPlus,
  UserRound,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { accountHandle } from '@/lib/ogonek/accounts'
import { playClick } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import type { ViewId } from '@/lib/ogonek/types'
import { Tooltip } from '../tooltip'
import { AccountAvatar } from './account-avatar'

type Props = {
  streak: number
  onOpenProfile?: () => void
  onNavigate?: (view: ViewId) => void
  onNotify: (message: string) => void
  /** Открыть модальное окно входа/регистрации (реализуется в AppShell) */
  onOpenAuth: (mode: 'signin' | 'register') => void
}

/**
 * КАРТОЧКА ПОЛЬЗОВАТЕЛЯ И МЕНЮ АККАУНТА (ЗАДАЧА 2):
 * - Внизу сайдбара в стиле X.com
 * - Для авторизованного пользователя: только текущий пользователь,
 *   пункты «Мой профиль», «Настройки», «Как пользоваться», «Выйти».
 * - Для гостя: кнопки «Войти» и «Зарегистрироваться», «Как пользоваться».
 * - Никаких хардкодных тестовых аккаунтов.
 */
export function AccountSwitcher({ streak, onOpenProfile, onNavigate, onNotify, onOpenAuth }: Props) {
  const { state, signOut } = useOgonekStore()
  const auth = state.auth
  const sound = state.soundEnabled

  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const active = auth.accounts.find((a) => a.id === auth.activeAccountId) ?? auth.accounts[0]
  const isGuest = !auth.signedIn || Boolean(active?.isGuest)

  // Закрытие по клику вне меню и по Escape
  useEffect(() => {
    if (!open) return
    const handlePointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const handleSignOut = useCallback(() => {
    playClick(sound)
    signOut()
    setOpen(false)
    onNotify('Вы вышли из аккаунта')
  }, [signOut, sound, onNotify])

  const handleOpenGuide = () => {
    setOpen(false)
    window.dispatchEvent(new CustomEvent('ogonek:open-onboarding'))
  }

  return (
    <div className="account-switcher" ref={rootRef}>
      <AnimatePresence>
        {open && (
          <motion.div
            className="account-menu"
            role="menu"
            aria-label="Меню пользователя"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {/* Карточка текущего пользователя в шапке попапа */}
            {!isGuest && active ? (
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-3">
                <AccountAvatar account={active} size={42} active />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-[var(--text)] truncate leading-tight">
                    {active.snapshot?.displayName || state.profile.displayName || 'Пользователь'}
                  </p>
                  <p className="text-[13px] text-[var(--text-3)] truncate font-mono">
                    {accountHandle(active)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <p className="text-[14px] font-bold text-[var(--text)]">Гостевой режим</p>
                <p className="text-[12px] text-[var(--text-2)] mt-0.5">
                  Войди, чтобы сохранять летопись в облако
                </p>
              </div>
            )}

            <div className="account-menu__actions py-1.5">
              {!isGuest ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="account-menu__action"
                    onClick={() => {
                      setOpen(false)
                      if (onOpenProfile) onOpenProfile()
                      else onNavigate?.('profile')
                    }}
                  >
                    <UserRound size={17} /> Мой профиль
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    className="account-menu__action"
                    onClick={() => {
                      setOpen(false)
                      onNavigate?.('settings')
                    }}
                  >
                    <Settings size={17} /> Настройки
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="account-menu__action font-bold text-[var(--accent)]"
                    onClick={() => {
                      setOpen(false)
                      onOpenAuth('signin')
                    }}
                  >
                    <LogIn size={17} /> Войти
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    className="account-menu__action"
                    onClick={() => {
                      setOpen(false)
                      onOpenAuth('register')
                    }}
                  >
                    <UserPlus size={17} /> Зарегистрироваться
                  </button>
                </>
              )}

              {/* Раздел «Гайд» перенесён сюда */}
              <button
                type="button"
                role="menuitem"
                className="account-menu__action"
                onClick={handleOpenGuide}
              >
                <HelpCircle size={17} /> Как пользоваться
              </button>
            </div>

            {!isGuest && (
              <>
                <div className="account-menu__divider" />
                <button
                  type="button"
                  role="menuitem"
                  className="account-menu__action is-danger"
                  onClick={handleSignOut}
                >
                  <LogOut size={16} /> Выйти
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Tooltip content={isGuest ? 'Войти в аккаунт' : 'Меню пользователя'} side="top">
        <button
          type="button"
          className={`profile-mini account-switcher__trigger ${open ? 'is-open' : ''}`}
          onClick={() => {
            playClick(sound)
            setOpen((value) => !value)
          }}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={isGuest ? 'Войти' : `Аккаунт ${active?.snapshot.displayName || ''}`}
        >
          {active ? (
            <AccountAvatar account={active} size={40} active={!isGuest} />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[var(--bg-elev)] border border-[var(--border)] flex items-center justify-center text-[var(--text-2)]">
              <UserRound size={18} />
            </div>
          )}

          <span className="account-switcher__text">
            <strong>
              {isGuest ? 'Войти' : active?.snapshot?.displayName || state.profile.displayName || 'Огонёк'}
            </strong>
            <small>
              {isGuest ? 'Гость' : `${accountHandle(active || { provider: 'email', email: '' } as any)} · ${streak}д`}
            </small>
          </span>
        </button>
      </Tooltip>
    </div>
  )
}

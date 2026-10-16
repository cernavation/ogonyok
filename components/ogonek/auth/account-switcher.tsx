'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  BadgeCheck,
  Check,
  ChevronUp,
  LogIn,
  LogOut,
  Settings,
  Trash2,
  UserPlus,
  UserRound,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AUTH_PROVIDER_META,
  accountHandle,
  accountSubtitle,
} from '@/lib/ogonek/accounts'
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
 * ЭТАП 18 — ПЕРЕКЛЮЧАТЕЛЬ АККАУНТОВ (нижний левый угол сайдбара).
 * Показывает активную личность, а по клику открывает всплывающее меню со
 * списком профилей, быстрым переключением, добавлением и выходом.
 */
export function AccountSwitcher({ streak, onOpenProfile, onNavigate, onNotify, onOpenAuth }: Props) {
  const { state, switchAccount, signOut, removeAccount } = useOgonekStore()
  const auth = state.auth
  const sound = state.soundEnabled

  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const active = auth.accounts.find((a) => a.id === auth.activeAccountId) ?? auth.accounts[0]

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

  const handleSwitch = useCallback(
    (accountId: string) => {
      if (accountId === auth.activeAccountId) {
        setOpen(false)
        return
      }
      const target = auth.accounts.find((a) => a.id === accountId)
      if (!target) return
      playClick(sound)
      switchAccount(accountId)
      setOpen(false)
      onNotify(`Аккаунт переключён: ${target.snapshot.displayName}`)
    },
    [auth.activeAccountId, auth.accounts, switchAccount, sound, onNotify]
  )

  const handleSignOut = useCallback(() => {
    playClick(sound)
    signOut()
    setOpen(false)
    onNotify('Вы вышли из аккаунта')
  }, [signOut, sound, onNotify])

  const handleRemove = useCallback(
    (accountId: string, name: string) => {
      if (typeof window !== 'undefined' && !window.confirm(`Удалить аккаунт ${name} с этого устройства?`)) {
        return
      }
      playClick(sound)
      const ok = removeAccount(accountId)
      onNotify(ok ? `Аккаунт ${name} удалён` : 'Нельзя удалить последний аккаунт')
    },
    [removeAccount, sound, onNotify]
  )

  if (!active) return null

  return (
    <div className="account-switcher" ref={rootRef}>
      <AnimatePresence>
        {open && (
          <motion.div
            className="account-menu"
            role="menu"
            aria-label="Меню аккаунтов"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="account-menu__head">
              <b>Аккаунты</b>
              <span>{auth.accounts.length}</span>
              <button
                type="button"
                className="account-menu__add"
                onClick={() => {
                  setOpen(false)
                  onOpenAuth('register')
                }}
                aria-label="Добавить аккаунт"
                title="Добавить аккаунт"
              >
                <UserPlus size={15} />
              </button>
            </div>

            <ul className="account-menu__list">
              {auth.accounts.map((account) => {
                const isActive = account.id === auth.activeAccountId
                return (
                  <li key={account.id}>
                    <button
                      type="button"
                      role="menuitem"
                      className={`account-menu__item ${isActive ? 'is-active' : ''}`}
                      onClick={() => handleSwitch(account.id)}
                    >
                      <AccountAvatar account={account} size={38} active={isActive} />
                      <span className="account-menu__meta">
                        <b>
                          {account.snapshot.displayName}
                          {account.snapshot.verified && (
                            <BadgeCheck size={12} className="account-menu__verified" />
                          )}
                        </b>
                        <small>{accountSubtitle(account)}</small>
                      </span>
                      <span
                        className="account-menu__badge"
                        style={{ color: AUTH_PROVIDER_META[account.provider].color }}
                      >
                        {isActive ? <Check size={14} /> : AUTH_PROVIDER_META[account.provider].short}
                      </span>
                    </button>
                    {auth.accounts.length > 1 && (
                      <button
                        type="button"
                        className="account-menu__remove"
                        onClick={() => handleRemove(account.id, account.snapshot.displayName)}
                        aria-label={`Удалить аккаунт ${account.snapshot.displayName}`}
                        title="Удалить с устройства"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>

            <div className="account-menu__actions">
              <button
                type="button"
                role="menuitem"
                className="account-menu__action"
                onClick={() => {
                  setOpen(false)
                  onOpenAuth('register')
                }}
              >
                <UserPlus size={15} /> Добавить аккаунт
              </button>
              <button
                type="button"
                role="menuitem"
                className="account-menu__action"
                onClick={() => {
                  setOpen(false)
                  onOpenAuth('signin')
                }}
              >
                <LogIn size={15} /> Войти в другой аккаунт
              </button>
              {onOpenProfile && (
                <button
                  type="button"
                  role="menuitem"
                  className="account-menu__action"
                  onClick={() => {
                    setOpen(false)
                    onOpenProfile()
                  }}
                >
                  <UserRound size={15} /> Открыть профиль
                </button>
              )}
              {onNavigate && (
                <button
                  type="button"
                  role="menuitem"
                  className="account-menu__action"
                  onClick={() => {
                    setOpen(false)
                    onNavigate('settings')
                  }}
                >
                  <Settings size={15} /> Настройки аккаунта
                </button>
              )}
            </div>

            <div className="account-menu__divider" />

            <button type="button" role="menuitem" className="account-menu__action is-danger" onClick={handleSignOut}>
              <LogOut size={15} /> Выйти из {accountHandle(active)}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Tooltip content="Аккаунты и профиль" side="top">
        <button
          type="button"
          className={`profile-mini account-switcher__trigger ${open ? 'is-open' : ''}`}
          onClick={() => {
            playClick(sound)
            setOpen((value) => !value)
          }}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Аккаунт ${active.snapshot.displayName}. Открыть меню аккаунтов`}
        >
          <AccountAvatar account={active} size={40} active />
          <span className="account-switcher__text">
            <strong>{active.snapshot.displayName}</strong>
            <small>
              {accountHandle(active)} · {streak}д
            </small>
          </span>
          <span className="account-switcher__caret" aria-hidden="true">
            <ChevronUp size={18} />
          </span>
        </button>
      </Tooltip>
    </div>
  )
}

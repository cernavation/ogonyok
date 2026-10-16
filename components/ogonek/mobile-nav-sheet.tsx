'use client'

import { motion } from 'framer-motion'
import {
  BarChart3,
  Home,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Target,
  User,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { playClick } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import type { ViewId } from '@/lib/ogonek/types'

type Props = {
  view: ViewId
  onNavigate: (view: ViewId) => void
  onCompose: () => void
  onClose: () => void
}

type SheetItem = { id: ViewId; label: string; hint: string; icon: LucideIcon }

const SECTIONS: SheetItem[] = [
  { id: 'home', label: 'Главная', hint: 'Лента дней и стрик', icon: Home },
  { id: 'explore', label: 'Поиск', hint: 'Люди, теги, достижения', icon: Search },
  { id: 'messages', label: 'Чаты', hint: 'Друзья и поддержка', icon: MessageCircle },
  { id: 'vault', label: 'Evidence Vault', hint: 'Факты твоей силы', icon: Zap },
  { id: 'intentions', label: 'Намерения', hint: 'Утренний фокус и сверка', icon: Target },
  { id: 'analytics', label: 'Аналитика', hint: 'Динамика и карта огня', icon: BarChart3 },
  { id: 'profile', label: 'Профиль', hint: 'Ачивки, сторис, медиа', icon: User },
  { id: 'settings', label: 'Настройки', hint: 'Тема, приватность, синк', icon: Settings },
]

/**
 * ЭТАП 20 — МОБИЛЬНАЯ КАРТА РАЗДЕЛОВ («Ещё»).
 * На узких экранах сайдбар и правая колонка скрыты, поэтому этот bottom-sheet
 * делает все разделы досягаемыми: Evidence Vault, Намерения, Профиль и
 * Настройки больше не теряются. Каждый пункт реально переключает вид.
 */
export function MobileNavSheet({ view, onNavigate, onCompose, onClose }: Props) {
  const { state, signOut } = useOgonekStore()
  const profile = state.profile

  const go = (id: ViewId) => {
    playClick(state.soundEnabled)
    onNavigate(id)
    onClose()
  }

  const handleCompose = () => {
    playClick(state.soundEnabled)
    onClose()
    onCompose()
  }

  const handleSignOut = () => {
    playClick(state.soundEnabled)
    onClose()
    signOut()
  }

  return (
    <>
      <motion.div
        className="mobile-sheet-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        className="mobile-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Все разделы"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 34 }}
      >
        <div className="mobile-sheet__grab" aria-hidden="true" />

        <header className="mobile-sheet__head">
          <span
            className="avatar avatar-photo mobile-sheet__avatar"
            style={{ background: profile.avatarColor }}
            aria-hidden="true"
          >
            {(profile.displayName.trim().split(/\s+/)[0]?.[0] ?? 'Я').toUpperCase()}
          </span>
          <span className="mobile-sheet__who">
            <b>{profile.displayName}</b>
            <small>@{profile.username}</small>
          </span>
          <button
            type="button"
            className="mobile-sheet__close"
            onClick={onClose}
            aria-label="Закрыть меню разделов"
          >
            <X size={18} />
          </button>
        </header>

        <div className="mobile-sheet__grid" role="menu" aria-label="Разделы приложения">
          {SECTIONS.map(({ id, label, hint, icon: Icon }) => {
            const active = view === id
            return (
              <button
                key={id}
                type="button"
                role="menuitem"
                className={`mobile-sheet__item ${active ? 'is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => go(id)}
              >
                <span className="mobile-sheet__item-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span className="mobile-sheet__item-text">
                  <b>{label}</b>
                  <small>{hint}</small>
                </span>
              </button>
            )
          })}
        </div>

        <div className="mobile-sheet__actions">
          <button type="button" className="mobile-sheet__compose" onClick={handleCompose}>
            <Plus size={17} strokeWidth={2.5} /> Записать день
          </button>
          <button type="button" className="mobile-sheet__signout" onClick={handleSignOut}>
            <LogOut size={15} /> Выйти из аккаунта
          </button>
        </div>
      </motion.div>
    </>
  )
}

'use client'

import React from 'react'
import Link from 'next/link'
import {
  BarChart3,
  Home,
  MessageCircle,
  PenSquare,
  Search,
  Settings,
  Trophy,
  User,
  Zap,
} from 'lucide-react'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { totalUnread } from '@/lib/ogonek/messenger'
import { Tooltip } from '../tooltip'
import { usePhotoUrl } from '@/lib/ogonek/use-photo-url'

type Props = {
  activeSection?: string
  onNewChat: () => void
  onOpenProfile?: () => void
  soundEnabled?: boolean
}

export function MessengerIconRail({ activeSection = 'chats', onNewChat, onOpenProfile }: Props) {
  const { state } = useOgonekStore()
  const avatarSrc = usePhotoUrl(state.profile.avatarImage)
  const unreadCount = totalUnread(state.chatThreads ?? {})

  const NAV_ITEMS = [
    { id: 'explore', icon: Search, label: 'Поиск', href: '/?view=explore' },
    { id: 'chats', icon: MessageCircle, label: 'Чаты', href: '/chats', badge: unreadCount },
    { id: 'profile', icon: User, label: 'Профиль', href: '/?view=profile' },
    { id: 'vault', icon: Zap, label: 'Evidence Vault', href: '/?view=vault' },
    { id: 'analytics', icon: BarChart3, label: 'Статистика', href: '/?view=analytics' },
    { id: 'leaderboard', icon: Trophy, label: 'Рейтинг', href: '/?view=leaderboard' },
    { id: 'settings', icon: Settings, label: 'Настройки', href: '/?view=settings' },
  ]

  return (
    <aside
      className="w-[88px] h-full shrink-0 flex flex-col items-center justify-between py-4 border-r border-[var(--border)] bg-[var(--bg)] select-none z-20"
      aria-label="Основная навигация"
    >
      {/* Верхняя часть: Кнопка «Домой» и основные разделы */}
      <div className="flex flex-col items-center gap-2 w-full">
        {/* Кнопка «Домой» */}
        <Tooltip content="На главную" side="right">
          <Link
            href="/"
            className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-[var(--text)] hover:bg-[var(--bg-hover)] transition-all hover:scale-105 active:scale-95 group"
            aria-label="На главную"
          >
            <Home size={26} className="text-[var(--text)] group-hover:text-[var(--accent)] transition-colors" />
          </Link>
        </Tooltip>

        <div className="w-8 h-[1px] bg-[var(--border)] my-1" />

        {/* Иконки разделов без подписей: зона 52×52, мягкий круг hover */}
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === activeSection
          const Icon = item.icon

          return (
            <Tooltip key={item.id} content={item.label} side="right">
              <Link
                href={item.href}
                className={`relative w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-md scale-105'
                    : 'text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]'
                }`}
                aria-label={item.label}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />

                {/* Бейдж непрочитанных */}
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 bg-[var(--accent)] text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-[var(--bg)] shadow">
                    {item.badge! > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            </Tooltip>
          )
        })}
      </div>

      {/* Нижняя часть: Круглая кнопка «Новый чат» (64px) и мой аватар (40px) */}
      <div className="flex flex-col items-center gap-4 w-full">
        <Tooltip content="Новый чат" side="right">
          <button
            type="button"
            onClick={onNewChat}
            className="w-[64px] h-[64px] rounded-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center shadow-lg hover:opacity-90 transition-all hover:scale-105 active:scale-95 group"
            aria-label="Новый чат"
          >
            <PenSquare size={26} strokeWidth={2.5} />
          </button>
        </Tooltip>

        <Tooltip content={`Мой профиль (@${state.profile.username})`} side="right">
          <button
            type="button"
            onClick={onOpenProfile}
            className="w-[40px] h-[40px] rounded-full overflow-hidden border-2 border-[var(--border)] hover:border-[var(--accent)] transition-all hover:scale-105 active:scale-95"
            aria-label="Мой профиль"
          >
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt={state.profile.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: state.profile.avatarColor || 'var(--accent)' }}
              >
                {state.profile.displayName?.slice(0, 2).toUpperCase() || 'ОГ'}
              </div>
            )}
          </button>
        </Tooltip>
      </div>
    </aside>
  )
}

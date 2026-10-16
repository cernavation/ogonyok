'use client'

import { BarChart3, Home, MessageCircle, Plus, Search, Settings, Target, User, Zap } from 'lucide-react'
import { CURRENT_DAY } from '@/lib/ogonek/data'
import { totalUnread } from '@/lib/ogonek/messenger'
import type { ViewId } from '@/lib/ogonek/types'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { AccountSwitcher } from './auth'
import { Tooltip } from './tooltip'

type Props = {
  view: ViewId
  onNavigate: (view: ViewId) => void
  onFocusIntentions: () => void
  onCompose: () => void
  onOpenProfile?: () => void
  /** Открыть модальное окно входа/регистрации (реализуется в AppShell) */
  onOpenAuth: (mode: 'signin' | 'register') => void
  /** Всплывающее уведомление (тост) для обратной связи действий аккаунта */
  onNotify: (message: string) => void
  streak?: number
}

const NAV = [
  { id: 'home' as ViewId,       icon: Home,     label: 'Главная' },
  { id: 'explore' as ViewId,   icon: Search,   label: 'Поиск' },
  { id: 'messages' as ViewId,  icon: MessageCircle, label: 'Чаты' },
  { id: 'vault' as ViewId,     icon: Zap,      label: 'Evidence Vault' },
  { id: 'analytics' as ViewId, icon: BarChart3, label: 'Аналитика' },
  { id: 'profile' as ViewId,   icon: User,     label: 'Профиль' },
  { id: 'settings' as ViewId,  icon: Settings, label: 'Настройки' },
]

export function Sidebar({
  view,
  onNavigate,
  onFocusIntentions,
  onCompose,
  onOpenProfile,
  onOpenAuth,
  onNotify,
  streak = CURRENT_DAY,
}: Props) {
  const { state } = useOgonekStore()
  const unread = totalUnread(state.chatThreads ?? {})
  return (
    <aside className="sidebar" aria-label="Боковая панель">
      {/* X-style logo mark */}
      <div className="brand">
        <span
          className="brand-flame"
          aria-hidden="true"
          style={{ fontSize: 28, letterSpacing: '-0.04em', fontWeight: 900 }}
        >
          ✦
        </span>
        <span>Огонёк</span>
      </div>

      {/* Navigation */}
      <nav className="nav-list" aria-label="Разделы приложения">
        {NAV.map(({ id, icon: Icon, label }) => (
          <Tooltip key={id} content={label} side="right">
            <button
              type="button"
              className={`nav-item ${view === id ? 'active' : ''}`}
              onClick={() => onNavigate(id)}
              aria-label={label}
              aria-current={view === id ? 'page' : undefined}
            >
              <Icon size={24} strokeWidth={view === id ? 2.5 : 1.75} />
              <span>{label}</span>
              {id === 'messages' && unread > 0 && (
                <span className="nav-item__badge" aria-label={`${unread} непрочитанных`}>
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
          </Tooltip>
        ))}

        <Tooltip content="Утренние намерения" side="right">
          <button
            type="button"
            className="nav-item"
            onClick={onFocusIntentions}
            aria-label="Утренние намерения"
          >
            <Target size={24} strokeWidth={1.75} />
            <span>Намерения</span>
          </button>
        </Tooltip>
      </nav>

      {/* Primary CTA — Twitter Blue pill */}
      <Tooltip content="Записать день" side="top" hotkey="N">
        <button
          type="button"
          className="x-compose-btn"
          onClick={onCompose}
          aria-label="Записать день"
        >
          <Plus size={20} strokeWidth={2.5} className="compose-btn-icon-only" />
          <span className="compose-btn-label">Записать</span>
        </button>
      </Tooltip>

      {/* Profile block — переключатель аккаунтов (ЭТАП 18) */}
      <AccountSwitcher
        streak={streak}
        onOpenProfile={onOpenProfile}
        onNavigate={onNavigate}
        onNotify={onNotify}
        onOpenAuth={onOpenAuth}
      />
    </aside>
  )
}

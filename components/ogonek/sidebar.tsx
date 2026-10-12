'use client'

import { BarChart3, Home, MoreHorizontal, Plus, Search, Settings, Target, Zap } from 'lucide-react'
import { CURRENT_DAY } from '@/lib/ogonek/data'
import type { ViewId } from '@/lib/ogonek/types'
import { Tooltip } from './tooltip'

type Props = {
  view: ViewId
  onNavigate: (view: ViewId) => void
  onFocusIntentions: () => void
  onCompose: () => void
  onOpenProfile?: () => void
  streak?: number
}

const NAV = [
  { id: 'home' as ViewId,      icon: Home,     label: 'Главная' },
  { id: 'explore' as ViewId,   icon: Search,   label: 'Поиск' },
  { id: 'vault' as ViewId,     icon: Zap,      label: 'Evidence Vault' },
  { id: 'analytics' as ViewId, icon: BarChart3, label: 'Аналитика' },
  { id: 'settings' as ViewId,  icon: Settings, label: 'Настройки' },
]

export function Sidebar({
  view,
  onNavigate,
  onFocusIntentions,
  onCompose,
  onOpenProfile,
  streak = CURRENT_DAY,
}: Props) {
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

      {/* Profile block */}
      <Tooltip content="Профиль @cernavation" side="top" hotkey="P">
        <div
          className="profile-mini cursor-pointer hover:bg-white/[0.08] transition-colors duration-150 rounded-full px-3 py-2.5 -mx-1"
          onClick={onOpenProfile}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpenProfile?.()
            }
          }}
          aria-label="Открыть профиль пользователя"
        >
          {/* Avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-none select-none"
            style={{
              background: 'linear-gradient(145deg, #7f95a3 0%, #7f95a3 35%, #d9ae8b 36%, #d9ae8b 66%, #29384b 67%)',
              color: '#fff',
              textShadow: '0 1px 2px #000',
            }}
            aria-hidden="true"
          >
            AC
          </div>
          <div className="flex-1 min-w-0">
            <strong className="block text-[15px] font-bold text-[#e7e9ea] tracking-[-0.015em] truncate leading-[20px]">
              Алексей Черна
            </strong>
            <small className="block text-[#71767b] text-[12px] leading-[16px] mt-0.5 truncate">
              @cernavation · {streak}д
            </small>
          </div>
          <button
            type="button"
            className="text-[#71767b] p-1 rounded-full hover:bg-white/[0.08] transition-colors flex-none"
            aria-label="Меню профиля"
            onClick={(e) => { e.stopPropagation(); onOpenProfile?.() }}
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </Tooltip>
    </aside>
  )
}

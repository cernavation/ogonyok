'use client'

import { Archive, BarChart3, ChevronRight, Search, ShieldAlert } from 'lucide-react'
import { CURRENT_DAY, EVIDENCE_ITEMS } from '@/lib/ogonek/data'
import type { StreakStatus } from '@/lib/ogonek/streak'
import type { ViewId } from '@/lib/ogonek/types'
import { FlameIcon } from './flame-icon'
import { ActiveFriendsWidget } from './active-friends-widget'
import { StoriesBar } from './stories-bar'
import { Tooltip } from './tooltip'

type Props = {
  onNavigate: (view: ViewId) => void
  onCompose: () => void
  streak?: number
  streakStatus?: StreakStatus
  hoursLeft?: number | null
  isDemo?: boolean
  onNotify?: (message: string) => void
  soundEnabled?: boolean
}

export function RightRail({
  onNavigate,
  onCompose,
  streak = CURRENT_DAY,
  streakStatus = 'safe',
  hoursLeft,
  isDemo = false,
  onNotify,
  soundEnabled = true,
}: Props) {
  return (
    <aside className="right-rail" aria-label="Дополнительная информация">
      {/* Search bar — X.com style */}
      <div className="x-search-bar mb-4" role="search">
        <div
          className="flex items-center gap-3 bg-[#202327] rounded-full px-4 py-3 cursor-pointer hover:bg-[#2c2f33] transition-colors duration-150 border border-transparent hover:border-[#1d9bf0]/30"
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('explore')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('explore') }
          }}
          aria-label="Перейти к поиску"
        >
          <Search size={18} className="text-[#71767b] flex-none" />
          <span className="text-[#71767b] text-[15px] select-none">Поиск по журналу</span>
        </div>
      </div>

      {/* Сторис друзей — живая карточка в правой панели */}
      {onNotify && (
        <div className="stories-rail-card">
          <StoriesBar
            variant="rail"
            onNotify={onNotify}
            soundEnabled={soundEnabled}
            onOpenProfile={() => onNavigate('profile')}
          />
        </div>
      )}

      {/* Активные друзья — онлайн-статусы и свежие сторис */}
      {onNotify && (
        <ActiveFriendsWidget
          onNavigate={onNavigate}
          onNotify={onNotify}
          soundEnabled={soundEnabled}
        />
      )}

      {isDemo && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-semibold">
            <ShieldAlert size={14} /> ДЕМО РЕЖИМ
          </span>
          <button
            type="button"
            className="text-[11px] underline text-amber-300 hover:text-white transition-colors"
            onClick={() => onNavigate('settings')}
          >
            Импорт данных →
          </button>
        </div>
      )}

      {/* Streak & Deadline widget */}
      <section
        className="bg-[#16181c] rounded-2xl border border-[#2f3336] p-4 mb-4"
        aria-labelledby="streak-title"
      >
        <h2 id="streak-title" className="text-[#e7e9ea] text-[20px] font-bold tracking-[-0.02em] mb-3">
          Стрик & Дедлайн
        </h2>
        <div className="flex items-center gap-3 mb-3">
          <FlameIcon status={streakStatus} hoursLeft={hoursLeft} size={36} />
          <div>
            <p className="text-[#e7e9ea] text-[32px] font-black leading-none tracking-[-0.03em]">
              {streak}
            </p>
            <p className="text-[#71767b] text-[13px] leading-[16px] mt-0.5">дней подряд</p>
          </div>
        </div>
        <p className="flex items-center gap-1.5 text-[13px] leading-[16px]">
          <span className="w-2 h-2 rounded-full bg-[#00ba7c] flex-none" aria-hidden="true" />
          <span className="text-[#71767b]">Telegram-бот подключен</span>
        </p>
        <button
          type="button"
          onClick={() => onNavigate('analytics')}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-full border border-[#2f3336] text-[14px] font-bold text-[#e7e9ea] hover:bg-white/[0.06] transition-colors duration-150"
        >
          <BarChart3 size={15} /> Аналитика
        </button>
      </section>

      {/* Evidence Vault widget */}
      <section
        className="bg-[#16181c] rounded-2xl border border-[#2f3336] p-4 mb-4"
        aria-labelledby="vault-title"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 id="vault-title" className="text-[#e7e9ea] text-[20px] font-bold tracking-[-0.02em]">
            Evidence Vault
          </h2>
          <Archive size={18} className="text-[#71767b]" />
        </div>
        <p className="text-[#71767b] text-[13px] leading-[18px] mb-3">
          Факты силы, которые помогают вспомнить, на что ты способен.
        </p>
        <div className="flex flex-col divide-y divide-[#2f3336]">
          {EVIDENCE_ITEMS.slice(0, 3).map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => onNavigate('vault')}
              className="flex items-center justify-between w-full text-left py-2.5 text-[14px] text-[#e7e9ea] hover:text-[#1d9bf0] transition-colors duration-150 group"
              aria-label={`Открыть: ${item.title}`}
            >
              <span className="truncate pr-2">{item.title}</span>
              <ChevronRight size={15} className="text-[#71767b] group-hover:text-[#1d9bf0] flex-none transition-colors" />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onNavigate('vault')}
          className="mt-3 w-full py-2 rounded-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white text-[14px] font-bold transition-colors duration-150"
        >
          Открыть Vault →
        </button>
      </section>

      {/* Quick actions widget */}
      <section
        className="bg-[#16181c] rounded-2xl border border-[#2f3336] p-4"
        aria-labelledby="trends-title"
      >
        <h2 id="trends-title" className="text-[#e7e9ea] text-[20px] font-bold tracking-[-0.02em] mb-3">
          Быстрые действия
        </h2>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onCompose}
            className="flex items-center justify-between w-full py-2.5 px-0 text-left group"
            aria-label="Записать новый день"
          >
            <div>
              <p className="text-[#71767b] text-[12px] leading-[16px]">Добавить</p>
              <p className="text-[#e7e9ea] text-[15px] font-bold leading-[20px] group-hover:text-[#1d9bf0] transition-colors">
                Новый день
              </p>
            </div>
            <ChevronRight size={16} className="text-[#71767b] group-hover:text-[#1d9bf0] transition-colors flex-none" />
          </button>
          <div className="h-px bg-[#2f3336]" />
          <button
            type="button"
            onClick={() => onNavigate('analytics')}
            className="flex items-center justify-between w-full py-2.5 px-0 text-left group"
            aria-label="Открыть аналитику"
          >
            <div>
              <p className="text-[#71767b] text-[12px] leading-[16px]">Открыть</p>
              <p className="text-[#e7e9ea] text-[15px] font-bold leading-[20px] group-hover:text-[#1d9bf0] transition-colors">
                Аналитика & Стрик
              </p>
            </div>
            <ChevronRight size={16} className="text-[#71767b] group-hover:text-[#1d9bf0] transition-colors flex-none" />
          </button>
        </div>
      </section>
    </aside>
  )
}

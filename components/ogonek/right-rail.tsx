'use client'

import { Archive, MoreHorizontal, Search, ShieldAlert } from 'lucide-react'
import { CURRENT_DAY, EVIDENCE_ITEMS } from '@/lib/ogonek/data'
import type { StreakStatus } from '@/lib/ogonek/streak'
import type { ViewId } from '@/lib/ogonek/types'
import { FlameIcon } from './flame-icon'
import { Tooltip } from './tooltip'

type Props = {
  onNavigate: (view: ViewId) => void
  onCompose: () => void
  streak?: number
  streakStatus?: StreakStatus
  hoursLeft?: number | null
  isDemo?: boolean
}

export function RightRail({
  onNavigate,
  onCompose,
  streak = CURRENT_DAY,
  streakStatus = 'safe',
  hoursLeft,
  isDemo = false,
}: Props) {
  return (
    <aside className="right-rail" aria-label="Дополнительная информация">
      {isDemo && (
        <div className="demo-badge-bar mb-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-400 flex items-center justify-between">
          <span className="flex items-center gap-1 font-semibold">
            <ShieldAlert size={14} /> ДЕМО РЕЖИМ
          </span>
          <button
            type="button"
            className="text-[11px] underline text-amber-300 hover:text-white"
            onClick={() => onNavigate('settings')}
          >
            Импорт данных →
          </button>
        </div>
      )}

      <div
        className="search-box"
        role="button"
        tabIndex={0}
        onClick={() => onNavigate('explore')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onNavigate('explore')
          }
        }}
        aria-label="Перейти к поиску"
      >
        <Search size={18} />
        <input
          placeholder="Поиск"
          readOnly
          aria-label="Поиск по журналу"
        />
      </div>

      <section className="widget streak-widget" aria-labelledby="streak-title">
        <div className="widget-title">
          <span id="streak-title">Стрик & Дедлайн</span>
          <Tooltip content="Параметры стрика" side="left">
            <button
              type="button"
              className="muted"
              aria-label="Параметры стрика"
              style={{ padding: 2 }}
              onClick={() => onNavigate('analytics')}
            >
              <MoreHorizontal size={17} />
            </button>
          </Tooltip>
        </div>
        <div className="streak-big">
          <FlameIcon status={streakStatus} hoursLeft={hoursLeft} size={36} />
          <strong>{streak}</strong>
          <span>дней подряд</span>
        </div>
        <p className="connected">
          <span aria-hidden="true" /> Telegram-бот подключен
        </p>
      </section>

      <section className="widget vault-widget" aria-labelledby="vault-title">
        <div className="widget-title">
          <span id="vault-title">Evidence Vault</span>
          <Archive size={18} />
        </div>
        <p>Факты силы, которые помогают вспомнить, на что ты способен.</p>
        {EVIDENCE_ITEMS.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => onNavigate('vault')}
            aria-label={`Открыть доказательство: ${item.title}`}
          >
            <span>{item.title}</span>
            <span aria-hidden="true">→</span>
          </button>
        ))}
      </section>

      <section className="widget trends" aria-labelledby="trends-title">
        <div className="widget-title">
          <span id="trends-title">Быстрые действия</span>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('analytics')}
          aria-label="Открыть раздел Аналитика & Стрик"
        >
          <small>Открыть</small>
          <b>Аналитика & Стрик</b>
          <span aria-hidden="true">→</span>
        </button>
        <button
          type="button"
          onClick={onCompose}
          aria-label="Записать новый день"
        >
          <small>Добавить</small>
          <b>Новый день</b>
          <span aria-hidden="true">→</span>
        </button>
      </section>
    </aside>
  )
}

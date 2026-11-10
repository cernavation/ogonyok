'use client'

import { ArrowLeft, Check, Flame, Lock, Pin, Plus, Search, Sparkles, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { EVIDENCE_CATEGORIES } from '@/lib/ogonek/data'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { EvidenceItem, ViewId } from '@/lib/ogonek/types'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { normalizeTier } from '@/lib/ogonek/permissions'
import { dispatchUpgradeModal } from '@/components/ogonek/billing/upgrade-modal'

const MilestoneVaultCard = dynamic(
  () => import('../milestones/milestone-vault-card').then((m) => m.MilestoneVaultCard),
  { ssr: false }
)
const MilestoneModal = dynamic(
  () => import('../milestones/milestone-modal').then((m) => m.MilestoneModal),
  { ssr: false }
)

type Props = {
  evidenceItems?: EvidenceItem[]
  onNavigate: (view: ViewId) => void
  onTogglePin?: (id: string) => void
  onAddEvidence?: (item: Omit<EvidenceItem, 'id'>) => void
  onDeleteEvidence?: (id: string) => void
  onNotify?: (msg: string) => void
  soundEnabled?: boolean
}

export function VaultView({
  evidenceItems = [],
  onNavigate,
  onTogglePin,
  onAddEvidence,
  onDeleteEvidence,
  onNotify,
  soundEnabled = true,
}: Props) {
  const { state: storeState } = useOgonekStore()
  const userTier = normalizeTier(storeState?.profile?.subscription_tier, storeState?.profile?.subscription_valid_until)
  const isFree = userTier === 'free'

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Все')
  const [isAdding, setIsAdding] = useState(false)
  const [milestones, setMilestones] = useState<any[]>([])
  const [activeMilestoneNumber, setActiveMilestoneNumber] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/milestones/vault')
      .then((res) => res.json())
      .then((json) => {
        if (!active) return
        if (json.success && Array.isArray(json.milestones)) {
          setMilestones(json.milestones.filter((m: any) => m.saved_to_vault))
        }
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [])

  // Form fields for adding new fact of strength
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCategory, setNewCategory] = useState<string>('Сомнения')
  const [newDate, setNewDate] = useState(() => {
    return new Date().toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).toUpperCase()
  })

  const query = search.trim().toLowerCase()

  const filteredItems = useMemo(() => {
    return evidenceItems
      .filter((item) => {
        const matchesCategory =
          selectedCategory === 'Все' ||
          (item.category && item.category.toLowerCase() === selectedCategory.toLowerCase())

        if (!matchesCategory) return false

        if (!query) return true

        const matchTitle = item.title.toLowerCase().includes(query)
        const matchDesc = item.description.toLowerCase().includes(query)
        const matchDate = item.date.toLowerCase().includes(query)
        return matchTitle || matchDesc || matchDate
      })
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
  }, [evidenceItems, selectedCategory, query])

  const handleSaveFact = () => {
    if (!newTitle.trim()) {
      onNotify?.('Введите название факта силы')
      return
    }

    if (onAddEvidence) {
      onAddEvidence({
        title: newTitle.trim(),
        description:
          newDescription.trim() ||
          'Ты продолжил, когда было проще остановиться. Характер стал сильнее.',
        date: newDate.trim(),
        category: newCategory,
        pinned: true,
      })
      playSuccess(soundEnabled)
      onNotify?.('Факт силы добавлен в Evidence Vault')
    }

    setNewTitle('')
    setNewDescription('')
    setIsAdding(false)
  }

  return (
    <div className="view-vault min-h-screen pb-20">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--line)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
            onClick={() => onNavigate('home')}
            aria-label="Вернуться на главную"
          >
            <ArrowLeft size={19} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">
              Evidence Vault
            </h1>
            <p className="text-[13px] text-[var(--muted)] font-normal">
              {evidenceItems.length} фактов силы
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playClick(soundEnabled)
            if (isFree) {
              dispatchUpgradeModal({
                feature: 'vault',
                reason: 'Evidence Vault доступен на тарифах Премиум и Ultra',
              })
              return
            }
            setIsAdding(!isAdding)
          }}
          className="min-h-[36px] px-4 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-[13px] font-extrabold inline-flex items-center gap-1.5 transition-colors"
        >
          {isAdding ? <X size={15} /> : <Plus size={15} />}
          <span>{isAdding ? 'Отмена' : 'Добавить факт'}</span>
        </button>
      </header>

      {/* Search Pill + Category Pills */}
      <div className="p-4 border-b border-[var(--line)] flex flex-col gap-3">
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[var(--bg-elev)] border border-[var(--line)] focus-within:border-[var(--accent)] transition-colors">
          <Search size={16} className="text-[var(--text-2)] flex-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Искать в доказательствах..."
            aria-label="Поиск по доказательствам"
            className="flex-1 bg-transparent border-0 outline-none text-[14px] text-[var(--text)] placeholder:text-[var(--text-2)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="w-7 h-7 min-w-[28px] rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
              aria-label="Очистить поиск"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5" role="tablist">
          {EVIDENCE_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                onClick={() => {
                  playClick(soundEnabled)
                  setSelectedCategory(cat)
                }}
                className={`min-h-[34px] px-3.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[var(--text)] text-[var(--bg)]'
                    : 'bg-[var(--bg-elev)] text-[var(--text-2)] hover:text-[var(--text)] border border-[var(--border)]'
                }`}
                aria-pressed={active}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* Compact Add Form */}
      {isAdding && (
        <div className="p-4 m-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-extrabold text-[var(--accent)]">
              ✦ Новый факт силы
            </span>
            <span className="text-[11px] text-[var(--text-3)]">
              Сохраняется локально
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] text-[var(--text-2)] font-semibold block mb-1">
                Дата победы
              </label>
              <input
                type="text"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-[12px] outline-none focus:border-[var(--accent)]"
                aria-label="Дата победы"
              />
            </div>

            <div>
              <label className="text-[11px] text-[var(--text-2)] font-semibold block mb-1">
                Категория
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-[12px] outline-none focus:border-[var(--accent)]"
                aria-label="Категория победы"
              >
                <option value="Сомнения">Сомнения</option>
                <option value="Memernity">Memernity</option>
                <option value="Спорт">Спорт</option>
                <option value="Школа">Школа</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-[var(--text-2)] font-semibold block mb-1">
              Что ты совершил? (Факт)
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Например: Проехал 130 км, хотя хотел остановиться"
              className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-[13px] outline-none focus:border-[var(--accent)]"
              aria-label="Название факта силы"
            />
          </div>

          <div>
            <label className="text-[11px] text-[var(--text-2)] font-semibold block mb-1">
              Цитата преодоления (почему это доказывает силу)
            </label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              placeholder="Ты продолжил, когда было проще сдаться..."
              className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-[12px] outline-none focus:border-[var(--accent)] resize-none"
              aria-label="Цитата преодоления"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3.5 py-1.5 rounded-full text-[12px] font-bold text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSaveFact}
              className="h-8 px-4 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-[12px] font-extrabold inline-flex items-center gap-1.5 transition-colors"
            >
              <Check size={14} /> Сохранить факт
            </button>
          </div>
        </div>
      )}

      {/* Юбилейные Вехи Свода (Vault Milestones) */}
      {milestones.length > 0 && (
        <div className="px-4 py-4 flex flex-col gap-3 border-b border-[var(--border)] bg-amber-500/[0.03]">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider">
            <Flame size={14} className="fill-amber-400" />
            <span>Золотые Вехи Свода</span>
          </div>
          <div className="flex flex-col gap-3">
            {milestones.map((m) => (
              <MilestoneVaultCard
                key={m.milestone_number}
                milestoneNumber={m.milestone_number}
                data={m.snapshot_json}
                onOpenDetails={() => {
                  playClick(soundEnabled)
                  setActiveMilestoneNumber(m.milestone_number)
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ЭТАП 13: Режим превью для Базового тарифа с 1-2 примерами и мягким блоком апселла */}
      {isFree ? (
        <div className="flex flex-col">
          <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-elev)]/50">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
              <Sparkles size={14} />
              <span>Режим предпросмотра Evidence Vault</span>
            </div>
            <p className="text-xs text-[var(--text-2)] leading-relaxed">
              Ниже показано, как выглядит Свод личной силы для фиксации ключевых моментов стойкости и побед.
            </p>
          </div>

          <div className="divide-y divide-[var(--border)] opacity-85">
            <article className="px-4 py-3.5 relative">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-[var(--text-2)] uppercase tracking-wider">
                    14 ОКТЯБРЯ 2026
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Демо-пример
                  </span>
                  <span className="text-[13px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--text)]">
                    Закреплено
                  </span>
                </div>
              </div>
              <h2 className="text-[15px] font-bold text-[var(--text)] leading-snug">
                Преодолел спад мотивации на 42-й день пути
              </h2>
              <p className="text-[14px] text-[var(--text-2)] leading-normal mt-1">
                Когда не было сил и желания даже открывать дневник — сел и честно зафиксировал 3 гордости. Характер закаляется именно в такие дни.
              </p>
            </article>

            <article className="px-4 py-3.5 relative">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-[var(--text-2)] uppercase tracking-wider">
                    28 СЕНТЯБРЯ 2026
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Демо-пример
                  </span>
                </div>
              </div>
              <h2 className="text-[15px] font-bold text-[var(--text)] leading-snug">
                Первый марафон дисциплины: 100 дней подряд
              </h2>
              <p className="text-[14px] text-[var(--text-2)] leading-normal mt-1">
                Доказал себе, что слово не расходится с делом. Рубеж взят, ни единого пропуска.
              </p>
            </article>
          </div>

          {/* Единый мягкий блок разблокировки */}
          <div className="m-4 p-6 rounded-3xl bg-[var(--bg-elev)] border border-[var(--border)] text-center shadow-lg relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3 border border-amber-500/20">
              <Lock size={22} />
            </div>
            <h3 className="text-lg font-black text-[var(--text)] mb-1">
              Разблокируйте Evidence Vault
            </h3>
            <p className="text-xs sm:text-[13px] text-[var(--text-2)] max-w-md mx-auto leading-relaxed mb-4">
              Свод личной силы сохраняет неопровержимые доказательства твоих побед и вех. Доступно на тарифах Премиум и Ultra.
            </p>
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                dispatchUpgradeModal({ feature: 'vault', force: true })
              }}
              className="h-10 px-6 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-transform active:scale-95"
            >
              <Sparkles size={14} />
              <span>Разблокировать Свод Силы</span>
            </button>
          </div>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="divide-y divide-[var(--border)]">
          {filteredItems.map((item) => {
            const isPinned = Boolean(item.pinned)
            return (
              <article
                key={item.id || item.title}
                className="px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors relative"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[var(--text-2)] uppercase tracking-wider">
                      {item.date}
                    </span>
                    {item.category && (
                      <span className="text-[13px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--text-2)]">
                        {item.category}
                      </span>
                    )}
                    {isPinned && (
                      <span className="text-[13px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--text)] dark:text-[var(--accent)]">
                        Закреплено
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        playClick(soundEnabled)
                        if (onTogglePin) onTogglePin(item.id)
                      }}
                      title={isPinned ? 'Открепить факт силы' : 'Закрепить факт силы'}
                      aria-label={isPinned ? 'Открепить факт силы' : 'Закрепить факт силы'}
                      className="w-9 h-9 min-w-[34px] min-h-[34px] rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors"
                    >
                      <Pin size={15} fill={isPinned ? 'currentColor' : 'none'} className={isPinned ? 'text-[var(--accent)]' : ''} />
                    </button>
                    {onDeleteEvidence && (
                      <button
                        type="button"
                        onClick={() => {
                          playClick(soundEnabled)
                          onDeleteEvidence(item.id)
                          onNotify?.('Факт силы удалён')
                        }}
                        title="Удалить факт силы"
                        aria-label="Удалить факт силы"
                        className="w-9 h-9 min-w-[34px] min-h-[34px] rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
                <h2 className="text-[15px] font-bold text-[var(--text)] leading-snug">
                  {item.title}
                </h2>
                <p className="text-[14px] text-[var(--text-2)] leading-normal mt-1">
                  {item.description}
                </p>
              </article>
            )
          })}
        </div>
      ) : (
        /* Empty State: Icon + 1 line + Button */
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-elev)] border border-[var(--border)] flex items-center justify-center text-[var(--text-2)] mb-3">
            <Pin size={20} className="rotate-45" />
          </div>
          <p className="text-[16px] font-bold text-[var(--text)] mb-3">
            {query ? 'Ничего не найдено' : 'В Evidence Vault пока пусто'}
          </p>
          <button
            type="button"
            onClick={() => {
              if (query) setSearch('')
              else setIsAdding(true)
            }}
            className="h-9 px-5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-[14px] font-extrabold transition-colors inline-flex items-center gap-1.5"
          >
            <Plus size={16} />
            <span>{query ? 'Сбросить поиск' : 'Добавить факт силы'}</span>
          </button>
        </div>
      )}

      {activeMilestoneNumber !== null && (
        <MilestoneModal
          isOpen={activeMilestoneNumber !== null}
          milestoneNumber={activeMilestoneNumber}
          tier="ultra"
          onClose={() => setActiveMilestoneNumber(null)}
          onNotify={onNotify}
          soundEnabled={soundEnabled}
        />
      )}
    </div>
  )
}

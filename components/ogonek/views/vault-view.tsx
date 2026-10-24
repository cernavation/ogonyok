'use client'

import { ArrowLeft, Check, Pin, Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EVIDENCE_CATEGORIES } from '@/lib/ogonek/data'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { EvidenceItem, ViewId } from '@/lib/ogonek/types'

type Props = {
  evidenceItems?: EvidenceItem[]
  onNavigate: (view: ViewId) => void
  onTogglePin?: (id: string) => void
  onAddEvidence?: (item: Omit<EvidenceItem, 'id'>) => void
  onNotify?: (msg: string) => void
  soundEnabled?: boolean
}

export function VaultView({
  evidenceItems = [],
  onNavigate,
  onTogglePin,
  onAddEvidence,
  onNotify,
  soundEnabled = true,
}: Props) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Все')
  const [isAdding, setIsAdding] = useState(false)

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
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)]">
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
            <h1 className="text-[19px] font-extrabold text-[var(--text)] tracking-[-0.02em] leading-tight">
              Evidence Vault
            </h1>
            <p className="text-[13px] text-[var(--text-2)]">
              {evidenceItems.length} фактов силы
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playClick(soundEnabled)
            setIsAdding(!isAdding)
          }}
          className="min-h-[36px] px-4 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-[13px] font-extrabold inline-flex items-center gap-1.5 transition-colors"
        >
          {isAdding ? <X size={15} /> : <Plus size={15} />}
          <span>{isAdding ? 'Отмена' : 'Добавить факт'}</span>
        </button>
      </header>

      {/* Search Pill + Category Pills */}
      <div className="p-4 border-b border-[var(--border)] flex flex-col gap-3">
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[var(--bg-elev)] border border-[var(--border)] focus-within:border-[var(--accent)] transition-colors">
          <Search size={16} className="text-[var(--text-3)] flex-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Искать в доказательствах..."
            aria-label="Поиск по доказательствам"
            className="flex-1 bg-transparent border-0 outline-none text-[14px] text-[var(--text)] placeholder-[var(--text-3)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="w-6 h-6 min-w-[24px] rounded-full flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text)]"
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

      {/* Flat List like X Feed */}
      {filteredItems.length > 0 ? (
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
                      <span className="text-[13px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                        Закреплено
                      </span>
                    )}
                  </div>
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
    </div>
  )
}

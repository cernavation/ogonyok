'use client'

import { ArrowLeft, Check, Pin, Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EVIDENCE_CATEGORIES } from '@/lib/ogonek/data'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import type { EvidenceItem, ViewId } from '@/lib/ogonek/types'
import { MobileHeader } from '../mobile-header'

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
    <div className="view-vault">
      <MobileHeader title="Evidence Vault" />

      <header className="view-header">
        <button
          type="button"
          className="back-button"
          onClick={() => onNavigate('home')}
          aria-label="Вернуться на главную"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1>Evidence Vault</h1>
          <p className="view-subtitle">Факты силы: подтверждения того, что ты способен побеждать</p>
        </div>
      </header>

      <div className="vault-content">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
          <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
            <Search size={18} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Искать в доказательствах..."
              aria-label="Поиск по доказательствам"
            />
            {search && (
              <button
                type="button"
                className="clear-button"
                onClick={() => setSearch('')}
                aria-label="Очистить поиск"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              playClick(soundEnabled)
              setIsAdding(!isAdding)
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              borderRadius: 999,
              background: isAdding ? 'var(--surface2)' : 'linear-gradient(135deg, var(--orange), #ff975c)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
              border: 0,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: isAdding ? 'none' : '0 4px 14px rgba(255,107,53,0.25)',
            }}
          >
            {isAdding ? <X size={16} /> : <Plus size={16} />}
            <span>{isAdding ? 'Отмена' : 'Добавить факт'}</span>
          </button>
        </div>

        {/* Compact Form to Add Fact of Strength */}
        {isAdding && (
          <div
            className="add-fact-card"
            style={{
              padding: 18,
              borderRadius: 14,
              background: '#0d0f12',
              border: '1px solid var(--orange)',
              marginBottom: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--orange-light)' }}>
                ✦ Новый факт силы
              </span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                Сохраняется в локальное хранилище
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                  Дата победы
                </label>
                <input
                  type="text"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: '#050505',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                    fontSize: 12,
                  }}
                  aria-label="Дата победы"
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                  Категория
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: '#050505',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                    fontSize: 12,
                  }}
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
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                Что ты совершил? (Факт)
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Например: Проехал 130 км, хотя хотел остановиться"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: '#050505',
                  border: '1px solid var(--line)',
                  color: 'var(--text)',
                  fontSize: 13,
                }}
                aria-label="Название факта силы"
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                Цитата преодоления (почему это доказывает силу)
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
                placeholder="Ты продолжил, когда было проще сдаться..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: '#050505',
                  border: '1px solid var(--line)',
                  color: 'var(--text)',
                  fontSize: 12,
                  resize: 'vertical',
                }}
                aria-label="Цитата преодоления"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  background: 'none',
                  border: '1px solid var(--line)',
                  color: 'var(--muted)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveFact}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 16px',
                  borderRadius: 8,
                  background: 'var(--orange)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  border: 0,
                  cursor: 'pointer',
                }}
              >
                <Check size={14} /> Сохранить факт
              </button>
            </div>
          </div>
        )}

        {/* Category Filter Chips */}
        <div className="chip-row" role="region" aria-label="Категории Evidence Vault">
          {EVIDENCE_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat
            return (
              <button
                key={cat}
                type="button"
                className={`tag-chip ${active ? 'active' : ''}`}
                onClick={() => {
                  playClick(soundEnabled)
                  setSelectedCategory(cat)
                }}
                aria-pressed={active}
              >
                {cat}
              </button>
            )
          })}
        </div>

        {filteredItems.length > 0 ? (
          <div className="evidence-results">
            {filteredItems.map((item) => {
              const isPinned = Boolean(item.pinned)
              return (
                <article
                  className="evidence-result"
                  key={item.id || item.title}
                  style={{
                    position: 'relative',
                    borderLeft: isPinned ? '3px solid var(--orange)' : '1px solid var(--line)',
                    paddingLeft: isPinned ? 16 : 14,
                    background: isPinned ? '#0e1014' : '#111315',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="result-date">{item.date}</span>
                      {item.category && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: 'var(--surface2)',
                            color: 'var(--muted)',
                          }}
                        >
                          {item.category}
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
                      style={{
                        background: 'none',
                        border: 0,
                        color: isPinned ? 'var(--orange)' : 'var(--muted)',
                        padding: 4,
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <Pin size={16} fill={isPinned ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  <b>{item.title}</b>
                  <p>{item.description}</p>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="empty-state" role="status">
            <p className="empty-state__title">Ничего не найдено</p>
            <p className="empty-state__desc">
              В Evidence Vault нет записей, соответствующих критериям поиска.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

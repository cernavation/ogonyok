'use client'

import { ArrowLeft, ArrowRight, Flame, Heart, Search, X, Zap } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { CURRENT_DAY, EVIDENCE_ITEMS, TRENDING_TAGS } from '@/lib/ogonek/data'
import type { Day, ViewId } from '@/lib/ogonek/types'
import { DayCard } from '../day-card'
import { MobileHeader } from '../mobile-header'

type Props = {
  days: Day[]
  onNavigate: (view: ViewId) => void
  onLightbox: (url: string) => void
  onNotify: (msg: string) => void
  onSelectDay?: (dayId: number) => void
  onEditDay?: (day: Day) => void
}

function highlightText(text: string, query: string): ReactNode {
  if (!query) return text

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)

  if (parts.length <= 1) return text

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-orange-500/20 text-orange-400 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

function getResultWord(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod100 >= 11 && mod100 <= 19) return 'дней'
  if (mod10 === 1) return 'день'
  if (mod10 >= 2 && mod10 <= 4) return 'дня'
  return 'дней'
}

export function ExploreView({
  days,
  onNavigate,
  onLightbox,
  onNotify,
  onSelectDay,
  onEditDay,
}: Props) {
  const [query, setQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const activeQuery = query.trim().toLowerCase()

  const handleTagClick = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(null)
    } else {
      setSelectedTag(tag)
      setQuery('')
    }
  }

  // Check if search query is a specific day number e.g. "400" or "#400"
  const dayNumberJump = useMemo(() => {
    if (!activeQuery) return null
    const match = activeQuery.match(/^#?(\d+)$/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num >= 1 && num <= CURRENT_DAY) {
        return num
      }
    }
    return null
  }, [activeQuery])

  const filteredDays = useMemo(() => {
    return days.filter((day) => {
      if (selectedTag) {
        return day.tags.includes(selectedTag)
      }
      if (!activeQuery) return true

      if (dayNumberJump && day.id === dayNumberJump) return true

      const inTitle = day.title.toLowerCase().includes(activeQuery)
      const inTags = day.tags.some((t) => t.toLowerCase().includes(activeQuery))
      const inPrides = day.prides.some((p) => p.text.toLowerCase().includes(activeQuery))
      const inGratitudes = day.gratitudes.some((g) => {
        const text = typeof g === 'string' ? g : g.text
        return text.toLowerCase().includes(activeQuery)
      })

      return inTitle || inTags || inPrides || inGratitudes
    })
  }, [days, selectedTag, activeQuery, dayNumberJump])

  const filteredEvidence = useMemo(() => {
    if (selectedTag) return []
    if (!activeQuery) return EVIDENCE_ITEMS
    return EVIDENCE_ITEMS.filter((item) => {
      const inTitle = item.title.toLowerCase().includes(activeQuery)
      const inDesc = item.description.toLowerCase().includes(activeQuery)
      return inTitle || inDesc
    })
  }, [selectedTag, activeQuery])

  const hasAnyResults = filteredDays.length > 0 || filteredEvidence.length > 0 || dayNumberJump !== null

  return (
    <div className="view-explore">
      <MobileHeader title="Поиск & Теги" />

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
          <h1>Поиск & Теги</h1>
          <p className="view-subtitle">Полнотекстовый поиск по 5 гордостям и 5 благодарностям</p>
        </div>
      </header>

      <div className="explore-content">
        <div className="search-bar">
          <Search size={18} />
          <input
            id="explore-search-input"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (selectedTag) setSelectedTag(null)
            }}
            placeholder="Искать победы, мысли, #400, теги..."
            aria-label="Поиск по журналу"
          />
          {query && (
            <button
              type="button"
              className="clear-button"
              onClick={() => setQuery('')}
              aria-label="Очистить поиск"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="chip-row" role="region" aria-label="Теги">
          {TRENDING_TAGS.map((tag) => {
            const active = selectedTag === tag
            return (
              <button
                key={tag}
                type="button"
                className={`tag-chip ${active ? 'active' : ''}`}
                onClick={() => handleTagClick(tag)}
                aria-pressed={active}
              >
                {tag}
              </button>
            )
          })}
        </div>

        {/* Quick Day Jump Card */}
        {dayNumberJump && (
          <div
            className="day-jump-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(255,107,53,0.15), rgba(255,151,92,0.05))',
              border: '1px solid var(--orange)',
              marginBottom: 20,
            }}
          >
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--orange-light)', textTransform: 'uppercase' }}>
                Прямой переход
              </span>
              <h3 style={{ margin: '2px 0 0', fontSize: 16, color: 'var(--text)' }}>
                Перейти к Дню #{dayNumberJump}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onSelectDay) {
                  onSelectDay(dayNumberJump)
                } else {
                  onNavigate('home')
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 999,
                background: 'var(--orange)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 800,
                border: 0,
                cursor: 'pointer',
              }}
            >
              <span>Открыть день</span>
              <ArrowRight size={15} />
            </button>
          </div>
        )}

        {/* Search Results Counter */}
        {activeQuery && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              Найдено: <b style={{ color: 'var(--text)' }}>{filteredDays.length}</b> {getResultWord(filteredDays.length)}
              {filteredEvidence.length > 0 && ` и ${filteredEvidence.length} в Evidence Vault`}
            </span>
          </div>
        )}

        {!selectedTag && !activeQuery && (
          <section className="trending-section" aria-labelledby="trending-title">
            <h2 id="trending-title">В тренде</h2>
            <div className="trending-grid">
              <button
                type="button"
                className="trending-card"
                onClick={() => onNavigate('vault')}
              >
                <Zap size={18} className="trending-icon" />
                <div>
                  <strong>Evidence Vault</strong>
                  <small>Факты преодоления сомнений</small>
                </div>
              </button>
              <button
                type="button"
                className="trending-card"
                onClick={() => onNavigate('analytics')}
              >
                <Flame size={18} className="trending-icon" />
                <div>
                  <strong>Стрик и аналитика</strong>
                  <small>Статистика дисциплины</small>
                </div>
              </button>
            </div>
          </section>
        )}

        {hasAnyResults ? (
          <div className="search-results">
            {filteredEvidence.length > 0 && (activeQuery || !selectedTag) && (
              <section className="evidence-section" aria-label="Результаты в Evidence Vault">
                <div className="section-title">
                  <Zap size={16} />
                  <span>Evidence Vault ({filteredEvidence.length})</span>
                </div>
                <div className="evidence-list">
                  {filteredEvidence.map((item) => (
                    <article className="evidence-card" key={item.id || item.title}>
                      <span className="result-date">{item.date}</span>
                      <b>{highlightText(item.title, activeQuery)}</b>
                      <p>{highlightText(item.description, activeQuery)}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {filteredDays.slice(0, 30).map((day) => (
              <DayCard
                key={day.id}
                day={day}
                onLightbox={onLightbox}
                onNotify={onNotify}
                onEdit={onEditDay}
              />
            ))}
            {filteredDays.length > 30 && (
              <div className="py-4 text-center text-xs text-muted">
                Показано первые 30 результатов из {filteredDays.length}. Уточните поисковый запрос для более точного совпадения.
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state" role="status">
            <p className="empty-state__title">Ничего не найдено</p>
            <p className="empty-state__desc">
              По запросу «{query || selectedTag}» совпадений не обнаружено.
              Попробуйте изменить формулировку, указать тег или ввести номер дня, например #400.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

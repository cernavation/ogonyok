'use client'

import React, { useEffect, useState } from 'react'
import { Search, Sparkles, X } from 'lucide-react'
import { playClick } from '@/lib/ogonek/sound'

type GifItem = {
  id: string
  title: string
  url: string
  previewUrl: string
}

type Props = {
  onSelectGif: (gifUrl: string) => void
  onClose: () => void
  soundEnabled?: boolean
}

export function ChatGifModal({ onSelectGif, onClose, soundEnabled = true }: Props) {
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState<GifItem[]>([])
  const [loading, setLoading] = useState(true)
  const [keyConfigured, setKeyConfigured] = useState(true)

  useEffect(() => {
    let active = true
    const fetchGifs = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/giphy?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        if (!active) return
        setKeyConfigured(Boolean(data.keyConfigured))
        setGifs(Array.isArray(data.gifs) ? data.gifs : [])
      } catch {
        if (!active) return
        setKeyConfigured(false)
        setGifs([])
      } finally {
        if (active) setLoading(false)
      }
    }

    const timer = setTimeout(fetchGifs, query ? 350 : 0)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query])

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--bg-elev)] p-4 shadow-2xl flex flex-col h-[520px] max-h-[85vh] animate-in fade-in zoom-in-95">
        {/* Шапка модалки */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎬</span>
            <h3 className="text-base font-bold text-[var(--text)]">Поиск GIF-анимаций</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {/* Поиск */}
        <div className="relative my-3">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-2)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск GIF (напр. огонь, победа, бег)..."
            className="w-full h-10 rounded-full border border-[var(--border)] bg-[var(--bg)] pl-10 pr-4 text-xs text-[var(--text)] placeholder:text-[var(--text-2)] outline-none focus:border-[var(--accent)]"
            autoFocus
          />
        </div>

        {/* Сетка GIF */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {!keyConfigured ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-[var(--text-2)]">
              <Sparkles size={36} className="text-[var(--accent)] mb-2" />
              <p className="text-sm font-bold text-[var(--text)] mb-1">Поиск GIF не подключён</p>
              <p className="text-xs text-[var(--text-2)] max-w-xs leading-relaxed">
                Добавьте бесплатный ключ провайдера GIF в файл <code className="bg-white/10 px-1.5 py-0.5 rounded text-white">.env.local</code> для поиска сотен тысяч GIF-анимаций.
              </p>
            </div>
          ) : loading ? (
            <div className="h-full flex items-center justify-center text-xs text-[var(--text-2)]">
              Загрузка GIF...
            </div>
          ) : gifs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-[var(--text-2)]">
              Ничего не найдено по запросу «{query}»
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1">
              {gifs.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    playClick(soundEnabled)
                    onSelectGif(g.url)
                    onClose()
                  }}
                  className="relative aspect-square rounded-xl overflow-hidden bg-white/5 hover:opacity-85 hover:scale-[1.02] transition-all group border border-white/5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.previewUrl || g.url}
                    alt={g.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

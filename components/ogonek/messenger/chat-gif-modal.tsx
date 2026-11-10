'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Search, Sparkles, X } from 'lucide-react'
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
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [keyConfigured, setKeyConfigured] = useState(true)

  const fetchGifs = useCallback(async (searchQuery: string, currentOffset: number, append = false) => {
    if (currentOffset === 0) setLoading(true)
    else setLoadingMore(true)

    try {
      const qParam = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''
      const res = await fetch(`/api/giphy?limit=24&offset=${currentOffset}${qParam}`)
      const data = await res.json()
      setKeyConfigured(Boolean(data.keyConfigured))
      const list: GifItem[] = Array.isArray(data.gifs) ? data.gifs : []

      if (append) {
        setGifs((prev) => [...prev, ...list])
      } else {
        setGifs(list)
      }
      setHasMore(list.length >= 24)
    } catch {
      if (!append) {
        setKeyConfigured(false)
        setGifs([])
      }
      setHasMore(false)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    setOffset(0)
    const timer = setTimeout(() => {
      fetchGifs(query, 0, false)
    }, query ? 350 : 0)
    return () => clearTimeout(timer)
  }, [query, fetchGifs])

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return
    const nextOffset = offset + 24
    setOffset(nextOffset)
    fetchGifs(query, nextOffset, true)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--bg-elev)] p-4 shadow-2xl flex flex-col h-[540px] max-h-[85vh]"
        role="dialog"
        aria-modal="true"
        aria-label="Поиск GIF"
      >
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
              <Loader2 size={24} className="animate-spin text-[var(--accent)] mr-2" />
              Загрузка GIF...
            </div>
          ) : gifs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-[var(--text-2)]">
              Ничего не найдено по запросу «{query}»
            </div>
          ) : (
            <div className="flex flex-col gap-3">
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

              {hasMore && (
                <div className="flex justify-center pb-2">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 text-[var(--text)] transition-colors flex items-center gap-1.5"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Загрузка...
                      </>
                    ) : (
                      'Загрузить ещё'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Атрибуция GIPHY по политике использования */}
        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--text-2)]">
          <span className="font-semibold uppercase tracking-wider opacity-60">
            Powered by <strong className="text-[var(--text)]">GIPHY</strong>
          </span>
          <span className="opacity-50">Выбирай анимацию для ответа</span>
        </div>
      </motion.div>
    </div>
  )
}

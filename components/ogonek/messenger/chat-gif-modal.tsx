'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Sparkles, X } from 'lucide-react'
import { playClick } from '@/lib/ogonek/sound'

type GifItem = {
  id: string
  title: string
  url: string
  previewUrl: string
}

type GifTileStage = 'preview' | 'full' | 'proxy' | 'broken'

function GifTile({
  gif,
  onSelect,
}: {
  gif: GifItem
  onSelect: () => void
}) {
  const [stage, setStage] = useState<GifTileStage>('preview')
  const [loaded, setLoaded] = useState(false)

  if (stage === 'broken') return null

  const primary = gif.previewUrl || gif.url
  const src =
    stage === 'preview'
      ? primary
      : stage === 'full'
        ? gif.url || primary
        : `/api/giphy?img=${encodeURIComponent(primary)}`

  return (
    <button
      type="button"
      onClick={onSelect}
      className="relative aspect-square rounded-xl overflow-hidden bg-white/5 hover:opacity-90 hover:scale-[1.02] transition-all group border border-white/5 cursor-pointer"
    >
      {!loaded && <div className="absolute inset-0 animate-pulse bg-white/[0.06]" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={gif.title}
        referrerPolicy="no-referrer"
        className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(false)
          setStage((prev) => {
            if (prev === 'preview' && gif.url && gif.url !== primary) return 'full'
            if (prev === 'preview' || prev === 'full') return 'proxy'
            return 'broken'
          })
        }}
      />
    </button>
  )
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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--bg-elev)] p-4 shadow-2xl flex flex-col h-[520px] max-h-[85vh]"
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
                Добавьте ключ <code className="bg-white/10 px-1.5 py-0.5 rounded text-white">GIPHY_API_KEY</code> или{' '}
                <code className="bg-white/10 px-1.5 py-0.5 rounded text-white">KLIPY_API_KEY</code> в переменные окружения Vercel /{' '}
                <code className="bg-white/10 px-1.5 py-0.5 rounded text-white">.env.local</code>.
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
                <GifTile
                  key={g.id}
                  gif={g}
                  onSelect={() => {
                    playClick(soundEnabled)
                    onSelectGif(g.url)
                    onClose()
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Нижняя строка */}
        <div className="pt-2.5 pb-0.5 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-2)] shrink-0">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent)]" />
            {query.trim() ? `Результаты: «${query.trim()}»` : 'Популярные GIF'}
          </span>
          {gifs.length > 0 && (
            <span className="text-[11px] text-[var(--text-2)]">Найдено: {gifs.length}</span>
          )}
        </div>
      </motion.div>
    </div>
  )
}

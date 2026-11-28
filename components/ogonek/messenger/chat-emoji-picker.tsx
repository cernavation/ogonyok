'use client'

import { Search, Sparkles, Smile, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  EMOJI_CATEGORIES,
  EMOJI_SETS,
  POPULAR_EMOJIS,
  STICKER_PACK,
  searchEmojis,
  type ChatSticker,
} from '@/lib/ogonek/messenger'
import { playClick } from '@/lib/ogonek/sound'

type Props = {
  onPickEmoji: (char: string) => void
  onPickSticker?: (sticker: ChatSticker) => void
  onClose: () => void
  soundEnabled?: boolean
  align?: 'left' | 'right'
  /** При false рендерится без absolute bottom-full (для портала / точного позиционирования во внешнем контейнере) */
  floating?: boolean
  /** Скрыть вкладку стикеров (например в комментариях) */
  hideStickers?: boolean
}

const SKIN_TONES = ['', '🏻', '🏼', '🏽', '🏾', '🏿']
const RECENT_STORAGE_KEY = 'priday_recent_emojis_v1'
const DEFAULT_RECENTS: string[] = [
  ...POPULAR_EMOJIS,
  '🙏', '🤝', '⚡️', '🎉', '🏆', '🎯', '🥳',
]

export function ChatEmojiPicker({
  onPickEmoji,
  onPickSticker,
  onClose,
  soundEnabled = true,
  align = 'left',
  floating = true,
  hideStickers = false,
}: Props) {
  const pickerRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<'emoji' | 'stickers'>('emoji')
  const [category, setCategory] = useState<string>('smileys')
  const [search, setSearch] = useState('')
  const [skinTone, setSkinTone] = useState('')
  const [recents, setRecents] = useState<string[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_RECENTS
    try {
      const raw = window.localStorage.getItem(RECENT_STORAGE_KEY)
      if (!raw) return DEFAULT_RECENTS
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((x): x is string => typeof x === 'string' && x.length > 0).slice(0, 24)
      }
    } catch {}
    return DEFAULT_RECENTS
  })

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  const applyTone = (emoji: string): string => {
    if (!skinTone) return emoji
    // Only apply skin tone to gesture-like emojis
    const modifiable = ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🙏', '✍️', '💅', '🤳', '💪']
    if (modifiable.includes(emoji)) {
      return `${emoji}${skinTone}`
    }
    return emoji
  }

  const filteredEmojis = useMemo(
    () => searchEmojis(search, category, recents, EMOJI_SETS),
    [search, category, recents]
  )

  const handleEmojiClick = (emoji: string) => {
    const toned = applyTone(emoji)
    playClick(soundEnabled)
    setRecents((prev) => {
      const next = [toned, ...prev.filter((x) => x !== toned)].slice(0, 24)
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next))
        } catch {}
      }
      return next
    })
    onPickEmoji(toned)
  }

  const handleStickerClick = (sticker: ChatSticker) => {
    playClick(soundEnabled)
    onPickSticker?.(sticker)
  }

  return (
    <div
      ref={pickerRef}
      className={`${
        floating
          ? `absolute bottom-full ${align === 'right' ? 'right-0' : '-left-[96px] sm:left-0'} mb-2 z-[70]`
          : 'relative'
      } flex h-[360px] sm:h-[380px] w-[300px] sm:w-[340px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#16181c]/95 backdrop-blur-xl shadow-2xl text-[#e7e9ea] animate-in fade-in zoom-in-95 duration-150`}
      role="dialog"
      aria-label="Панель эмодзи и стикеров"
    >
      {/* Шапка с вкладками Эмодзи / Стикеры */}
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 bg-black/20">
        <div className="flex gap-1 rounded-xl bg-white/5 p-0.5">
          <button
            type="button"
            onClick={() => {
              playClick(soundEnabled)
              setTab('emoji')
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              tab === 'emoji' ? 'bg-[#ff7a18] text-white shadow-sm' : 'text-[#71767b] hover:text-white'
            }`}
          >
            <Smile size={14} />
            <span>Эмодзи</span>
          </button>
          {!hideStickers && (
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                setTab('stickers')
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                tab === 'stickers' ? 'bg-[#ff7a18] text-white shadow-sm' : 'text-[#71767b] hover:text-white'
              }`}
            >
              <Sparkles size={14} />
              <span>Стикеры</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[#71767b] hover:bg-white/10 hover:text-white"
          aria-label="Закрыть"
        >
          <X size={15} />
        </button>
      </div>

      {tab === 'emoji' ? (
        <>
          {/* Поиск и выбор оттенка кожи */}
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#71767b]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск: огонь, сердце, cool..."
                className="w-full rounded-lg border border-white/10 bg-black/30 py-1 pl-8 pr-6 text-xs text-white placeholder-[#71767b] outline-none focus:border-[#ff7a18]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Очистить поиск"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#71767b] hover:text-white cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Выбор тона кожи */}
            <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-black/20 p-0.5">
              {SKIN_TONES.map((tone, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSkinTone(tone)}
                  className={`flex h-5 w-5 items-center justify-center rounded text-xs transition-all ${
                    skinTone === tone ? 'bg-[#ff7a18] scale-110' : 'hover:bg-white/10'
                  }`}
                  title={tone ? `Тон кожи ${idx}` : 'По умолчанию'}
                >
                  {tone ? `👍${tone}` : '👍'}
                </button>
              ))}
            </div>
          </div>

          {/* Панель категорий и быстрые популярные эмодзи */}
          {!search && (
            <>
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-white/5 px-2 py-1 bg-black/10">
                {EMOJI_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      playClick(soundEnabled)
                      setCategory(cat.id)
                    }}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm transition-colors ${
                      category === cat.id ? 'bg-white/15 text-[#ffad5a]' : 'text-[#71767b] hover:text-white'
                    }`}
                    title={cat.label}
                  >
                    {cat.icon}
                  </button>
                ))}
              </div>
              {category !== 'recent' && (
                <div className="flex items-center justify-between gap-0.5 border-b border-white/5 px-2.5 py-1 bg-white/[0.02]">
                  {POPULAR_EMOJIS.map((emoji) => (
                    <button
                      key={`pop-${emoji}`}
                      type="button"
                      onClick={() => handleEmojiClick(emoji)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-base hover:bg-white/10 hover:scale-115 transition-transform cursor-pointer"
                      title="Быстрый выбор"
                    >
                      {applyTone(emoji)}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Сетка эмодзи */}
          <div className="flex-1 overflow-y-auto p-2 scroll-smooth">
            {filteredEmojis.length > 0 ? (
              <div className="grid grid-cols-8 gap-1">
                {filteredEmojis.map((emoji, idx) => (
                  <button
                    key={`${emoji}-${idx}`}
                    type="button"
                    onClick={() => handleEmojiClick(emoji)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-white/10 hover:scale-125 transition-transform"
                  >
                    {applyTone(emoji)}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex h-full min-h-[120px] items-center justify-center text-xs text-[#71767b]">
                Ничего не найдено
              </div>
            )}
          </div>
        </>
      ) : (
        /* Вкладка Стикеры */
        <div className="flex-1 overflow-y-auto p-3">
          <p className="mb-2.5 text-[11px] font-medium text-[#71767b]">
            Стикерпак «Winlog · Держим стрик»
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {STICKER_PACK.map((sticker) => (
              <button
                key={sticker.id}
                type="button"
                onClick={() => handleStickerClick(sticker)}
                className="group flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center transition-all hover:border-[#ff7a18] hover:bg-[#ff7a18]/10 hover:scale-105"
              >
                <span className="text-3xl transition-transform group-hover:scale-110 drop-shadow-md">
                  {sticker.emoji}
                </span>
                <span className="mt-1 text-[11px] font-medium text-[#e7e9ea] group-hover:text-[#ffad5a]">
                  {sticker.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

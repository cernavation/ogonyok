'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  PhoneOutgoing,
  RefreshCw,
  Search,
  Video,
} from 'lucide-react'
import { getCallHistoryRpc } from '@/lib/supabase/api'
import type { CallHistoryItem } from '@/lib/ogonek/types'
import { ChatAvatar } from './chat-avatar'
import { playClick } from '@/lib/ogonek/sound'

export interface CallsHistoryViewProps {
  onStartCall: (peerId: string, isVideo: boolean, peerName?: string, peerAvatar?: string | null) => void
  soundEnabled?: boolean
  currentUserId?: string | null
}

export function CallsHistoryView({
  onStartCall,
  soundEnabled = true,
  currentUserId,
}: CallsHistoryViewProps) {
  const [calls, setCalls] = useState<CallHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'missed'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getCallHistoryRpc(50, 0)
      if (res.ok && Array.isArray(res.calls)) {
        setCalls(res.calls)
      }
    } catch (e) {
      console.warn('[CallsHistoryView] error loading call history:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      if (filter === 'missed') {
        const isMissed = c.status === 'missed' || c.status === 'rejected'
        if (!isMissed) return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const nameMatch = (c.peer_name || '').toLowerCase().includes(q)
        const userMatch = (c.peer_username || '').toLowerCase().includes(q)
        return nameMatch || userMatch
      }
      return true
    })
  }, [calls, filter, searchQuery])

  const formatCallDate = (iso: string) => {
    try {
      const d = new Date(iso)
      const now = new Date()
      const isToday = d.toDateString() === now.toDateString()
      const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      if (isToday) {
        return `Сегодня, ${time}`
      }
      return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`
    } catch {
      return ''
    }
  }

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text)] select-none">
      {/* Шапка раздела «Звонки» */}
      <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-elev)] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center font-bold">
              <PhoneCall size={16} />
            </div>
            <h2 className="text-base font-bold tracking-tight">Звонки</h2>
          </div>

          <button
            type="button"
            onClick={() => {
              playClick(soundEnabled)
              void loadHistory()
            }}
            className="p-1.5 rounded-lg text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
            title="Обновить историю"
            aria-label="Обновить историю звонков"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Переключатель фильтров Все / Пропущенные */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[var(--surface2)] rounded-xl p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                setFilter('all')
              }}
              className={`px-3 py-1 rounded-lg transition-all ${
                filter === 'all'
                  ? 'bg-[var(--bg)] text-[var(--text)] shadow-sm'
                  : 'text-[var(--text-2)] hover:text-[var(--text)]'
              }`}
            >
              Все звонки
            </button>
            <button
              type="button"
              onClick={() => {
                playClick(soundEnabled)
                setFilter('missed')
              }}
              className={`px-3 py-1 rounded-lg transition-all ${
                filter === 'missed'
                  ? 'bg-[var(--bg)] text-red-500 shadow-sm'
                  : 'text-[var(--text-2)] hover:text-[var(--text)]'
              }`}
            >
              Пропущенные
            </button>
          </div>

          {/* Поиск */}
          <div className="flex-1 relative flex items-center">
            <Search size={14} className="absolute left-3 text-[var(--text-3)]" />
            <input
              type="text"
              placeholder="Поиск по имени..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[40px] bg-[var(--surface2)] border border-[var(--border)] rounded-xl pl-8 pr-3 py-2 text-xs text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Список истории звонков */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)] no-scrollbar">
        {loading && calls.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-2)]">
            Загрузка истории звонков...
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-[var(--surface2)] flex items-center justify-center text-[var(--text-3)] mb-3">
              <PhoneOff size={24} />
            </div>
            <p className="text-sm font-bold text-[var(--text)]">Нет звонков</p>
            <p className="text-xs text-[var(--text-2)] max-w-xs mt-1">
              {filter === 'missed'
                ? 'У вас нет пропущенных звонков'
                : 'Вы ещё не совершали звонков. Выберите соратника в переписке, чтобы связаться с ним'}
            </p>
          </div>
        ) : (
          filteredCalls.map((item) => {
            const isMissed = item.status === 'missed'
            const isRejected = item.status === 'rejected' || item.status === 'declined'
            const isBusy = item.status === 'busy'
            const isEnded = item.status === 'ended' || item.status === 'connected'

            return (
              <div
                key={item.id}
                className="p-3 sm:px-4 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ChatAvatar
                    friendId={item.peer_id}
                    size={42}
                    fallbackAvatar={item.peer_avatar}
                    fallbackName={item.peer_name}
                  />

                  <div className="min-w-0 flex flex-col">
                    <span className="text-sm font-bold truncate text-[var(--text)]">
                      {item.peer_name}
                    </span>

                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-2)] mt-0.5">
                      {/* Иконка статуса звонка */}
                      {isMissed ? (
                        <span className="flex items-center gap-1 text-red-500 font-medium">
                          <PhoneMissed size={13} className="shrink-0" />
                          <span>Пропущенный</span>
                        </span>
                      ) : isRejected ? (
                        <span className="flex items-center gap-1 text-red-400">
                          <PhoneOff size={13} className="shrink-0" />
                          <span>Отклонён</span>
                        </span>
                      ) : isBusy ? (
                        <span className="flex items-center gap-1 text-amber-500">
                          <PhoneOff size={13} className="shrink-0" />
                          <span>Занято</span>
                        </span>
                      ) : item.is_outgoing ? (
                        <span className="flex items-center gap-1 text-emerald-500">
                          <ArrowUpRight size={13} className="shrink-0" />
                          <span>Исходящий</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-blue-400">
                          <ArrowDownLeft size={13} className="shrink-0" />
                          <span>Входящий</span>
                        </span>
                      )}

                      <span>•</span>
                      <span>{formatCallDate(item.created_at)}</span>

                      {isEnded && item.duration_seconds > 0 && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{formatDuration(item.duration_seconds)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Кнопка «Позвонить снова» */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      playClick(soundEnabled)
                      onStartCall(item.peer_id, item.is_video, item.peer_name, item.peer_avatar)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface2)] hover:bg-[var(--accent)] hover:text-white text-[var(--text)] text-xs font-bold transition-all shadow-sm active:scale-95"
                    title={item.is_video ? 'Позвонить с видео' : 'Позвонить'}
                    aria-label={`Позвонить снова ${item.peer_name}`}
                  >
                    {item.is_video ? <Video size={13} /> : <Phone size={13} />}
                    <span className="hidden sm:inline">Позвонить снова</span>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

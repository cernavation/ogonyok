'use client'

import {
  AlertTriangle,
  Check,
  Cloud,
  CloudOff,
  Database,
  KeyRound,
  Link2,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
  Zap,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { useSupabaseSync } from '@/lib/ogonek/use-supabase-sync'
import { readSupabaseConfig, type SupabaseSyncPhase, type SupabaseTable } from '@/lib/ogonek/supabase-sync'

type Props = {
  onNotify: (message: string) => void
}

const PHASE_META: Record<SupabaseSyncPhase, { label: string; color: string; icon: typeof Cloud }> = {
  disabled: { label: 'Облако выключено', color: '#71767b', icon: CloudOff },
  offline: { label: 'Офлайн', color: '#f59e0b', icon: CloudOff },
  ready: { label: 'Готово', color: '#53d3a3', icon: Cloud },
  syncing: { label: 'Синхронизация…', color: '#1d9bf0', icon: Loader2 },
  synced: { label: 'Синхронизировано', color: '#00ba7c', icon: Check },
  error: { label: 'Ошибка', color: '#f91880', icon: AlertTriangle },
}

const TABLE_LABELS: Record<SupabaseTable, string> = {
  profiles: 'Профиль',
  days: 'Дни',
  prides: 'Гордости',
  gratitudes: 'Благодарности',
  achievements_verifications: 'Ачивки',
  stories: 'Сторис',
  friendships: 'Дружба',
  reactions: 'Реакции',
  comments: 'Комментарии',
  direct_messages: 'Сообщения',
}

const TABLE_ORDER: SupabaseTable[] = [
  'days',
  'prides',
  'gratitudes',
  'achievements_verifications',
  'stories',
  'friendships',
  'reactions',
  'comments',
  'direct_messages',
]

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return '—'
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (seconds < 5) return 'только что'
  if (seconds < 60) return `${seconds} с назад`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} мин назад`
  return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/**
 * ЭТАП 19 — ПАНЕЛЬ СИНХРОНИЗАЦИИ SUPABASE.
 * Живой пульт управления облаком: подключение ключей, анонимный или парольный
 * вход, ручная синхронизация, сброс очереди и отключение. Все кнопки реально
 * работают через адаптер lib/ogonek/supabase-sync.ts.
 */
export function SupabaseSyncPanel({ onNotify }: Props) {
  const { state } = useOgonekStore()
  const sound = state.soundEnabled
  const { status, overview, busy, syncNow, connect, disconnect, resetQueue } = useSupabaseSync({
    autoSync: false,
  })

  const initial = useMemo(() => readSupabaseConfig(), [])
  const [showForm, setShowForm] = useState(!status.configured)
  const [url, setUrl] = useState(initial?.url ?? '')
  const [anonKey, setAnonKey] = useState(initial?.anonKey ?? '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const phase = PHASE_META[status.phase] ?? PHASE_META.ready
  const PhaseIcon = phase.icon

  const handleSync = useCallback(async () => {
    playClick(sound)
    const result = await syncNow()
    if (result.ok) {
      playSuccess(sound)
      onNotify(
        result.changed
          ? `Синхронизировано: обновлено ${result.pushed}, принято из облака`
          : `Облако актуально (отправлено ${result.pushed}, удалено ${result.deleted})`
      )
    } else {
      onNotify(result.error ?? 'Не удалось синхронизировать')
    }
  }, [onNotify, sound, syncNow])

  const handleAnonymousConnect = useCallback(async () => {
    if (!url.trim() || !anonKey.trim()) {
      onNotify('Укажите Project URL и anon public key из Supabase')
      return
    }
    playClick(sound)
    const result = await connect({ url, anonKey })
    if (result.ok) {
      playSuccess(sound)
      onNotify(result.anonymous ? 'Подключено анонимно — облако включено' : 'Подключено к Supabase')
    } else {
      onNotify(result.error ?? 'Не удалось подключиться')
    }
  }, [anonKey, connect, onNotify, sound, url])

  const handleAccountConnect = useCallback(async () => {
    if (!url.trim() || !anonKey.trim()) {
      onNotify('Укажите Project URL и anon public key из Supabase')
      return
    }
    if (!email.trim() || !password) {
      onNotify('Введите почту и пароль аккаунта Supabase')
      return
    }
    playClick(sound)
    const result = await connect({ url, anonKey, email: email.trim(), password })
    if (result.ok) {
      playSuccess(sound)
      onNotify(`Вход выполнен: ${email.trim()}`)
    } else {
      onNotify(result.error ?? 'Не удалось войти')
    }
  }, [anonKey, connect, email, onNotify, password, sound, url])

  const handleDisconnect = useCallback(async () => {
    playClick(sound)
    await disconnect(false)
    onNotify('Отключено от аккаунта Supabase — данные остались локально')
  }, [disconnect, onNotify, sound])

  const handleForget = useCallback(async () => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm('Удалить сохранённые ключи Supabase на этом устройстве? Данные летописи не тронем.')
      if (!ok) return
    }
    playClick(sound)
    await disconnect(true)
    setUrl('')
    setAnonKey('')
    onNotify('Ключи Supabase удалены с устройства')
  }, [disconnect, onNotify, sound])

  const handleResetQueue = useCallback(() => {
    playClick(sound)
    resetQueue()
    onNotify('Очередь сброшена — следующий пуш зальёт всю базу в облако')
  }, [onNotify, resetQueue, sound])

  const statTiles: { label: string; value: string | number; accent?: boolean }[] = [
    { label: 'Строк в облако', value: overview.pendingChanges, accent: overview.pendingChanges > 0 },
    { label: 'Дней', value: overview.rows.days },
    { label: 'Гордостей', value: overview.rows.prides },
    { label: 'Благодарностей', value: overview.rows.gratitudes },
    { label: 'Ачивок', value: overview.rows.achievements_verifications },
    { label: 'Сторис', value: overview.rows.stories },
    { label: 'Реакций', value: overview.rows.reactions },
    { label: 'Сообщений', value: overview.rows.direct_messages },
  ]

  return (
    <section className="settings-section supabase-sync-panel" aria-labelledby="supabase-title">
      <div className="appearance-section-head">
        <div>
          <b id="supabase-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Cloud size={16} className="text-[#53d3a3]" /> Синхронизация с Supabase (облако)
          </b>
          <small>
            Offline-first: приложение работает локально всегда, а при добавлении ключей в{' '}
            <code>.env.local</code> данные сами уезжают в облако и возвращаются обратно
          </small>
        </div>
        <span
          className="backup-fingerprint"
          title={status.message}
          style={{ color: phase.color, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <PhaseIcon size={14} className={status.phase === 'syncing' ? 'animate-spin' : ''} />
          {phase.label}
        </span>
      </div>

      {/* ── Текущее состояние ─────────────────────────────────────────────── */}
      <div className="backup-stats">
        {statTiles.map((tile) => (
          <div key={tile.label} className={`backup-stat ${tile.accent ? 'is-accent' : ''}`}>
            <b>{typeof tile.value === 'number' ? tile.value.toLocaleString('ru-RU') : tile.value}</b>
            <span>{tile.label}</span>
          </div>
        ))}
      </div>

      <div className="backup-meta" style={{ flexWrap: 'wrap', gap: 10 }}>
        <span>
          <Database size={12} /> {status.configured ? 'Ключи Supabase заданы' : 'Ключей нет — режим офлайн'}
        </span>
        <span>
          <UserRound size={12} /> {status.authenticated ? (status.anonymous ? 'Анонимный аккаунт' : status.email ?? 'Аккаунт') : 'Не авторизован'}
        </span>
        <span>
          {status.online ? <Check size={12} /> : <CloudOff size={12} />} {status.online ? 'Сеть есть' : 'Нет сети'}
        </span>
        <span>
          <RefreshCw size={12} /> Обмен: {timeAgo(status.lastSyncAtISO)}
        </span>
      </div>

      {status.lastError ? (
        <div className="backup-local-note" style={{ borderColor: 'rgba(249,24,128,0.4)', color: '#f8b4cf' }}>
          <AlertTriangle size={14} />
          <span>{status.lastError}</span>
        </div>
      ) : null}

      {/* ── Действия ─────────────────────────────────────────────────────── */}
      <div className="backup-actions">
        <button
          type="button"
          className="backup-action primary"
          onClick={() => void handleSync()}
          disabled={busy || status.phase === 'syncing' || !status.configured || !status.online}
          aria-label="Синхронизировать с Supabase сейчас"
        >
          {busy || status.phase === 'syncing' ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
          <span className="backup-action__text">
            <b>Синхронизировать сейчас</b>
            <small>
              {overview.pendingChanges > 0
                ? `К отправке: ${overview.pendingChanges} строк`
                : 'Отправит изменения и примет новые'}
            </small>
          </span>
        </button>

        <button
          type="button"
          className="backup-action"
          onClick={() => {
            playClick(sound)
            setShowForm((v) => !v)
          }}
          aria-expanded={showForm}
          aria-label="Показать настройки подключения Supabase"
        >
          <Link2 size={18} />
          <span className="backup-action__text">
            <b>{showForm ? 'Скрыть настройки' : 'Настройки подключения'}</b>
            <small>Project URL и anon public key</small>
          </span>
        </button>
      </div>

      {/* ── Форма подключения ────────────────────────────────────────────── */}
      {showForm ? (
        <div className="sync-code-block">
          <div className="appearance-section-head">
            <div>
              <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <KeyRound size={14} /> Ключи проекта Supabase
              </b>
              <small>
                Их выдают в Supabase → Project Settings → API. Можно задать здесь или добавить{' '}
                <code>NEXT_PUBLIC_SUPABASE_URL</code> и <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> в{' '}
                <code>.env.local</code>
              </small>
            </div>
          </div>

          <input
            className="sync-code-area"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://ваш-проект.supabase.co"
            spellCheck={false}
            aria-label="Project URL Supabase"
            style={{ minHeight: 40, height: 40 }}
          />
          <input
            className="sync-code-area"
            value={anonKey}
            onChange={(e) => setAnonKey(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…  (anon public key)"
            spellCheck={false}
            aria-label="Anon public key Supabase"
            style={{ minHeight: 40, height: 40, marginTop: 8 }}
          />

          <div className="sync-code-toolbar" style={{ marginTop: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="sec-mini-btn sec-mini-btn--accent"
              onClick={() => void handleAnonymousConnect()}
              disabled={busy}
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
              Подключить анонимно
            </button>
            <button
              type="button"
              className="sec-mini-btn"
              onClick={() => void handleAccountConnect()}
              disabled={busy || !email.trim() || !password}
            >
              <UserRound size={13} /> Войти в аккаунт
            </button>
          </div>

          <div className="sync-code-import" style={{ marginTop: 10 }}>
            <div className="sync-code-import__head">
              <UserRound size={13} />
              <span>Вход по почте и паролю (необязательно для анонимного режима)</span>
            </div>
            <input
              className="sync-code-area"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
              aria-label="Почта аккаунта Supabase"
              style={{ minHeight: 40, height: 40 }}
            />
            <input
              className="sync-code-area"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль аккаунта Supabase"
              type="password"
              autoComplete="current-password"
              aria-label="Пароль аккаунта Supabase"
              style={{ minHeight: 40, height: 40, marginTop: 8 }}
            />
          </div>

          <div className="sync-code-toolbar" style={{ marginTop: 12, flexWrap: 'wrap' }}>
            <button type="button" className="sec-mini-btn" onClick={() => void handleDisconnect()} disabled={busy || !status.authenticated}>
              <LogOut size={13} /> Выйти
            </button>
            <button type="button" className="sec-mini-btn" onClick={handleResetQueue} disabled={busy}>
              <Trash2 size={13} /> Сбросить очередь
            </button>
            <button
              type="button"
              className="sec-mini-btn"
              onClick={() => void handleForget()}
              disabled={busy || !overview.runtimeConfigured}
              title="Удаляет сохранённые на устройстве ключи Supabase"
            >
              <CloudOff size={13} /> Забыть ключи
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Что именно синхронизируется ──────────────────────────────────── */}
      <div className="backup-storage" style={{ marginTop: 12 }}>
        <div className="backup-storage__head">
          <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Database size={14} /> Содержимое облачной копии
          </b>
          <span>{Object.values(overview.rows).reduce((sum, n) => sum + n, 0).toLocaleString('ru-RU')} строк</span>
        </div>
        <div className="backup-stats" style={{ marginTop: 8 }}>
          {TABLE_ORDER.map((table) => (
            <div key={table} className="backup-stat">
              <b>{overview.rows[table].toLocaleString('ru-RU')}</b>
              <span>{TABLE_LABELS[table]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="backup-local-note">
        <ShieldCheck size={14} />
        <span>
          Данные летописи остаются в вашем браузере (ключ <code>ogonek.v2</code>). Облако —
          необязательная надстройка: без ключей и без сети приложение работает как обычно, а
          изменения дозаливаются при появлении связи.
        </span>
      </div>
    </section>
  )
}

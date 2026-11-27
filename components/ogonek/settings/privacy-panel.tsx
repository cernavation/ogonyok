'use client'

import React, { useEffect, useMemo, useState, type ComponentType } from 'react'
import {
  BadgeCheck,
  Check,
  EyeOff,
  Flame,
  Globe,
  Lock,
  MessageSquare,
  Phone,
  Radio,
  RotateCcw,
  Search,
  ShieldCheck,
  Trophy,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react'
import {
  INTERACTION_AUDIENCE_OPTIONS,
  PROFILE_VISIBILITY_OPTIONS,
  audienceMeta,
  buildPrivacySummary,
  evaluatePrivacyScore,
  profileVisibilityMeta,
} from '@/lib/ogonek/privacy'
import { playClick, playSuccess } from '@/lib/ogonek/sound'
import { useOgonekStore } from '@/lib/ogonek/use-ogonek-store'
import { getBlockedProfiles, type BlockedProfile } from '@/lib/supabase/api'
import type { PrivacySettings } from '@/lib/ogonek/types'

type Props = {
  onNotify: (message: string) => void
}

const RING_RADIUS = 46
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

type ToggleKey =
  | 'showStreakPublicly'
  | 'showDifficultyLevelPublicly'
  | 'showBadgesPublicly'
  | 'searchableByUsername'
  | 'hideFromLeaderboards'

const TOGGLES: {
  key: ToggleKey
  icon: ComponentType<{ size?: number; className?: string }>
  onLabel: string
  onHint: string
  offLabel: string
  offHint: string
  privateWhen: boolean
}[] = [
  {
    key: 'showStreakPublicly',
    icon: Flame,
    onLabel: 'Показывать стрик публично',
    onHint: 'Другие видят длину твоей серии в профиле',
    offLabel: 'Стрик скрыт',
    offHint: 'Длину серии видишь только ты',
    privateWhen: false,
  },
  {
    key: 'showDifficultyLevelPublicly',
    icon: Flame,
    onLabel: 'Показывать мой уровень сложности',
    onHint: 'Значок уровня сложности и количество побед видны другим',
    offLabel: 'Уровень сложности скрыт',
    offHint: 'Твой уровень виден только тебе',
    privateWhen: false,
  },
  {
    key: 'showBadgesPublicly',
    icon: BadgeCheck,
    onLabel: 'Показывать верифицированные бейджи',
    onHint: 'Подтверждённые ачивки видны в публичном профиле',
    offLabel: 'Бейджи скрыты',
    offHint: 'Ачивки хранятся только в твоём журнале',
    privateWhen: false,
  },
  {
    key: 'searchableByUsername',
    icon: Search,
    onLabel: 'Можно найти по @username',
    onHint: 'Профиль находится через поиск в хабе Priday',
    offLabel: 'Невидим для поиска',
    offHint: 'Тебя нельзя найти по имени пользователя',
    privateWhen: false,
  },
  {
    key: 'hideFromLeaderboards',
    icon: Trophy,
    onLabel: 'Участвую в рейтинге',
    onHint: 'Твой стрик отображается в таблице лидеров',
    offLabel: 'Скрыт из рейтинга',
    offHint: 'Ты не появляешься в публичных рейтингах',
    privateWhen: true,
  },
]

const ACCESS_OPTIONS = [
  { id: 'everyone' as const, label: 'Все' },
  { id: 'friends' as const, label: 'Только друзья' },
  { id: 'nobody' as const, label: 'Никто' },
]

export function PrivacyPanel({ onNotify }: Props) {
  const {
    state,
    setProfileVisibility,
    setCommentPolicy,
    setChatPolicy,
    updatePrivacy,
    resetPrivacy,
  } = useOgonekStore()

  const privacy = state.privacy
  const sound = state.soundEnabled

  const score = useMemo(() => evaluatePrivacyScore(privacy), [privacy])
  const activeVisibility = profileVisibilityMeta(privacy.profileVisibility)

  // Список заблокированных пользователей
  const [blockedUsers, setBlockedUsers] = useState<BlockedProfile[]>([])
  const [loadingBlocked, setLoadingBlocked] = useState(false)
  const [unblockingId, setUnblockingId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoadingBlocked(true)
      const res = await getBlockedProfiles()
      if (mounted && res.ok) {
        setBlockedUsers(res.profiles)
      }
      if (mounted) setLoadingBlocked(false)
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const handleUnblock = async (user: BlockedProfile) => {
    try {
      setUnblockingId(user.id)
      playClick(sound)
      const res = await fetch('/api/friends/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unblock', targetUserId: user.id }),
      })
      if (res.ok) {
        setBlockedUsers((prev) => prev.filter((b) => b.id !== user.id))
        playSuccess(sound)
        onNotify(`Пользователь @${user.username} разблокирован`)
      } else {
        onNotify('Не удалось разблокировать пользователя')
      }
    } catch {
      onNotify('Ошибка соединения')
    } finally {
      setUnblockingId(null)
    }
  }

  const isDefault =
    privacy.profileVisibility === 'public' &&
    privacy.commentPolicy === 'everyone' &&
    !privacy.isHiddenFromSearch &&
    (privacy.allowMessagesFrom ?? privacy.whoCanMessage) === 'everyone' &&
    (privacy.allowGroupInvitesFrom ?? 'friends') === 'friends' &&
    privacy.whoCanFind === 'everyone' &&
    privacy.whoCanCall === 'friends' &&
    privacy.whoCanSeeOnline === 'friends' &&
    privacy.defaultDayVisibility === 'public' &&
    privacy.showStreakPublicly &&
    privacy.showBadgesPublicly &&
    privacy.searchableByUsername &&
    !privacy.hideFromLeaderboards

  const handleVisibility = (next: PrivacySettings['profileVisibility']) => {
    if (next === privacy.profileVisibility) return
    setProfileVisibility(next)
    playClick(sound)
    onNotify(
      next === 'private'
        ? 'Аккаунт закрыт: записи видят только друзья'
        : 'Профиль открыт: записи доступны в глобальной ленте'
    )
  }

  const handleToggle = (toggle: (typeof TOGGLES)[number]) => {
    const current = Boolean(privacy[toggle.key])
    const nextVal = !current
    if (toggle.key === 'searchableByUsername') {
      updatePrivacy({
        searchableByUsername: nextVal,
        isHiddenFromSearch: !nextVal,
        whoCanFind: nextVal ? 'everyone' : 'nobody',
      })
    } else {
      updatePrivacy({ [toggle.key]: nextVal } as Partial<PrivacySettings>)
    }
    playClick(sound)
    onNotify(nextVal ? toggle.onLabel : toggle.offLabel)
  }

  const handleReset = () => {
    resetPrivacy()
    playSuccess(sound)
    onNotify('Приватность сброшена к заводским настройкам')
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-5" aria-labelledby="privacy-title">
      {/* ── Заголовок и индикатор приватности ─────────────────────────── */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
        <div>
          <h2 id="privacy-title" className="text-[16px] font-bold text-[var(--text)] flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--accent)]" /> Приватность профиля и данных
          </h2>
          <p className="text-[13px] text-[var(--text-2)] mt-0.5">
            {buildPrivacySummary(privacy)}
          </p>
        </div>
        <span
          className="px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border border-[var(--border)]"
          style={{
            background: score.level === 'closed' ? 'rgba(34,197,94,0.1)' : score.level === 'balanced' ? 'rgba(59,130,246,0.1)' : 'rgba(234,179,8,0.1)',
            color: score.level === 'closed' ? '#22c55e' : score.level === 'balanced' ? '#3b82f6' : '#eab308',
          }}
        >
          <Lock size={12} /> {score.label} ({score.percent}%)
        </span>
      </div>

      {/* ── Кольцо приватности + сводка ─────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)] flex items-center gap-4">
        <div className="relative shrink-0 w-20 h-20 flex items-center justify-center">
          <svg viewBox="0 0 108 108" className="w-full h-full -rotate-90">
            <circle
              cx="54"
              cy="54"
              r={RING_RADIUS}
              className="fill-none stroke-[var(--border)] stroke-[8]"
            />
            <circle
              cx="54"
              cy="54"
              r={RING_RADIUS}
              className="fill-none stroke-[var(--accent)] stroke-[8] transition-all duration-500"
              style={{
                strokeDasharray: `${(score.percent / 100) * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`,
                strokeLinecap: 'round',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[15px] font-black leading-tight text-[var(--text)]">{score.percent}%</span>
            <span className="text-[9px] uppercase tracking-wider text-[var(--text-3)] font-bold">индекс</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{activeVisibility.emoji}</span>
            <h3 className="text-[15px] font-bold text-[var(--text)]">{activeVisibility.label}</h3>
          </div>
          <p className="text-[12px] text-[var(--text-2)] mt-0.5 leading-relaxed break-words">
            {activeVisibility.description}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--bg)] border border-[var(--border)] text-[var(--text-2)] flex items-center gap-1">
              <Lock size={10} /> {activeVisibility.shortLabel}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--bg)] border border-[var(--border)] text-[var(--text-2)] flex items-center gap-1">
              <MessageSquare size={10} /> Сообщения: {(privacy.allowMessagesFrom ?? privacy.whoCanMessage) === 'everyone' ? 'Все' : (privacy.allowMessagesFrom ?? privacy.whoCanMessage) === 'friends' ? 'Друзья' : 'Никто'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--bg)] border border-[var(--border)] text-[var(--text-2)] flex items-center gap-1">
              <Users size={10} /> Группы: {(privacy.allowGroupInvitesFrom ?? 'friends') === 'nobody' ? 'Никто' : 'Друзья'}
            </span>
          </div>
        </div>
      </div>

      {/* ── 0. Скрытая личность (скрыть меня из поиска) ─────────────────── */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)]">
        <div className="min-w-0 pr-2">
          <h3 className="text-[14px] font-bold text-[var(--text)] flex items-center gap-2">
            <EyeOff size={15} className="text-[var(--accent)] shrink-0" />
            <span>Скрытая личность (скрыть меня из поиска)</span>
          </h3>
          <p className="text-[12px] text-[var(--text-2)] mt-0.5 leading-snug">
            {privacy.isHiddenFromSearch
              ? 'Аккаунт скрыт: профиль не отображается в разделе «Поиск» и в рекомендациях у других пользователей'
              : 'Когда включено, тебя нельзя найти через Поиск и рекомендации, но переписки с друзьями продолжают работать'}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={Boolean(privacy.isHiddenFromSearch)}
          aria-label="Скрытая личность (скрыть меня из поиска)"
          onClick={() => {
            const nextHidden = !privacy.isHiddenFromSearch
            playClick(sound)
            updatePrivacy({
              isHiddenFromSearch: nextHidden,
              whoCanFind: nextHidden ? 'nobody' : 'everyone',
              searchableByUsername: !nextHidden,
            })
            onNotify(
              nextHidden
                ? 'Скрытая личность включена: аккаунт убран из Поиска'
                : 'Скрытая личность выключена: профиль снова виден в Поиске'
            )
          }}
          className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${
            privacy.isHiddenFromSearch ? 'bg-[var(--accent)]' : 'bg-zinc-800'
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              privacy.isHiddenFromSearch ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* ── 1. Кто может находить меня в поиске ─────────────────────────── */}
      <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)]">
        <div>
          <h3 className="text-[14px] font-bold text-[var(--text)] flex items-center gap-2">
            <Search size={15} className="text-[var(--accent)]" /> Кто может находить меня в поиске
          </h3>
          <p className="text-[12px] text-[var(--text-2)] mt-0.5">
            Определяет, отображается ли профиль в поиске хаба и результатах автокомплита
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Кто может находить меня">
          {ACCESS_OPTIONS.map((opt) => {
            const active = (privacy.whoCanFind || 'everyone') === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  playClick(sound)
                  updatePrivacy({
                    whoCanFind: opt.id,
                    isHiddenFromSearch: opt.id === 'nobody',
                    searchableByUsername: opt.id !== 'nobody',
                  })
                  onNotify(`Поиск: ${opt.label}`)
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]'
                    : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-2)] hover:border-[var(--border-strong)]'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 2. Кто может писать мне личные сообщения ─────────────────────── */}
      <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)]">
        <div>
          <h3 className="text-[14px] font-bold text-[var(--text)] flex items-center gap-2">
            <MessageSquare size={15} className="text-[var(--accent)]" /> Кто может писать мне сообщения
          </h3>
          <p className="text-[12px] text-[var(--text-2)] mt-0.5">
            Применяется в интерфейсе и на уровне PostgreSQL RLS: кнопка «Написать» и отправка диалогов учитывают этот фильтр
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Кто может писать мне">
          {ACCESS_OPTIONS.map((opt) => {
            const currentMsgAudience = privacy.allowMessagesFrom ?? privacy.whoCanMessage ?? 'everyone'
            const active = currentMsgAudience === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  playClick(sound)
                  updatePrivacy({
                    allowMessagesFrom: opt.id,
                    whoCanMessage: opt.id,
                    chatPolicy: opt.id,
                  })
                  onNotify(`Сообщения: ${opt.label}`)
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]'
                    : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-2)] hover:border-[var(--border-strong)]'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 2.5. Кто может добавлять меня в группы ──────────────────────── */}
      <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)]">
        <div>
          <h3 className="text-[14px] font-bold text-[var(--text)] flex items-center gap-2">
            <Users size={15} className="text-[var(--accent)]" /> Кто может добавлять меня в группы
          </h3>
          <p className="text-[12px] text-[var(--text-2)] mt-0.5">
            В группы Priday могут добавлять только взаимные друзья, или вы можете полностью отключить приглашения
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Кто может добавлять меня в группы">
          {[
            { id: 'friends' as const, label: 'Только друзья' },
            { id: 'nobody' as const, label: 'Никто' },
          ].map((opt) => {
            const currentGroupPolicy = privacy.allowGroupInvitesFrom || 'friends'
            const active = currentGroupPolicy === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  playClick(sound)
                  updatePrivacy({ allowGroupInvitesFrom: opt.id })
                  onNotify(`Группы: ${opt.label}`)
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]'
                    : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-2)] hover:border-[var(--border-strong)]'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 3. Кто может звонить мне ───────────────────────────────────── */}
      <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)]">
        <div>
          <h3 className="text-[14px] font-bold text-[var(--text)] flex items-center gap-2">
            <Phone size={15} className="text-[var(--accent)]" /> Кто может звонить мне
          </h3>
          <p className="text-[12px] text-[var(--text-2)] mt-0.5">
            Проверяется RPC звонков: если звонящий не соответствует правилу, вызов автоматически отклоняется
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Кто может звонить мне">
          {ACCESS_OPTIONS.map((opt) => {
            const active = (privacy.whoCanCall || 'everyone') === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  playClick(sound)
                  updatePrivacy({ whoCanCall: opt.id })
                  onNotify(`Звонки: ${opt.label}`)
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]'
                    : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-2)] hover:border-[var(--border-strong)]'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 4. Кто видит статус «в сети» ───────────────────────────────── */}
      <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)]">
        <div>
          <h3 className="text-[14px] font-bold text-[var(--text)] flex items-center gap-2">
            <Radio size={15} className="text-[var(--accent)]" /> Кто видит мой статус «в сети»
          </h3>
          <p className="text-[12px] text-[var(--text-2)] mt-0.5">
            Зелёный индикатор активности и время последнего визита
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Кто видит статус в сети">
          {ACCESS_OPTIONS.map((opt) => {
            const active = (privacy.whoCanSeeOnline || 'everyone') === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  playClick(sound)
                  updatePrivacy({ whoCanSeeOnline: opt.id })
                  onNotify(`Статус онлайн: ${opt.label}`)
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]'
                    : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-2)] hover:border-[var(--border-strong)]'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 5. Аудитория записей по умолчанию ───────────────────────────── */}
      <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)]">
        <div>
          <h3 className="text-[14px] font-bold text-[var(--text)] flex items-center gap-2">
            <Lock size={15} className="text-[var(--accent)]" /> Аудитория записей по умолчанию
          </h3>
          <p className="text-[12px] text-[var(--text-2)] mt-0.5">
            Новые дни и гордости автоматически создаются с этой видимостью
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Аудитория записей по умолчанию">
          {[
            { id: 'private' as const, label: 'Лично' },
            { id: 'friends' as const, label: 'Друзьям' },
            { id: 'public' as const, label: 'Всем' },
          ].map((opt) => {
            const currentVis = privacy.defaultDayVisibility || 'public'
            const active = currentVis === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  playClick(sound)
                  updatePrivacy({ defaultDayVisibility: opt.id })
                  onNotify(`Аудитория по умолчанию: ${opt.label}`)
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]'
                    : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-2)] hover:border-[var(--border-strong)]'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 6. Список заблокированных пользователей ─────────────────────── */}
      <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-[var(--bg-elev)] border border-[var(--border)]">
        <div>
          <h3 className="text-[14px] font-bold text-[var(--text)] flex items-center gap-2">
            <UserX size={15} className="text-rose-500" /> Заблокированные пользователи
          </h3>
          <p className="text-[12px] text-[var(--text-2)] mt-0.5">
            Заблокированные пользователи не могут писать вам, звонить и находить в поиске
          </p>
        </div>

        {loadingBlocked ? (
          <div className="py-4 text-center text-xs text-[var(--text-3)]">Загрузка черного списка...</div>
        ) : blockedUsers.length === 0 ? (
          <div className="py-4 px-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-center">
            <UserCheck size={20} className="mx-auto text-[var(--text-3)] mb-1 opacity-70" />
            <p className="text-xs text-[var(--text-2)] font-medium">Черный список пуст</p>
            <p className="text-[11px] text-[var(--text-3)] mt-0.5">У вас нет заблокированных пользователей</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {blockedUsers.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                    {b.display_name.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[var(--text)] truncate">{b.display_name}</p>
                    <p className="text-[11px] text-[var(--text-3)] truncate">@{b.username}</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={unblockingId === b.id}
                  onClick={() => handleUnblock(b)}
                  className="px-3 py-1 rounded-full text-xs font-bold border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
                >
                  {unblockingId === b.id ? 'Разблокировка...' : 'Разблокировать'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 7. Дополнительные переключатели приватности ───────────────────── */}
      <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]">
        <h3 className="text-[13px] font-bold text-[var(--text-2)] uppercase tracking-wider mb-1">
          Видимость элементов профиля
        </h3>
        {TOGGLES.map((toggle) => {
          const Icon = toggle.icon
          const raw = privacy[toggle.key]
          const visualOn = toggle.key === 'hideFromLeaderboards' ? !raw : raw
          return (
            <div
              key={toggle.key}
              className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elev)] border border-[var(--border)]"
            >
              <div className="min-w-0 pr-3">
                <p className="text-[13px] font-bold text-[var(--text)] flex items-center gap-2">
                  <Icon size={14} className="text-[var(--text-2)]" />
                  <span>{visualOn ? toggle.onLabel : toggle.offLabel}</span>
                </p>
                <p className="text-[12px] text-[var(--text-2)] mt-0.5 break-words leading-tight">
                  {visualOn ? toggle.onHint : toggle.offHint}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={visualOn}
                aria-label={visualOn ? toggle.onLabel : toggle.offLabel}
                onClick={() => handleToggle(toggle)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${
                  visualOn ? 'bg-[var(--accent)]' : 'bg-zinc-800'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                    visualOn ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )
        })}
      </div>

      {/* ── Кнопка сброса ──────────────────────────────────────────────── */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={handleReset}
          disabled={isDefault}
          className="px-4 py-2 rounded-full border border-[var(--border)] text-xs font-bold text-[var(--text-2)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition-colors flex items-center gap-1.5 disabled:opacity-40"
        >
          <RotateCcw size={13} />
          <span>Сбросить приватность по умолчанию</span>
        </button>
      </div>
    </div>
  )
}

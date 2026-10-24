'use client'

import {
  BadgeCheck,
  Check,
  Flame,
  Globe,
  Lock,
  MessageSquare,
  RotateCcw,
  Search,
  ShieldCheck,
  Trophy,
  UserX,
  Users,
} from 'lucide-react'
import { useMemo, type ComponentType } from 'react'
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
import type { InteractionAudience, PrivacySettings } from '@/lib/ogonek/types'

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
  icon: ComponentType<{ size?: number }>
  onLabel: string
  onHint: string
  offLabel: string
  offHint: string
  /** Значение, которое считается «приватным» (подсвечивается акцентом) */
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
    onHint: 'Профиль находится через поиск в хабе Огонька',
    offLabel: 'Невидим для поиска',
    offHint: 'Тебя нельзя найти по имени пользователя',
    privateWhen: false,
  },
  {
    key: 'hideFromLeaderboards',
    icon: Trophy,
    onLabel: 'Скрыт из таблиц лидеров',
    onHint: 'Ты не появляешься в публичных рейтингах',
    offLabel: 'Участвую в лидерах',
    offHint: 'Стрик участвует в таблицах лидеров',
    privateWhen: true,
  },
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

  const isDefault =
    privacy.profileVisibility === 'public' &&
    privacy.commentPolicy === 'everyone' &&
    privacy.chatPolicy === 'friends' &&
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

  const handleAudience = (
    field: 'commentPolicy' | 'chatPolicy',
    next: InteractionAudience
  ) => {
    if (privacy[field] === next) return
    if (field === 'commentPolicy') setCommentPolicy(next)
    else setChatPolicy(next)
    playClick(sound)
    const meta = audienceMeta(next)
    onNotify(
      field === 'commentPolicy'
        ? `Комментарии: ${meta.label.toLowerCase()}`
        : `Сообщения: ${meta.label.toLowerCase()}`
    )
  }

  const handleToggle = (toggle: (typeof TOGGLES)[number]) => {
    const current = privacy[toggle.key]
    updatePrivacy({ [toggle.key]: !current } as Partial<PrivacySettings>)
    playClick(sound)
    onNotify(!current ? toggle.onLabel : toggle.offLabel)
  }

  const handleReset = () => {
    resetPrivacy()
    playSuccess(sound)
    onNotify('Приватность сброшена к заводским настройкам')
  }

  return (
    <section className="settings-section privacy-panel" aria-labelledby="privacy-title">
      <div className="appearance-section-head">
        <div>
          <b id="privacy-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={16} style={{ color: 'var(--accent)' }} /> Приватность профиля
          </b>
          <small>{buildPrivacySummary(privacy)}</small>
        </div>
        <span className={`privacy-score-badge privacy-score-badge--${score.level}`} title={score.label}>
          <Lock size={12} /> {score.label}
        </span>
      </div>

      {/* ── Кольцо приватности + сводка ─────────────────────────────────── */}
      <div className="privacy-hero">
        <div className="privacy-ring" aria-hidden="true">
          <svg viewBox="0 0 108 108">
            <circle className="privacy-ring__track" cx="54" cy="54" r={RING_RADIUS} />
            <circle
              className="privacy-ring__value"
              cx="54"
              cy="54"
              r={RING_RADIUS}
              style={{
                strokeDasharray: `${(score.percent / 100) * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`,
              }}
            />
          </svg>
          <span className="privacy-ring__label">
            <b>{score.percent}%</b>
            <small>приватность</small>
          </span>
        </div>

        <div className="privacy-hero__info">
          <b className="privacy-hero__title">
            <span aria-hidden="true">{activeVisibility.emoji}</span> {activeVisibility.label}
          </b>
          <p className="privacy-hero__text">{activeVisibility.description}</p>
          <div className="privacy-hero__chips">
            <span className={`privacy-chip ${privacy.profileVisibility === 'private' ? 'is-on' : ''}`}>
              <Lock size={12} /> {activeVisibility.shortLabel}
            </span>
            <span className="privacy-chip">
              <MessageSquare size={12} /> Коммент: {audienceMeta(privacy.commentPolicy).shortLabel}
            </span>
            <span className="privacy-chip">
              <Users size={12} /> Чат: {audienceMeta(privacy.chatPolicy).shortLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ── Тип аккаунта ─────────────────────────────────────────────────── */}
      <div className="privacy-group">
        <b className="privacy-group__label">
          <Globe size={14} /> Тип аккаунта
        </b>
        <div className="privacy-visibility-grid" role="radiogroup" aria-label="Тип аккаунта">
          {PROFILE_VISIBILITY_OPTIONS.map((option) => {
            const active = option.id === privacy.profileVisibility
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`privacy-visibility-card ${active ? 'is-active' : ''}`}
                style={active ? { borderColor: option.color } : undefined}
                onClick={() => handleVisibility(option.id)}
              >
                <span className="privacy-visibility-card__emoji" aria-hidden="true">
                  {option.emoji}
                </span>
                <span className="privacy-visibility-card__body">
                  <b>{option.label}</b>
                  <small>{option.description}</small>
                </span>
                {active && (
                  <span className="privacy-visibility-card__check" aria-hidden="true">
                    <Check size={13} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Политика взаимодействия ──────────────────────────────────────── */}
      <div className="privacy-group">
        <b className="privacy-group__label">
          <MessageSquare size={14} /> Кто может комментировать и писать
        </b>

        <div className="privacy-policy">
          <span className="privacy-policy__caption">
            <MessageSquare size={13} /> Комментарии
          </span>
          <div className="segmented privacy-policy__seg" role="radiogroup" aria-label="Кто может комментировать">
            {INTERACTION_AUDIENCE_OPTIONS.map((option) => {
              const active = option.id === privacy.commentPolicy
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={active ? 'selected' : ''}
                  title={option.description}
                  onClick={() => handleAudience('commentPolicy', option.id)}
                >
                  {option.shortLabel}
                </button>
              )
            })}
          </div>
        </div>

        <div className="privacy-policy">
          <span className="privacy-policy__caption">
            <Users size={13} /> Личные сообщения
          </span>
          <div className="segmented privacy-policy__seg" role="radiogroup" aria-label="Кто может писать в чат">
            {INTERACTION_AUDIENCE_OPTIONS.map((option) => {
              const active = option.id === privacy.chatPolicy
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={active ? 'selected' : ''}
                  title={option.description}
                  onClick={() => handleAudience('chatPolicy', option.id)}
                >
                  {option.shortLabel}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Тумблеры видимости ───────────────────────────────────────────── */}
      <div className="privacy-group privacy-toggles">
        {TOGGLES.map((toggle) => {
          const Icon = toggle.icon
          const raw = privacy[toggle.key]
          // Для «hideFromLeaderboards» включённое значение = приватно
          const privateState = toggle.privateWhen ? raw : !raw
          return (
            <div className="setting-row privacy-toggle-row" key={toggle.key}>
              <div>
                <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon size={15} /> {raw ? toggle.onLabel : toggle.offLabel}
                  {privateState && (
                    <span className="privacy-private-pill">
                      <Lock size={10} /> приватно
                    </span>
                  )}
                </b>
                <small>{raw ? toggle.onHint : toggle.offHint}</small>
              </div>
              <button
                type="button"
                className={`switch ${raw ? 'on' : ''}`}
                onClick={() => handleToggle(toggle)}
                aria-pressed={raw}
                aria-label={raw ? toggle.onLabel : toggle.offLabel}
              >
                <i />
              </button>
            </div>
          )
        })}
      </div>

      <div className="privacy-reset-row">
        <button
          type="button"
          className="appearance-reset-btn"
          onClick={handleReset}
          disabled={isDefault}
          aria-label="Сбросить приватность к значениям по умолчанию"
        >
          {isDefault ? <UserX size={14} /> : <RotateCcw size={14} />}
          <span>{isDefault ? 'Приватность по умолчанию' : 'Сбросить приватность'}</span>
        </button>
      </div>
    </section>
  )
}

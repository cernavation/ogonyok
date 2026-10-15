import type { ProfileSocialPlatform } from './types'

/** Готовая обложка профиля (banner) — фон + подпись */
export type BannerPreset = {
  id: string
  label: string
  /** CSS background (gradient) */
  background: string
  /** Акцентный цвет для звёзд/подписи */
  accent: string
  /** Показывать ли силуэт гор */
  mountains: boolean
}

/** Акцентные градиенты для аватара-заглушки */
export type AvatarPreset = {
  id: string
  label: string
  background: string
}

export const BANNER_PRESETS: BannerPreset[] = [
  {
    id: 'night-peaks',
    label: 'Ночные вершины',
    background:
      'linear-gradient(135deg, #0f1923 0%, #1a1f3a 35%, #0d2137 65%, #060d1a 100%)',
    accent: '#8ab4ff',
    mountains: true,
  },
  {
    id: 'ember-dawn',
    label: 'Угольный рассвет',
    background:
      'linear-gradient(135deg, #2a1206 0%, #4a1d08 38%, #7a2f0c 68%, #1a0a04 100%)',
    accent: '#ffad5a',
    mountains: true,
  },
  {
    id: 'deep-forest',
    label: 'Глубокий лес',
    background:
      'linear-gradient(135deg, #04120d 0%, #0b2a1f 40%, #123a29 70%, #03100b 100%)',
    accent: '#7ee0b8',
    mountains: true,
  },
  {
    id: 'violet-haze',
    label: 'Фиолетовая дымка',
    background:
      'linear-gradient(135deg, #120a24 0%, #2a1250 40%, #3d1a6b 70%, #0a0518 100%)',
    accent: '#c4a6ff',
    mountains: true,
  },
  {
    id: 'rose-quartz',
    label: 'Розовый кварц',
    background:
      'linear-gradient(135deg, #240a17 0%, #4a1030 40%, #6b1846 70%, #18060f 100%)',
    accent: '#ff9ecb',
    mountains: false,
  },
  {
    id: 'steel-grid',
    label: 'Стальная сетка',
    background:
      'linear-gradient(135deg, #0d0f12 0%, #1c2128 45%, #2a313a 70%, #08090b 100%)',
    accent: '#9fb4c7',
    mountains: false,
  },
  {
    id: 'aurora',
    label: 'Северное сияние',
    background:
      'linear-gradient(135deg, #04121a 0%, #0a2e3a 35%, #14524f 65%, #071b1f 100%)',
    accent: '#66ffd9',
    mountains: true,
  },
  {
    id: 'gold-lux',
    label: 'Золото',
    background:
      'linear-gradient(135deg, #1a1405 0%, #3d2f08 38%, #6b5210 68%, #141003 100%)',
    accent: '#ffd76a',
    mountains: false,
  },
]

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'flame',
    label: 'Пламя',
    background: 'linear-gradient(135deg, #ff6b35 0%, #ffa600 100%)',
  },
  {
    id: 'ocean',
    label: 'Океан',
    background: 'linear-gradient(135deg, #1d9bf0 0%, #0a4d8c 100%)',
  },
  {
    id: 'violet',
    label: 'Аметист',
    background: 'linear-gradient(135deg, #a855f7 0%, #5b21b6 100%)',
  },
  {
    id: 'forest',
    label: 'Изумруд',
    background: 'linear-gradient(135deg, #22c55e 0%, #0f5132 100%)',
  },
  {
    id: 'rose',
    label: 'Роза',
    background: 'linear-gradient(135deg, #f91880 0%, #7d1f4a 100%)',
  },
  {
    id: 'graphite',
    label: 'Графит',
    background: 'linear-gradient(135deg, #536471 0%, #1f2429 100%)',
  },
  {
    id: 'sunset',
    label: 'Закат',
    background: 'linear-gradient(135deg, #ff8a50 0%, #c2410c 100%)',
  },
  {
    id: 'ice',
    label: 'Лёд',
    background: 'linear-gradient(135deg, #67e8f9 0%, #155e75 100%)',
  },
]

/** Предложения для главной цели месяца */
export const GOAL_SUGGESTIONS: string[] = [
  'Закрыть сделку с Alibaba и вывести партнёрство на новый уровень',
  'Пробежать 42 км босиком и не сойти с дистанции',
  'Держать стрик Огонька 30 дней без пропусков',
  'Запустить новую версию Memernity для первых пользователей',
  'Тренироваться 20 раз за месяц и укрепить тело',
  'Каждый день писать 1 страницу личного дневника',
  'Выступать публично минимум 4 раза за месяц',
]

export type SocialPlatformMeta = {
  id: ProfileSocialPlatform
  label: string
  /** Префикс, который показывается в поле ввода */
  placeholder: string
  /** Цвет иконки/бейджа */
  color: string
  /** Базовый URL, если пользователь вводит только ник */
  baseUrl: string
}

export const SOCIAL_PLATFORMS: SocialPlatformMeta[] = [
  {
    id: 'website',
    label: 'Сайт',
    placeholder: 'https://example.com',
    color: '#1d9bf0',
    baseUrl: '',
  },
  {
    id: 'telegram',
    label: 'Telegram',
    placeholder: '@username',
    color: '#2aabee',
    baseUrl: 'https://t.me/',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    placeholder: '@username',
    color: '#e1306c',
    baseUrl: 'https://instagram.com/',
  },
  {
    id: 'github',
    label: 'GitHub',
    placeholder: '@username',
    color: '#c9d1d9',
    baseUrl: 'https://github.com/',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    placeholder: '@channel',
    color: '#ff0000',
    baseUrl: 'https://youtube.com/@',
  },
  {
    id: 'x',
    label: 'X (Twitter)',
    placeholder: '@username',
    color: '#e7e9ea',
    baseUrl: 'https://x.com/',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    placeholder: 'in/username',
    color: '#0a66c2',
    baseUrl: 'https://linkedin.com/in/',
  },
  {
    id: 'custom',
    label: 'Другое',
    placeholder: 'https://...',
    color: '#71767b',
    baseUrl: '',
  },
]

export function getBannerPreset(id: string): BannerPreset {
  return BANNER_PRESETS.find((preset) => preset.id === id) ?? BANNER_PRESETS[0]
}

export function getAvatarPreset(id: string): AvatarPreset {
  return AVATAR_PRESETS.find((preset) => preset.id === id) ?? AVATAR_PRESETS[0]
}

export function getSocialPlatformMeta(platform: ProfileSocialPlatform): SocialPlatformMeta {
  return SOCIAL_PLATFORMS.find((meta) => meta.id === platform) ?? SOCIAL_PLATFORMS[0]
}

/** Нормализует ввод ссылки: добавляет базовый URL для соцсетей и https для сайтов */
export function normalizeSocialUrl(platform: ProfileSocialPlatform, raw: string): string {
  const value = (raw ?? '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  const meta = getSocialPlatformMeta(platform)
  if (meta.baseUrl) {
    return `${meta.baseUrl}${value.replace(/^@/, '')}`
  }
  return `https://${value.replace(/^\/+/, '')}`
}

/** Отображаемое имя ссылки (без протокола, компактно) */
export function prettySocialUrl(url: string): string {
  return (url ?? '')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '')
}

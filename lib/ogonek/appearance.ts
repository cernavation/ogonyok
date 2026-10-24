import type { AccentId, FeedDensityId, FontScaleId, ThemeMode } from './types'

/* ══════════════════════════════════════════════════════════════════════════
   ЭТАП 14 — ЦЕНТР ОФОРМЛЕНИЯ ОГОНЬКА
   Единый источник правды по темам, акцентам, размеру шрифта и плотности.
   Значения прокидываются в CSS через data-атрибуты на <html>, поэтому
   оформление применяется ко всему приложению мгновенно.
   ══════════════════════════════════════════════════════════════════════════ */

/** Лёгкий ключ для предзагрузки темы до отрисовки (без парсинга тяжёлого стора) */
export const APPEARANCE_STORAGE_KEY = 'ogonek.appearance.v1'

export const DEFAULT_THEME: ThemeMode = 'x-black'
export const DEFAULT_ACCENT: AccentId = 'flame'
export const DEFAULT_FONT_SCALE: FontScaleId = 'regular'
export const DEFAULT_FEED_DENSITY: FeedDensityId = 'cozy'

export const THEME_IDS: ThemeMode[] = ['x-black', 'apple-light', 'dim']
export const ACCENT_IDS: AccentId[] = ['flame', 'blue', 'violet', 'emerald', 'rose', 'gold']
export const FONT_SCALE_IDS: FontScaleId[] = ['compact', 'regular', 'large', 'xlarge']
export const FEED_DENSITY_IDS: FeedDensityId[] = ['cozy', 'comfortable', 'compact']

export type AppearanceSettings = {
  theme: ThemeMode
  accent: AccentId
  fontScale: FontScaleId
  feedDensity: FeedDensityId
}

/* ── Темы оформления ─────────────────────────────────────────────────────── */

export type ThemePreset = {
  id: ThemeMode
  /** Короткое название темы */
  label: string
  /** Английский код (X Black / Apple Light / Dim) */
  code: string
  /** Пояснение для пользователя */
  hint: string
  /** Светлая или тёмная схема */
  scheme: 'dark' | 'light'
  /** Цвета мини-превью карточки темы */
  preview: {
    bg: string
    surface: string
    line: string
    text: string
    muted: string
  }
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'x-black',
    label: 'Тёмная',
    code: 'X Black',
    hint: 'Абсолютно чёрный OLED-фон с максимальным контрастом — как в X.',
    scheme: 'dark',
    preview: { bg: '#000000', surface: '#16181c', line: '#2f3336', text: '#e7e9ea', muted: '#71767b' },
  },
  {
    id: 'apple-light',
    label: 'Светлая',
    code: 'Apple Light',
    hint: 'Чистый «яблочный» белый интерфейс с мягкими серыми подложками.',
    scheme: 'light',
    preview: { bg: '#ffffff', surface: '#f7f9f9', line: '#e1e8ed', text: '#0f1419', muted: '#536471' },
  },
  {
    id: 'dim',
    label: 'Сумеречная',
    code: 'Dim',
    hint: 'Глубокий сине-графитовый фон, бережёт глаза вечером и ночью.',
    scheme: 'dark',
    preview: { bg: '#15202b', surface: '#1e2732', line: '#38444d', text: '#f7f9f9', muted: '#8b98a5' },
  },
]

/* ── Акцентные цвета ─────────────────────────────────────────────────────── */

export type AccentPreset = {
  id: AccentId
  label: string
  /** Основной акцентный цвет (--accent) */
  color: string
  /** Более тёмный вариант для hover (--accent-strong) */
  strong: string
  /** Полупрозрачная подложка акцента (--accent-soft) */
  soft: string
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: 'flame', label: 'Огонёк', color: '#FF5C00', strong: '#E65300', soft: 'rgba(255,92,0,0.12)' },
  { id: 'blue', label: 'Небесный', color: '#1D9BF0', strong: '#1A8CD8', soft: 'rgba(29,155,240,0.12)' },
  { id: 'violet', label: 'Аметист', color: '#7856FF', strong: '#6742ED', soft: 'rgba(120,86,255,0.12)' },
  { id: 'emerald', label: 'Изумруд', color: '#00BA7C', strong: '#009664', soft: 'rgba(0,186,124,0.12)' },
  { id: 'rose', label: 'Роза', color: '#F91880', strong: '#D70F6B', soft: 'rgba(249,24,128,0.12)' },
  { id: 'gold', label: 'Золото', color: '#FFD400', strong: '#E6BF00', soft: 'rgba(255,212,0,0.12)' },
]

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '')
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16)
    const g = parseInt(clean[1] + clean[1], 16)
    const b = parseInt(clean[2] + clean[2], 16)
    return { r, g, b }
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16)
    const g = parseInt(clean.slice(2, 4), 16)
    const b = parseInt(clean.slice(4, 6), 16)
    return { r, g, b }
  }
  return null
}

export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export function computeAccentDetails(hex: string) {
  const rgb = hexToRgb(hex) || { r: 255, g: 92, b: 0 }
  const lum = getLuminance(rgb.r, rgb.g, rgb.b)
  // Contrast text: black if luminance > 0.45, else white
  const contrast = lum > 0.45 ? '#000000' : '#FFFFFF'
  // Soft color: 12% opacity
  const soft = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`
  // Hover: 10% darker if light, 10% lighter if dark
  const factor = lum > 0.45 ? 0.88 : 1.15
  const hr = Math.min(255, Math.max(0, Math.round(rgb.r * factor)))
  const hg = Math.min(255, Math.max(0, Math.round(rgb.g * factor)))
  const hb = Math.min(255, Math.max(0, Math.round(rgb.b * factor)))
  const hover = `#${hr.toString(16).padStart(2, '0')}${hg.toString(16).padStart(2, '0')}${hb.toString(16).padStart(2, '0')}`
  return { color: hex, hover, soft, contrast }
}

/* ── Размер шрифта / масштаб интерфейса ──────────────────────────────────── */

export type FontScalePreset = {
  id: FontScaleId
  label: string
  /** Подпись на шкале */
  sample: string
  /** Масштаб интерфейса (CSS zoom на .app-shell) */
  scale: number
}

export const FONT_SCALE_PRESETS: FontScalePreset[] = [
  { id: 'compact', label: 'Мельче', sample: 'Аа', scale: 0.94 },
  { id: 'regular', label: 'Стандарт', sample: 'Аа', scale: 1 },
  { id: 'large', label: 'Крупнее', sample: 'Аа', scale: 1.08 },
  { id: 'xlarge', label: 'Крупный', sample: 'Аа', scale: 1.15 },
]

/* ── Плотность ленты ─────────────────────────────────────────────────────── */

export type FeedDensityPreset = {
  id: FeedDensityId
  label: string
  hint: string
}

export const FEED_DENSITY_PRESETS: FeedDensityPreset[] = [
  { id: 'cozy', label: 'Уютная', hint: 'Сбалансированные отступы карточек ленты' },
  { id: 'comfortable', label: 'Просторная', hint: 'Больше воздуха между записями дней' },
  { id: 'compact', label: 'Плотная', hint: 'Максимум записей на экране без лишних отступов' },
]

/* ── Помощники ───────────────────────────────────────────────────────────── */

export function getThemePreset(id: ThemeMode): ThemePreset {
  return THEME_PRESETS.find((t) => t.id === id) ?? THEME_PRESETS[0]
}

export function getAccentPreset(id: AccentId): AccentPreset {
  return ACCENT_PRESETS.find((a) => a.id === id) ?? ACCENT_PRESETS[0]
}

export function getFontScalePreset(id: FontScaleId): FontScalePreset {
  return FONT_SCALE_PRESETS.find((f) => f.id === id) ?? FONT_SCALE_PRESETS[1]
}

export function getFeedDensityPreset(id: FeedDensityId): FeedDensityPreset {
  return FEED_DENSITY_PRESETS.find((d) => d.id === id) ?? FEED_DENSITY_PRESETS[0]
}

/** Применяет оформление к <html> через data-атрибуты и CSS-переменные (мгновенно, без перезагрузки) */
export function applyAppearanceToDocument(settings: AppearanceSettings, doc?: Document): void {
  if (typeof document === 'undefined' && !doc) return
  const root = (doc ?? document).documentElement
  const body = (doc ?? document).body

  root.setAttribute('data-theme', settings.theme)
  root.setAttribute('data-font-scale', settings.fontScale)
  root.setAttribute('data-density', settings.feedDensity)
  if (body) {
    body.setAttribute('data-theme', settings.theme)
  }

  // Расчёт и применение переменных акцента
  let accentHex = '#FF5C00'
  if (typeof settings.accent === 'string' && settings.accent.startsWith('#')) {
    root.setAttribute('data-accent', 'custom')
    accentHex = settings.accent
  } else {
    root.setAttribute('data-accent', settings.accent)
    const preset = getAccentPreset(settings.accent)
    accentHex = preset.color
  }

  const details = computeAccentDetails(accentHex)
  root.style.setProperty('--accent', details.color)
  root.style.setProperty('--accent-hover', details.hover)
  root.style.setProperty('--accent-soft', details.soft)
  root.style.setProperty('--accent-contrast', details.contrast)
  root.style.setProperty('--accent-text', details.contrast)
  root.style.setProperty('--orange', details.color)
  root.style.setProperty('--blue', details.color)

  // Подсказываем браузеру схему
  const scheme = getThemePreset(settings.theme).scheme
  root.style.colorScheme = scheme
  const themePreset = getThemePreset(settings.theme)
  const meta = (doc ?? document).querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', themePreset.preview.bg)
}

/** Сохраняет лёгкий слепок оформления для мгновенной загрузки без мигания темы */
export function persistAppearance(settings: AppearanceSettings): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // localStorage может быть недоступен — молча игнорируем
  }
}

/** Читает сохранённый слепок оформления (для bootstrap-скрипта и провайдера) */
export function readPersistedAppearance(): AppearanceSettings {
  if (typeof window === 'undefined') {
    return {
      theme: DEFAULT_THEME,
      accent: DEFAULT_ACCENT,
      fontScale: DEFAULT_FONT_SCALE,
      feedDensity: DEFAULT_FEED_DENSITY,
    }
  }
  try {
    const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY)
    if (!raw) {
      return {
        theme: DEFAULT_THEME,
        accent: DEFAULT_ACCENT,
        fontScale: DEFAULT_FONT_SCALE,
        feedDensity: DEFAULT_FEED_DENSITY,
      }
    }
    const parsed = JSON.parse(raw) as Partial<AppearanceSettings>
    return {
      theme: isThemeId(parsed.theme) ? parsed.theme : DEFAULT_THEME,
      accent: isAccentId(parsed.accent) ? parsed.accent : DEFAULT_ACCENT,
      fontScale: isFontScaleId(parsed.fontScale) ? parsed.fontScale : DEFAULT_FONT_SCALE,
      feedDensity: isFeedDensityId(parsed.feedDensity) ? parsed.feedDensity : DEFAULT_FEED_DENSITY,
    }
  } catch {
    return {
      theme: DEFAULT_THEME,
      accent: DEFAULT_ACCENT,
      fontScale: DEFAULT_FONT_SCALE,
      feedDensity: DEFAULT_FEED_DENSITY,
    }
  }
}

export function isThemeId(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (THEME_IDS as string[]).includes(value)
}

export function isAccentId(value: unknown): value is AccentId {
  if (typeof value !== 'string') return false
  if ((ACCENT_IDS as string[]).includes(value as any)) return true
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
}

export function isFontScaleId(value: unknown): value is FontScaleId {
  return typeof value === 'string' && (FONT_SCALE_IDS as string[]).includes(value)
}

export function isFeedDensityId(value: unknown): value is FeedDensityId {
  return typeof value === 'string' && (FEED_DENSITY_IDS as string[]).includes(value)
}

/** Inline-скрипт для <head>: применяет тему из localStorage до первой отрисовки */
export const APPEARANCE_BOOTSTRAP_SCRIPT = `(function(){try{var k='${APPEARANCE_STORAGE_KEY}';var r=document.documentElement;var raw=localStorage.getItem(k);var s=raw?JSON.parse(raw):{};var t=['x-black','apple-light','dim'].indexOf(s.theme)>-1?s.theme:'${DEFAULT_THEME}';var a=s.accent||'${DEFAULT_ACCENT}';var f=['compact','regular','large','xlarge'].indexOf(s.fontScale)>-1?s.fontScale:'${DEFAULT_FONT_SCALE}';var d=['cozy','comfortable','compact'].indexOf(s.feedDensity)>-1?s.feedDensity:'${DEFAULT_FEED_DENSITY}';r.setAttribute('data-theme',t);if(typeof a==='string'&&a.charAt(0)==='#'){r.setAttribute('data-accent','custom');r.style.setProperty('--accent',a);}else{r.setAttribute('data-accent',a);}r.setAttribute('data-font-scale',f);r.setAttribute('data-density',d);r.style.colorScheme=(t==='apple-light')?'light':'dark';}catch(e){}})();`

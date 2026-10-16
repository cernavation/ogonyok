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
  { id: 'flame', label: 'Огонёк', color: '#ff6b35', strong: '#e8562a', soft: 'rgba(255,107,53,0.14)' },
  { id: 'blue', label: 'Небесный', color: '#1d9bf0', strong: '#1a8cd8', soft: 'rgba(29,155,240,0.14)' },
  { id: 'violet', label: 'Аметист', color: '#8b5cf6', strong: '#7c3aed', soft: 'rgba(139,92,246,0.16)' },
  { id: 'emerald', label: 'Изумруд', color: '#12b886', strong: '#0ca678', soft: 'rgba(18,184,134,0.16)' },
  { id: 'rose', label: 'Роза', color: '#f91880', strong: '#db0e6f', soft: 'rgba(249,24,128,0.16)' },
  { id: 'gold', label: 'Золото', color: '#f5b942', strong: '#e0a52f', soft: 'rgba(245,185,66,0.16)' },
]

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

/** Применяет оформление к <html> через data-атрибуты (мгновенно, без перезагрузки) */
export function applyAppearanceToDocument(settings: AppearanceSettings, doc?: Document): void {
  if (typeof document === 'undefined' && !doc) return
  const root = (doc ?? document).documentElement
  root.setAttribute('data-theme', settings.theme)
  root.setAttribute('data-accent', settings.accent)
  root.setAttribute('data-font-scale', settings.fontScale)
  root.setAttribute('data-density', settings.feedDensity)
  // Подсказываем браузеру схему — от неё зависят нативные скроллбары, формы и т.п.
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
  return typeof value === 'string' && (ACCENT_IDS as string[]).includes(value)
}

export function isFontScaleId(value: unknown): value is FontScaleId {
  return typeof value === 'string' && (FONT_SCALE_IDS as string[]).includes(value)
}

export function isFeedDensityId(value: unknown): value is FeedDensityId {
  return typeof value === 'string' && (FEED_DENSITY_IDS as string[]).includes(value)
}

/** Inline-скрипт для <head>: применяет тему из localStorage до первой отрисовки */
export const APPEARANCE_BOOTSTRAP_SCRIPT = `(function(){try{var k='${APPEARANCE_STORAGE_KEY}';var r=document.documentElement;var raw=localStorage.getItem(k);var s=raw?JSON.parse(raw):{};var t=['x-black','apple-light','dim'].indexOf(s.theme)>-1?s.theme:'${DEFAULT_THEME}';var a=['flame','blue','violet','emerald','rose','gold'].indexOf(s.accent)>-1?s.accent:'${DEFAULT_ACCENT}';var f=['compact','regular','large','xlarge'].indexOf(s.fontScale)>-1?s.fontScale:'${DEFAULT_FONT_SCALE}';var d=['cozy','comfortable','compact'].indexOf(s.feedDensity)>-1?s.feedDensity:'${DEFAULT_FEED_DENSITY}';r.setAttribute('data-theme',t);r.setAttribute('data-accent',a);r.setAttribute('data-font-scale',f);r.setAttribute('data-density',d);r.style.colorScheme=(t==='apple-light')?'light':'dark';}catch(e){}})();`

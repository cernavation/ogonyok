/**
 * ЭТАП 8 — ШЕРИНГ СТОРИС «КУДА УГОДНО».
 *
 * Даёт просмотрщику сторис всё, чтобы историей можно было поделиться:
 *  - готовый текст (для Telegram / X / буфера обмена);
 *  - deep-link «поделиться в Telegram»;
 *  - вертикальную карточку 9:16 (1080×1920) в SVG;
 *  - экспорт карточки в PNG и скачивание файла.
 */

import { downloadBlob } from './card-export'
import type { StoryDayDigest, StoryPhoto } from './story-digest'
import type { StorySlide } from './types'

function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Разбивает длинный текст на строки по словам (для SVG-карточки) */
function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = (text || '').trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxChars && current) {
      lines.push(current)
      current = word
      if (lines.length === maxLines) break
    } else {
      current = candidate
    }
  }
  if (lines.length < maxLines && current) lines.push(current)
  if (lines.length === 0) return ['']
  const last = lines[lines.length - 1]
  if (words.join(' ').length > lines.join(' ').length && last) {
    lines[lines.length - 1] = `${last.slice(0, Math.max(0, maxChars - 1))}…`
  }
  return lines.slice(0, maxLines)
}

export type StoryShareCardInput = {
  name: string
  username: string
  verified?: boolean
  initials?: string
  slide: StorySlide
  digest: StoryDayDigest
}

const CARD_W = 1080
const CARD_H = 1920

/** Шаблон текста для шаринга сторис в любую соцсеть */
export function buildStoryShareText(
  name: string,
  username: string,
  slide: StorySlide,
  digest?: StoryDayDigest | null
): string {
  const lines: string[] = [`${slide.emoji} ${slide.headline} — ${slide.detail}`]
  if (digest?.mainPride) lines.push(`💪 Главная гордость дня: ${digest.mainPride}`)
  if (digest?.streak) lines.push(`🔥 Серия: ${digest.streak} дней подряд`)
  if (digest?.city) lines.push(`📍 ${digest.city}`)
  lines.push('')
  lines.push(`Сторис ${name} (@${username}) · дневник гордости #Огонёк`)
  return lines.join('\n')
}

/** Deep-link для отправки сторис в Telegram */
export function buildTelegramShareUrl(text: string, url?: string): string {
  const params = new URLSearchParams()
  params.set('text', text)
  if (url) params.set('url', url)
  return `https://t.me/share/url?${params.toString()}`
}

/** Вертикальная карточка сторис 9:16 для скачивания */
export function generateStoryCardSvg(input: StoryShareCardInput): string {
  const { slide, digest } = input
  const headlineLines = wrapText(slide.headline, 16, 3)
  const detailLines = wrapText(slide.detail, 40, 2)
  const prideLines = wrapText(digest?.mainPride ?? '', 46, 2)

  const headlineSvg = headlineLines
    .map(
      (line, i) =>
        `<text x="72" y="${790 + i * 84}" fill="#ffffff" font-family="'Helvetica Neue', Arial, sans-serif" font-size="70" font-weight="800">${escapeXml(
          line
        )}</text>`
    )
    .join('')

  const detailSvg = detailLines
    .map(
      (line, i) =>
        `<text x="72" y="${1010 + i * 44}" fill="rgba(255,255,255,0.82)" font-family="'Helvetica Neue', Arial, sans-serif" font-size="32">${escapeXml(
          line
        )}</text>`
    )
    .join('')

  const prideSvg = prideLines
    .map(
      (line, i) =>
        `<text x="120" y="${1188 + i * 42}" fill="#ffffff" font-family="'Helvetica Neue', Arial, sans-serif" font-size="34" font-weight="600">${escapeXml(
          line
        )}</text>`
    )
    .join('')

  // Сетка 3×2 из градиентных плиток дня
  const tiles: StoryPhoto[] = [...(digest?.photos ?? [])]
  while (tiles.length < 6) {
    tiles.push({
      id: `filler-${tiles.length}`,
      emoji: '✨',
      caption: 'момент дня',
      gradient: 'linear-gradient(135deg, #2a1206 0%, #7a2f0c 100%)',
    })
  }

  const tileSize = 288
  const gap = 20
  const startX = (CARD_W - (tileSize * 3 + gap * 2)) / 2
  const startY = 1290
  const gridSvg = tiles
    .slice(0, 6)
    .map((tile, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = startX + col * (tileSize + gap)
      const y = startY + row * (tileSize + gap)
      return `
        <g transform="translate(${x}, ${y})">
          <rect width="${tileSize}" height="${tileSize}" rx="28" fill="url(#tile${i})" stroke="rgba(255,255,255,0.16)" stroke-width="2" />
          <text x="${tileSize / 2}" y="${tileSize / 2 + 24}" text-anchor="middle" font-size="96">${escapeXml(
            tile.emoji
          )}</text>
        </g>`
    })
    .join('')

  const tileDefs = tiles
    .slice(0, 6)
    .map((tile, i) => {
      const [from, to] = gradientStops(tile.gradient)
      return `<linearGradient id="tile${i}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${from}" />
        <stop offset="100%" stop-color="${to}" />
      </linearGradient>`
    })
    .join('')

  const initials = (input.initials || input.name || 'О')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'О'

  const verifiedBadge = input.verified
    ? `<circle cx="470" cy="262" r="16" fill="#1d9bf0" />
       <text x="470" y="269" text-anchor="middle" fill="#ffffff" font-size="20" font-weight="900">✓</text>`
    : ''

  const statLine = digest
    ? `🔥 ${digest.streak} дней · 💪 ${digest.mainPrideScale}/10 · 📍 ${digest.city || 'путь силы'}`
    : ''

  return `
<svg width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${slide.from}" />
      <stop offset="100%" stop-color="${slide.to}" />
    </linearGradient>
    <radialGradient id="glow" cx="78%" cy="8%" r="62%">
      <stop offset="0%" stop-color="${slide.accent}" stop-opacity="0.55" />
      <stop offset="100%" stop-color="${slide.accent}" stop-opacity="0" />
    </radialGradient>
    ${tileDefs}
  </defs>

  <rect width="${CARD_W}" height="${CARD_H}" fill="url(#bg)" />
  <rect width="${CARD_W}" height="${CARD_H}" fill="url(#glow)" />

  <!-- Бренд -->
  <g transform="translate(72, 96)">
    <path d="M16 0L20 12L32 16L20 20L16 32L12 20L0 16L12 12Z" fill="#ff8a3d" />
    <text x="46" y="25" fill="#ff8a3d" font-family="'Helvetica Neue', Arial, sans-serif" font-size="26" font-weight="800" letter-spacing="2">ОГОНЁК</text>
    <text x="190" y="25" fill="rgba(255,255,255,0.6)" font-family="'Helvetica Neue', Arial, sans-serif" font-size="22">· дневник силы</text>
  </g>

  <!-- Автор -->
  <g transform="translate(72, 216)">
    <circle cx="50" cy="50" r="50" fill="${slide.accent}" />
    <text x="50" y="66" text-anchor="middle" fill="#0b0b0b" font-family="'Helvetica Neue', Arial, sans-serif" font-size="38" font-weight="900">${escapeXml(
      initials
    )}</text>
    <text x="128" y="42" fill="#ffffff" font-family="'Helvetica Neue', Arial, sans-serif" font-size="38" font-weight="800">${escapeXml(
      input.name
    )}</text>
    <text x="128" y="80" fill="rgba(255,255,255,0.65)" font-family="'Helvetica Neue', Arial, sans-serif" font-size="26">@${escapeXml(
      input.username
    )} · ${escapeXml(digest?.dateLabel ?? 'сегодня')}</text>
    <g transform="translate(322, -8)">${verifiedBadge}</g>
  </g>

  <!-- Кадр -->
  <text x="72" y="470" fill="${slide.accent}" font-family="'Helvetica Neue', Arial, sans-serif" font-size="26" font-weight="900" letter-spacing="6">${escapeXml(
    slide.kicker
  )}</text>
  <text x="70" y="650" font-size="150">${escapeXml(slide.emoji)}</text>
  ${headlineSvg}
  ${detailSvg}

  <!-- Главная гордость дня -->
  <g transform="translate(72, 1100)">
    <rect width="${CARD_W - 144}" height="130" rx="26" fill="rgba(0,0,0,0.32)" stroke="${slide.accent}" stroke-width="2" />
    <text x="48" y="50" fill="${slide.accent}" font-family="'Helvetica Neue', Arial, sans-serif" font-size="22" font-weight="800" letter-spacing="2">💪 ГЛАВНАЯ ГОРДОСТЬ ДНЯ</text>
  </g>
  ${prideSvg}

  <!-- Фото-сетка дня -->
  ${gridSvg}

  <!-- Футер -->
  <text x="72" y="${CARD_H - 42}" fill="rgba(255,255,255,0.6)" font-family="'Helvetica Neue', Arial, sans-serif" font-size="24">${escapeXml(
    statLine
  )}</text>
  <text x="${CARD_W - 72}" y="${CARD_H - 42}" text-anchor="end" fill="rgba(255,255,255,0.85)" font-family="'Helvetica Neue', Arial, sans-serif" font-size="24" font-weight="700">#Огонёк</text>
</svg>`.trim()
}

/** Превращает CSS-градиент вида `linear-gradient(135deg, #a, #b)` в пару цветов */
function gradientStops(gradient: string): [string, string] {
  const hexes = gradient.match(/#[0-9a-fA-F]{3,8}/g)
  if (hexes && hexes.length >= 2) return [hexes[0], hexes[hexes.length - 1]]
  return ['#2a1206', '#7a2f0c']
}

function slugify(input: string): string {
  return (
    (input || 'ogonek')
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'ogonek'
  )
}

/** Рендерит SVG-карточку сторис в PNG-блоб */
export async function exportStoryCardAsPng(input: StoryShareCardInput): Promise<Blob> {
  const svgString = generateStoryCardSvg(input)
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  return new Promise<Blob>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = CARD_W
        canvas.height = CARD_H
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(url)
          reject(new Error('Canvas 2D context not available'))
          return
        }
        ctx.drawImage(img, 0, 0, CARD_W, CARD_H)
        URL.revokeObjectURL(url)
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to create PNG blob from canvas'))
        }, 'image/png')
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to render story card SVG'))
    }
    img.src = url
  })
}

/** Собирает PNG-карточку сторис и скачивает её файлом */
export async function downloadStoryCard(input: StoryShareCardInput): Promise<void> {
  const blob = await exportStoryCardAsPng(input)
  downloadBlob(blob, `ogonek-story-${slugify(input.name)}.png`)
}

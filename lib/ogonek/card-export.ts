import type { Day } from './types'

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function formatDayAsText(day: Day): string {
  const dateStr = day.dateISO ? new Date(day.dateISO).toLocaleDateString('ru-RU') : 'Сегодня'
  const lines: string[] = [
    `✦ Огонёк · День #${day.id} (${dateStr})`,
    '',
    '🔥 Гордости:',
  ]

  day.prides.forEach((p, idx) => {
    lines.push(`${idx + 1}. ${p.text} (сила ${p.scale}/10)`)
  })

  if (day.gratitudes.length > 0) {
    lines.push('')
    lines.push('❤️ Благодарности:')
    day.gratitudes.forEach((g, idx) => {
      lines.push(`${idx + 1}. ${g}`)
    })
  }

  lines.push('')
  lines.push('— Дневник осознанности @cernavation')
  return lines.join('\n')
}

export function generateDayCardSvg(day: Day): string {
  const width = 800
  const dateStr = day.dateISO
    ? new Date(day.dateISO).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Запись дня'

  // Pre-calculate heights
  const prideLines: string[] = []
  day.prides.slice(0, 5).forEach((p, i) => {
    prideLines.push(`${i + 1}. ${p.text}`)
  })

  const gratLines: string[] = []
  day.gratitudes.slice(0, 3).forEach((g, i) => {
    gratLines.push(`${i + 1}. ${g}`)
  })

  const estimatedHeight = 320 + prideLines.length * 44 + gratLines.length * 38
  const height = Math.max(600, estimatedHeight)

  let y = 140

  const prideItemsSvg = prideLines
    .map((line) => {
      const currentY = y
      y += 42
      return `
        <g transform="translate(48, ${currentY})">
          <circle cx="6" cy="-6" r="3" fill="#ff6b35" />
          <text x="20" y="0" fill="#e7e9ea" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="18" font-weight="400">
            ${escapeXml(line.slice(0, 75))}
          </text>
        </g>
      `
    })
    .join('')

  y += 20
  const gratHeaderY = y
  y += 36

  const gratItemsSvg = gratLines
    .map((line) => {
      const currentY = y
      y += 40
      return `
        <g transform="translate(48, ${currentY})">
          <circle cx="6" cy="-6" r="3" fill="#f91880" />
          <text x="20" y="0" fill="#e7e9ea" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="17" font-weight="400">
            ${escapeXml(line.slice(0, 75))}
          </text>
        </g>
      `
    })
    .join('')

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width}" ${height} fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#000000" />
      <stop offset="100%" stop-color="#0f1419" />
    </linearGradient>
    <linearGradient id="flameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff6b35" />
      <stop offset="100%" stop-color="#ffa600" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" rx="24" fill="url(#cardGrad)" stroke="#2f3336" stroke-width="2" />

  <!-- Brand / Header -->
  <g transform="translate(48, 56)">
    <!-- Spark icon -->
    <path d="M14 0L17.5 10.5L28 14L17.5 17.5L14 28L10.5 17.5L0 14L10.5 10.5L14 0Z" fill="url(#flameGrad)" />
    <text x="38" y="20" fill="#ff6b35" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="1">ОГОНЁК</text>
    <text x="145" y="20" fill="#71767b" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="16">· Дневник силы</text>
  </g>

  <!-- Day Badge & Date -->
  <g transform="translate(48, 105)">
    <text x="0" y="0" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="26" font-weight="800">
      День #${day.id}
    </text>
    <text x="130" y="-2" fill="#71767b" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="16">
      ${escapeXml(dateStr)}
    </text>
  </g>

  <!-- Prides Section -->
  ${prideItemsSvg}

  <!-- Gratitudes Header (if present) -->
  ${
    gratLines.length > 0
      ? `
    <g transform="translate(48, ${gratHeaderY})">
      <text x="0" y="0" fill="#f91880" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="700" letter-spacing="0.5">
        БЛАГОДАРНОСТИ
      </text>
    </g>
    ${gratItemsSvg}
  `
      : ''
  }

  <!-- Footer -->
  <g transform="translate(48, ${height - 40})">
    <line x1="0" y1="-16" x2="${width - 96}" y2="-16" stroke="#2f3336" stroke-width="1" />
    <text x="0" y="4" fill="#71767b" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14">
      719 дней осознанности
    </text>
    <text x="${width - 96}" y="4" fill="#e7e9ea" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="600">
      @cernavation
    </text>
  </g>
</svg>
`.trim()
}

export async function exportDayCardAsPng(day: Day): Promise<Blob> {
  const svgString = generateDayCardSvg(day)
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  return new Promise<Blob>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const scale = 2 // 2x high-DPI retina crispness
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas 2D context not available'))
          return
        }
        ctx.scale(scale, scale)
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create PNG blob from canvas'))
          }
        }, 'image/png')
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(new Error(`Failed to load SVG into image: ${String(e)}`))
    }
    img.src = url
  })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

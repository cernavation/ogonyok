import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ICONS_DIR = path.join(process.cwd(), 'public', 'icons')
fs.mkdirSync(ICONS_DIR, { recursive: true })

function createFlameSvg(size, isMaskable = false) {
  const padding = isMaskable ? size * 0.2 : size * 0.12
  const flameSize = size - padding * 2

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${isMaskable ? 0 : Math.round(size * 0.22)}" fill="#000000" />
  <defs>
    <linearGradient id="flameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffb703" />
      <stop offset="40%" stop-color="#ff6b35" />
      <stop offset="100%" stop-color="#d90429" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${size * 0.04}" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Centered glowing flame graphic -->
  <g transform="translate(${padding}, ${padding}) scale(${flameSize / 24})" filter="url(#glow)">
    <path d="M12 2C10.5 4.5 10 6 8.5 8C7 10 5 12 5 15C5 18.866 8.13401 22 12 22C15.866 22 19 18.866 19 15C19 12 17 9.5 15 8C15 10 14 11 13 12C12.5 10.5 13 8 13.5 6C13.8 4.5 13 3 12 2Z" fill="url(#flameGrad)" />
    <!-- Inner core -->
    <path d="M12 14C11 15 10.5 16 10.5 17C10.5 17.8284 11.1716 18.5 12 18.5C12.8284 18.5 13.5 17.8284 13.5 17C13.5 16 13 15 12 14Z" fill="#ffffff" />
  </g>
</svg>
`.trim()
}

async function generate() {
  console.log('🔥 Generating PWA icons...')

  // 1. Generate SVGs
  const svg192 = createFlameSvg(192, false)
  const svg512 = createFlameSvg(512, false)
  const svgMaskable = createFlameSvg(512, true)

  fs.writeFileSync(path.join(ICONS_DIR, 'icon-192.svg'), svg192, 'utf8')
  fs.writeFileSync(path.join(ICONS_DIR, 'icon-512.svg'), svg512, 'utf8')
  fs.writeFileSync(path.join(ICONS_DIR, 'icon-maskable.svg'), svgMaskable, 'utf8')

  // 2. Generate PNGs with sharp
  await sharp(Buffer.from(svg192)).png().toFile(path.join(ICONS_DIR, 'icon-192.png'))
  await sharp(Buffer.from(svg512)).png().toFile(path.join(ICONS_DIR, 'icon-512.png'))
  await sharp(Buffer.from(svgMaskable)).png().toFile(path.join(ICONS_DIR, 'icon-maskable.png'))
  await sharp(Buffer.from(svg192)).png().toFile(path.join(process.cwd(), 'public', 'apple-icon.png'))

  console.log('✅ All PWA icons generated successfully in public/icons/!')
}

generate().catch(console.error)

import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

async function generateOgImage() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  })

  const page = await context.newPage()

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px;
    height: 630px;
    background: #000000;
    color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 72px 80px;
    position: relative;
    overflow: hidden;
  }
  .glow-1 {
    position: absolute;
    width: 600px;
    height: 600px;
    top: -150px;
    right: -100px;
    background: radial-gradient(circle, rgba(255, 92, 0, 0.28) 0%, rgba(255, 92, 0, 0) 70%);
    pointer-events: none;
  }
  .glow-2 {
    position: absolute;
    width: 500px;
    height: 500px;
    bottom: -150px;
    left: -100px;
    background: radial-gradient(circle, rgba(255, 122, 24, 0.15) 0%, rgba(255, 92, 0, 0) 70%);
    pointer-events: none;
  }
  .grid-pattern {
    position: absolute;
    inset: 0;
    background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 16px;
    z-index: 10;
  }
  .logo-box {
    width: 56px;
    height: 56px;
    border-radius: 18px;
    background: linear-gradient(135deg, #FF5C00, #FF8A00);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    box-shadow: 0 8px 30px rgba(255, 92, 0, 0.4);
  }
  .brand-name {
    font-size: 32px;
    font-weight: 900;
    letter-spacing: -0.03em;
  }
  .badge {
    margin-left: 12px;
    padding: 6px 14px;
    border-radius: 9999px;
    background: rgba(255, 92, 0, 0.12);
    border: 1px solid rgba(255, 92, 0, 0.3);
    color: #FF5C00;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .content {
    z-index: 10;
    max-width: 950px;
  }
  .title {
    font-size: 58px;
    font-weight: 900;
    line-height: 1.08;
    letter-spacing: -0.04em;
    margin-bottom: 20px;
  }
  .title span {
    background: linear-gradient(90deg, #FF5C00 0%, #FF8A00 50%, #FFB800 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .subtitle {
    font-size: 24px;
    color: #a1a1aa;
    line-height: 1.4;
    font-weight: 400;
    max-width: 820px;
  }
  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 10;
    padding-top: 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .pills {
    display: flex;
    gap: 24px;
    font-size: 16px;
    font-weight: 600;
    color: #71717a;
  }
  .pill-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .pill-item span.dot {
    color: #FF5C00;
  }
  .url {
    font-size: 18px;
    font-weight: 700;
    color: #e4e4e7;
    letter-spacing: -0.01em;
  }
</style>
</head>
<body>
  <div class="grid-pattern"></div>
  <div class="glow-1"></div>
  <div class="glow-2"></div>

  <div class="header">
    <div class="logo-box">✦</div>
    <div class="brand-name">Огонёк</div>
    <div class="badge">🔥 Стрик никогда не сгорает</div>
  </div>

  <div class="content">
    <h1 class="title">Твой личный дневник силы.<br><span>Без фальши и токсичности.</span></h1>
    <p class="subtitle">Пиши по 1–5 побед и благодарностей в день. Стрик = количество закрытых дней. 700 дней несокрушимой веры в себя.</p>
  </div>

  <div class="footer">
    <div class="pills">
      <div class="pill-item"><span class="dot">✦</span> Дневник побед</div>
      <div class="pill-item"><span class="dot">✦</span> Evidence Vault</div>
      <div class="pill-item"><span class="dot">✦</span> Мессенджер соратников</div>
      <div class="pill-item"><span class="dot">✦</span> Офлайн PWA</div>
    </div>
    <div class="url">ogonek.app</div>
  </div>
</body>
</html>`

  await page.setContent(html, { waitUntil: 'networkidle' })
  const outPath = path.resolve('public/og-image.png')
  await page.screenshot({ path: outPath })
  await browser.close()
  console.log(`✅ OG image created at ${outPath} (1200x630)`)
}

generateOgImage().catch(console.error)

import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

// ── 5 устройств / разрешений экрана ───────────────────────────────────────────
export const VIEWPORTS = {
  'desktop': { name: 'desktop', label: 'Desktop Widescreen', width: 1920, height: 1080 },
  'laptop': { name: 'laptop', label: 'Laptop', width: 1280, height: 800 },
  'tablet-portrait': { name: 'tablet-portrait', label: 'Tablet Portrait', width: 768, height: 1024 },
  'tablet-landscape': { name: 'tablet-landscape', label: 'Tablet Landscape', width: 1024, height: 768 },
  'mobile': { name: 'mobile', label: 'Mobile Phone (iPhone 14)', width: 390, height: 844 },
};

// ── 3 темы оформления ─────────────────────────────────────────────────────────
export const THEMES = {
  'dark': { id: 'x-black', code: 'dark', label: 'Тёмная (Dark / X Black)' },
  'light': { id: 'apple-light', code: 'light', label: 'Светлая (Light / Apple Light)' },
  'dim': { id: 'dim', code: 'dim', label: 'Сумеречная (Dim)' },
};

// ── 7 экранов приложения ──────────────────────────────────────────────────────
export const SCREENS = {
  'home': { id: 'home', label: 'Главная', path: '/?view=home' },
  'explore': { id: 'explore', label: 'Поиск', path: '/?view=explore' },
  'profile': { id: 'profile', label: 'Профиль', path: '/?view=profile' },
  'messages': { id: 'messages', label: 'Чаты', path: '/?view=messages' },
  'settings': { id: 'settings', label: 'Настройки', path: '/?view=settings' },
  'premium': { id: 'premium', label: 'Премиум', path: '/?view=premium' },
  'leaderboard': { id: 'leaderboard', label: 'Рейтинг', path: '/?view=leaderboard' },
};

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function parseArgs() {
  const args = process.argv.slice(2);
  let selectedScreens = Object.keys(SCREENS);
  let selectedThemes = Object.keys(THEMES);
  let selectedViewports = Object.keys(VIEWPORTS);

  if (args.length > 0 && args[0].startsWith('http')) {
    return {
      legacy: true,
      url: args[0],
      name: args[1] || 'screen',
    };
  }

  for (const arg of args) {
    if (arg.startsWith('--screen=')) {
      const val = arg.split('=')[1];
      selectedScreens = val === 'all' ? Object.keys(SCREENS) : val.split(',').filter(s => SCREENS[s]);
    } else if (arg.startsWith('--theme=')) {
      const val = arg.split('=')[1];
      selectedThemes = val === 'all' ? Object.keys(THEMES) : val.split(',').filter(t => THEMES[t]);
    } else if (arg.startsWith('--viewport=')) {
      const val = arg.split('=')[1];
      selectedViewports = val === 'all' ? Object.keys(VIEWPORTS) : val.split(',').filter(v => VIEWPORTS[v]);
    } else if (SCREENS[arg]) {
      selectedScreens = [arg];
    } else if (THEMES[arg]) {
      selectedThemes = [arg];
    } else if (VIEWPORTS[arg]) {
      selectedViewports = [arg];
    }
  }

  return {
    legacy: false,
    screens: selectedScreens,
    themes: selectedThemes,
    viewports: selectedViewports,
  };
}

(async () => {
  const parsed = parseArgs();
  const outDir = path.resolve('.vision');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    browser = await chromium.launch({ headless: true });
  }

  if (parsed.legacy) {
    const context = await browser.newContext();
    const pageDesk = await context.newPage();
    await pageDesk.setViewportSize({ width: 1280, height: 800 });
    await pageDesk.goto(parsed.url, { waitUntil: 'domcontentloaded' });
    await pageDesk.waitForTimeout(600);
    await pageDesk.screenshot({ path: path.join(outDir, `${parsed.name}-desktop.png`) });
    await pageDesk.close();

    const pageMob = await context.newPage();
    await pageMob.setViewportSize({ width: 390, height: 844 });
    await pageMob.goto(parsed.url, { waitUntil: 'domcontentloaded' });
    await pageMob.waitForTimeout(600);
    await pageMob.screenshot({ path: path.join(outDir, `${parsed.name}-mobile.png`) });
    await pageMob.close();

    await browser.close();
    console.log(`📸 Скриншоты сохранены в .vision/${parsed.name}-desktop.png и mobile.png`);
    return;
  }

  console.log(`🚀 Запуск Playwright Visual Regression Suite:`);
  console.log(`   Экраны (${parsed.screens.length}): ${parsed.screens.join(', ')}`);
  console.log(`   Темы (${parsed.themes.length}): ${parsed.themes.join(', ')}`);
  console.log(`   Устройства (${parsed.viewports.length}): ${parsed.viewports.join(', ')}`);
  console.log(`   Всего скриншотов: ${parsed.screens.length * parsed.themes.length * parsed.viewports.length}`);

  let totalDone = 0;

  for (const themeKey of parsed.themes) {
    const themeDef = THEMES[themeKey];
    
    // Создаем изолированный контекст с внедрённой авторизацией и темой
    const context = await browser.newContext();
    await context.addInitScript(({ themeId }) => {
      try {
        localStorage.setItem('ogonek.appearance.v1', JSON.stringify({
          theme: themeId,
          accent: 'flame',
          fontScale: 'regular',
          feedDensity: 'cozy'
        }));
        
        const now = new Date().toISOString();
        const demoAccount = {
          id: 'acc-owner',
          provider: 'local',
          snapshot: {
            displayName: 'Александр Черняк',
            username: 'alex_cerna',
            bio: 'Создатель и архитектор Огонька. Дневник побед и личной силы.',
            city: 'Кишинёв',
            avatarColor: '#ff6b35',
            avatarImage: '/author-avatar.png',
            bannerImage: null,
            bannerPreset: 'ember',
            verified: true,
          },
          createdAtISO: now,
          lastActiveISO: now,
          signInCount: 1,
          isGuest: false,
        };

        const store = {
          schemaVersion: 3,
          isDemo: true,
          theme: themeId,
          accent: 'flame',
          fontScale: 'regular',
          feedDensity: 'cozy',
          auth: {
            accounts: [demoAccount],
            activeAccountId: 'acc-owner',
            signedIn: true,
            hasOnboarded: true,
            switchCount: 0,
            signInCount: 1,
            failedAttempts: 0,
            lockedUntilISO: null,
            lastAuthAtISO: now,
            updatedAtISO: now,
          },
          profile: {
            displayName: 'Александр Черняк',
            username: 'alex_cerna',
            bio: 'Создатель и архитектор Огонька. Дневник побед и личной силы.',
            city: 'Кишинёв',
            avatarColor: '#ff6b35',
            avatarImage: '/author-avatar.png',
            bannerPreset: 'ember',
            verified: true,
            subscription_tier: 'premium',
          },
          days: [
            {
              id: 720,
              dateISO: now,
              title: 'Автономный цикл Playwright Visual Regression',
              prides: [
                { id: 'p1', text: '100% пиксель-перфект по всем 15 viewport+theme комбинациям', scale: 10, overcome: 3 },
                { id: 'p2', text: 'Исправлена геометрия иконки домика (арочный дверной проем)', scale: 9, overcome: 2 }
              ],
              gratitudes: [{ id: 'g1', text: 'За чистую архитектуру компонентов и дизайн-систему' }],
              status: 'completed',
              streakCount: 720
            },
            {
              id: 719,
              dateISO: new Date(Date.now() - 86400000).toISOString(),
              title: 'Полировка контрастности светлой и сумеречной темы',
              prides: [
                { id: 'p3', text: 'Проведен аудит WCAG контраста текста и виджетов', scale: 9, overcome: 1 }
              ],
              gratitudes: [{ id: 'g2', text: 'Команде тестирования' }],
              status: 'completed',
              streakCount: 719
            }
          ]
        };
        localStorage.setItem('ogonek.v2', JSON.stringify(store));
        document.documentElement.setAttribute('data-theme', themeId);
      } catch (e) {}
    }, { themeId: themeDef.id });

    for (const vpKey of parsed.viewports) {
      const vp = VIEWPORTS[vpKey];
      const page = await context.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.emulateMedia({ reducedMotion: 'reduce' });

      for (const screenKey of parsed.screens) {
        const screen = SCREENS[screenKey];
        const targetUrl = `${BASE_URL}${screen.path}`;
        const fileName = `${screenKey}-${themeKey}-${vpKey}.png`;
        const filePath = path.join(outDir, fileName);

        try {
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('.app-shell, .fullscreen-messenger, .msgr, [role="main"], .view', { timeout: 3500 }).catch(() => {});
          await page.waitForTimeout(400);

          await page.evaluate((themeId) => {
            if (document.documentElement.getAttribute('data-theme') !== themeId) {
              document.documentElement.setAttribute('data-theme', themeId);
            }
            if (document.body && document.body.getAttribute('data-theme') !== themeId) {
              document.body.setAttribute('data-theme', themeId);
            }
          }, themeDef.id);

          await page.screenshot({ path: filePath, fullPage: false });
          totalDone++;
          process.stdout.write(`  [${totalDone}] ✓ ${fileName}\n`);
        } catch (err) {
          console.error(`  ✗ Ошибка при захвате ${fileName}:`, err.message);
        }
      }
      await page.close();
    }
    await context.close();
  }

  await browser.close();
  console.log(`\n🎉 Аудит успешно завершён! Сохранено ${totalDone} скриншотов в папку .vision/`);
})();

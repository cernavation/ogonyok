# ОТЧЁТ О РАЗМЕРАХ БАНДЛА И ДИНАМИЧЕСКИХ ИМПОРТАХ (STAGE 16)

- **Дата**: 2026-11-10T08:35:00Z
- **Фреймворк**: Next.js 16.4.0 (Webpack production build)
- **Целевой норматив**: Initial JS главной страницы $\le 250$ КБ gzip
- **Фактический результат**: **130.7 КБ gzip** (441.2 КБ raw) — **НОРМАТИВ ВЫПОЛНЕН С ЗАПАСОМ 47.7%**

---

## 1. Первичные чанки для маршрута `/` (Главная лента)

| Файл чанка | Размер (Raw) | Размер (Gzip) | Описание |
|---|:---:|:---:|---|
| `static/chunks/webpack-114d05583ddec4d1.js` | 4.4 KB | **2.4 KB** | Webpack runtime & module bootstrap |
| `static/chunks/4bd1b696-8cd12253b448cc13.js` | 199.0 KB | **62.6 KB** | React 19 core, Next.js routing runtime |
| `static/chunks/3794-ba54cbd6a46cf18d.js` | 237.3 KB | **65.5 KB** | Базовые UI-компоненты (AppShell, HomeView, DayCard) |
| `static/chunks/main-app-740763fc6d400813.js` | 0.5 KB | **0.2 KB** | App router entrypoint |
| **ИТОГО ДЛЯ ГЛАВНОЙ** | **441.2 KB** | **130.7 KB** | **ЗЕЛЕНАЯ ЗОНА (< 250 KB)** |

---

## 2. Модули, вынесенные в динамические импорты (`next/dynamic` с `ssr: false`)

Следующие тяжёлые модули изолированы и загружаются строго по требованию (on-demand), не утяжеляя первичный экран:
1. `AnalyticsView` (графики активности, аналитика стриков)
2. `MessagesView` (список тредов, мессенджер)
3. `SettingsView` (10 разделов настроек, сессии, ПИН)
4. `VaultView` (Сейф доказательств)
5. `LeaderboardView` (таблица лидеров)
6. `PremiumView` (тарифная витрина, матрица цен)
7. `GuestLanding` (лендинг для неавторизованных)
8. `FullscreenMessenger` (полноэкранный режим чата)
9. `Composer` (модальное окно написания дня)
10. `ChatCallModal` (WebRTC видео/аудио звонки)
11. `ChatGifModal` (пагинация Giphy)
12. `ChatPollCreatorModal` (опросы)
13. `ChatScheduleModal` (отложенные сообщения)
14. `MilestoneModal` (церемония юбилея)
15. `UpgradeModal` (апселлы)

---

## 3. Аудит зависимостей (`depcheck`)

- Проверка `npx depcheck` выявила неиспользуемый пакет `@google/genai` (удален из `package.json`).
- Пакет `tw-animate-css` подтвержден как используемый (`app/globals.css:3`).

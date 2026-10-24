# Отчёт базового аудита интерфейса (BASELINE)

> **Дата замера:** 2026-10-24T07:37:14.294Z  
> **Режим:** Быстрый (--fast, десктоп x-black)  
> **Длительность выполнения:** 28.3 сек  
> **Всего проверено экранов и состояний:** 16  

---

## 1. Сводная статистика проблем

| Категория проверки | Количество дефектов | Серьёзность |
| :--- | :---: | :--- |
| **Огромные hover-подсветки (> 12% экрана)** | 0 | 🔴 Critical |
| **Карточки в карточках (вложенность ≥ 2)** | 0 | 🔴 Critical |
| **Налезающие кнопки (Overlap)** | 0 | 🔴 Critical |
| **Горизонтальный скролл** | 0 | 🔴 Critical |
| **Ошибки в консоли браузера** | 0 | 🔴 Critical |
| **Слипшиеся кнопки (зазор < 6px)** | 0 | 🟡 Warning |
| **Мелкий шрифт (< 13px)** | 0 | 🟡 Warning |
| **Низкий контраст (< 4.5:1 WCAG AA)** | 0 | 🟡 Warning |
| **Малые зоны нажатия (< 32px / 40px)** | 0 | 🟡 Warning |
| **Обрезанный текст (overflow without ellipsis)** | 0 | 🟡 Warning |
| **Warning'и в консоли браузера** | 0 | 🟡 Warning |
| **ИТОГО ДЕФЕКТОВ** | **0** | **(Критичных: 0, Предупреждений: 0)** |

---

## 2. ТОП-10 самых грубых дефектов

🎉 Замечаний не обнаружено!

---

## 3. Детализация по экранам и скриншотам

| Экран / Состояние | Окружение | Тема | Дефектов | Скриншот |
| :--- | :--- | :--- | :---: | :--- |
| **Главная** | desktop | x-black | 0 | [`desktop-x-black-home.png`](./desktop-x-black-home.png) |
| **Поиск** | desktop | x-black | 0 | [`desktop-x-black-explore.png`](./desktop-x-black-explore.png) |
| **Чаты** | desktop | x-black | 0 | [`desktop-x-black-messages.png`](./desktop-x-black-messages.png) |
| **Evidence Vault** | desktop | x-black | 0 | [`desktop-x-black-vault.png`](./desktop-x-black-vault.png) |
| **Статистика** | desktop | x-black | 0 | [`desktop-x-black-analytics.png`](./desktop-x-black-analytics.png) |
| **Рейтинг** | desktop | x-black | 0 | [`desktop-x-black-leaderboard.png`](./desktop-x-black-leaderboard.png) |
| **Профиль** | desktop | x-black | 0 | [`desktop-x-black-profile.png`](./desktop-x-black-profile.png) |
| **Настройки** | desktop | x-black | 0 | [`desktop-x-black-settings.png`](./desktop-x-black-settings.png) |
| **Намерения** | desktop | x-black | 0 | [`desktop-x-black-intentions.png`](./desktop-x-black-intentions.png) |
| **Открытое окно «Записать»** | desktop | x-black | 0 | [`desktop-x-black-state-composer.png`](./desktop-x-black-state-composer.png) |
| **Онбординг (гайд и выбор уровня)** | desktop | x-black | 0 | [`desktop-x-black-state-onboarding.png`](./desktop-x-black-state-onboarding.png) |
| **Окно регистрации аккаунта** | desktop | x-black | 0 | [`desktop-x-black-state-auth-register.png`](./desktop-x-black-state-auth-register.png) |
| **Просмотр сторис** | desktop | x-black | 0 | [`desktop-x-black-state-story-viewer.png`](./desktop-x-black-state-story-viewer.png) |
| **Открытый чат с сообщениями** | desktop | x-black | 0 | [`desktop-x-black-state-chat-open.png`](./desktop-x-black-state-chat-open.png) |
| **Открытое меню «⋯» у поста** | desktop | x-black | 0 | [`desktop-x-black-state-post-menu.png`](./desktop-x-black-state-post-menu.png) |
| **Развёрнутое поле «Утренний фокус»** | desktop | x-black | 0 | [`desktop-x-black-state-quick-focus-expanded.png`](./desktop-x-black-state-quick-focus-expanded.png) |

---

## 4. Как запустить повторный замер

```bash
# Быстрый аудит (десктоп, тёмная тема — для быстрой итерации)
npm run audit-ui:fast

# Полный аудит перед сдачей (все разрешения и темы)
npm run audit-ui
```

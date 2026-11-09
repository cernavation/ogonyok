# Отчёт базового аудита интерфейса (BASELINE)

> **Дата замера:** 2026-11-09T20:52:29.581Z  
> **Режим:** Полный (1440×900 + 390×844, Dark + Light)  
> **Длительность выполнения:** 143.6 сек  
> **Всего проверено экранов и состояний:** 96  

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
| **Низкий контраст (< 4.5:1 WCAG AA)** | 252 | 🟡 Warning |
| **Малые зоны нажатия (< 32px / 40px)** | 6 | 🟡 Warning |
| **Обрезанный текст (overflow without ellipsis)** | 0 | 🟡 Warning |
| **Warning'и в консоли браузера** | 6 | 🟡 Warning |
| **ИТОГО ДЕФЕКТОВ** | **264** | **(Критичных: 0, Предупреждений: 264)** |

---

## 2. ТОП-10 самых грубых дефектов

### 1. [🟡 ВНИМАНИЕ] Низкий контраст текста (3.88:1 < 4.5:1)
- **Экран/Состояние:** Главная (desktop / x-black)
- **Элемент/Селектор:** `label.text-[13px].font-bold.text-[var(--text-2)]`
- **Подробности:** Текст "Никнейм" цвета rgb(113, 118, 123) на фоне rgb(22,24,28) имеет контрастность 3.88:1 (норма ≥ 4.5:1)
- **Скриншот:** `ui-audit/desktop-x-black-home.png`

### 2. [🟡 ВНИМАНИЕ] Низкий контраст текста (3.88:1 < 4.5:1)
- **Экран/Состояние:** Главная (desktop / x-black)
- **Элемент/Селектор:** `span.absolute.left-3.5.text-[var(--text-3)]`
- **Подробности:** Текст "@" цвета rgb(113, 118, 123) на фоне rgb(22,24,28) имеет контрастность 3.88:1 (норма ≥ 4.5:1)
- **Скриншот:** `ui-audit/desktop-x-black-home.png`

### 3. [🟡 ВНИМАНИЕ] Низкий контраст текста (3.88:1 < 4.5:1)
- **Экран/Состояние:** Главная (desktop / x-black)
- **Элемент/Селектор:** `label.text-[13px].font-bold.text-[var(--text-2)]`
- **Подробности:** Текст "Пароль" цвета rgb(113, 118, 123) на фоне rgb(22,24,28) имеет контрастность 3.88:1 (норма ≥ 4.5:1)
- **Скриншот:** `ui-audit/desktop-x-black-home.png`

### 4. [🟡 ВНИМАНИЕ] Низкий контраст текста (3.88:1 < 4.5:1)
- **Экран/Состояние:** Поиск (desktop / x-black)
- **Элемент/Селектор:** `label.text-[13px].font-bold.text-[var(--text-2)]`
- **Подробности:** Текст "Никнейм" цвета rgb(113, 118, 123) на фоне rgb(22,24,28) имеет контрастность 3.88:1 (норма ≥ 4.5:1)
- **Скриншот:** `ui-audit/desktop-x-black-explore.png`

### 5. [🟡 ВНИМАНИЕ] Низкий контраст текста (3.88:1 < 4.5:1)
- **Экран/Состояние:** Поиск (desktop / x-black)
- **Элемент/Селектор:** `span.absolute.left-3.5.text-[var(--text-3)]`
- **Подробности:** Текст "@" цвета rgb(113, 118, 123) на фоне rgb(22,24,28) имеет контрастность 3.88:1 (норма ≥ 4.5:1)
- **Скриншот:** `ui-audit/desktop-x-black-explore.png`

### 6. [🟡 ВНИМАНИЕ] Низкий контраст текста (3.88:1 < 4.5:1)
- **Экран/Состояние:** Поиск (desktop / x-black)
- **Элемент/Селектор:** `label.text-[13px].font-bold.text-[var(--text-2)]`
- **Подробности:** Текст "Пароль" цвета rgb(113, 118, 123) на фоне rgb(22,24,28) имеет контрастность 3.88:1 (норма ≥ 4.5:1)
- **Скриншот:** `ui-audit/desktop-x-black-explore.png`

### 7. [🟡 ВНИМАНИЕ] Зона нажатия меньше 32px (136×31px)
- **Экран/Состояние:** Чаты (desktop / x-black)
- **Элемент/Селектор:** `button.flex.items-center.gap-1.5`
- **Подробности:** Кнопка <button.flex.items-center.gap-1.5> имеет габариты 136×31px (стандарт ≥ 32px)
- **Скриншот:** `ui-audit/desktop-x-black-messages.png`

### 8. [🟡 ВНИМАНИЕ] Низкий контраст текста (3.88:1 < 4.5:1)
- **Экран/Состояние:** Evidence Vault (desktop / x-black)
- **Элемент/Селектор:** `label.text-[13px].font-bold.text-[var(--text-2)]`
- **Подробности:** Текст "Никнейм" цвета rgb(113, 118, 123) на фоне rgb(22,24,28) имеет контрастность 3.88:1 (норма ≥ 4.5:1)
- **Скриншот:** `ui-audit/desktop-x-black-vault.png`

### 9. [🟡 ВНИМАНИЕ] Низкий контраст текста (3.88:1 < 4.5:1)
- **Экран/Состояние:** Evidence Vault (desktop / x-black)
- **Элемент/Селектор:** `span.absolute.left-3.5.text-[var(--text-3)]`
- **Подробности:** Текст "@" цвета rgb(113, 118, 123) на фоне rgb(22,24,28) имеет контрастность 3.88:1 (норма ≥ 4.5:1)
- **Скриншот:** `ui-audit/desktop-x-black-vault.png`

### 10. [🟡 ВНИМАНИЕ] Низкий контраст текста (3.88:1 < 4.5:1)
- **Экран/Состояние:** Evidence Vault (desktop / x-black)
- **Элемент/Селектор:** `label.text-[13px].font-bold.text-[var(--text-2)]`
- **Подробности:** Текст "Пароль" цвета rgb(113, 118, 123) на фоне rgb(22,24,28) имеет контрастность 3.88:1 (норма ≥ 4.5:1)
- **Скриншот:** `ui-audit/desktop-x-black-vault.png`


---

## 3. Детализация по экранам и скриншотам

| Экран / Состояние | Окружение | Тема | Дефектов | Скриншот |
| :--- | :--- | :--- | :---: | :--- |
| **Главная** | desktop | x-black | 3 | [`desktop-x-black-home.png`](./desktop-x-black-home.png) |
| **Поиск** | desktop | x-black | 3 | [`desktop-x-black-explore.png`](./desktop-x-black-explore.png) |
| **Чаты** | desktop | x-black | 1 | [`desktop-x-black-messages.png`](./desktop-x-black-messages.png) |
| **Evidence Vault** | desktop | x-black | 3 | [`desktop-x-black-vault.png`](./desktop-x-black-vault.png) |
| **Статистика** | desktop | x-black | 3 | [`desktop-x-black-analytics.png`](./desktop-x-black-analytics.png) |
| **Рейтинг** | desktop | x-black | 3 | [`desktop-x-black-leaderboard.png`](./desktop-x-black-leaderboard.png) |
| **Профиль** | desktop | x-black | 3 | [`desktop-x-black-profile.png`](./desktop-x-black-profile.png) |
| **Настройки** | desktop | x-black | 3 | [`desktop-x-black-settings.png`](./desktop-x-black-settings.png) |
| **Намерения** | desktop | x-black | 3 | [`desktop-x-black-intentions.png`](./desktop-x-black-intentions.png) |
| **Открытое окно «Записать»** | desktop | x-black | 3 | [`desktop-x-black-state-composer.png`](./desktop-x-black-state-composer.png) |
| **Онбординг (гайд и выбор уровня)** | desktop | x-black | 3 | [`desktop-x-black-state-onboarding.png`](./desktop-x-black-state-onboarding.png) |
| **Окно регистрации аккаунта** | desktop | x-black | 5 | [`desktop-x-black-state-auth-register.png`](./desktop-x-black-state-auth-register.png) |
| **Просмотр сторис** | desktop | x-black | 5 | [`desktop-x-black-state-story-viewer.png`](./desktop-x-black-state-story-viewer.png) |
| **Открытый чат с сообщениями** | desktop | x-black | 1 | [`desktop-x-black-state-chat-open.png`](./desktop-x-black-state-chat-open.png) |
| **Открытое меню «⋯» у поста** | desktop | x-black | 3 | [`desktop-x-black-state-post-menu.png`](./desktop-x-black-state-post-menu.png) |
| **Развёрнутое поле «Утренний фокус»** | desktop | x-black | 3 | [`desktop-x-black-state-quick-focus-expanded.png`](./desktop-x-black-state-quick-focus-expanded.png) |
| **Главная** | desktop | apple-light | 0 | [`desktop-apple-light-home.png`](./desktop-apple-light-home.png) |
| **Поиск** | desktop | apple-light | 0 | [`desktop-apple-light-explore.png`](./desktop-apple-light-explore.png) |
| **Чаты** | desktop | apple-light | 1 | [`desktop-apple-light-messages.png`](./desktop-apple-light-messages.png) |
| **Evidence Vault** | desktop | apple-light | 3 | [`desktop-apple-light-vault.png`](./desktop-apple-light-vault.png) |
| **Статистика** | desktop | apple-light | 3 | [`desktop-apple-light-analytics.png`](./desktop-apple-light-analytics.png) |
| **Рейтинг** | desktop | apple-light | 3 | [`desktop-apple-light-leaderboard.png`](./desktop-apple-light-leaderboard.png) |
| **Профиль** | desktop | apple-light | 3 | [`desktop-apple-light-profile.png`](./desktop-apple-light-profile.png) |
| **Настройки** | desktop | apple-light | 3 | [`desktop-apple-light-settings.png`](./desktop-apple-light-settings.png) |
| **Намерения** | desktop | apple-light | 3 | [`desktop-apple-light-intentions.png`](./desktop-apple-light-intentions.png) |
| **Открытое окно «Записать»** | desktop | apple-light | 3 | [`desktop-apple-light-state-composer.png`](./desktop-apple-light-state-composer.png) |
| **Онбординг (гайд и выбор уровня)** | desktop | apple-light | 3 | [`desktop-apple-light-state-onboarding.png`](./desktop-apple-light-state-onboarding.png) |
| **Окно регистрации аккаунта** | desktop | apple-light | 5 | [`desktop-apple-light-state-auth-register.png`](./desktop-apple-light-state-auth-register.png) |
| **Просмотр сторис** | desktop | apple-light | 5 | [`desktop-apple-light-state-story-viewer.png`](./desktop-apple-light-state-story-viewer.png) |
| **Открытый чат с сообщениями** | desktop | apple-light | 1 | [`desktop-apple-light-state-chat-open.png`](./desktop-apple-light-state-chat-open.png) |
| **Открытое меню «⋯» у поста** | desktop | apple-light | 3 | [`desktop-apple-light-state-post-menu.png`](./desktop-apple-light-state-post-menu.png) |
| **Развёрнутое поле «Утренний фокус»** | desktop | apple-light | 3 | [`desktop-apple-light-state-quick-focus-expanded.png`](./desktop-apple-light-state-quick-focus-expanded.png) |
| **Главная** | desktop | dim | 0 | [`desktop-dim-home.png`](./desktop-dim-home.png) |
| **Поиск** | desktop | dim | 0 | [`desktop-dim-explore.png`](./desktop-dim-explore.png) |
| **Чаты** | desktop | dim | 1 | [`desktop-dim-messages.png`](./desktop-dim-messages.png) |
| **Evidence Vault** | desktop | dim | 3 | [`desktop-dim-vault.png`](./desktop-dim-vault.png) |
| **Статистика** | desktop | dim | 3 | [`desktop-dim-analytics.png`](./desktop-dim-analytics.png) |
| **Рейтинг** | desktop | dim | 3 | [`desktop-dim-leaderboard.png`](./desktop-dim-leaderboard.png) |
| **Профиль** | desktop | dim | 3 | [`desktop-dim-profile.png`](./desktop-dim-profile.png) |
| **Настройки** | desktop | dim | 3 | [`desktop-dim-settings.png`](./desktop-dim-settings.png) |
| **Намерения** | desktop | dim | 3 | [`desktop-dim-intentions.png`](./desktop-dim-intentions.png) |
| **Открытое окно «Записать»** | desktop | dim | 3 | [`desktop-dim-state-composer.png`](./desktop-dim-state-composer.png) |
| **Онбординг (гайд и выбор уровня)** | desktop | dim | 3 | [`desktop-dim-state-onboarding.png`](./desktop-dim-state-onboarding.png) |
| **Окно регистрации аккаунта** | desktop | dim | 5 | [`desktop-dim-state-auth-register.png`](./desktop-dim-state-auth-register.png) |
| **Просмотр сторис** | desktop | dim | 5 | [`desktop-dim-state-story-viewer.png`](./desktop-dim-state-story-viewer.png) |
| **Открытый чат с сообщениями** | desktop | dim | 1 | [`desktop-dim-state-chat-open.png`](./desktop-dim-state-chat-open.png) |
| **Открытое меню «⋯» у поста** | desktop | dim | 3 | [`desktop-dim-state-post-menu.png`](./desktop-dim-state-post-menu.png) |
| **Развёрнутое поле «Утренний фокус»** | desktop | dim | 3 | [`desktop-dim-state-quick-focus-expanded.png`](./desktop-dim-state-quick-focus-expanded.png) |
| **Главная** | mobile | x-black | 4 | [`mobile-x-black-home.png`](./mobile-x-black-home.png) |
| **Поиск** | mobile | x-black | 4 | [`mobile-x-black-explore.png`](./mobile-x-black-explore.png) |
| **Чаты** | mobile | x-black | 0 | [`mobile-x-black-messages.png`](./mobile-x-black-messages.png) |
| **Evidence Vault** | mobile | x-black | 4 | [`mobile-x-black-vault.png`](./mobile-x-black-vault.png) |
| **Статистика** | mobile | x-black | 4 | [`mobile-x-black-analytics.png`](./mobile-x-black-analytics.png) |
| **Рейтинг** | mobile | x-black | 4 | [`mobile-x-black-leaderboard.png`](./mobile-x-black-leaderboard.png) |
| **Профиль** | mobile | x-black | 4 | [`mobile-x-black-profile.png`](./mobile-x-black-profile.png) |
| **Настройки** | mobile | x-black | 4 | [`mobile-x-black-settings.png`](./mobile-x-black-settings.png) |
| **Намерения** | mobile | x-black | 4 | [`mobile-x-black-intentions.png`](./mobile-x-black-intentions.png) |
| **Открытое окно «Записать»** | mobile | x-black | 4 | [`mobile-x-black-state-composer.png`](./mobile-x-black-state-composer.png) |
| **Онбординг (гайд и выбор уровня)** | mobile | x-black | 4 | [`mobile-x-black-state-onboarding.png`](./mobile-x-black-state-onboarding.png) |
| **Окно регистрации аккаунта** | mobile | x-black | 6 | [`mobile-x-black-state-auth-register.png`](./mobile-x-black-state-auth-register.png) |
| **Просмотр сторис** | mobile | x-black | 6 | [`mobile-x-black-state-story-viewer.png`](./mobile-x-black-state-story-viewer.png) |
| **Открытый чат с сообщениями** | mobile | x-black | 0 | [`mobile-x-black-state-chat-open.png`](./mobile-x-black-state-chat-open.png) |
| **Открытое меню «⋯» у поста** | mobile | x-black | 4 | [`mobile-x-black-state-post-menu.png`](./mobile-x-black-state-post-menu.png) |
| **Развёрнутое поле «Утренний фокус»** | mobile | x-black | 4 | [`mobile-x-black-state-quick-focus-expanded.png`](./mobile-x-black-state-quick-focus-expanded.png) |
| **Главная** | mobile | apple-light | 0 | [`mobile-apple-light-home.png`](./mobile-apple-light-home.png) |
| **Поиск** | mobile | apple-light | 0 | [`mobile-apple-light-explore.png`](./mobile-apple-light-explore.png) |
| **Чаты** | mobile | apple-light | 0 | [`mobile-apple-light-messages.png`](./mobile-apple-light-messages.png) |
| **Evidence Vault** | mobile | apple-light | 4 | [`mobile-apple-light-vault.png`](./mobile-apple-light-vault.png) |
| **Статистика** | mobile | apple-light | 4 | [`mobile-apple-light-analytics.png`](./mobile-apple-light-analytics.png) |
| **Рейтинг** | mobile | apple-light | 4 | [`mobile-apple-light-leaderboard.png`](./mobile-apple-light-leaderboard.png) |
| **Профиль** | mobile | apple-light | 4 | [`mobile-apple-light-profile.png`](./mobile-apple-light-profile.png) |
| **Настройки** | mobile | apple-light | 4 | [`mobile-apple-light-settings.png`](./mobile-apple-light-settings.png) |
| **Намерения** | mobile | apple-light | 4 | [`mobile-apple-light-intentions.png`](./mobile-apple-light-intentions.png) |
| **Открытое окно «Записать»** | mobile | apple-light | 4 | [`mobile-apple-light-state-composer.png`](./mobile-apple-light-state-composer.png) |
| **Онбординг (гайд и выбор уровня)** | mobile | apple-light | 4 | [`mobile-apple-light-state-onboarding.png`](./mobile-apple-light-state-onboarding.png) |
| **Окно регистрации аккаунта** | mobile | apple-light | 6 | [`mobile-apple-light-state-auth-register.png`](./mobile-apple-light-state-auth-register.png) |
| **Просмотр сторис** | mobile | apple-light | 6 | [`mobile-apple-light-state-story-viewer.png`](./mobile-apple-light-state-story-viewer.png) |
| **Открытый чат с сообщениями** | mobile | apple-light | 0 | [`mobile-apple-light-state-chat-open.png`](./mobile-apple-light-state-chat-open.png) |
| **Открытое меню «⋯» у поста** | mobile | apple-light | 4 | [`mobile-apple-light-state-post-menu.png`](./mobile-apple-light-state-post-menu.png) |
| **Развёрнутое поле «Утренний фокус»** | mobile | apple-light | 4 | [`mobile-apple-light-state-quick-focus-expanded.png`](./mobile-apple-light-state-quick-focus-expanded.png) |
| **Главная** | mobile | dim | 1 | [`mobile-dim-home.png`](./mobile-dim-home.png) |
| **Поиск** | mobile | dim | 1 | [`mobile-dim-explore.png`](./mobile-dim-explore.png) |
| **Чаты** | mobile | dim | 0 | [`mobile-dim-messages.png`](./mobile-dim-messages.png) |
| **Evidence Vault** | mobile | dim | 1 | [`mobile-dim-vault.png`](./mobile-dim-vault.png) |
| **Статистика** | mobile | dim | 1 | [`mobile-dim-analytics.png`](./mobile-dim-analytics.png) |
| **Рейтинг** | mobile | dim | 1 | [`mobile-dim-leaderboard.png`](./mobile-dim-leaderboard.png) |
| **Профиль** | mobile | dim | 1 | [`mobile-dim-profile.png`](./mobile-dim-profile.png) |
| **Настройки** | mobile | dim | 1 | [`mobile-dim-settings.png`](./mobile-dim-settings.png) |
| **Намерения** | mobile | dim | 1 | [`mobile-dim-intentions.png`](./mobile-dim-intentions.png) |
| **Открытое окно «Записать»** | mobile | dim | 1 | [`mobile-dim-state-composer.png`](./mobile-dim-state-composer.png) |
| **Онбординг (гайд и выбор уровня)** | mobile | dim | 1 | [`mobile-dim-state-onboarding.png`](./mobile-dim-state-onboarding.png) |
| **Окно регистрации аккаунта** | mobile | dim | 1 | [`mobile-dim-state-auth-register.png`](./mobile-dim-state-auth-register.png) |
| **Просмотр сторис** | mobile | dim | 1 | [`mobile-dim-state-story-viewer.png`](./mobile-dim-state-story-viewer.png) |
| **Открытый чат с сообщениями** | mobile | dim | 0 | [`mobile-dim-state-chat-open.png`](./mobile-dim-state-chat-open.png) |
| **Открытое меню «⋯» у поста** | mobile | dim | 1 | [`mobile-dim-state-post-menu.png`](./mobile-dim-state-post-menu.png) |
| **Развёрнутое поле «Утренний фокус»** | mobile | dim | 1 | [`mobile-dim-state-quick-focus-expanded.png`](./mobile-dim-state-quick-focus-expanded.png) |

---

## 4. Как запустить повторный замер

```bash
# Быстрый аудит (десктоп, тёмная тема — для быстрой итерации)
npm run audit-ui:fast

# Полный аудит перед сдачей (все разрешения и темы)
npm run audit-ui
```

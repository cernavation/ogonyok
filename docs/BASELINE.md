# Отчёт базового аудита интерфейса (BASELINE)

> **Дата замера:** 2026-10-23T14:47:31.031Z  
> **Режим:** Полный (1440×900 + 390×844, Dark + Light)  
> **Длительность выполнения:** 177.3 сек  
> **Всего проверено экранов и состояний:** 64  

---

## 1. Сводная статистика проблем

| Категория проверки | Количество дефектов | Серьёзность |
| :--- | :---: | :--- |
| **Огромные hover-подсветки (> 12% экрана)** | 0 | 🔴 Critical |
| **Карточки в карточках (вложенность ≥ 2)** | 0 | 🔴 Critical |
| **Налезающие кнопки (Overlap)** | 18312 | 🔴 Critical |
| **Горизонтальный скролл** | 2 | 🔴 Critical |
| **Ошибки в консоли браузера** | 0 | 🔴 Critical |
| **Слипшиеся кнопки (зазор < 6px)** | 3696 | 🟡 Warning |
| **Мелкий шрифт (< 13px)** | 12090 | 🟡 Warning |
| **Низкий контраст (< 4.5:1 WCAG AA)** | 1336 | 🟡 Warning |
| **Малые зоны нажатия (< 32px / 40px)** | 23908 | 🟡 Warning |
| **Обрезанный текст (overflow without ellipsis)** | 108 | 🟡 Warning |
| **Warning'и в консоли браузера** | 0 | 🟡 Warning |
| **ИТОГО ДЕФЕКТОВ** | **59452** | **(Критичных: 18314, Предупреждений: 41138)** |

---

## 2. ТОП-10 самых грубых дефектов

### 1. [🔴 КРИТИЧНО] Нахлёст кнопок: <#base-ui-_r_101_> перекрывает <#base-ui-_r_14q_>
- **Экран/Состояние:** Главная (desktop / x-black)
- **Элемент/Селектор:** `#base-ui-_r_101_ overlaps #base-ui-_r_14q_`
- **Подробности:** Пересечение 29×7px на (918, 10339)
- **Скриншот:** `ui-audit/desktop-x-black-home.png`

### 2. [🔴 КРИТИЧНО] Нахлёст кнопок: <#base-ui-_r_10p_> перекрывает <#_r_14r_-tab-gratitude>
- **Экран/Состояние:** Главная (desktop / x-black)
- **Элемент/Селектор:** `#base-ui-_r_10p_ overlaps #_r_14r_-tab-gratitude`
- **Подробности:** Пересечение 16×21px на (989, 10607)
- **Скриншот:** `ui-audit/desktop-x-black-home.png`

### 3. [🔴 КРИТИЧНО] Нахлёст кнопок: <button.inline-flex.items-center.gap-1.5> перекрывает <#_r_1ab_-tab-pride>
- **Экран/Состояние:** Главная (desktop / x-black)
- **Элемент/Селектор:** `button.inline-flex.items-center.gap-1.5 overlaps #_r_1ab_-tab-pride`
- **Подробности:** Пересечение 136×30px на (426, 10804)
- **Скриншот:** `ui-audit/desktop-x-black-home.png`

### 4. [🔴 КРИТИЧНО] Нахлёст кнопок: <#base-ui-_r_115_> перекрывает <button.inline-flex.items-center.gap-1.5>
- **Экран/Состояние:** Главная (desktop / x-black)
- **Элемент/Селектор:** `#base-ui-_r_115_ overlaps button.inline-flex.items-center.gap-1.5`
- **Подробности:** Пересечение 28×18px на (429, 10847)
- **Скриншот:** `ui-audit/desktop-x-black-home.png`

### 5. [🔴 КРИТИЧНО] Нахлёст кнопок: <#base-ui-_r_117_> перекрывает <button.inline-flex.items-center.gap-1.5>
- **Экран/Состояние:** Главная (desktop / x-black)
- **Элемент/Селектор:** `#base-ui-_r_117_ overlaps button.inline-flex.items-center.gap-1.5`
- **Подробности:** Пересечение 28×18px на (459, 10847)
- **Скриншот:** `ui-audit/desktop-x-black-home.png`

### 6. [🔴 КРИТИЧНО] Нахлёст кнопок: <#base-ui-_r_119_> перекрывает <button.inline-flex.items-center.gap-1.5>
- **Экран/Состояние:** Главная (desktop / x-black)
- **Элемент/Селектор:** `#base-ui-_r_119_ overlaps button.inline-flex.items-center.gap-1.5`
- **Подробности:** Пересечение 28×18px на (489, 10847)
- **Скриншот:** `ui-audit/desktop-x-black-home.png`

### 7. [🔴 КРИТИЧНО] Нахлёст кнопок: <#base-ui-_r_11f_> перекрывает <#base-ui-_r_1ad_>
- **Экран/Состояние:** Главная (desktop / x-black)
- **Элемент/Селектор:** `#base-ui-_r_11f_ overlaps #base-ui-_r_1ad_`
- **Подробности:** Пересечение 21×14px на (989, 10896)
- **Скриншот:** `ui-audit/desktop-x-black-home.png`

### 8. [🔴 КРИТИЧНО] Нахлёст кнопок: <button.inline-flex.items-center.gap-1> перекрывает <#base-ui-_r_159_>
- **Экран/Состояние:** Главная (desktop / x-black)
- **Элемент/Селектор:** `button.inline-flex.items-center.gap-1 overlaps #base-ui-_r_159_`
- **Подробности:** Пересечение 28×18px на (426, 10975)
- **Скриншот:** `ui-audit/desktop-x-black-home.png`

### 9. [🔴 КРИТИЧНО] Нахлёст кнопок: <button.inline-flex.items-center.gap-1> перекрывает <#base-ui-_r_15b_>
- **Экран/Состояние:** Главная (desktop / x-black)
- **Элемент/Селектор:** `button.inline-flex.items-center.gap-1 overlaps #base-ui-_r_15b_`
- **Подробности:** Пересечение 28×18px на (426, 10975)
- **Скриншот:** `ui-audit/desktop-x-black-home.png`

### 10. [🔴 КРИТИЧНО] Нахлёст кнопок: <#base-ui-_r_11i_> перекрывает <#base-ui-_r_15d_>
- **Экран/Состояние:** Главная (desktop / x-black)
- **Элемент/Селектор:** `#base-ui-_r_11i_ overlaps #base-ui-_r_15d_`
- **Подробности:** Пересечение 19×19px на (497, 10974)
- **Скриншот:** `ui-audit/desktop-x-black-home.png`


---

## 3. Детализация по экранам и скриншотам

| Экран / Состояние | Окружение | Тема | Дефектов | Скриншот |
| :--- | :--- | :--- | :---: | :--- |
| **Главная** | desktop | x-black | 3324 | [`desktop-x-black-home.png`](./desktop-x-black-home.png) |
| **Поиск** | desktop | x-black | 298 | [`desktop-x-black-explore.png`](./desktop-x-black-explore.png) |
| **Чаты** | desktop | x-black | 66 | [`desktop-x-black-messages.png`](./desktop-x-black-messages.png) |
| **Evidence Vault** | desktop | x-black | 23 | [`desktop-x-black-vault.png`](./desktop-x-black-vault.png) |
| **Статистика** | desktop | x-black | 82 | [`desktop-x-black-analytics.png`](./desktop-x-black-analytics.png) |
| **Рейтинг** | desktop | x-black | 152 | [`desktop-x-black-leaderboard.png`](./desktop-x-black-leaderboard.png) |
| **Профиль** | desktop | x-black | 267 | [`desktop-x-black-profile.png`](./desktop-x-black-profile.png) |
| **Настройки** | desktop | x-black | 41 | [`desktop-x-black-settings.png`](./desktop-x-black-settings.png) |
| **Намерения** | desktop | x-black | 27 | [`desktop-x-black-intentions.png`](./desktop-x-black-intentions.png) |
| **Открытое окно «Записать»** | desktop | x-black | 108 | [`desktop-x-black-state-composer.png`](./desktop-x-black-state-composer.png) |
| **Онбординг (гайд и выбор уровня)** | desktop | x-black | 28 | [`desktop-x-black-state-onboarding.png`](./desktop-x-black-state-onboarding.png) |
| **Окно регистрации аккаунта** | desktop | x-black | 44 | [`desktop-x-black-state-auth-register.png`](./desktop-x-black-state-auth-register.png) |
| **Просмотр сторис** | desktop | x-black | 3292 | [`desktop-x-black-state-story-viewer.png`](./desktop-x-black-state-story-viewer.png) |
| **Открытый чат с сообщениями** | desktop | x-black | 66 | [`desktop-x-black-state-chat-open.png`](./desktop-x-black-state-chat-open.png) |
| **Открытое меню «⋯» у поста** | desktop | x-black | 3267 | [`desktop-x-black-state-post-menu.png`](./desktop-x-black-state-post-menu.png) |
| **Развёрнутое поле «Утренний фокус»** | desktop | x-black | 3267 | [`desktop-x-black-state-quick-focus-expanded.png`](./desktop-x-black-state-quick-focus-expanded.png) |
| **Главная** | desktop | apple-light | 3324 | [`desktop-apple-light-home.png`](./desktop-apple-light-home.png) |
| **Поиск** | desktop | apple-light | 298 | [`desktop-apple-light-explore.png`](./desktop-apple-light-explore.png) |
| **Чаты** | desktop | apple-light | 66 | [`desktop-apple-light-messages.png`](./desktop-apple-light-messages.png) |
| **Evidence Vault** | desktop | apple-light | 23 | [`desktop-apple-light-vault.png`](./desktop-apple-light-vault.png) |
| **Статистика** | desktop | apple-light | 82 | [`desktop-apple-light-analytics.png`](./desktop-apple-light-analytics.png) |
| **Рейтинг** | desktop | apple-light | 152 | [`desktop-apple-light-leaderboard.png`](./desktop-apple-light-leaderboard.png) |
| **Профиль** | desktop | apple-light | 428 | [`desktop-apple-light-profile.png`](./desktop-apple-light-profile.png) |
| **Настройки** | desktop | apple-light | 41 | [`desktop-apple-light-settings.png`](./desktop-apple-light-settings.png) |
| **Намерения** | desktop | apple-light | 27 | [`desktop-apple-light-intentions.png`](./desktop-apple-light-intentions.png) |
| **Открытое окно «Записать»** | desktop | apple-light | 108 | [`desktop-apple-light-state-composer.png`](./desktop-apple-light-state-composer.png) |
| **Онбординг (гайд и выбор уровня)** | desktop | apple-light | 29 | [`desktop-apple-light-state-onboarding.png`](./desktop-apple-light-state-onboarding.png) |
| **Окно регистрации аккаунта** | desktop | apple-light | 44 | [`desktop-apple-light-state-auth-register.png`](./desktop-apple-light-state-auth-register.png) |
| **Просмотр сторис** | desktop | apple-light | 3292 | [`desktop-apple-light-state-story-viewer.png`](./desktop-apple-light-state-story-viewer.png) |
| **Открытый чат с сообщениями** | desktop | apple-light | 66 | [`desktop-apple-light-state-chat-open.png`](./desktop-apple-light-state-chat-open.png) |
| **Открытое меню «⋯» у поста** | desktop | apple-light | 3267 | [`desktop-apple-light-state-post-menu.png`](./desktop-apple-light-state-post-menu.png) |
| **Развёрнутое поле «Утренний фокус»** | desktop | apple-light | 3267 | [`desktop-apple-light-state-quick-focus-expanded.png`](./desktop-apple-light-state-quick-focus-expanded.png) |
| **Главная** | mobile | x-black | 3561 | [`mobile-x-black-home.png`](./mobile-x-black-home.png) |
| **Поиск** | mobile | x-black | 277 | [`mobile-x-black-explore.png`](./mobile-x-black-explore.png) |
| **Чаты** | mobile | x-black | 45 | [`mobile-x-black-messages.png`](./mobile-x-black-messages.png) |
| **Evidence Vault** | mobile | x-black | 11 | [`mobile-x-black-vault.png`](./mobile-x-black-vault.png) |
| **Статистика** | mobile | x-black | 63 | [`mobile-x-black-analytics.png`](./mobile-x-black-analytics.png) |
| **Рейтинг** | mobile | x-black | 61 | [`mobile-x-black-leaderboard.png`](./mobile-x-black-leaderboard.png) |
| **Профиль** | mobile | x-black | 249 | [`mobile-x-black-profile.png`](./mobile-x-black-profile.png) |
| **Настройки** | mobile | x-black | 32 | [`mobile-x-black-settings.png`](./mobile-x-black-settings.png) |
| **Намерения** | mobile | x-black | 5 | [`mobile-x-black-intentions.png`](./mobile-x-black-intentions.png) |
| **Открытое окно «Записать»** | mobile | x-black | 102 | [`mobile-x-black-state-composer.png`](./mobile-x-black-state-composer.png) |
| **Онбординг (гайд и выбор уровня)** | mobile | x-black | 6 | [`mobile-x-black-state-onboarding.png`](./mobile-x-black-state-onboarding.png) |
| **Окно регистрации аккаунта** | mobile | x-black | 40 | [`mobile-x-black-state-auth-register.png`](./mobile-x-black-state-auth-register.png) |
| **Просмотр сторис** | mobile | x-black | 3593 | [`mobile-x-black-state-story-viewer.png`](./mobile-x-black-state-story-viewer.png) |
| **Открытый чат с сообщениями** | mobile | x-black | 45 | [`mobile-x-black-state-chat-open.png`](./mobile-x-black-state-chat-open.png) |
| **Открытое меню «⋯» у поста** | mobile | x-black | 3561 | [`mobile-x-black-state-post-menu.png`](./mobile-x-black-state-post-menu.png) |
| **Развёрнутое поле «Утренний фокус»** | mobile | x-black | 3561 | [`mobile-x-black-state-quick-focus-expanded.png`](./mobile-x-black-state-quick-focus-expanded.png) |
| **Главная** | mobile | apple-light | 3561 | [`mobile-apple-light-home.png`](./mobile-apple-light-home.png) |
| **Поиск** | mobile | apple-light | 277 | [`mobile-apple-light-explore.png`](./mobile-apple-light-explore.png) |
| **Чаты** | mobile | apple-light | 45 | [`mobile-apple-light-messages.png`](./mobile-apple-light-messages.png) |
| **Evidence Vault** | mobile | apple-light | 11 | [`mobile-apple-light-vault.png`](./mobile-apple-light-vault.png) |
| **Статистика** | mobile | apple-light | 63 | [`mobile-apple-light-analytics.png`](./mobile-apple-light-analytics.png) |
| **Рейтинг** | mobile | apple-light | 61 | [`mobile-apple-light-leaderboard.png`](./mobile-apple-light-leaderboard.png) |
| **Профиль** | mobile | apple-light | 410 | [`mobile-apple-light-profile.png`](./mobile-apple-light-profile.png) |
| **Настройки** | mobile | apple-light | 32 | [`mobile-apple-light-settings.png`](./mobile-apple-light-settings.png) |
| **Намерения** | mobile | apple-light | 5 | [`mobile-apple-light-intentions.png`](./mobile-apple-light-intentions.png) |
| **Открытое окно «Записать»** | mobile | apple-light | 102 | [`mobile-apple-light-state-composer.png`](./mobile-apple-light-state-composer.png) |
| **Онбординг (гайд и выбор уровня)** | mobile | apple-light | 7 | [`mobile-apple-light-state-onboarding.png`](./mobile-apple-light-state-onboarding.png) |
| **Окно регистрации аккаунта** | mobile | apple-light | 40 | [`mobile-apple-light-state-auth-register.png`](./mobile-apple-light-state-auth-register.png) |
| **Просмотр сторис** | mobile | apple-light | 3593 | [`mobile-apple-light-state-story-viewer.png`](./mobile-apple-light-state-story-viewer.png) |
| **Открытый чат с сообщениями** | mobile | apple-light | 45 | [`mobile-apple-light-state-chat-open.png`](./mobile-apple-light-state-chat-open.png) |
| **Открытое меню «⋯» у поста** | mobile | apple-light | 3561 | [`mobile-apple-light-state-post-menu.png`](./mobile-apple-light-state-post-menu.png) |
| **Развёрнутое поле «Утренний фокус»** | mobile | apple-light | 3561 | [`mobile-apple-light-state-quick-focus-expanded.png`](./mobile-apple-light-state-quick-focus-expanded.png) |

---

## 4. Как запустить повторный замер

```bash
# Быстрый аудит (десктоп, тёмная тема — для быстрой итерации)
npm run audit-ui:fast

# Полный аудит перед сдачей (все разрешения и темы)
npm run audit-ui
```

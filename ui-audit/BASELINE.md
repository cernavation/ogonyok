# Отчёт базового аудита интерфейса (BASELINE)

> **Дата замера:** 2026-11-10T08:15:02.457Z  
> **Режим:** Быстрый (--fast, десктоп x-black)  
> **Длительность выполнения:** 27.3 сек  
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
| **Низкий контраст (< 4.5:1 WCAG AA)** | 46 | 🟡 Warning |
| **Малые зоны нажатия (< 32px / 40px)** | 2 | 🟡 Warning |
| **Обрезанный текст (overflow without ellipsis)** | 0 | 🟡 Warning |
| **Warning'и в консоли браузера** | 7 | 🟡 Warning |
| **ИТОГО ДЕФЕКТОВ** | **55** | **(Критичных: 0, Предупреждений: 55)** |

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

---

## 4. Как запустить повторный замер

```bash
# Быстрый аудит (десктоп, тёмная тема — для быстрой итерации)
npm run audit-ui:fast

# Полный аудит перед сдачей (все разрешения и темы)
npm run audit-ui
```

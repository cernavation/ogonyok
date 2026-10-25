# ОТЧЁТ ТЕСТИРОВАНИЯ ВВОДА ТЕКСТА И СТАБИЛЬНОСТИ ФОКУСА

- **Дата**: 2026-10-24T20:34:09.325Z
- **Общий статус**: ❌ НАЙДЕНО 2 ПРОБЛЕМ
- **Время прогона**: 335.1 сек

| Браузер | Вьюпорт | Сцена | Статус | Время | Детали |
|---|---|---|---|---|---|
| chromium | desktop-1440 | Composer: Гордость (посимвольный ввод, эмодзи, 2000 симв) | ✅ PASS | 4052ms | — |
| chromium | desktop-1440 | Composer: Благодарность (переключение вкладки и ввод) | ✅ PASS | 3916ms | — |
| chromium | desktop-1440 | Поиск: строка запроса в Explore | ✅ PASS | 3023ms | — |
| chromium | desktop-1440 | Чаты: поле ввода сообщения в диалоге | ✅ PASS | 12712ms | — |
| chromium | desktop-1440 | Evidence Vault: поиск и ввод данных улики | ✅ PASS | 4727ms | — |
| chromium | desktop-1440 | Намерения / Фокус: утренний фокус дня | ✅ PASS | 3606ms | — |
| chromium | desktop-1440 | Редактирование профиля: имя и bio | ✅ PASS | 3891ms | — |
| chromium | desktop-1440 | Настройки: кастомный акцент / ник | ✅ PASS | 4275ms | — |
| chromium | desktop-1440 | Окно входа/регистрации: логин и пароль | ✅ PASS | 4290ms | — |
| chromium | mobile-390 | Composer: Гордость (посимвольный ввод, эмодзи, 2000 симв) | ✅ PASS | 14558ms | — |
| chromium | mobile-390 | Composer: Благодарность (переключение вкладки и ввод) | ✅ PASS | 13610ms | — |
| chromium | mobile-390 | Поиск: строка запроса в Explore | ✅ PASS | 12769ms | — |
| chromium | mobile-390 | Чаты: поле ввода сообщения в диалоге | ❌ FAIL | 15965ms | not-found: Селектор textarea[placeholder*="сообщени"], input[placeholder*="сообщени"], textarea[placeholder*="Сообщени"] не найден или невидим |
| chromium | mobile-390 | Evidence Vault: поиск и ввод данных улики | ✅ PASS | 12261ms | — |
| chromium | mobile-390 | Намерения / Фокус: утренний фокус дня | ✅ PASS | 12067ms | — |
| chromium | mobile-390 | Редактирование профиля: имя и bio | ✅ PASS | 12035ms | — |
| chromium | mobile-390 | Настройки: кастомный акцент / ник | ✅ PASS | 11557ms | — |
| chromium | mobile-390 | Окно входа/регистрации: логин и пароль | ✅ PASS | 11392ms | — |
| webkit | desktop-1440 | Composer: Гордость (посимвольный ввод, эмодзи, 2000 симв) | ✅ PASS | 6926ms | — |
| webkit | desktop-1440 | Composer: Благодарность (переключение вкладки и ввод) | ✅ PASS | 5443ms | — |
| webkit | desktop-1440 | Поиск: строка запроса в Explore | ✅ PASS | 3940ms | — |
| webkit | desktop-1440 | Чаты: поле ввода сообщения в диалоге | ✅ PASS | 13382ms | — |
| webkit | desktop-1440 | Evidence Vault: поиск и ввод данных улики | ✅ PASS | 3729ms | — |
| webkit | desktop-1440 | Намерения / Фокус: утренний фокус дня | ✅ PASS | 3796ms | — |
| webkit | desktop-1440 | Редактирование профиля: имя и bio | ✅ PASS | 6545ms | — |
| webkit | desktop-1440 | Настройки: кастомный акцент / ник | ✅ PASS | 4477ms | — |
| webkit | desktop-1440 | Окно входа/регистрации: логин и пароль | ✅ PASS | 5140ms | — |
| webkit | mobile-390 | Composer: Гордость (посимвольный ввод, эмодзи, 2000 симв) | ✅ PASS | 13733ms | — |
| webkit | mobile-390 | Composer: Благодарность (переключение вкладки и ввод) | ✅ PASS | 13461ms | — |
| webkit | mobile-390 | Поиск: строка запроса в Explore | ✅ PASS | 12332ms | — |
| webkit | mobile-390 | Чаты: поле ввода сообщения в диалоге | ❌ FAIL | 16578ms | not-found: Селектор textarea[placeholder*="сообщени"], input[placeholder*="сообщени"], textarea[placeholder*="Сообщени"] не найден или невидим |
| webkit | mobile-390 | Evidence Vault: поиск и ввод данных улики | ✅ PASS | 11478ms | — |
| webkit | mobile-390 | Намерения / Фокус: утренний фокус дня | ✅ PASS | 11702ms | — |
| webkit | mobile-390 | Редактирование профиля: имя и bio | ✅ PASS | 11986ms | — |
| webkit | mobile-390 | Настройки: кастомный акцент / ник | ✅ PASS | 11209ms | — |
| webkit | mobile-390 | Окно входа/регистрации: логин и пароль | ✅ PASS | 11550ms | — |

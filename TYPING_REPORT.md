# ОТЧЁТ ТЕСТИРОВАНИЯ ВВОДА ТЕКСТА И СТАБИЛЬНОСТИ ФОКУСА

- **Дата**: 2026-10-24T19:43:35.755Z
- **Общий статус**: ❌ НАЙДЕНО 2 ПРОБЛЕМ
- **Время прогона**: 37.8 сек

| Браузер | Вьюпорт | Сцена | Статус | Время | Детали |
|---|---|---|---|---|---|
| chromium | desktop-1440 | Composer: Гордость (посимвольный ввод, эмодзи, 2000 симв) | ✅ PASS | 4366ms | — |
| chromium | desktop-1440 | Composer: Благодарность (переключение вкладки и ввод) | ✅ PASS | 3941ms | — |
| chromium | desktop-1440 | Поиск: строка запроса в Explore | ✅ PASS | 2762ms | — |
| chromium | desktop-1440 | Чаты: поле ввода сообщения в диалоге | ✅ PASS | 2179ms | — |
| chromium | desktop-1440 | Evidence Vault: поиск и ввод данных улики | ✅ PASS | 1643ms | — |
| chromium | desktop-1440 | Намерения / Фокус: утренний фокус дня | ✅ PASS | 2239ms | — |
| chromium | desktop-1440 | Редактирование профиля: имя и bio | ✅ PASS | 2526ms | — |
| chromium | desktop-1440 | Настройки: кастомный акцент / ник | ❌ FAIL | 5992ms | not-found: Селектор input[placeholder*="#FF5C00"], input[type="text"] не найден или невидим |
| chromium | desktop-1440 | Окно входа/регистрации: логин и пароль | ❌ FAIL | 7106ms | not-found: Селектор input[placeholder*="alex_cerna"], input[autoComplete="username"], input[type="text"] не найден или невидим |

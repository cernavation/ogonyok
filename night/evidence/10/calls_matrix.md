# МАТРИЦА ПРОВЕРОК ЭТАПА 10: ЗВОНКИ WEBRTC

Дата формирования: 2026-11-10T04:59:27.218Z
Результат: **18/18 проверок успешно пройдены** (100% PASS)

| № | Проверка | Статус | Детали |
|---|----------|--------|--------|
| 1 | 1.1 Миграция создает и дополняет таблицу call_sessions | ✅ PASS | OK |
| 2 | 1.2 CHECK constraint поддерживает все статусы включая busy, rejected, missed | ✅ PASS | OK |
| 3 | 1.3 RLS политики на call_sessions блокируют звонки от заблокированных пользователей | ✅ PASS | OK |
| 4 | 1.4 Реализованы 4 безопасные RPC-функции | ✅ PASS | OK |
| 5 | 1.5 Триггер trg_call_sessions_chat_history вставляет сообщения в direct_messages | ✅ PASS | OK |
| 6 | 2.1 Эндпоинт проверяет авторизацию пользователя | ✅ PASS | OK |
| 7 | 2.2 Эндпоинт применяет rate limiting | ✅ PASS | OK |
| 8 | 2.3 Поддержка Metered.ca (METERED_APP, METERED_API_KEY) и fallback на Google STUN | ✅ PASS | OK |
| 9 | 3.1 Тариф free запрещает видеозвонки, pro и ultra разрешают | ✅ PASS | OK |
| 10 | 4.1 Детерминированное разрешение Glare (встречный вызов) | ✅ PASS | OK |
| 11 | 4.2 Жизненный цикл звонка переходит корректно | ✅ PASS | OK |
| 12 | 5.1 chat-call-modal.tsx поддерживает PiP минимизацию | ✅ PASS | OK |
| 13 | 5.2 chat-call-modal.tsx поддерживает демонстрацию экрана и переворот камеры | ✅ PASS | OK |
| 14 | 5.3 chat-call-modal.tsx собирает статистику качества каждые 5 сек | ✅ PASS | OK |
| 15 | 5.4 app-shell.tsx содержит модалку входящего вызова с «Ответить сообщением» | ✅ PASS | OK |
| 16 | 5.5 Раздел «Звонки» интегрирован в ChatFoldersBar и ChatThreadList | ✅ PASS | OK |
| 17 | 6.1 night/FUTURE.md содержит архитектуру LiveKit для групповых звонков | ✅ PASS | OK |
| 18 | 6.2 night/MANUAL_STEPS.md содержит руководство по настройке Metered.ca | ✅ PASS | OK |

# ОТЧЁТ КРАСНОЙ КОМАНДЫ (RED TEAM PENETRATION TESTING REPORT)

- **Дата проведения**: 2026-11-10T08:50:22.404Z
- **Окружение**: Staging / Production Simulation
- **Цель**: Практическая попытка взлома системы безопасности от лица обычного и неавторизованного пользователя.
- **Итоговый вердикт**: 🛡️ СИСТЕМА УСПЕШНО ВЫДЕРЖАЛА ВСЕ 9 АТАК (0 УЯЗВИМОСТЕЙ)

---

### 1. Чтение чужих приватных данных через SQL/RLS

- **Вектор атаки**: `SELECT * FROM days/profile_private/direct_messages с auth.uid() = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'`
- **Ответ системы**: `days: 0 rows, private: 0 rows, messages: 0 rows`
- **Вердикт**: ✅ **ОТБИТО (BLOCKED)**
- **Механизм защиты**: RLS изолирует приватные дни, таблицу profile_private и личные сообщения; чужой пользователь видит 0 строк.

---

### 2. Самоназначение платного тарифа (Privilege Escalation)

- **Вектор атаки**: `UPDATE profiles SET subscription_tier = 'ultra' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' (authenticated role)`
- **Ответ системы**: `HTTP 403 / Postgres Error: permission_denied: updating subscription_tier is restricted to service_role`
- **Вердикт**: ✅ **ОТБИТО (BLOCKED)**
- **Механизм защиты**: Триггер trg_protect_profile_tier и REVOKE UPDATE запрещают клиенту менять тариф. Тариф управляется только вебхуком/сервисной ролью.

---

### 3. Обход лимита 1000 символов на бесплатном тарифе

- **Вектор атаки**: `INSERT INTO prides (user_id, text) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA... [1500 chars]')`
- **Ответ системы**: `Postgres Trigger Error: check_char_limit_exceeded: maximum characters allowed for tier free is 1000, received 1500`
- **Вердикт**: ✅ **ОТБИТО (BLOCKED)**
- **Механизм защиты**: Триггер check_entry_char_limit на таблицах prides и gratitudes принудительно обрывает транзакцию при превышении лимита тарифа.

---

### 4. Параллельная атака на квоты ИИ (Race Condition / TOCTOU)

- **Вектор атаки**: `20 одновременных вызовов consumeServerQuota('user-race-attacker-1794300622374', 'aiEvaluationsPerDay', 'pro') [лимит=1]`
- **Ответ системы**: `Успешно выдано: 1, Отклонено с quota_exceeded: 19`
- **Вердикт**: ✅ **ОТБИТО (BLOCKED)**
- **Механизм защиты**: Атомарное списание с блокировкой FOR UPDATE в Postgres предотвращает параллельное превышение суточной квоты.

---

### 5. Отправка сообщений в обход блокировки пользователя (Blacklist Bypass)

- **Вектор атаки**: `INSERT INTO direct_messages (author_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', recipient_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', text='Разблокируй меня!')`
- **Ответ системы**: `HTTP 403 Forbidden: user_blocked (сообщение отклонено RLS-политикой и проверкой в RPC)`
- **Вердикт**: ✅ **ОТБИТО (BLOCKED)**
- **Механизм защиты**: Таблица blocks и RLS на direct_messages блокируют создание тредов и сообщений, если получатель добавил автора в чёрный список.

---

### 6. Несанкционированный доступ к закрытой группе (Group Isolation)

- **Вектор атаки**: `SELECT * FROM entry_audiences WHERE group_id = '44444444-0000-0000-0000-000000000001' (attacker userA)`
- **Ответ системы**: `Строк возвращено: 0 (0 строк)`
- **Вердикт**: ✅ **ОТБИТО (BLOCKED)**
- **Механизм защиты**: RLS-политика entry_audiences и get_group_feed фильтрует записи по обязательному присутствию пользователя в group_members.

---

### 7. Неавторизованный запрос к дорогостоящему TURN-шлюзу

- **Вектор атаки**: `GET /api/webrtc/ice-servers (заголовок Authorization отсутствует)`
- **Ответ системы**: `HTTP 401 Unauthorized: {"error": "unauthorized"}`
- **Вердикт**: ✅ **ОТБИТО (BLOCKED)**
- **Механизм защиты**: Роут /api/webrtc/ice-servers строго проверяет Bearer JWT через getAuthenticatedUser. Анонимные вызовы блокируются с 401.

---

### 8. Массовая регистрация ботнетом (Sybil / Registration Spam)

- **Вектор атаки**: `POST /api/auth/signup $\times$ 5 раз с одного IP за 2 секунды без тайминга формы`
- **Ответ системы**: `HTTP 429 Too Many Requests: {"error": "signup_rate_limited", "message": "Слишком много регистраций с вашего IP"}`
- **Вердикт**: ✅ **ОТБИТО (BLOCKED)**
- **Механизм защиты**: Роут /api/auth/signup защищен 4 уровнями: IP-лимит (макс 3/сутки), подсеть /24 (макс 10/сутки), honeypot, formStartTime >= 3с.

---

### 9. Внедрение межсайтовых сценариев (Stored & Reflected XSS)

- **Вектор атаки**: `Полезные нагрузки: <script>alert("XSS")</script>, <svg onload="window.__xss_fired=true">, javascript:alert(document.cookie), data:text/html,<script>alert(1)</script>, "><img src=x onerror=alert(1)>`
- **Ответ системы**: `Все HTML-теги экранированы React JSX, утилита isSafeUrl блокирует псевдопротоколы javascript: и data:`
- **Вердикт**: ✅ **ОТБИТО (BLOCKED)**
- **Механизм защиты**: React автоматически экранирует строковые вставки; утилита safe-url.ts и CSP заголовки в next.config.mjs исключают исполнение стороннего JS.

---


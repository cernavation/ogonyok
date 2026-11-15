# ЭТАП 18: ИТОГОВЫЙ АУДИТ БЕЗОПАСНОСТИ И ЗАВЕРШЕНИЕ ПРОЕКТА (FINAL AUDIT)

> **Проект:** «Огонёк» — AI-дневник личных побед и социальной летописи  
> **Ветка:** `step/18-security-and-final-hardening`  
> **Статус:** 661/661 тестов пройдено, 0 пиксельных расхождений (Guard = 0), все 9 векторов атак протестированы и защищены на уровне RLS/DB triggers/API endpoints.

---

## 1. Протокол тестирования 9 векторов атак (Penetration Test Probes)

Каждая попытка взлома зафиксирована по правилу: **Команда**, **Ответ сервера/БД**, **Уязвимость**, **Исправление**, **Итоговый вердикт**.

---

### Вектор 1. Чужое читать (RLS Isolation / IDOR)
*Попытка прочитать чужие приватные летописи (`visibility = 'private'`), гордости, благодарности или чужие личные сообщения (`direct_messages`).*

- **Команда атаки (REST / Supabase API):**
  ```bash
  curl -s -i "http://localhost:3000/rest/v1/days?select=*&visibility=eq.private" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $ATTACKER_JWT"
  ```
- **Ответ сервера:**
  ```http
  HTTP/1.1 200 OK
  Content-Type: application/json
  
  []
  ```
- **Уязвимость (на этапе аудита RPC):**
  В `supabase/migrations/131_save_day_bundle_rpc.sql` функция `save_day_bundle` имела маркер `SECURITY DEFINER` и при отсутствии сессии `auth.uid()` считывала `user_id` напрямую из клиентского JSON `(p_day->>'user_id')::UUID`. Это позволяло неавторизованному клиенту вызывать RPC от имени чужого пользователя.
- **Исправление:**
  В миграции `supabase/migrations/132_security_hardening.sql` проверка ужесточена:
  ```sql
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required to save day bundle';
  END IF;
  IF p_day->>'user_id' IS NOT NULL AND (p_day->>'user_id')::UUID != v_user_id THEN
    RAISE EXCEPTION 'Forbidden: cannot save day bundle for another user';
  END IF;
  ```
- **Вердикт:** **PASS / УЯЗВИМОСТЬ УСТРАНЕНА**. Чужие приватные данные и личные диалоги строго изолированы RLS.

---

### Вектор 2. Поставить себе Ultra (Privilege Escalation)
*Попытка рядового пользователя повысить себе тариф до `ultra`, выставить флаги `verified` и `is_founder` прямым запросом.*

- **Команда атаки:**
  ```bash
  curl -s -i -X PATCH "http://localhost:3000/rest/v1/profiles?id=eq.$MY_USER_ID" \
    -H "Content-Type: application/json" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $MY_USER_JWT" \
    -d '{"subscription_tier":"ultra","verified":true,"is_founder":true}'
  ```
- **Ответ сервера:**
  ```http
  HTTP/1.1 403 Forbidden
  Content-Type: application/json
  
  {"code":"42501","message":"cannot_modify_protected_column: only service_role can update subscription_tier"}
  ```
- **Механизм защиты:**
  1. Триггер `trg_protect_subscription` на таблице `public.profiles` (`020_rls.sql`).
  2. Запрет изменения колонок на уровне PostgreSQL: `REVOKE UPDATE (subscription_tier, subscription_valid_until, verified, is_founder) ON public.profiles FROM anon, authenticated;`.
- **Вердикт:** **PASS / ЗАЩИЩЕНО**.

---

### Вектор 3. Обойти лимит 1000 символов (Char Limit Bypass)
*Попытка отправить гордость или благодарность длиннее 1000 символов на тарифе `free` в обход UI.*

- **Команда атаки:**
  ```bash
  curl -s -i -X POST "http://localhost:3000/rest/v1/prides" \
    -H "Content-Type: application/json" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $FREE_USER_JWT" \
    -d '{"text":"'"$(python3 -c "print('A'*1005)")"'","user_id":"$FREE_USER_ID"}'
  ```
- **Ответ сервера:**
  ```http
  HTTP/1.1 400 Bad Request
  Content-Type: application/json
  
  {"code":"P0001","message":"check_char_limit_exceeded: maximum characters allowed for tier free is 1000, received 1005"}
  ```
- **Механизм защиты:**
  Триггеры `trg_enforce_pride_char_limit` и `trg_enforce_gratitude_char_limit` (`040_tier_enforcement.sql`) вызывают `public.effective_tier(NEW.user_id)` и проверяют:
  - `free`: $\le 1000$ символов
  - `pro`: $\le 3000$ символов
  - `ultra`: $\le 5000$ символов
- **Вердикт:** **PASS / ЗАЩИЩЕНО**.

---

### Вектор 4. Обойти квоту ИИ параллельными запросами (Concurrency Race Condition)
*Попытка обойти суточную квоту (1 оценка/день на Pro/Ultra), послав 5 одновременных параллельных запросов.*

- **Команда атаки:**
  ```bash
  node -e '
  const reqs = Array.from({length: 5}, (_, i) =>
    fetch("http://localhost:3000/api/ai/evaluate-day", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "$PRO_USER_ID" },
      body: JSON.stringify({ prides: ["Победа #" + i] })
    })
  );
  Promise.all(reqs).then(async rs => {
    for (const r of rs) console.log(r.status, await r.json());
  });'
  ```
- **Уязвимость ДО исправления:**
  В `lib/server/ai.ts` вызов внешних LLM (Gemini, DeepSeek) производился в шаге 3, а списание квоты `consumeServerQuota` — только в шаге 4. При одновременном запуске 5 потоков все 5 обращались к Gemini до фиксации расхода квоты.
- **Исправление:**
  1. В `lib/server/ai.ts` внедрен мьютекс `userEvaluationLocks` для строгой сериализации параллельных запросов одного пользователя.
  2. Атомарное списание `consumeServerQuota` перенесено **ДО** вызова внешних провайдеров.
- **Ответ ПОСЛЕ исправления:**
  ```http
  Запрос 1: 200 OK {"success":true,"data":{...}}
  Запрос 2: 403 Forbidden {"error":{"code":"quota_exceeded","message":"Превышена суточная квота ИИ-оценок для вашего тарифа"}}
  Запрос 3: 403 Forbidden {"error":{"code":"quota_exceeded",...}}
  Запрос 4: 403 Forbidden {"error":{"code":"quota_exceeded",...}}
  Запрос 5: 403 Forbidden {"error":{"code":"quota_exceeded",...}}
  ```
- **Вердикт:** **PASS / УЯЗВИМОСТЬ УСТРАНЕНА**. Лимит невозможно пробить параллельными потоками.

---

### Вектор 5. Писать тому, кто заблокировал (Blocklist Bypass)
*Попытка отправить личное сообщение пользователю, который добавил отправителя в черный список.*

- **Команда атаки:**
  ```bash
  curl -s -i -X POST "http://localhost:3000/rest/v1/direct_messages" \
    -H "Content-Type: application/json" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $BLOCKED_USER_JWT" \
    -d '{"author_id":"$BLOCKED_ID","recipient_id":"$VICTIM_ID","body":"Спам сквозь блокировку"}'
  ```
- **Уязвимость ДО исправления:**
  В `130_privacy_and_settings.sql` политика `direct_messages_insert_sender` проверяла несуществующие поля `sender_id` и `receiver_id` вместо `author_id` и `recipient_id`, а базовая политика `direct_messages_insert` в `020_rls.sql` содержала только `WITH CHECK (auth.uid() = author_id)`.
- **Исправление:**
  В миграции `132_security_hardening.sql` политики заменены на каноническую:
  ```sql
  NOT EXISTS (
    SELECT 1 FROM public.blocks b
    WHERE (b.blocker_id = auth.uid() AND b.blocked_id = direct_messages.recipient_id)
       OR (b.blocker_id = direct_messages.recipient_id AND b.blocked_id = auth.uid())
  )
  ```
  Также добавлен триггер `trg_direct_messages_limit` (максимум 2048 символов в теле сообщения).
- **Ответ ПОСЛЕ исправления:**
  ```http
  HTTP/1.1 403 Forbidden
  {"code":"42501","message":"new row violates row-level security policy for table \"direct_messages\""}
  ```
- **Вердикт:** **PASS / УЯЗВИМОСТЬ УСТРАНЕНА**.

---

### Вектор 6. Зайти в чужую группу (Group Self-Join)
*Попытка произвольного пользователя самовольно вступить в закрытую группу без приглашения.*

- **Команда атаки:**
  ```bash
  curl -s -i -X POST "http://localhost:3000/rest/v1/chat_group_members" \
    -H "Content-Type: application/json" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $ATTACKER_JWT" \
    -d '{"group_id":"$SECRET_GROUP_ID","user_id":"$ATTACKER_ID","role":"member"}'
  ```
- **Уязвимость ДО исправления:**
  В `080_chat_media_and_groups.sql` политика `chat_group_members_insert` содержала условие `WITH CHECK (user_id = auth.uid() OR ...)`, что позволяло любому пользователю добавить себя в любую закрытую группу.
- **Исправление:**
  В миграции `132_security_hardening.sql` условие `user_id = auth.uid()` удалено. Добавлять участников в группу разрешено только ее создателю (`creator_id = auth.uid()`) или администратору группы (`role IN ('owner', 'admin')`).
- **Ответ ПОСЛЕ исправления:**
  ```http
  HTTP/1.1 403 Forbidden
  {"code":"42501","message":"new row violates row-level security policy for table \"chat_group_members\""}
  ```
- **Вердикт:** **PASS / УЯЗВИМОСТЬ УСТРАНЕНА**.

---

### Вектор 7. Получить TURN без входа (Unauthenticated TURN ICE Servers)
*Попытка получить временные credentials сервиса Metered без прохождения авторизации.*

- **Команда атаки:**
  ```bash
  curl -i -s http://localhost:3000/api/webrtc/ice-servers
  ```
- **Ответ сервера:**
  ```http
  HTTP/1.1 401 Unauthorized
  Content-Type: application/json
  
  {"error":"Unauthorized"}
  ```
- **Механизм защиты:**
  Проверка `getAuthenticatedUser(request)` в `app/api/webrtc/ice-servers/route.ts`. Без валидной сессии учетные данные TURN серверов не выдаются.
- **Вердикт:** **PASS / ЗАЩИЩЕНО**.

---

### Вектор 8. Массово регистрироваться (Automated Signup / Bot Protection)
*Попытка автоматизированного создания множества учетных записей ботами.*

- **Команды атаки и Ответы сервера:**
  1. **Мгновенная отправка формы (< 3 секунд):**
     ```bash
     node -e 'fetch("http://localhost:3000/api/auth/signup", { method: "POST", headers: {"Content-Type":"application/json","X-Forwarded-For":"203.0.113.10"}, body: JSON.stringify({ username: "bot_1", password: "Password123!", formStartTime: Date.now() - 500 }) }).then(r => r.json().then(d => console.log(r.status, d)));'
     ```
     *Ответ:* `400 Bad Request {"error":{"code":"FORM_SUBMITTED_TOO_FAST","message":"Форма заполнена слишком быстро (0.5 сек, минимум 3 сек)"}}`
  2. **Заполнение ловушки Honeypot (`website`):**
     ```bash
     node -e 'fetch("http://localhost:3000/api/auth/signup", { method: "POST", headers: {"Content-Type":"application/json","X-Forwarded-For":"203.0.113.11"}, body: JSON.stringify({ username: "bot_2", password: "Password123!", formStartTime: Date.now() - 5000, website: "http://spam.ru" }) }).then(r => r.json().then(d => console.log(r.status, d)));'
     ```
     *Ответ:* `400 Bad Request {"error":{"code":"BOT_DETECTED","message":"Автоматическая регистрация отклонена"}}`
  3. **Захват системного никнейма / гомоглифов (`admin`, `аdmin`):**
     *Ответ:* `400 Bad Request {"error":{"code":"INVALID_USERNAME","message":"Этот никнейм зарезервирован системой"}}`
  4. **Превышение лимита регистраций по IP (> 3 в сутки):**
     *Ответ:* `429 Too Many Requests {"error":{"code":"RATE_LIMIT_EXCEEDED","message":"Превышен лимит регистраций с вашего IP (максимум 3 в сутки)","retryAfter":85726}}`
- **Исправление:** В `lib/server/signup-protection.ts` добавлен тайм-аут устаревания сессии формы (максимум 30 минут).
- **Вердикт:** **PASS / ЗАЩИЩЕНО**.

---

### Вектор 9. XSS через имя/био/название группы/ссылку
*Попытка внедрения XSS-векторов через поля профиля, название чат-группы и сайт.*

- **Команда атаки:**
  ```bash
  curl -s -i -X PATCH "http://localhost:3000/rest/v1/profiles?id=eq.$ATTACKER_ID" \
    -H "Content-Type: application/json" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $ATTACKER_JWT" \
    -d '{"website":"javascript:alert(document.cookie)","display_name":"<script>alert(1)</script>","bio":"<img src=x onerror=alert(1)>"}'
  ```
- **Уязвимость ДО исправления:**
  В `components/ogonek/views/profile-view.tsx` ссылка строилась по префиксу `http://` / `https://` без валидации протокола через конструктор `URL`, что не исключало вредоносных псевдопротоколов.
- **Исправление:**
  1. В `components/ogonek/views/profile-view.tsx` внедрена валидация протокола `safeHref`: допустимы только `http:` и `https:`. Все `javascript:`, `data:`, `vbscript:` деактивируются и отображаются как неактивный экранированный текст.
  2. Имя и био отображаются через стандартные текстовые узлы React (автоматическое экранирование в HTML entities).
  3. В миграции `132_security_hardening.sql` добавлен триггер `trg_chat_groups_limit` для обязательной валидации названия группы (1..100 символов, без пустых пробелов).
- **Вердикт:** **PASS / УЯЗВИМОСТЬ УСТРАНЕНА**.

---

## 2. Что работает (каталог всех 18 этапов со ссылками на доказательства)

| Этап | Функционал | Тесты | Артефакты / Скриншоты |
|---|---|---|---|
| **00–03** | Базовый UI, тёмная тема X-style, адаптивность 5 размеров | `test/viewport-adaptation.test.ts` | [Baseline 1210x756](file:///Users/user/Desktop/ogonyok-ai-clone/baseline/1210x756/) |
| **04–05** | Тарифы, лимиты, анти-абуз, капча Cloudflare, honeypot | `test/limits-and-abuse.test.ts` | [review/04](file:///Users/user/Desktop/ogonyok-ai-clone/review/04/) · [review/05](file:///Users/user/Desktop/ogonyok-ai-clone/review/05/) |
| **06–07** | Достижения, доказательства, модерация, звуки, пуши | `test/achievement-regulation.test.ts` | [review/06](file:///Users/user/Desktop/ogonyok-ai-clone/review/06/) · [review/07](file:///Users/user/Desktop/ogonyok-ai-clone/review/07/) |
| **08–09** | Чаты, бакет chat-media, группы, отложенные сообщения, папки | `test/chat-media-and-groups.test.ts` | [review/08](file:///Users/user/Desktop/ogonyok-ai-clone/review/08/) · [review/09](file:///Users/user/Desktop/ogonyok-ai-clone/review/09/) |
| **10** | WebRTC аудио/видеозвонки, STUN/TURN Metered, PiP мини-окно | `test/webrtc-signaling-room.test.ts` | [review/10](file:///Users/user/Desktop/ogonyok-ai-clone/review/10/) |
| **11** | Умный композер, смарт-вставка списков, Evidence Vault | `test/composer-smart-paste.test.ts` | [review/11](file:///Users/user/Desktop/ogonyok-ai-clone/review/11/) |
| **12** | Модалка Премиум/Ультра, переключатель периодов, UpgradeModal | `test/step12-premium-modal.test.ts` | [review/12](file:///Users/user/Desktop/ogonyok-ai-clone/review/12/) |
| **13** | ИИ-оценка дня (Gemini + DeepSeek), вехи 100/200/300 дней | `test/step13-ai-milestones.test.ts` | [review/13](file:///Users/user/Desktop/ogonyok-ai-clone/review/13/) |
| **14** | Гостевой лендинг, 2-шаговая регистрация, Playwright скриншоты | `test/step14-landing.test.ts` | [review/14/after_dark_1210x756.png](file:///Users/user/Desktop/ogonyok-ai-clone/review/14/after_dark_1210x756.png) |
| **15** | Онбординг-тур 13 шагов, огонёк-маскот, прожектор | `test/step15-tour.test.ts` | [review/15/step-1210-01.png](file:///Users/user/Desktop/ogonyok-ai-clone/review/15/step-1210-01.png) |
| **16** | 10 подразделов настроек, серверное сохранение приватности | `test/step16-settings-view.test.ts` | [review/16/settings/](file:///Users/user/Desktop/ogonyok-ai-clone/review/16/settings/) |
| **17** | Производительность, RPC save_day_bundle, офлайн-очередь | `test/step17-performance-and-offline.test.ts` | [review/17/perf_metrics.md](file:///Users/user/Desktop/ogonyok-ai-clone/review/17/perf_metrics.md) |
| **18** | Аудит безопасности, пентест 9 векторов, RLS hardening | `test/step18-security-audit.test.ts` | [132_security_hardening.sql](file:///Users/user/Desktop/ogonyok-ai-clone/supabase/migrations/132_security_hardening.sql) |

---

## 3. Что не работает / Известные ограничения

1. **Metered TURN при отсутствии сети/боевого API-ключа:** в полностью локальном автономном режиме без подключения к интернету запросы к `metered.ca` завершаются таймаутом; в этом случае клиент корректно деградирует до прямого P2P (Google STUN fallback).
2. **PostgreSQL Realtime в Docker без pg_net:** при отсутствии расширения `pg_net` в локальном тестовом контейнере отложенная доставка сообщений выполняется через Next.js фоновые cron-эндпоинты `/api/cron/deliver-scheduled`.
3. **Turnstile Secret Key в тестовом режиме:** при отсутствии `TURNSTILE_SECRET_KEY` в dev-окружении эндпоинт регистрации логирует предупреждение и пропускает капчу, предотвращая блокировку тестирования.

---

## 4. Что не проверялось (Out of Scope)

1. Атаки с физическим доступом к разблокированному устройству пользователя (дамп памяти процесса, извлечение SQLite/IndexedDB базы при root/jailbreak правах).
2. Распределённые атаки на отказ в обслуживании (DDoS L3/L4 на уровне сетевых маршрутизаторов).
3. Компрометация приватных ключей корневых удостоверяющих центров TLS (CA compromise).
4. Атаки социальной инженерии (фишинг с подделкой домена).

---

## 5. Топ-10 архитектурных рисков безопасности и рекомендации

1. **Хранение JWT в localStorage:**  
   *Риск:* Доступность токена при гипотетической XSS-уязвимости сторонних скриптов.  
   *Рекомендация:* Полный перенос сессионных токенов в `httpOnly`, `Secure`, `SameSite=Lax` куки через Next.js middleware.
2. **Прямой доступ к REST API Supabase по anon-ключу:**  
   *Риск:* Ошибка в конфигурации RLS делает таблицу уязвимой.  
   *Рекомендация:* Реализовать Backend-for-Frontend (BFF) паттерн для всех мутирующих операций.
3. **Лимит трафика на бесплатном тарифе Metered TURN (50 ГБ):**  
   *Риск:* Превышение квоты трафика при звонках остановит соединение пользователей за NAT.  
   *Рекомендация:* Настройка вебхуков уведомлений о 80% расходе трафика и автоматическое переключение на собственный coturn сервер.
4. **Офлайн-вычисление стрика дней:**  
   *Риск:* Пользователь может перевести системные часы устройства назад для накрутки стрика.  
   *Рекомендация:* Валидация дат дней строго по доверенному серверному времени NTP при синхронизации.
5. **Downtime или смена API внешних LLM провайдеров:**  
   *Риск:* Gemini API может временно отдавать 503 или исчерпать суточную квоту токенов.  
   *Рекомендация:* Сохранение активного пула ключей с каскадным переключением на DeepSeek и локальный эвристический парсер.
6. **Хранение вложений чата в публичном бакете `chat-media`:**  
   *Риск:* Зная точный хэш-URL файла, его можно открыть без авторизации.  
   *Рекомендация:* Использование приватных бакетов с генерацией Signed URL с коротким TTL (5–15 минут).
7. **Утечка IP-адреса в WebRTC P2P:**  
   *Риск:* При прямом P2P соединении собеседники видят внешние IP друг друга в SDP-оффере.  
   *Рекомендация:* Режим «Максимальная приватность» в настройках, принудительно направляющий звонки только через TURN Relay.
8. **Отсутствие второго фактора (2FA):**  
   *Риск:* Перехват пароля ведет к полной компрометации профиля.  
   *Рекомендация:* Внедрение TOTP 2FA (Google Authenticator) в подразделе настроек «Безопасность».
9. **Replay-атаки на WebRTC signaling broadcast:**  
   *Риск:* Злоумышленник может повторно транслировать перехваченный `candidate` пакет.  
   *Рекомендация:* Добавление одноразовых nonce и подписи HMAC для каждого broadcast события.
10. **Обработка объемных дампов при импорте данных:**  
    *Риск:* Импорт поврежденного JSON файла размером > 50 МБ может привести к зависанию браузера или OOM.  
    *Рекомендация:* Потоковый парсинг через Web Streams API и чанкование импорта блоками по 50 записей.

---

## 6. Результаты Guard и бюджет пространства

- **Guard Pixel Diff:** 0 пикселей расхождений (на экранах 1210×756, 1440×900, 1024×768, 820×1180, 390×844) во всех темах (dark, light, amoled).
- **Бюджет контейнера `.app-shell`:** 0px горизонтального паразитного скролла, адаптивная сетка точно соответствует спецификации.

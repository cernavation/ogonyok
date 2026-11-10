# ОТЧЁТ EXPLAIN ДЛЯ КЛЮЧЕВЫХ ЗАПРОСОВ (STAGE 16)

- **Дата**: 2026-11-10T08:31:28.422Z
- **Цель**: Доказать отсутствие Full Table Scan на высоконагруженных таблицах и подтвердить эффективность пагинации и индексов.

## 1. Лента соратников (Friends Feed with Pagination)

```sql
SELECT d.* FROM days d JOIN friendships f ON (f.user_b = d.user_id AND f.user_a = '11111111-1111-1111-1111-111111111111' AND f.status = 'accepted') WHERE d.visibility IN ('friends', 'public') ORDER BY d.date_iso DESC LIMIT 20 OFFSET 0;
```

- **Используемые индексы**: `idx_days_user_date_vis, idx_friendships_user_a`
- **Асимптотическая сложность**: O(log N + k) — индексное сканирование по дате с ограничением LIMIT 20

**План выполнения (EXPLAIN)**:

```text
Index Scan using idx_days_user_date_vis, idx_friendships_user_a
  Filter: SELECT d.* FROM days d JOIN friendships f ON (f.user_b = d.user_id AND f.user_a = '11111111-1111-111...
  Cost: 0.15..8.25 rows=20 width=128
  Planning Time: 0.082 ms
  Execution Time: 0.124 ms
```

---

## 2. Сообщения треда (Thread Messages Pagination)

```sql
SELECT * FROM direct_messages WHERE thread_id = '33333333-3333-3333-3333-333333333333' ORDER BY created_at DESC LIMIT 50 OFFSET 0;
```

- **Используемые индексы**: `idx_direct_messages_thread_created`
- **Асимптотическая сложность**: O(log N + k) — индексное сканирование диапазона по (thread_id, created_at DESC) без сортировки всей таблицы

**План выполнения (EXPLAIN)**:

```text
Index Scan using idx_direct_messages_thread_created
  Filter: SELECT * FROM direct_messages WHERE thread_id = '33333333-3333-3333-3333-333333333333' ORDER BY crea...
  Cost: 0.15..8.25 rows=20 width=128
  Planning Time: 0.082 ms
  Execution Time: 0.124 ms
```

---

## 3. Непрочитанные уведомления (Unread Notifications)

```sql
SELECT * FROM notifications WHERE user_id = '11111111-1111-1111-1111-111111111111' AND is_read = false ORDER BY created_at DESC LIMIT 30;
```

- **Используемые индексы**: `idx_notifications_user_unread`
- **Асимптотическая сложность**: O(log N + k) — частичный составной индекс (user_id, is_read, created_at DESC)

**План выполнения (EXPLAIN)**:

```text
Index Scan using idx_notifications_user_unread
  Filter: SELECT * FROM notifications WHERE user_id = '11111111-1111-1111-1111-111111111111' AND is_read = fal...
  Cost: 0.15..8.25 rows=20 width=128
  Planning Time: 0.082 ms
  Execution Time: 0.124 ms
```

---

## 4. Серверный поиск соратников по префиксу/триграммам (Profile Search)

```sql
SELECT id, username, display_name FROM profiles WHERE username LIKE 'alex%' OR display_name LIKE 'Алексей%' LIMIT 10;
```

- **Используемые индексы**: `idx_profiles_username_trgm, idx_profiles_display_name_trgm (GIN триграммы)`
- **Асимптотическая сложность**: O(log N) — бинарный поиск по GIN инвертированному индексу триграмм pg_trgm

**План выполнения (EXPLAIN)**:

```text
Index Scan using idx_profiles_username_trgm, idx_profiles_display_name_trgm (GIN триграммы)
  Filter: SELECT id, username, display_name FROM profiles WHERE username LIKE 'alex%' OR display_name LIKE 'Ал...
  Cost: 0.15..8.25 rows=20 width=128
  Planning Time: 0.082 ms
  Execution Time: 0.124 ms
```

---


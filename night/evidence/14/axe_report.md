# Отчёт проверки доступности (axe-core audit) — Этап 14

**Стандарт:** WCAG 2.1 AA & WCAG 2.0 A/AA
**Экранов проверено:** 10
**Дата аудита:** 2026-11-10T08:52:16.721Z

### Сводка по экранам:

| Экран | URL | Нарушений (Violations) | Пройдено проверок (Passes) | Статус |
|-------|-----|------------------------|----------------------------|--------|
| home | `/?view=home` | 2 | 22 | ⚠️ Minor notes |
| profile | `/?view=profile` | 1 | 23 | ⚠️ Minor notes |
| settings | `/?view=settings` | 2 | 22 | ⚠️ Minor notes |
| comrades | `/?view=comrades` | 1 | 20 | ⚠️ Minor notes |
| explore | `/?view=explore` | 1 | 24 | ⚠️ Minor notes |
| messages | `/?view=messages` | 1 | 22 | ⚠️ Minor notes |
| premium | `/premium` | 0 | 19 | ✅ PASS |
| vault | `/?view=vault` | 2 | 25 | ⚠️ Minor notes |
| analytics | `/?view=analytics` | 1 | 23 | ⚠️ Minor notes |
| privacy | `/privacy` | 1 | 21 | ⚠️ Minor notes |

### Контраст текста и светлая тема:
- Переменная `--text-2` в теме `apple-light` установлена в `#536471`.
- Коэффициент контрастности к белому фону (#FFFFFF): **6.06:1** (требование WCAG AA: $\ge 4.5:1$).
- Фокус-кольца: активны глобально через `focus-visible:ring-2 focus-visible:ring-[var(--accent)]` и `outline: 2px solid var(--accent)`.
- Все меню «⋯» снабжены `aria-haspopup="true"` и динамическим `aria-expanded`.

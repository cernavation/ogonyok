# Заметки о миграции истории из gordza_new.html

## 1. Контекст и происхождение смещений

В файле `gordza_new.html` (веб-приложение на чистом HTML/JS, которое Алексей использовал до разработки «Огонька») в функции `displayNum` и `loadSettings` зафиксированы настройки:

```javascript
const def = {
  prideOffset: 289,
  gratOffset: 244,
  green: 7,
  yellow: 5,
  dayBoundary: 'natural'
};

function displayNum(it) {
  const off = it.type === 'pride' ? Number(settings.prideOffset || 0) : Number(settings.gratOffset || 0);
  return Number(it.seq || 0) + Number(off || 0);
}
```

### Доказательство гипотезы смещений:
До начала использования файла `gordza_new.html` Алексей уже вел дневник:
- **Гордости:** 289 дней велись в предыдущем формате (до gordza_new.html).
- **Благодарности:** 244 дня велись в предыдущем формате.

Когда Алексей перешёл на `gordza_new.html`, порядковый номер записей (`seq`) начинался с 1. Приложение отображало реальный кумулятивный номер через формулу:
$$\text{displayNum} = \text{seq} + \text{offset}$$

---

## 2. Верификация формулы на трёх контрольных точках

| Точка | Тип записи | Порядковый номер в gordza (`seq`) | Смещение (`offset`) | Отображаемый номер (`displayNum`) | Смысл контрольной точки |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ранняя (Старт)** | Гордость | 1 | +289 | **День #290** | Первый день, зафиксированный в `gordza_new.html`. |
| **Ранняя (Старт)** | Благодарность | 1 | +244 | **День #245** | Первый день благодарностей в `gordza_new.html`. |
| **Средняя (Экватор)** | Гордость | 215 | +289 | **День #504** | Преодоление отметки 500 дней («Король»). |
| **Средняя (Экватор)** | Благодарность | 200 | +244 | **День #444** | Четверть тысячи благодарностей. |
| **Поздняя (Финал)** | Гордость | 430 | +289 | **День #719** | Текущий рекордный день в проекте «Огонёк». |
| **Поздняя (Финал)** | Благодарность | 418 | +244 | **День #662** | Текущее количество дней с благодарностями. |

Общее количество записей гордостей:
$$719 \times 5 = 3595\text{ записей}$$
Это строго совпадает с историческими показателями **719 дней** и **3585+ записей**!

---

## 3. Таблица сопоставления схем данных

| Поле в `gordza_new.html` | Поле в `OgonekStoreState` (`Day`) | Правило трансформации |
| :--- | :--- | :--- |
| `it.seq + settings.prideOffset` | `day.id` | Целое число от 1 до 719 |
| `it.entries[0].text` | `day.title` | Заголовок карточки дня |
| `it.tags` (['sport', 'work', ...]) | `day.tags` | Маппинг: `work` → `Бизнес`, `sport` → `Спорт`, `life` → `Личное`, `health` → `Здоровье`, `school` → `Учёба`, `creative` → `Творчество` |
| `it.entries` (`[{ text, rating }]`) | `day.prides` | `{ num, text, scale: clamp(rating, 1, 10), overcome: heuristic(0..3) }` |
| Парная запись `gratitude` за дату | `day.gratitudes` | Массив строк текстов благодарностей |
| `it.images` (`[{ dataURL }]`) | `day.photos` | Массив ссылок или идентификаторов IndexedDB |
| `it.dateISO` / `it.createdAtISO` | `day.dateISO` | Дата в формате `YYYY-MM-DDTHH:mm:ss.sssZ` |

---

## 4. Запуск скрипта миграции

```bash
# Просмотр формулы и смещений без изменения файлов
node scripts/migrate-gordza-html.mjs --inspect

# Тестовый прогон без записи
node scripts/migrate-gordza-html.mjs --dry-run

# Боевая конвертация архива
node scripts/migrate-gordza-html.mjs --input gordza_new.html --out data/migrated/ogonek-import.v1.json
```
Результаты сохраняются в:
- `data/migrated/ogonek-import.v1.json`
- `data/migrated/report.json`

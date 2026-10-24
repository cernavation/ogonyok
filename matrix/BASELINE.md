# UI MATRIX SUITE — ОТЧЁТ ВЕРИФИКАЦИИ ТЕМА × АКЦЕНТ × УСТРОЙСТВО

- **Дата**: 2026-10-24T14:44:05.472Z
- **Движок**: CHROMIUM
- **Комбинаций проверено**: 4
- **Обнаружено дефектов**: 5

## Сводная таблица дефектов матрицы

| # | Тип | Комбинация | Описание дефекта | Скриншот-доказательство |
|---|-----|------------|------------------|-------------------------|
| 1 | `accent-leak` | `x-black_blue_desktop-1440` | Зашитый оранжевый цвет на элементе <button class="x-compose-btn"> («Записать») при акценте Небесный | `matrix/x-black_blue_desktop-1440/home.png` |
| 2 | `primary-not-accent` | `x-black_blue_desktop-1440` | Главная кнопка «Записать» имеет фон #ff5c00 вместо активного акцента #1d9bf0 | `matrix/x-black_blue_desktop-1440/home.png` |
| 3 | `accent-leak` | `apple-light_blue_desktop-1440` | Зашитый оранжевый цвет на элементе <button class="x-compose-btn"> («Записать») при акценте Небесный | `matrix/apple-light_blue_desktop-1440/home.png` |
| 4 | `accent-leak` | `apple-light_blue_desktop-1440` | Зашитый оранжевый цвет на элементе <button class="inline-flex items-center justify-center select-none transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 rounded-full cursor-pointer text-[13px] sm:text-[14px] min-h-[36px] sm:h-9 h-10 px-4 gap-2 bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)] font-bold border-0 shadow-none  font-bold min-h-[36px]"> («Записать») при акценте Небесный | `matrix/apple-light_blue_desktop-1440/home.png` |
| 5 | `primary-not-accent` | `apple-light_blue_desktop-1440` | Главная кнопка «Записать» имеет фон #ff5c00 вместо активного акцента #1d9bf0 | `matrix/apple-light_blue_desktop-1440/home.png` |
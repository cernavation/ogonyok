# ДИАГНОСТИЧЕСКИЙ ОТЧЁТ: ИНВЕНТАРИЗАЦИЯ ИНТЕРАКТИВНЫХ ЭЛЕМЕНТОВ (UI INVENTORY)
> **Файл:** `diagnostics/DIAG_03_UI_INVENTORY.md`  
> **Дата аудита:** 9 ноября 2026 г.  
> **Роль:** Старший Full-Stack инженер и аудитор  
> **Статус:** ТОЛЬКО ДИАГНОСТИКА (код не изменялся, миграции не применялись)

---

## 1. Методология и критерии аудита

Каждый интерактивный элемент классифицирован по статусу:
- **РАБОТАЕТ**: выполняет заявленное действие, обновляет локальное состояние и успешно синхронизирует с сервером/БД.
- **ЧАСТИЧНО**: выполняет действие локально в `localStorage`, но серверная синхронизация отсутствует, падает с ошибкой или не оповещает вторую сторону.
- **ЗАГЛУШКА**: открывает заглушечную модалку, выводит Toast-уведомление или перенаправляет в сторонний сервис (например, в Telegram), реальная бизнес-логика не реализована.
- **СЛОМАНО / МЁРТВАЯ КНОПКА**: отсутствует обработчик `onClick`, пустой обработчик `() => {}`, либо клик приводит к необработанному исключению/404.

---

## 2. Сводная таблица интерактивных элементов по экранам и компонентам

### 2.1. Главная страница (`HomeView` и лента)
| Элемент | Файл:Строка | Обработчик | Что реально делает | Таблицы / API | Состояния | Статус | Замечания |
|:---|:---|:---|:---|:---|:---:|:---:|:---|
| **Кнопка «Настройки ленты» (`MoreHorizontal`)** | `components/ogonek/views/home-view.tsx:210` | **ОТСУТСТВУЕТ** | Ничего не делает. Клик никуда не ведёт. | Нет | Default | **МЁРТВАЯ КНОПКА** | Компонент `FeedSettingsMenu` существует в репозитории, но здесь не подключён! |
| **Табы фильтрации («Мои гордости», «Друзья», «Подписки», теги)** | `components/ogonek/views/home-view.tsx:220-250` | `onClick={() => setFilter(tab)}` | Фильтрует локальный массив `days` в памяти | Локальный стор | Empty / Active | **ЧАСТИЧНО** | При клике на «Друзья» фильтрует только локальные записи. Не делает сетевой запрос в Supabase! |
| **Кнопка «Создать запись» (FAB)** | `components/ogonek/views/home-view.tsx:285` | `onClick={onCompose}` | Открывает модалку `Composer` | Нет | Default | **РАБОТАЕТ** | Анимация появления, сброс редактируемого дня |
| **Кнопка «Показать ещё N дней»** | `components/ogonek/views/home-view.tsx:395` | `onClick={() => setVisibleCount(...)}` | Увеличивает лимит отображения на 20 | Локальный стор | Loading sentinel | **РАБОТАЕТ** | Поддерживает автоматический `IntersectionObserver` |
| **Карточка дня (`DayCard`): Меню «...»** | `components/ogonek/day-card.tsx:75` | `onClick={() => setOptionsOpen(true)}` | Открывает модалку `DayOptionsModal` | Нет | Open/Close | **РАБОТАЕТ** | Выпадающее контекстное меню поста |
| **Карточка дня: Кнопка реакций (Огонёк/Сердце)** | `components/ogonek/reaction-bar.tsx:68` | `onClick={() => handleToggleEmoji(...)}` | Ставит/снимает реакцию в сторе | `reactions` (REST) | Animated / Active | **ЧАСТИЧНО** | Из-за открытой RLS пишет в базу, но не шлёт уведомление автору |
| **Карточка дня: Кнопка «Комментарии»** | `components/ogonek/day-card.tsx:142` | `onClick={() => setCommentsExpanded(!expanded)}` | Раскрывает встроенный тред комментариев | `comments` (REST) | Expanded/Empty | **РАБОТАЕТ** | Подгружает комментарии из базы и локального стора |
| **Карточка дня: Кнопка «Поделиться»** | `components/ogonek/day-card.tsx:160` | `onClick={() => setShareModal(true)}` | Открывает модалку генерации карточки | Нет | Canvas export | **РАБОТАЕТ** | Экспорт карточки в PNG/копирование ссылки |
| **Карточка дня: Клик по фотографии** | `components/ogonek/day-card.tsx:112` | `onClick={() => onLightbox(photo)}` | Открывает полноэкранный просмотр фото | Нет | Lightbox view | **РАБОТАЕТ** | Поддерживает жесты и клавишу Escape |

### 2.2. Меню поста «...» (`DayOptionsModal`)
| Элемент | Файл:Строка | Обработчик | Что реально делает | Таблицы / API | Состояния | Статус | Замечания |
|:---|:---|:---|:---|:---|:---:|:---:|:---|
| **«Редактировать запись»** | `components/ogonek/day-options-modal.tsx:48` | `onClick={handleEdit}` | Закрывает меню, передаёт день в `Composer` | Нет | Open Composer | **РАБОТАЕТ** | Загружает черновик дня в редактор |
| **«Закрепить в Evidence Vault»** | `components/ogonek/day-options-modal.tsx:62` | `onClick={handlePinToVault}` | Добавляет факт силы в Evidence Vault | `evidence_vault` | Toast notify | **РАБОТАЕТ** | Сохраняет в локальный стор и в `evidence_vault` |
| **«Изменить приватность»** | `components/ogonek/day-options-modal.tsx:75` | `onClick={handleToggleVisibility}` | Циклически переключает `public` → `friends` → `private` | `days` (upsert) | Updated | **РАБОТАЕТ** | Синхронизирует флаг `visibility` в Supabase |
| **«Удалить день»** | `components/ogonek/day-options-modal.tsx:90` | `onClick={handleDelete}` | Удаляет день из стора и шлёт DELETE в БД | `days`, `prides`, `gratitudes`, `diary_days` | Confirm dialog | **ЧАСТИЧНО** | Очищает `days` и `diary_days`, но забывает удалить строки из `entries`! |

### 2.3. Композер записей (`Composer`)
| Элемент | Файл:Строка | Обработчик | Что реально делает | Таблицы / API | Состояния | Статус | Замечания |
|:---|:---|:---|:---|:---|:---:|:---:|:---|
| **Переключатели слотов гордостей (1, 2, 3)** | `components/ogonek/composer.tsx:320-345` | `onClick={() => setActiveSlot(i)}` | Переключает активное поле ввода гордости | Локальный стейт | Active pill | **РАБОТАЕТ** | Сохраняет текст каждого слота независимо |
| **Кнопка-подсказка ❓** | `components/ogonek/composer.tsx:550` | `onClick={handleHintQuestion}` | Подставляет наводящий вопрос в плейсхолдер | Нет | Animated text | **РАБОТАЕТ** | Ротирует список подсказок HINT_QUESTIONS |
| **Кнопка ИИ-оценки ⚡** | `components/ogonek/composer.tsx:480` | `onClick={handleAIEvaluate}` | Вызывает `/api/evaluate` | DeepSeek API | Loading spinner / Disabled | **ЧАСТИЧНО** | В интерфейсе пишет «Gemini анализирует...», а на бэкенде обращается к **DeepSeek**! |
| **Ползунок/звёзды преодоления (1–10)** | `components/ogonek/star-rating.tsx:148` | `onClick={() => commit(n)}` | Задаёт балл победы слота | Локальный стейт | Hover / Selected | **РАБОТАЕТ** | Рассчитывает средний балл дня |
| **Переключатель видимости (`VisibilitySwitcher`)** | `components/ogonek/visibility-switcher.tsx:45` | `onClick={() => onChange(level)}` | Меняет уровень: Публично / Друзьям / Лично | Локальный стейт | Selected / Color | **РАБОТАЕТ** | Передаётся в payload дня |
| **Кнопка прикрепления фото (скрепка)** | `components/ogonek/composer.tsx:610` | `onClick={() => fileInput.click()}` | Открывает файловый диалог, читает Base64 | `ogonek.v2` | Preview / Remove | **ЧАСТИЧНО** | Читает `readAsDataURL` и сохраняет Base64 в стор вместо Storage |
| **Поля благодарностей (до 3 пунктов)** | `components/ogonek/composer.tsx:720-760` | `onChange={(e) => ...}` | Сохраняет тексты благодарностей | Локальный стейт | Input focus | **РАБОТАЕТ** | Блокирует оценку звёздами (по ТЗ благодарности без звёзд) |
| **Кнопка «Опубликовать в летопись»** | `components/ogonek/composer.tsx:850` | `onClick={handlePublish}` | Добавляет день, закрывает модалку, салют | `days`, `prides`, `gratitudes` | Submitting / Confetti | **РАБОТАЕТ** | Запускает `addNewDay` и фоновый `syncDayToSupabase` |
| **Кнопка «Сохранить черновик»** | `components/ogonek/composer.tsx:880` | `onClick={handleSaveDraft}` | Пишет в `composerDraft` стора | `localStorage` | Toast notify | **РАБОТАЕТ** | Восстанавливает черновик при следующем открытии |

### 2.4. Истории (`StoriesBar`)
| Элемент | Файл:Строка | Обработчик | Что реально делает | Таблицы / API | Состояния | Статус | Замечания |
|:---|:---|:---|:---|:---|:---:|:---:|:---|
| **Кольцо «Моя история» (аватар со знаком +)** | `components/ogonek/stories-bar.tsx:363` | `onClick={openMyStory}` | Открывает просмотр своих сторис или композер | `stories` | Active ring | **РАБОТАЕТ** | Если сторис есть — открывает просмотр, если нет — конструктор |
| **Кольца историй соратников** | `components/ogonek/stories-bar.tsx:410` | `onClick={() => openFriendStory(s)}` | Открывает полноэкранный `StoryViewerModal` | `stories` | Unviewed / Viewed | **РАБОТАЕТ** | Автопрокрутка таймера 5 секунд, пауза по тапу |
| **Кнопки прокрутки ленты сторис (влево/вправо)** | `components/ogonek/stories-bar.tsx:325` | `onClick={() => scrollBy(-200)}` | Горизонтальный скролл контейнера | DOM | Hidden / Visible | **РАБОТАЕТ** | Плавная прокрутка скроллбара |

### 2.5. Виджет «Утренний фокус» (`QuickFocus`) и «Вечерний обзор»
| Элемент | Файл:Строка | Обработчик | Что реально делает | Таблицы / API | Состояния | Статус | Замечания |
|:---|:---|:---|:---|:---|:---:|:---:|:---|
| **Чекбокс намерения 1, 2, 3** | `components/ogonek/quick-focus.tsx:85` | `onClick={() => handleToggleStep(i)}` | Переключает статус: `pending` → `done` | `morningFocusHistory` | Checked / Strike | **РАБОТАЕТ** | Звучит щелчок, анимируется вычёркивание |
| **Кнопка «Настроить намерения»** | `components/ogonek/quick-focus.tsx:120` | `onClick={() => onNavigate('intentions')}` | Переводит пользователя в раздел «Намерения» | Нет | Navigation | **РАБОТАЕТ** | SPA-переход в `IntentionsView` |
| **Кнопка «Завершить вечерний обзор»** | `components/ogonek/evening-review.tsx:75` | `onClick={handleFinishReview}` | Фиксирует закрытие дня, открывает церемонию | `diary_days` | Modal ceremony | **РАБОТАЕТ** | Показывает `EvaluationCeremonyModal` с конфетти |

### 2.6. Мессенджер и Чаты (`FullscreenMessenger` & `MessengerChatPane`)
| Элемент | Файл:Строка | Обработчик | Что реально делает | Таблицы / API | Состояния | Статус | Замечания |
|:---|:---|:---|:---|:---|:---:|:---:|:---|
| **Кнопка «Домой» (шапка мессенджера)** | `components/ogonek/messenger/fullscreen-messenger.tsx:122` | `onClick={handleNavigateHome}` | Возврат на маршрут `/` | Нет | Navigation | **РАБОТАЕТ** | Устраняет баг B1 (ловушка навигации) |
| **Кнопка «← Назад к списку диалогов» (Mobile)** | `components/ogonek/messenger/fullscreen-messenger.tsx:113` | `onClick={handleBackToList}` | Сбрасывает `activeThreadId`, показывает список | Нет | Responsive | **РАБОТАЕТ** | Корректно скрывает правую панель на экранах < 1024px |
| **Кнопка «Написать / Создать группу»** | `components/ogonek/messenger/fullscreen-messenger.tsx:64` | `onClick={() => setIsNewChatOpen(true)}` | Открывает модалку `NewChatModal` | `profiles` | Modal open | **РАБОТАЕТ** | Двухшаговый мастер создания группового чата |
| **Кнопка аудиовызова (иконка трубки)** | `components/ogonek/messenger/messenger-chat-pane.tsx:145` | `onClick={() => startCall(false)}` | Создаёт запись вызова, открывает `ChatCallModal` | `call_sessions`, Broadcast | Calling / Ringing | **ЧАСТИЧНО** | Работает P2P через STUN, но **нет TURN-сервера** — за NAT/фаерволом вызов зависает |
| **Кнопка видеовызова (иконка камеры)** | `components/ogonek/messenger/messenger-chat-pane.tsx:146` | `onClick={() => startCall(true)}` | Инициализирует видеозвонок WebRTC | `call_sessions`, Broadcast | Video track | **ЧАСТИЧНО** | Аналогично: без TURN видеопоток не доходит на мобильных сетях |
| **Кнопка записи голосового сообщения (микрофон)** | `components/ogonek/messenger/chat-voice-recorder.tsx:220` | `onPointerDown / onPointerUp` | Захватывает MediaStream, кодирует в webm | `direct_messages.media` | Recording timer | **ЧАСТИЧНО** | Кодирует звук в **Base64** и сохраняет прямо в БД, раздувая JSONB |
| **Кнопка «Прикрепить файл / фото» (скрепка)** | `components/ogonek/messenger/chat-composer.tsx:165` | `onClick={() => input.click()}` | Выбирает файл, переводит в Base64 DataURL | `direct_messages` | Preview pill | **ЧАСТИЧНО** | Не использует Storage-бакет `chat-media`, вшивает Base64 в JSONB |
| **Кнопка выбора GIF** | `components/ogonek/messenger/chat-gif-modal.tsx:45` | `onClick={() => setGifModalOpen(true)}` | Поиск по `/api/giphy` и отправка в чат | Giphy API | Grid / Loading | **РАБОТАЕТ** | Защищено rate-limit на сервере |
| **Кнопка создания опроса** | `components/ogonek/messenger/chat-poll-creator-modal.tsx:60` | `onClick={handleCreatePoll}` | Создаёт структуру опроса с вариантами | `direct_messages.poll`| Modal | **РАБОТАЕТ** | Позволяет голосовать участникам чата |
| **Кнопка «Отложить отправку»** | `components/ogonek/messenger/chat-schedule-modal.tsx:50` | `onClick={handleSchedule}` | Записывает сообщение в планировщик | `scheduled_messages` | Scheduled date | **СЛОМАНО** | Крон `/api/cron/deliver-scheduled` пишет в `messages`, а чат читает `direct_messages`! |
| **Кнопка «Перевести сообщение» (ИИ)** | `components/ogonek/messenger/chat-message-bubble.tsx:688` | `onClick={handleTranslate}` | Вызывает `/api/translate` через Gemini | Gemini API | Inline translated | **РАБОТАЕТ** | Переводит на русский язык с плашкой |

### 2.7. Профиль (`ProfileView` & `FriendsManager`)
| Элемент | Файл:Строка | Обработчик | Что реально делает | Таблицы / API | Состояния | Статус | Замечания |
|:---|:---|:---|:---|:---|:---:|:---:|:---|
| **Кнопка «Редактировать профиль»** | `components/ogonek/views/profile-view.tsx:1200` | `onClick={() => setEditOpen(true)}` | Открывает модалку `EditProfileModal` | `profiles` | Modal | **РАБОТАЕТ** | Редактирует отображаемое имя, био, город, обложку |
| **Кнопка «Сменить уровень сложности»** | `components/ogonek/views/profile-view.tsx:1220` | `onClick={() => setLevelModalOpen(true)}` | Проверяет правило 30 дней и меняет уровень | `profiles.level` | Warning / Active | **РАБОТАЕТ** | Валидирует `canChangeLevel(profile)` |
| **Кнопка «Поделиться профилем»** | `components/ogonek/views/profile-view.tsx:1235` | `onClick={() => setShareOpen(true)}` | Открывает модалку шеринга с QR и ссылкой | Нет | Canvas QR | **РАБОТАЕТ** | Формирует визитную карточку профиля |
| **Кнопка «Пригласить друга» (`buildInviteUrl`)** | `components/ogonek/friends-manager.tsx:253` | `onClick={handleInvite}` | Копирует ссылку `${origin}/invite/${username}` | Буфер обмена | Toast notify | **СЛОМАНО** | **Роут `/invite/*` отсутствует в `app/`!** Переход по ссылке даёт ошибку 404! |
| **Кнопка «Подписаться» у пользователя** | `components/ogonek/friends-manager.tsx:264` | `onClick={() => handleFollow(user)}` | Upsert в `friendships` и `follows` | `friendships`, `follows` | Follow / Unfollow | **ЧАСТИЧНО** | Сразу ставит `status: 'accepted'`. Второй пользователь не получает уведомление! |
| **Кнопка «Добавить в друзья»** | `components/ogonek/friends-manager.tsx:274` | `onClick={() => handleAddFriend(user)}` | Добавляет в `friendIds` стора | Локальный стор | Friend added | **ЧАСТИЧНО** | Нет двустороннего подтверждения дружбы в БД |
| **Архивные ячейки стрика (сетка 730 дней)** | `components/ogonek/views/profile-view.tsx:1420` | `onClick={() => handleSelectCell(day)}` | Открывает модалку архивного дня | Локальный стор | Lazy modal | **РАБОТАЕТ** | Оптимизировано по PERF.md (ленивая генерация по клику) |

### 2.8. Evidence Vault (`VaultView`)
| Элемент | Файл:Строка | Обработчик | Что реально делает | Таблицы / API | Состояния | Статус | Замечания |
|:---|:---|:---|:---|:---|:---:|:---:|:---|
| **Поиск по фактам силы** | `components/ogonek/views/vault-view.tsx:28` | `onChange={(e) => setSearch(e.target.value)}` | Фильтрует факты в реальном времени | Локальный стейт | Query match | **РАБОТАЕТ** | Фильтрует по заголовку, описанию и дате |
| **Фильтр по категориям («Все», «Сомнения», ...)** | `components/ogonek/views/vault-view.tsx:29` | `onClick={() => setSelectedCategory(cat)}` | Фильтрует карточки по категории | Локальный стейт | Active chip | **РАБОТАЕТ** | 5 категорий фактов силы |
| **Кнопка «Добавить факт силы» (+)** | `components/ogonek/views/vault-view.tsx:30` | `onClick={() => setIsAdding(true)}` | Раскрывает форму добавления нового факта | Нет | Form toggle | **РАБОТАЕТ** | Поля: Заголовок, Описание, Категория, Дата |
| **Кнопка «Сохранить факт»** | `components/ogonek/views/vault-view.tsx:65` | `onClick={handleSaveFact}` | Сохраняет факт в стор и в базу данных | `evidence_vault` | Reset form | **РАБОТАЕТ** | Добавляет запись в `evidence_vault` |
| **Кнопка закрепления факта (Pin)** | `components/ogonek/views/vault-view.tsx:12` | `onClick={() => onTogglePin(id)}` | Переключает флаг `pinned: true/false` | `evidence_vault` | Pinned badge | **РАБОТАЕТ** | Закреплённые карточки поднимаются вверх |
| **Кнопка удаления факта (Trash)** | `components/ogonek/views/vault-view.tsx:14` | `onClick={() => onDeleteEvidence(id)}` | Удаляет карточку из стора и БД | `evidence_vault` (DELETE) | Removed | **РАБОТАЕТ** | Вызывает `deleteEvidenceVaultItem` |

### 2.9. Премиум (`PremiumView`)
| Элемент | Файл:Строка | Обработчик | Что реально делает | Таблицы / API | Состояния | Статус | Замечания |
|:---|:---|:---|:---|:---|:---:|:---:|:---|
| **Свитчер периода (Месяц / Год -20%)** | `components/ogonek/views/premium-view.tsx:47` | `onClick={() => setBilling(p)}` | Переключает отображаемые ценники | Локальный стейт | Active pill | **РАБОТАЕТ** | Пересчитывает цены со скидкой |
| **Кнопка «Тариф Базовый» (0 ₽)** | `components/ogonek/views/premium-view.tsx:73` | `onClick={() => handleSelectTier('free')}` | Сбрасывает `subscription_tier: 'free'` | `profiles` | Active badge | **РАБОТАЕТ** | Возвращает базовый статус профиля |
| **Кнопки «Оформить Премиум / Ультра»** | `components/ogonek/views/premium-view.tsx:83` | `onClick={() => handleSelectTier('premium')}`| Открывает модалку обращения в Telegram | Нет | Modal open | **ЗАГЛУШКА** | Автоматический биллинг/эквайринг отсутствует |
| **Кнопка «Написать в Telegram (@cernavation)»** | `components/ogonek/views/premium-view.tsx:86` | `onClick={openTelegramSupport}` | Открывает ссылку `https://t.me/cernavation` | Сторонний URL | New tab | **ЗАГЛУШКА** | Ручная активация подписки через личные сообщения |

### 2.10. Статистика (`AnalyticsView`) и Рейтинг (`LeaderboardView`)
| Элемент | Файл:Строка | Обработчик | Что реально делает | Таблицы / API | Состояния | Статус | Замечания |
|:---|:---|:---|:---|:---|:---:|:---:|:---|
| **Свитчер периода аналитики (`PeriodSwitcher`)** | `components/ogonek/analytics/period-switcher.tsx:20` | `onClick={() => onSelectPeriod(p)}` | Меняет срез: Неделя / Месяц / Год / Всё время | Локальный стейт | Active tab | **РАБОТАЕТ** | Пересчитывает средний балл и график динамики |
| **Кнопка «Добавить KPI» (`MonthlyKpiPanel`)** | `components/ogonek/analytics/monthly-kpi-panel.tsx:45` | `onClick={() => setAddKpiOpen(true)}` | Открывает модалку добавления цели месяца | `localStorage` | Modal open | **РАБОТАЕТ** | Добавляет прогресс-бар цели (спорт, чтение и др.) |
| **Кнопка «Обновить ИИ-анализ» (`AiInsightPanel`)**| `components/ogonek/analytics/ai-insight-panel.tsx:30` | `onClick={handleRefresh}` | Генерирует эвристический инсайт по дням | Heuristic | Loading | **РАБОТАЕТ** | Анализирует динамику стрика и преодолений |
| **Табы рейтинга («Всё время», «Месяц», «Неделя»)** | `components/ogonek/views/leaderboard-view.tsx:75` | `onClick={() => setPeriod(p)}` | Запрашивает `/api/leaderboard?period=...` | `/api/leaderboard` | Skeleton / List | **РАБОТАЕТ** | Защищено серверным HTTP-кэшем 60с |
| **Клик по карточке участника в рейтинге** | `components/ogonek/views/leaderboard-view.tsx:145` | `onClick={() => setSelectedUser(u)}` | Открывает модалку профиля участника | `profiles` | Modal open | **РАБОТАЕТ** | Показывает стрик, победы и аватар соратника |

### 2.11. Настройки (`SettingsView`)
| Элемент | Файл:Строка | Обработчик | Что реально делает | Таблицы / API | Состояния | Статус | Замечания |
|:---|:---|:---|:---|:---|:---:|:---:|:---|
| **Выбор темы (Тёмная, Светлая, Сумеречная)** | `components/ogonek/views/settings-view.tsx:180` | `onClick={() => onSetTheme(t)}` | Устанавливает атрибут `data-theme` | `localStorage` | Active card | **РАБОТАЕТ** | Полная поддержка CSS-токенов B3 |
| **Выбор акцентного цвета (6 пресетов)** | `components/ogonek/views/settings-view.tsx:210` | `onClick={() => onSetAccent(acc)}` | Пересчитывает CSS-переменные акцента | `localStorage` | Color ring | **РАБОТАЕТ** | B4: перекрашивает кнопки и обводки фокуса |
| **HEX-пикер «Свой цвет»** | `components/ogonek/views/settings-view.tsx:240` | `onChange={(e) => setCustomHex(...)}` | Задаёт произвольный акцентный цвет | `localStorage` | Live preview | **РАБОТАЕТ** | Валидирует 6-значный HEX-код |
| **Переключатель звуков интерфейса (Тогл)** | `components/ogonek/views/settings-view.tsx:280` | `onClick={() => onSetSoundEnabled(!sound)}` | Включает/выключает аудиоэффекты | `localStorage` | Toggle state | **РАБОТАЕТ** | Синтезированные Web Audio звуки |
| **Настройка ПИН-кода (`SecurityPanel`)** | `components/ogonek/security/security-panel.tsx:60` | `onClick={() => setPinSetupOpen(true)}` | Открывает мастер установки 4-значного ПИН | `localStorage` (PBKDF2) | Modal pin-pad | **РАБОТАЕТ** | Защищает вход при старте и тайм-ауте |
| **Кнопка «Синхронизировать сейчас» (Supabase)** | `components/ogonek/settings/supabase-sync-panel.tsx:85` | `onClick={handleSyncNow}` | Запускает пуш локальных данных и пулл | PostgREST REST | Sync spinner | **ЧАСТИЧНО** | Синхронизирует `days`, но падает с ошибкой, если на стороне Supabase включён RLS |
| **Кнопка «Отправить тестовое уведомление в Telegram»**| `components/ogonek/settings/telegram-reminder-panel.tsx:90` | `onClick={handleSendTest}` | Вызывает `/api/telegram/remind` | Telegram API | Success badge | **РАБОТАЕТ** | Доставляет тестовое сообщение в чат бота |
| **Кнопка «Экспорт данных (JSON)»** | `components/ogonek/settings/backup-sync-panel.tsx:50` | `onClick={handleExport}` | Скачивает файл `ogonek-backup-YYYY-MM-DD.json` | DOM Download | Instant | **РАБОТАЕТ** | Полный архив локального стора |
| **Кнопка «Импорт данных (JSON)»** | `components/ogonek/settings/backup-sync-panel.tsx:65` | `onClick={() => fileRef.click()}` | Читает JSON, валидирует схему, обновляет стор| `localStorage` | Confirm modal | **РАБОТАЕТ** | Бесшовно восстанавливает историю побед |
| **Кнопка «Сбросить все данные» (Danger Zone)** | `components/ogonek/settings/backup-sync-panel.tsx:95` | `onClick={handleResetAll}` | Очищает `localStorage['ogonek.v2']` | `localStorage` | Double confirm | **РАБОТАЕТ** | Требует подтверждения ввода фразы сброса |

---

## 3. Критические замечания по интерактивным элементам

1. **Главная страница (`home-view.tsx:210`)**: кнопка `MoreHorizontal` («Настройки ленты») **не имеет обработчика `onClick`**. Это мёртвый интерактивный элемент на первом экране.
2. **Приглашение друга (`friends-manager.tsx:253`)**: кнопка «Пригласить» копирует битую ссылку `/invite/${username}`. Маршрут отсутствует в приложении, что гарантированно отдаёт 404 любому приглашённому пользователю.
3. **Отложенные сообщения мессенджера (`chat-schedule-modal.tsx:50`)**: создание отложенного сообщения сохраняет его в таблицу `scheduled_messages`. Серверный крон переносит его в таблицу `messages`. Однако компонент переписки слушает строго `direct_messages`, в результате чего отправленное по расписанию сообщение никогда не отображается в диалоге.
4. **Оценка дня ИИ (`composer.tsx:480`)**: статус-сообщение вводит пользователя в заблуждение: сообщается об анализе через Gemini, в то время как серверный роут обращается к DeepSeek.
5. **Премиум-подписка (`premium-view.tsx:83`)**: платные тарифы не имеют биллингового шлюза и представляют собой заглушку со ссылкой на личные сообщения в Telegram.

# Known Defects — Шаг 00 (базовое состояние ветки `main` / `rework`)

Документ зафиксирован по результатам полного живого прогона стража `npm run guard` на текущем коде `main` (150 экранов/состояний на 5 контрольных размерах). Код приложения на этом шаге НЕ менялся согласно условиям задачи.

Полный машиночитаемый отчёт: [guard-report.json](../guard-report.json)  
Полная сводка проверок: [guard-report.md](../guard-report.md)  
Скриншоты дефектов с красной рамкой: [review/00/defects/](./defects/) и [review/guard-artifacts/](../guard-artifacts/)

---

## 1. Обязательные дефекты, подтверждённые стражем

### 1.1. Три способа «назад» в чатах
- **Код проверки**: `c-duplicate-back-controls` (19 срабатываний на разных вьюпортах и экранах чата).
- **Где в коде**: `components/ogonek/messenger/messenger-dialog-list.tsx:184-195`, `components/ogonek/messenger/messenger-chat-pane.tsx:641-664`, свёрнутый сайдбар `components/ogonek/sidebar.tsx:445-449`.
- **Что происходит**: На одном экране одновременно видны и доступны 3 элемента возврата:
  1. Кнопка `«Назад в ленту»` (с иконкой стрелки влево и подписью);
  2. Круглая стрелка `«Назад к списку чатов»` (`aria-label="Назад к списку чатов"`);
  3. Иконка перехода на Главную в левом рейле/сайдбаре.
- **Скриншоты**:
  - [messages_chat на 1210×756](./defects/messages_chat__1210x756__c-duplicate-back-controls__26.png)
  - [messages_list на 1210×756](./defects/messages_list__1210x756__c-duplicate-back-controls__16.png)

### 1.2. Дубль информации «Голосовое» в превью чата
- **Код проверки**: `c-duplicate-preview-info` (17 срабатываний).
- **Где в коде**: `components/ogonek/messenger/messenger-dialog-list.tsx:489-505`, `lib/ogonek/messenger.ts:519`.
- **Что происходит**: В строке превью диалога подряд выводятся чип с иконкой и текстом `<Mic /> Голосовое` и текстовое описание `🎤 Голосовое сообщение`, дублирующее одну и ту же информацию дважды.
- **Скриншоты**:
  - [messages_chat на 1210×756](./defects/messages_chat__1210x756__c-duplicate-preview-info__27.png)
  - [messages_list на 1210×756](./defects/messages_list__1210x756__c-duplicate-preview-info__17.png)

### 1.3. Пустая оранжевая кнопка-круг слева внизу в чатах
- **Код проверки**: `d-empty-button` (383 срабатывания).
- **Где в коде**: `components/ogonek/sidebar.tsx:453-468`.
- **Что происходит**: В свёрнутом левом меню чатов (ширина экрана `xl >= 1280px`, `isCollapsed=true`) кнопка `.x-compose-btn` содержит иконку с классом `xl:hidden` (`display: none`) и скрытую подпись `<span>Записать</span>` (`!isCollapsed` = false). На экране отображается абсолютно пустой оранжевый круг 50×50px без иконки и без текста.
- **Скриншоты**:
  - [messages_chat на 1210×756](./defects/messages_chat__1210x756__d-empty-button__28.png)
  - [messages_list на 1210×756](./defects/messages_list__1210x756__d-empty-button__18.png)

### 1.4. Мёртвые кнопки
- **Код проверки**: `d-dead-button-click-probe` (166 срабатываний), `d-dead-button`, `d-dead-button-noop`.
- **Где в коде**:
  - `components/ogonek/views/home-view.tsx:210-216`: `<button aria-label="Настройки ленты"><MoreHorizontal size={20} /></button>` не имеет `onClick` обработчика.
  - `components/ogonek/messenger/messenger-chat-pane.tsx:843-845`: кнопки в `<ChatSearchBar>` с пустыми обработчиками-заглушками `onPrev={() => {}}` и `onNext={() => {}}`.
  - Столбики аудиодорожки в карточке голосового сообщения оформлены как интерактивные теги `<button>` без действия и без доступного имени.
- **Скриншоты**:
  - [Кнопка «Настройки ленты» на Главной](./defects/home__1210x756__d-dead-button-click-probe__8.png)
  - [Мёртвые кнопки в чате](./defects/messages_chat__1210x756__d-dead-button-click-probe__32.png)

---

## 2. Системные дефекты UI и доступности, зафиксированные стражем

### 2.1. Запрещённый термин «Соратники» (CONTRACT п. 7)
- **Код проверки**: `h-forbidden-term-soratniki` (95 срабатываний в UI).
- **Где найдено**: чаты, настройки приватности, профиль, модалки друзей и групп, условия использования.
- **Примеры текста**:
  - *«Общайтесь с соратниками, делитесь карточками гордости...»* в пустом состоянии чатов;
  - *«При взаимодействии с соратниками в чатах, публикации записей...»* на странице `/terms`;
  - *«Видимость соратников»*, *«Найти соратника»*, плейсхолдеры в модалках.
- **Скриншоты**:
  - [Соратники в чате](./defects/messages_chat__1210x756__h-forbidden-term-soratniki__31.png)
  - [Соратники в модалке друзей](./defects/modal_friends__1210x756__h-forbidden-term-soratniki__118.png)
  - [Соратники на Terms](./defects/terms__1210x756__h-forbidden-term-soratniki__25.png)

### 2.2. Обрезанный текст и узкие колонки (CONTRACT п. 5)
- **Код проверки**: `b-clipped-text` (51 срабатывание), `b-narrow-text-column` (202 срабатывания).
- **Факты**:
  - В настройках и карточках текст усекается через `truncate` без атрибута `title` (пользователь не может прочесть полное описание).
  - В модалке композера и списках подсказок текст обрезается при стандартной ширине контейнера.
  - Текстовая колонка в блоке авторизации `Local-first: 0 локальных профиля` имеет ширину 217px (~26 символов при норме не менее 28 символов).
- **Скриншоты**:
  - [Обрезанный текст в чате](./defects/messages_chat__1210x756__b-clipped-text__24.png)
  - [Обрезанный текст в композере](./defects/modal_composer__1210x756__b-clipped-text__102.png)
  - [Узкая колонка на Landing](./defects/landing__1210x756__b-narrow-text-column__1.png)

### 2.3. Горизонтальный скролл и переполнение на мобильном 390×844
- **Код проверки**: `a-horizontal-overflow-container` (14 срабатываний).
- **Факты**: В `AuthScreen` контейнер `div[aria-label="Вход в Огонёк"]` имеет `scrollWidth=399px > clientWidth=379px` на экранах входа и регистрации, вызывая горизонтальный сдвиг вёрстки на iPhone.
- **Скриншоты**:
  - [Переполнение на Signin (390×844)](./defects/signin__390x844__a-horizontal-overflow-container__120.png)
  - [Переполнение на Register (390×844)](./defects/register__390x844__a-horizontal-overflow-container__127.png)

### 2.4. Низкий контраст текста < 4.5:1 (axe-core color-contrast)
- **Код проверки**: `g-contrast-ratio` (786 нарушений).
- **Факты**: Второстепенный текст `#71767b` на фоне `#16181c` даёт контраст **3.87:1** (при стандарте WCAG AA >= 4.5:1). На `/privacy` и `/terms` серый текст `#71717b` на чёрном фоне `#000000` даёт **4.35:1**.
- **Скриншоты**:
  - [Контраст на Landing](./defects/landing__1210x756__g-contrast-ratio__3.png)
  - [Контраст на Privacy](./defects/privacy__1210x756__g-contrast-ratio__21.png)
  - [Контраст на Terms](./defects/terms__1210x756__g-contrast-ratio__26.png)

### 2.5. Маленькие тач-таргеты на мобильном (< 40×40px)
- **Код проверки**: `d-small-tap-target` (94 нарушения).
- **Факты**: Текстовые ссылки и компактные иконки в мобильной версии имеют высоту 16–20px без достаточного padding, что нарушает требования удобства нажатия пальцем.
- **Скриншоты**:
  - [Тач-зона на Privacy](./defects/privacy__390x844__d-small-tap-target__136.png)
  - [Тач-зона на Terms](./defects/terms__390x844__d-small-tap-target__142.png)

### 2.6. Ошибки сети 404 и предупреждения консоли
- **Код проверки**: `e-http-error` (49 ошибок), `e-console-error` (49 ошибок), `e-console-warning` (15 предупреждений).
- **Факты**:
  - Запрос `GET /_vercel/insights/script.js` завершается **HTTP 404** на каждом экране в локальной сборке из-за неусловного `<Analytics />` в `app/layout.tsx`.
  - Повторяющееся предупреждение `Multiple GoTrueClient instances detected in the same browser context` из-за создания независимых экземпляров Supabase-клиента.
- **Скриншоты**:
  - [HTTP 404 скрипта аналитики](./defects/landing__1210x756__e-http-error__6.png)
  - [Предупреждение GoTrueClient](./defects/landing__1210x756__e-console-warning__5.png)

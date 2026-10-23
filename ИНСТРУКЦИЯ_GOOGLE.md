# Пошаговая инструкция: Вход через Google в «Огонёк» (Supabase OAuth)

Это подробное практическое руководство для новичка по настройке авторизации через Google-аккаунт. Каждый шаг расписан по принципу: **«что нажать → что скопировать → куда вставить»**.

---

## Что нужно для старта
1. Google-аккаунт (почта @gmail.com).
2. Аккаунт в [Supabase](https://supabase.com).
3. Аккаунт в [Vercel](https://vercel.com) (если проект уже опубликован онлайн).

---

## Шаг A. Создание проекта в Google Cloud Console

1. Откройте в браузере: **[console.cloud.google.com](https://console.cloud.google.com/)**.
2. В верхнем левом углу (справа от логотипа Google Cloud) нажмите на выпадающий список проектов.
3. В появившемся окне нажмите кнопку **«New Project»** (Новый проект) в правом верхнем углу.
4. В поле **Project Name** введите: `Ogonek`.
5. Поле **Organization** оставьте «No organization» (без организации).
6. Нажмите синюю кнопку **«Create»** (Создать).
7. Подождите 5–10 секунд, затем в правом верхнем колокольчике уведомлений нажмите **«Select Project»** (Выбрать проект), чтобы проект `Ogonek` стал активным.

---

## Шаг B. Настройка экрана согласия (OAuth consent screen)

1. В левом боковом меню Google Cloud выберите **APIs & Services** → **OAuth consent screen** (Экран согласия OAuth).
2. В блоке **User Type** выберите переключатель **External** (Внешний) — это нужно, чтобы входить мог любой пользователь с Google-почтой.
3. Нажмите кнопку **«Create»** (Создать).
4. Заполните обязательные поля:
   - **App name** (Название приложения): введите `Огонёк`.
   - **User support email** (Email поддержки): выберите вашу почту из выпадающего списка.
   - **App logo** (необязательно): можно пропустить.
   - **Application home page**: адрес вашего сайта (например, `https://ogonyok.vercel.app` или `http://localhost:3000`).
   - **Developer contact information**: снова введите вашу почту.
5. Нажмите внизу **«Save and Continue»** (Сохранить и продолжить).
6. **Раздел Scopes (Области доступа)**:
   - Нажмите **«Add or Remove Scopes»**.
   - Отметьте галочками ровно 3 базовых scope:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`
   - Нажмите внизу синюю кнопку **«Update»**.
   - Нажмите **«Save and Continue»**.
   > **Важно знать:** Для этих трех базовых scopes **не требуется** сложная проверка и верификация приложения со стороны Google!
7. **Раздел Test users (Тестовые пользователи)**:
   - Нажмите **«Save and Continue»**.
8. **Раздел Summary (Итог)**:
   - Внизу нажмите **«Back to Dashboard»**.
9. **ПУБЛИКАЦИЯ ПРИЛОЖЕНИЯ (Критично!)**:
   - На открывшейся странице OAuth consent screen найдите раздел **Publishing status** (Статус публикации).
   - Сейчас там написано *Testing*.
   - Нажмите кнопку **«Publish App»** (Опубликовать приложение) и подтвердите в модальном окне кнопкой **Confirm**.
   - Статус сменится на **«In production»**. Теперь любой человек в мире сможет войти через Google, а не только указанные вручную тестировщики!

---

## Шаг C. Создание ключей OAuth Client ID

1. В левом меню перейдите в **APIs & Services** → **Credentials** (Учетные данные).
2. Вверху нажмите **«+ Create Credentials»** → выберите **«OAuth client ID»**.
3. В выпадающем списке **Application type** выберите: **Web application** (Веб-приложение).
4. В поле **Name** укажите: `Ogonek Web Client`.
5. Блок **Authorized JavaScript origins** (Авторизованные источники JavaScript):
   - Нажмите **«+ Add URI»** и введите: `http://localhost:3000`
   - Нажмите **«+ Add URI»** и введите адрес вашего деплоя на Vercel (например, `https://ogonyok.vercel.app`, без косой черты на конце).
6. Блок **Authorized redirect URIs** (Авторизованные URI перенаправления):
   - Нажмите **«+ Add URI»**.
   - Сюда нужно вставить Callback URL из Supabase в формате:
     `https://<ID-проекта>.supabase.co/auth/v1/callback`
   > **Где взять `<ID-проекта>` в Supabase:**
   > 1. Откройте [supabase.com/dashboard](https://supabase.com/dashboard).
   > 2. Откройте ваш проект «Ogonek».
   > 3. В левом нижнем углу нажмите **Project Settings** (иконка шестерёнки) → вкладка **General**.
   > 4. В блоке **General settings** скопируйте значение строки **Reference ID** (это строка из 20 латинских букв, например `abcdefghijklmnopqrs`).
   > 5. Ваш Callback URL готов: `https://abcdefghijklmnopqrs.supabase.co/auth/v1/callback`.
   - Вставьте этот URL в поле **Authorized redirect URIs**.
7. Нажмите синюю кнопку **«Create»** (Создать).
8. На экране появится модальное окно:
   - Скопируйте **Client ID** (вида `123456789-xxxxxxxx.apps.googleusercontent.com`).
   - Скопируйте **Client secret** (вида `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx`).
   - Сохраните их во временный блокнот.

---

## Шаг D. Включение Google в панели Supabase

1. Перейдите в [панель Supabase Dashboard](https://supabase.com/dashboard).
2. В левом меню нажмите **Authentication** (иконка замка/пользователей).
3. Перейдите в подраздел **Providers**.
4. В списке провайдеров найдите строку **Google** и кликните на неё:
   - Переведите тумблер **Enable Google** в положение **Включено (зелёный)**.
   - В поле **Client ID (for OAuth)** вставьте скопированный из Google Client ID.
   - В поле **Client Secret (for OAuth)** вставьте скопированный Client Secret.
   - Опция **Skip nonce check** — оставьте выключенной (по умолчанию).
5. Нажмите внизу зеленую кнопку **«Save»** (Сохранить).

---

## Шаг E. Настройка URL Configuration в Supabase

1. В левом меню Supabase остаемся в **Authentication** → переходим во вкладку **URL Configuration**.
2. В поле **Site URL** укажите главный адрес вашего приложения:
   - Для продакшена: `https://<ваш-домен-на-vercel>.vercel.app`
   - Для локальной разработки: `http://localhost:3000`
3. В блоке **Redirect URLs**:
   - Нажмите **«Add URL»** и добавьте: `http://localhost:3000/**`
   - Нажмите **«Add URL»** и добавьте: `https://<ваш-домен-на-vercel>.vercel.app/**`
   - Нажмите **«Add URL»** и добавьте: `http://localhost:3000/auth/callback`
   - Нажмите **«Add URL»** и добавьте: `https://<ваш-домен-на-vercel>.vercel.app/auth/callback`
4. Нажмите **«Save»**.

---

## Шаг F. Добавление переменных в проект и на Vercel

### 1. Локально на компьютере (`.env.local`):
Откройте файл `.env.local` в корне проекта `ogonyok-ai-clone` и убедитесь, что в нём прописаны параметры вашего проекта Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ID-проекта>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*(Их можно взять в Supabase: Project Settings → API Keys).*

Запустите проверку конфигурации в терминале:
```bash
npm run check-setup
```
Скрипт должен показать `[OK]` напротив всех 16 таблиц, RLS и триггера `on_auth_user_created`.

### 2. На Vercel:
1. Зайдите в проект на [vercel.com](https://vercel.com).
2. Перейдите в **Settings** → **Environment Variables**.
3. Добавьте те же переменные:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Перейдите во вкладку **Deployments** → у последнего деплоя нажмите три точки `...` → выберите **Redeploy**.

---

## Шаг G. Пошаговая проверка (smoke-test)

1. Откройте окно браузера в **режиме инкогнито** (Cmd+Shift+N на Mac или Ctrl+Shift+N на Windows).
2. Перейдите на адрес приложения: `http://localhost:3000` (или на ваш Vercel-домен).
3. Вы увидите красивый лендинг гостя с кнопкой **«Войти через Google»**.
4. Нажмите кнопку **«Войти через Google»**:
   - Откроется окно входа Google.
   - Выберите свой Google-аккаунт.
   - Google вернёт вас обратно в приложение через `/auth/callback`.
5. Появится экран **Онбординга**:
   - Выберите уникальный никнейм (например `@pavel_durov`) — проверка доступности работает «на лету».
   - Выберите уровень сложности от 1 до 5.
   - Пройдите или пропустите 5-шаговый тур по разделам приложения.
   - Запишите свой первый повод для гордости.
6. Вы окажетесь на Главной странице:
   - В правом верхнем углу отображается ваша настоящая аватарка и имя из Google.
   - Появился баннер «Перенести мой старый дневник (705 дней истории)».
7. Нажмите клавишу **F5 (обновить страницу)**:
   - Сессия сохраняется, выход не происходит.
   - Ваша первая запись и профиль на месте.

---

## Шаг H. «Если не работает» — 10 частых ошибок и их решения

### 1. Ошибка `redirect_uri_mismatch` в окне Google
- **Причина**: URL перенаправления в Google Cloud не совпадает с тем, куда Supabase шлёт запрос.
- **Решение**: Проверьте Шаг C. В Google Cloud Console → Credentials → OAuth Client ID → в строке **Authorized redirect URIs** должен быть введён именно `https://<ID-проекта>.supabase.co/auth/v1/callback` (без пробелов, без завершающего слэша).

### 2. Ошибка «Access blocked: App has not completed the Google verification process»
- **Причина**: В Google Cloud проект оставлен в статусе *Testing*, а вы входите под аккаунтом, которого нет в списке Test Users.
- **Решение**: Проверьте Шаг B, пункт 9. Перейдите в OAuth consent screen и нажмите кнопку **«Publish App»**, подтвердив публикацию.

### 3. Бесконечный цикл редиректа на страницу входа
- **Причина**: Не настроен файл `middleware.ts` или маршрут `/auth/callback`, либо куки блокируются браузером.
- **Решение**: В нашем проекте `@supabase/ssr` уже обрабатывает сессию в `middleware.ts` и `app/auth/callback/route.ts`. Если вы тестируете в Safari со сторонними блокировщиками, разрешите куки для вашего домена или проверьте в Chrome.

### 4. Ошибка `Database error saving new user` или пустой профиль после входа
- **Причина**: В базе Supabase не запущен триггер `on_auth_user_created`.
- **Решение**: Откройте `supabase/schema.sql` в проекте, скопируйте секцию `22. ТРИГГЕР АВТОМАТИЧЕСКОГО СОЗДАНИЯ ПРОФИЛЯ ПРИ OAUTH-ВХОДЕ` и выполните её в Supabase Dashboard → **SQL Editor** → **Run**.

### 5. Ошибка `Error: new row violates row-level security policy for table profiles`
- **Причина**: На таблице `profiles` включён RLS, но триггерная функция создана без флага `SECURITY DEFINER`.
- **Решение**: В схеме `supabase/schema.sql` функция `public.handle_new_user()` объявлена с `SECURITY DEFINER`. Примените скрипт `supabase/schema.sql` в SQL Editor Supabase.

### 6. Кнопка «Войти через Google» ничего не делает или выдаёт ошибку в консоли
- **Причина**: Отсутствуют переменные окружения `NEXT_PUBLIC_SUPABASE_URL` или `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Решение**: Запустите `npm run check-setup` в терминале. Убедитесь, что файл `.env.local` существует и содержит валидные значения.

### 7. При переносе дневника пишет `База данных не подключена`
- **Причина**: Приложение запущено без настроенного Supabase URL или Anon Key.
- **Решение**: Проверьте `.env.local`. Перезапустите dev-сервер: `npm run dev`.

### 8. Ошибка «Cross-Origin Request Blocked» (CORS) в консоли браузера
- **Причина**: Домен, с которого отправляется запрос, не указан в Supabase URL Configuration.
- **Решение**: Перейдите в Supabase Dashboard → Authentication → URL Configuration и добавьте адрес вашего сайта в **Site URL** и в список **Redirect URLs** (Шаг E).

### 9. После закрытия вкладки пользователя «выбивает» из аккаунта
- **Причина**: Не настроена работа с сессионными cookies через `@supabase/ssr`.
- **Решение**: В проекте настроен `app/auth/callback/route.ts` с обменом OAuth-кода на постоянную сессию и сохранением в HttpOnly cookies. Убедитесь, что вы не используете приватное окно, которое принудительно стирает все cookies при закрытии.

### 10. В рейтинге не отображается ник пользователя
- **Причина**: Пользователь не завершил онбординг (не установил уникальный ник) или выключен тумблер «Участвую в рейтинге».
- **Решение**: Откройте Настройки профиля, убедитесь, что в поле никнейма стоит `@ник` и включён тумблер «Показывать меня в общем рейтинге».

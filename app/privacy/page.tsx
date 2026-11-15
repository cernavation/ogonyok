import Link from 'next/link'
import { ArrowLeft, Shield, Lock, Eye, Database, Mail } from 'lucide-react'

export const metadata = {
  title: 'Политика конфиденциальности — Огонёк',
  description: 'Как сервис Огонёк защищает ваши данные и личные записи.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white px-4 py-12 sm:px-6 lg:px-8 selection:bg-[var(--accent,#FF6A1A)]/30">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <div>
          <Link
            href="/"
            aria-label="Вернуться на главную"
            className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors min-h-[40px] py-2 px-1"
          >
            <ArrowLeft size={16} />
            <span>На главную</span>
          </Link>
        </div>

        <header className="space-y-3 border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[var(--accent,#FF6A1A)]/15 text-[var(--accent,#FF6A1A)] flex items-center justify-center font-bold">
              ✦
            </span>
            <span className="text-xl font-bold tracking-tight">Огонёк</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl text-zinc-100">
            Политика конфиденциальности
          </h1>
          <p className="text-sm text-zinc-400">
            Последнее обновление: 24 октября 2026 г.
          </p>
        </header>

        <section className="space-y-6 text-sm text-zinc-300 leading-relaxed">
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-start gap-3">
            <Shield size={20} className="text-[var(--accent,#FF6A1A)] shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-1">Главный принцип Огонька: твои победы принадлежат только тебе</strong>
              <p className="text-xs text-zinc-300">
                Записи дневника по умолчанию строго приватны. Никто, кроме тебя, не имеет доступа к твоим гордостям и благодарностям, пока ты сам не решишь поделиться ими с друзьями или в общей ленте.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Database size={18} className="text-[var(--accent,#FF6A1A)]" /> 1. Какие данные мы собираем
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
              <li>Данные авторизации: никнейм, псевдоним, хэш пароля (при локальной или облачной авторизации).</li>
              <li>Данные дневника: текст гордостей и благодарностей, выбранный уровень сложности, дата и оценки.</li>
              <li>Технические метаданные: часовой пояс (для расчёта дедлайна закрытия дня) и настройки интерфейса (тема, акцент).</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock size={18} className="text-[var(--accent,#FF6A1A)]" /> 2. Защита данных и Row Level Security
            </h2>
            <p className="text-zinc-300">
              Все данные хранятся в защищённой базе данных с включённым механизмом Row Level Security (RLS). Это гарантирует на уровне базы, что ни один пользователь не может прочитать или изменить чужие закрытые записи.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Eye size={18} className="text-[var(--accent,#FF6A1A)]" /> 3. Передача третьим лицам
            </h2>
            <p className="text-zinc-300">
              Мы никогда не продаём и не передаём личные данные пользователей третьим лицам, маркетинговым сетям или рекламным брокерам. Для ИИ-оценки дней (при нажатии пользователем кнопки «Оценить с ИИ») обезличенный текст передаётся через защищённый серверный шлюз.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Mail size={18} className="text-[var(--accent,#FF6A1A)]" /> 4. Контакты и удаление данных
            </h2>
            <p className="text-zinc-300">
              Вы имеете право в любой момент запросить полный экспорт или безвозвратное удаление всех своих данных и профиля.
            </p>
            <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-2 pt-1">
              <span>Контакты поддержки:</span>
              <a
                href="mailto:support@ogonek.app"
                aria-label="Почта поддержки support@ogonek.app"
                className="text-[var(--accent,#FF6A1A)] hover:underline min-h-[40px] inline-flex items-center py-2 px-1"
              >
                support@ogonek.app
              </a>
              <span>или Telegram:</span>
              <a
                href="https://t.me/ogonek_support"
                target="_blank"
                rel="noreferrer"
                aria-label="Telegram поддержки @ogonek_support"
                className="text-[var(--accent,#FF6A1A)] hover:underline min-h-[40px] inline-flex items-center py-2 px-1"
              >
                @ogonek_support
              </a>
            </div>
          </div>
        </section>

        <footer className="pt-8 border-t border-zinc-900 text-xs text-zinc-400 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <span className="text-zinc-400">© 2026 Огонёк. Все права защищены.</span>
          <div className="flex items-center gap-4">
            <Link
              href="/terms"
              aria-label="Перейти к условиям использования"
              className="text-zinc-300 hover:text-white transition-colors min-h-[40px] inline-flex items-center py-2 px-1"
            >
              Условия использования
            </Link>
            <Link
              href="/"
              aria-label="Перейти на главную страницу"
              className="text-zinc-300 hover:text-white transition-colors min-h-[40px] inline-flex items-center py-2 px-1"
            >
              Главная страница
            </Link>
          </div>
        </footer>
      </div>
    </div>
  )
}

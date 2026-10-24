import Link from 'next/link'
import { ArrowLeft, FileText, CheckCircle2, Shield, AlertCircle, Scale, Mail } from 'lucide-react'

export const metadata = {
  title: 'Условия использования — Огонёк',
  description: 'Пользовательское соглашение и условия использования сервиса Огонёк.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white px-4 py-12 sm:px-6 lg:px-8 selection:bg-[#FF5C00]/30">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span>На главную</span>
        </Link>

        <header className="space-y-3 border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[#FF5C00]/15 text-[#FF5C00] flex items-center justify-center font-bold">
              ✦
            </span>
            <span className="text-xl font-bold tracking-tight">Огонёк</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Условия использования
          </h1>
          <p className="text-sm text-zinc-400">
            Редакция действует с 24 октября 2026 г.
          </p>
        </header>

        <section className="space-y-6 text-sm text-zinc-300 leading-relaxed">
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-start gap-3">
            <Scale size={20} className="text-[#FF5C00] shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-1">
                Кратко и по делу
              </strong>
              <p className="text-xs text-zinc-400">
                Огонёк создан для фиксации личных достижений, гордостей и благодарностей. Твой контент остаётся твоей собственностью. Мы не продаём твои данные и не навязываем скрытых платежей.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[#FF5C00]" /> 1. Принятие условий
            </h2>
            <p className="text-zinc-400">
              Используя сервис «Огонёк» (сайт, мобильную веб-версию или PWA), вы соглашаетесь с настоящими Условиями использования и Политикой конфиденциальности. Если вы не согласны с какими-либо пунктами, пожалуйста, прекратите использование сервиса.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield size={18} className="text-[#FF5C00]" /> 2. Права на контент и дневниковые записи
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
              <li>Все записи дневника, формулировки гордостей, благодарностей и файлы в Evidence Vault являются исключительной собственностью автора.</li>
              <li>Сервис «Огонёк» не претендует на интеллектуальные права на пользовательский контент и использует его исключительно для предоставления функций сервиса (отображение, аналитика, синхронизация).</li>
              <li>Вы вправе в любой момент полностью выгрузить свои данные в формате JSON или удалить аккаунт со всеми записями.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText size={18} className="text-[#FF5C00]" /> 3. Правила поведения в сообществе и чатах
            </h2>
            <p className="text-zinc-400">
              При взаимодействии с соратниками в чатах, публикации записей в общую ленту и комментировании запрещены:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
              <li>Оскорбления, угрозы, дискриминация и разжигание вражды.</li>
              <li>Распространение спама, вредоносных ссылок и несанкционированной рекламы.</li>
              <li>Публикация персональных данных третьих лиц без их предварительного согласия.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertCircle size={18} className="text-[#FF5C00]" /> 4. Отказ от медицинских гарантий
            </h2>
            <p className="text-zinc-400">
              «Огонёк» является инструментом саморефлексии и фиксации привычек, но не является медицинской или психотерапевтической помощью. При наличии депрессивных или тревожных состояний мы настоятельно рекомендуем обращаться к квалифицированным специалистам.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Mail size={18} className="text-[#FF5C00]" /> 5. Вопросы и поддержка
            </h2>
            <p className="text-zinc-400">
              По любым юридическим или техническим вопросам обращайтесь в официальный канал поддержки:{' '}
              <a
                href="https://t.me/ogonek_support"
                target="_blank"
                rel="noreferrer"
                className="text-[#FF5C00] hover:underline"
              >
                @ogonek_support
              </a>
              .
            </p>
          </div>
        </section>

        <footer className="pt-6 border-t border-zinc-800 text-xs text-zinc-500 flex items-center justify-between">
          <span>© 2026 Огонёк. Все права защищены.</span>
          <Link href="/privacy" className="hover:text-zinc-300 transition-colors">
            Политика конфиденциальности
          </Link>
        </footer>
      </div>
    </div>
  )
}

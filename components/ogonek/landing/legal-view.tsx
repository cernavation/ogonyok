'use client'

import React, { useState } from 'react'
import { AppleNavbar } from '@/components/ogonek/landing/apple-navbar'
import { AppleFooter } from '@/components/ogonek/landing/apple-footer'
import { useScrollReveal } from '@/components/ogonek/landing/use-scroll-reveal'
import { type Locale } from '@/src/content/i18n'

interface LegalPageProps {
  locale?: Locale
}

const LEGAL_CONTENT: Record<
  Locale,
  {
    eyebrow: string
    title: string
    subtitle: string
    dateRevision: string
    controlPill: string
    tabTerms: string
    tabPrivacy: string
    termsTitle: string
    termsSummaryTitle: string
    termsSummaryText: string
    termsPoint1Title: string
    termsPoint1Text: string
    termsPoint2Title: string
    termsPoint2Text1: string
    termsPoint2Text2: string
    termsPoint3Title: string
    termsPoint3Text: string
    termsPoint4Title: string
    termsPoint4Text: string
    termsPoint5Title: string
    termsPoint5Text: string
    privacyEyebrow: string
    privacyTitle: string
    privacySubtitle: string
    colParam: string
    colLegacy: string
    colPriday: string
    tableRows: {
      feature: string
      legacy: string
      priday: string
    }[]
    privacyPoint1Title: string
    privacyPoint1Text: string
    privacyPoint2Title: string
    privacyPoint2Text: string
    privacyPoint3Title: string
    privacyPoint3Text: string
    contactSupport: string
  }
> = {
  ru: {
    eyebrow: 'Правовые стандарты и защита данных',
    title: 'Условия и конфиденциальность',
    subtitle: 'Честные, прозрачные правила сервиса Winlog. Твой контент остаётся твоей собственностью, а данные защищены.',
    dateRevision: 'Редакция: ноябрь 2026 г.',
    controlPill: 'Полный контроль видимости',
    tabTerms: 'Условия сервиса',
    tabPrivacy: 'Политика конфиденциальности',
    termsTitle: 'Условия использования',
    termsSummaryTitle: 'Кратко и по делу',
    termsSummaryText:
      '«Winlog» создан для фиксации личных достижений, побед и благодарностей. Твой контент - это твоя исключительная собственность. Мы не продаём твои данные, не навязываем скрытых платежей и не передаём твои записи рекламным сетям.',
    termsPoint1Title: '1. Принятие условий',
    termsPoint1Text:
      'Используя сервис «Winlog» (веб-приложение, сайт или PWA-версию), вы подтверждаете согласие с настоящими Условиями и Политикой приватности. Если вы не согласны с какими-либо положениями, пожалуйста, воздержитесь от использования сервиса.',
    termsPoint2Title: '2. Право собственности на контент и режимы приватности',
    termsPoint2Text1:
      'Все тексты побед, благодарностей, личные цели, прикреплённые фотографии и аудиозаписи принадлежат исключительно вам. Мы не претендуем ни на какие авторские права на ваш личный контент.',
    termsPoint2Text2:
      'Ты сам решаешь: быть публичным и делиться победами со всем миром, или вести секретную летопись, скрытую от всех (тебя никто не найдёт в поиске платформы, или найдут только те, кому ты лично разрешишь доступ).',
    termsPoint3Title: '3. Правила использования и аккаунты',
    termsPoint3Text:
      'Вы несёте ответственность за сохранность доступа к своему аккаунту и паролю. Запрещается использовать сервис для распространения вредоносного ПО, спама или попыток несанкционированного доступа к чужим профилям.',
    termsPoint4Title: '4. Экспорт и удаление данных',
    termsPoint4Text:
      'Вы имеете право в любой момент бесплатно экспортировать весь архив своих записей в стандартном формате JSON через меню «Настройки → Данные». Также вы можете в 1 клик удалить свой профиль и все связанные записи навсегда.',
    termsPoint5Title: '5. Обратная связь',
    termsPoint5Text:
      'По любым вопросам относительно настоящих Условий и работы сервиса вы можете связаться с командой проекта через Telegram-поддержку',
    privacyEyebrow: 'Раздел 2',
    privacyTitle: 'Политика конфиденциальности и защиты данных',
    privacySubtitle:
      'Мы не собираем персональные профили для рекламы, не продаём твои записи дата-брокерам и не сканируем мысли без твоего ведома.',
    colParam: 'Параметр',
    colLegacy: 'Обычные соцсети',
    colPriday: 'Winlog',
    tableRows: [
      {
        feature: 'Видимость записей',
        legacy: 'Видны всем без разбора в ленте',
        priday: 'Свободный выбор: делись со всеми или держи у себя',
      },
      {
        feature: 'Поиск по платформе',
        legacy: 'Профиль индексируется и виден всем',
        priday: 'В секретном режиме тебя никто не найдёт',
      },
      {
        feature: 'Реклама и трекеры',
        legacy: 'Рекламный спам и трекинг',
        priday: '0 рекламных трекеров, 0 продажи данных',
      },
      {
        feature: 'Обучение нейросетей',
        legacy: 'Парсинг текстов для LLM моделей',
        priday: 'Zero-Training: закрытый stateless анализ',
      },
      {
        feature: 'Экспорт и удаление',
        legacy: 'Сложные запросы, данные сохраняются',
        priday: 'Экспорт в JSON в 1 клик, мгновенный вайп',
      },
    ],
    privacyPoint1Title: '1. Свобода выбора: публичность или секретный режим',
    privacyPoint1Text:
      'Ты сам решаешь, какой уровень открытости тебе нужен. Ты можешь сделать свой профиль полностью публичным — делиться победами со всем миром, вдохновлять других и участвовать в общих рейтингах. А можешь включить секретный режим: в этом случае тебя никто не сможет найти на платформе через поиск, а твои записи не увидит никто на свете, кроме тех избранных людей, кому ты лично откроешь закрытый доступ.',
    privacyPoint2Title: '2. Защищённое разграничение доступа',
    privacyPoint2Text:
      'Доступ к закрытым записям защищается протоколом Row Level Security (RLS). Это означает, что правила проверяются на уровне базы данных: ни один другой пользователь физически не может получить доступ к твоим секретным записям без выданного тобой разрешения.',
    privacyPoint3Title: '3. Право на забвение и полный контроль',
    privacyPoint3Text:
      'В любой момент в разделе «Настройки → Данные» вы можете нажать одну кнопку, чтобы выгрузить полный архив всех дней в открытом формате JSON, либо нажать «Удалить аккаунт», что моментально и безвозвратно сотрёт весь профиль и все записи.',
    contactSupport: 'Вопросы по безопасности и аудиту кода можно направлять в Telegram-поддержку',
  },
  ro: {
    eyebrow: 'Standarde juridice și protecția datelor',
    title: 'Termeni și confidențialitate',
    subtitle:
      'Reguli clare și transparente ale serviciului Winlog. Conținutul tău rămâne proprietatea ta, iar datele sunt protejate.',
    dateRevision: 'Revizuit: noiembrie 2026',
    controlPill: 'Control deplin al vizibilității',
    tabTerms: 'Termenii serviciului',
    tabPrivacy: 'Politica de confidențialitate',
    termsTitle: 'Termeni și condiții de utilizare',
    termsSummaryTitle: 'Pe scurt și la obiect',
    termsSummaryText:
      '«Winlog» este creat pentru consemnarea realizărilor personale, a victoriilor și a recunoștinței. Conținutul tău este proprietatea ta exclusivă. Nu vindem datele tale, nu impunem costuri ascunse și nu transmitem însemnările tale rețelelor de publicitate.',
    termsPoint1Title: '1. Acceptarea termenilor',
    termsPoint1Text:
      'Prin utilizarea serviciului «Winlog» (aplicație web, site sau PWA), confirmați acordul cu acești Termeni și cu Politica de confidențialitate. Dacă nu sunteți de acord cu vreo prevedere, vă rugăm să nu utilizați serviciul.',
    termsPoint2Title: '2. Dreptul de proprietate și modurile de confidențialitate',
    termsPoint2Text1:
      'Toate textele victoriilor, recunoștințele, obiectivele personale, fotografiile atașate și fișierele audio vă aparțin în exclusivitate. Nu revendicăm niciun drept de autor asupra conținutului dvs. personal.',
    termsPoint2Text2:
      'Tu decizi: să fii public și să împărtășești reușitele cu întreaga lume sau să păstrezi o cronică secretă, ascunsă de toți (nimeni nu te va găsi la căutare pe platformă, cu excepția celor cărora le oferi acces personal).',
    termsPoint3Title: '3. Reguli de utilizare și conturi',
    termsPoint3Text:
      'Sunteți responsabil pentru păstrarea în siguranță a parolei și a accesului la cont. Se interzice utilizarea serviciului pentru distribuirea de malware, spam sau tentative de acces neautorizat la profile terțe.',
    termsPoint4Title: '4. Exportul și ștergerea datelor',
    termsPoint4Text:
      'Aveți dreptul de a exporta oricând și gratuit întregul istoric în format standard JSON prin meniul «Setări → Date». De asemenea, puteți șterge dintr-un singur clic contul și toate însemnările asociate definitiv.',
    termsPoint5Title: '5. Asistență și contact',
    termsPoint5Text:
      'Pentru orice întrebări referitoare la acești Termeni și funcționarea serviciului, puteți contacta echipa proiectului prin Telegram:',
    privacyEyebrow: 'Secțiunea 2',
    privacyTitle: 'Politica de confidențialitate și securitate a datelor',
    privacySubtitle:
      'Nu colectăm date pentru profilare publicitară, nu vindem însemnările tale brokerilor de date și nu folosim gândurile tale pentru antrenarea modelelor publice.',
    colParam: 'Parametru',
    colLegacy: 'Rețele sociale obișnuite',
    colPriday: 'Winlog',
    tableRows: [
      {
        feature: 'Vizibilitatea însemnărilor',
        legacy: 'Vizibile pentru toți în mod implicit',
        priday: 'Alegere liberă: public sau complet privat',
      },
      {
        feature: 'Căutarea pe platformă',
        legacy: 'Profil indexat și expus public',
        priday: 'În mod secret, profilul este invizibil',
      },
      {
        feature: 'Reclame și trackere',
        legacy: 'Trackere publicitare invazive',
        priday: '0 trackere publicitare, 0 vânzare de date',
      },
      {
        feature: 'Antrenarea AI-ului',
        legacy: 'Date utilizate pentru antrenare LLM',
        priday: 'Zero-Training: analiză izolată și sigură',
      },
      {
        feature: 'Export și ștergere',
        legacy: 'Proceduri greoaie, datele rămân salvate',
        priday: 'Export JSON într-un clic, ștergere instantanee',
      },
    ],
    privacyPoint1Title: '1. Libertatea de alegere: deschidere sau mod secret',
    privacyPoint1Text:
      'Tu decizi nivelul de transparență dorit. Poți face profilul complet public — să împărtășești victoriile cu lumea întreagă, să inspiri și să participi la clasamente. Sau poți activa modul secret: nimeni nu te va putea găsi la căutare pe platformă, iar însemnările tale vor rămâne complet private.',
    privacyPoint2Title: '2. Izolare strictă a accesului',
    privacyPoint2Text:
      'Accesul la însemnările private este protejat prin protocolul Row Level Security (RLS). Regulile sunt verificate direct la nivelul bazei de date: niciun alt utilizator nu poate accesa fizic datele tale fără permisiunea ta directă.',
    privacyPoint3Title: '3. Dreptul de a fi uitat și control complet',
    privacyPoint3Text:
      'În orice clipă, din secțiunea «Setări → Date», poți descărca arhiva completă a tuturor zilelor în format JSON sau poți alege «Șterge contul», acțiune ce elimină instantaneu și definitiv toate datele tale.',
    contactSupport: 'Întrebările legate de securitate pot fi transmise echipei prin asistența Telegram',
  },
  en: {
    eyebrow: 'Legal standards & data protection',
    title: 'Terms & Privacy',
    subtitle:
      'Fair, transparent terms for Winlog. Your content remains your exclusive property, and your data is protected.',
    dateRevision: 'Revised: November 2026',
    controlPill: 'Full visibility control',
    tabTerms: 'Terms of Service',
    tabPrivacy: 'Privacy Policy',
    termsTitle: 'Terms of Service',
    termsSummaryTitle: 'In brief',
    termsSummaryText:
      'Winlog is built for logging personal milestones, victories, and gratitude. Your content belongs exclusively to you. We do not monetize your data, never charge hidden fees, and never share your reflections with advertising networks.',
    termsPoint1Title: '1. Acceptance of terms',
    termsPoint1Text:
      'By accessing or using Winlog (via web, browser, or PWA), you acknowledge and agree to these Terms and our Privacy Policy. If you do not agree with any part, please discontinue using the service.',
    termsPoint2Title: '2. Content ownership & privacy tiers',
    termsPoint2Text1:
      'All journal texts, daily gratitudes, milestones, uploaded photos, and audio belong entirely to you. We claim zero copyright over your personal creations.',
    termsPoint2Text2:
      'You are in full control: choose to be public and share your courage with the world, or keep a strictly private journal hidden from everyone (no search indexing, and invisible unless you grant explicit access).',
    termsPoint3Title: '3. Acceptable use & accounts',
    termsPoint3Text:
      'You are responsible for keeping your login credentials confidential. Misusing the platform for distribution of malware, unsolicited spam, or attempting unauthorized access to other accounts is strictly prohibited.',
    termsPoint4Title: '4. Data export and account deletion',
    termsPoint4Text:
      'You have the right at any time to export your entire journal history for free in JSON format under "Settings → Data". You can also delete your account with one click, wiping all profile data and entries forever.',
    termsPoint5Title: '5. Feedback & Support',
    termsPoint5Text:
      'If you have questions regarding these Terms or platform operations, reach out to our team on Telegram:',
    privacyEyebrow: 'Section 2',
    privacyTitle: 'Privacy Policy & Data Security',
    privacySubtitle:
      'We never profile you for advertisers, never sell your journal to data brokers, and never feed your thoughts into public AI training sets.',
    colParam: 'Parameter',
    colLegacy: 'Typical Social Apps',
    colPriday: 'Winlog',
    tableRows: [
      {
        feature: 'Entry visibility',
        legacy: 'Visible to everyone by default',
        priday: 'Total freedom: public or strictly private',
      },
      {
        feature: 'Platform search',
        legacy: 'Profile indexed and publicly visible',
        priday: 'In secret mode, you are completely hidden',
      },
      {
        feature: 'Ads and trackers',
        legacy: 'Third-party tracking cookies',
        priday: '0 ad trackers, 0 data selling',
      },
      {
        feature: 'AI Model training',
        legacy: 'Reflections scraped to train LLMs',
        priday: 'Zero-Training: stateless private evaluation',
      },
      {
        feature: 'Export and wiping',
        legacy: 'Complex bureaucracy, data retained',
        priday: '1-click JSON export, instant hard deletion',
      },
    ],
    privacyPoint1Title: '1. Freedom of choice: public or secret mode',
    privacyPoint1Text:
      'You choose how visible you want to be. Share victories openly to inspire others and participate in leaderboards, or switch to secret mode where no search engine or platform member can discover you.',
    privacyPoint2Title: '2. Strong database-level access control',
    privacyPoint2Text:
      'Access to private entries is safeguarded by Row Level Security (RLS). Database policies verify authorization directly at the data tier, ensuring nobody can read your secret entries without your permission.',
    privacyPoint3Title: '3. Right to be forgotten and total ownership',
    privacyPoint3Text:
      'At any time under "Settings → Data", you can export a full JSON archive of all your days or press "Delete Account" to immediately and irrevocably delete your profile and reflections.',
    contactSupport: 'Security and code audit questions may be directed to our Telegram support:',
  },
}

export function LegalPageView({ locale = 'ru' }: { locale?: Locale }) {
  const containerRef = useScrollReveal()
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms')
  const content = LEGAL_CONTENT[locale] || LEGAL_CONTENT.ru

  return (
    <div className="landing" ref={containerRef}>
      <AppleNavbar locale={locale} />

      {/* ── HERO STAGE ────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 md:px-8 bg-black text-center overflow-hidden">
        <div className="relative z-10 max-w-[840px] mx-auto flex flex-col items-center">
          <div className="fade-blur mb-4 inline-flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d76737" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="apple-eyebrow !text-[#d76737]">{content.eyebrow}</span>
          </div>

          <h1 className="apple-hero-title fade-blur delay-150 mb-6 sm:mb-8 text-wrap-balance">
            {content.title}
          </h1>

          <p className="apple-body apple-hero-subtitle fade-up delay-250 max-w-[640px] mb-8 sm:mb-10 text-[#86868b] text-[17px] sm:text-[19px] leading-[1.38] text-wrap-balance">
            {content.subtitle}
          </p>

          <div className="flex items-center gap-4 text-xs font-mono text-[#86868b] mb-10 flex-wrap justify-center">
            <span>{content.dateRevision}</span>
            <span>·</span>
            <span>{content.controlPill}</span>
          </div>

          {/* Tab Switcher */}
          <div className="inline-flex items-center p-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md">
            <a
              href="#terms"
              onClick={() => setActiveTab('terms')}
              className={`px-6 py-2 rounded-full text-[13px] font-medium transition-all ${
                activeTab === 'terms'
                  ? 'bg-white text-black font-semibold shadow-md'
                  : 'text-[#86868b] hover:text-white'
              }`}
            >
              {content.tabTerms}
            </a>
            <a
              href="#privacy"
              onClick={() => setActiveTab('privacy')}
              className={`px-6 py-2 rounded-full text-[13px] font-medium transition-all ${
                activeTab === 'privacy'
                  ? 'bg-white text-black font-semibold shadow-md'
                  : 'text-[#86868b] hover:text-white'
              }`}
            >
              {content.tabPrivacy}
            </a>
          </div>
        </div>
      </section>

      {/* ── SECTION 1: УСЛОВИЯ ИСПОЛЬЗОВАНИЯ (TERMS) ────────────────── */}
      <section id="terms" className="py-16 sm:py-20 md:py-24 bg-black border-t border-white/[0.06] scroll-mt-20">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 md:px-8 space-y-10 text-[16px] sm:text-[17px] leading-relaxed text-[#a1a1a6]">
          <div className="border-b border-white/[0.08] pb-6">
            <span className="apple-eyebrow block mb-2 !text-[#d76737]">Раздел 1</span>
            <h2 className="text-[28px] sm:text-[34px] font-bold text-[#f5f5f7] tracking-tight">
              {content.termsTitle}
            </h2>
          </div>

          {/* Summary Box */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#060608] border border-white/[0.1]">
            <span className="text-xs font-mono text-[#d76737] uppercase tracking-wider block mb-2 font-semibold">
              {content.termsSummaryTitle}
            </span>
            <p className="text-[15px] sm:text-[16px] text-[#f5f5f7] leading-relaxed">
              {content.termsSummaryText}
            </p>
          </div>

          {/* Point 1 */}
          <div className="space-y-4">
            <h3 className="text-[22px] sm:text-[24px] font-bold text-[#f5f5f7] tracking-tight">
              {content.termsPoint1Title}
            </h3>
            <p>{content.termsPoint1Text}</p>
          </div>

          {/* Point 2 */}
          <div className="space-y-4">
            <h3 className="text-[22px] sm:text-[24px] font-bold text-[#f5f5f7] tracking-tight">
              {content.termsPoint2Title}
            </h3>
            <p>{content.termsPoint2Text1}</p>
            <p>{content.termsPoint2Text2}</p>
          </div>

          {/* Point 3 */}
          <div className="space-y-4">
            <h3 className="text-[22px] sm:text-[24px] font-bold text-[#f5f5f7] tracking-tight">
              {content.termsPoint3Title}
            </h3>
            <p>{content.termsPoint3Text}</p>
          </div>

          {/* Point 4 */}
          <div className="space-y-4">
            <h3 className="text-[22px] sm:text-[24px] font-bold text-[#f5f5f7] tracking-tight">
              {content.termsPoint4Title}
            </h3>
            <p>{content.termsPoint4Text}</p>
          </div>

          {/* Point 5 */}
          <div className="space-y-4">
            <h3 className="text-[22px] sm:text-[24px] font-bold text-[#f5f5f7] tracking-tight">
              {content.termsPoint5Title}
            </h3>
            <p>
              {content.termsPoint5Text}{' '}
              <a href="https://t.me/ogonek_support" target="_blank" rel="noreferrer" className="text-[#d76737] hover:underline font-medium">
                @ogonek_support
              </a>.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ (PRIVACY) ───────── */}
      <section id="privacy" className="py-16 sm:py-20 md:py-24 bg-black border-t border-white/[0.06] scroll-mt-20">
        <div className="max-w-[840px] mx-auto px-4 sm:px-6 md:px-8 space-y-12">
          <div className="border-b border-white/[0.08] pb-6">
            <span className="apple-eyebrow block mb-2 !text-[#d76737]">{content.privacyEyebrow}</span>
            <h2 className="text-[28px] sm:text-[34px] font-bold text-[#f5f5f7] tracking-tight mb-4">
              {content.privacyTitle}
            </h2>
            <p className="text-[#86868b] text-[16px] leading-relaxed">
              {content.privacySubtitle}
            </p>
          </div>

          {/* Comparison Table */}
          <div className="rounded-2xl overflow-hidden bg-[#060608] border border-white/[0.1]">
            <div className="grid grid-cols-12 p-4 sm:p-5 border-b border-white/[0.08] text-xs font-mono text-[#86868b] uppercase tracking-wider">
              <div className="col-span-4 sm:col-span-5">{content.colParam}</div>
              <div className="col-span-4 sm:col-span-3 text-rose-400">{content.colLegacy}</div>
              <div className="col-span-4 sm:col-span-4 text-[#d76737]">{content.colPriday}</div>
            </div>

            {content.tableRows.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-12 p-4 sm:p-5 border-b border-white/[0.04] text-[13px] sm:text-[14px] items-center hover:bg-white/[0.02] transition-colors"
              >
                <div className="col-span-4 sm:col-span-5 font-medium text-[#f5f5f7]">
                  {row.feature}
                </div>
                <div className="col-span-4 sm:col-span-3 text-rose-400/90 text-[12px] sm:text-[13px]">
                  ✗ {row.legacy}
                </div>
                <div className="col-span-4 sm:col-span-4 text-white/90 font-medium text-[12px] sm:text-[13px]">
                  ✓ {row.priday}
                </div>
              </div>
            ))}
          </div>

          {/* Privacy Points */}
          <div className="space-y-10 text-[16px] leading-relaxed text-[#a1a1a6]">
            <div>
              <h3 className="text-[22px] sm:text-[24px] font-bold text-[#f5f5f7] mb-3 tracking-tight">
                {content.privacyPoint1Title}
              </h3>
              <p className="text-[#86868b]">{content.privacyPoint1Text}</p>
            </div>

            <div>
              <h3 className="text-[22px] sm:text-[24px] font-bold text-[#f5f5f7] mb-3 tracking-tight">
                {content.privacyPoint2Title}
              </h3>
              <p className="text-[#86868b]">{content.privacyPoint2Text}</p>
            </div>

            <div>
              <h3 className="text-[22px] sm:text-[24px] font-bold text-[#f5f5f7] mb-3 tracking-tight">
                {content.privacyPoint3Title}
              </h3>
              <p className="text-[#86868b] mb-4">{content.privacyPoint3Text}</p>
              <div className="p-5 rounded-2xl bg-[#060608] border border-white/[0.1] text-xs text-[#86868b]">
                {content.contactSupport}{' '}
                <a href="https://t.me/ogonek_support" target="_blank" rel="noreferrer" className="text-[#d76737] underline">
                  @ogonek_support
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AppleFooter locale={locale} />
    </div>
  )
}

export default function LegalPage() {
  return <LegalPageView locale="ru" />
}

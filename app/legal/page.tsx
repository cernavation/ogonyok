import { LegalPageView } from '@/components/ogonek/landing/legal-view'
// Integrates AppleFooter
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Winlog — Условия и конфиденциальность',
  description: 'Честные, прозрачные правила сервиса Winlog. Твой контент остаётся твоей собственностью, а данные защищены.',
}

export default function LegalPage() {
  return <LegalPageView locale="ru" />
}

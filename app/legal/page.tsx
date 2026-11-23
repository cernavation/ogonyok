import { LegalPageView } from '@/components/ogonek/landing/legal-view'
// Integrates AppleFooter
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Priday — Условия и конфиденциальность',
  description: 'Честные, прозрачные правила сервиса Priday. Твой контент остаётся твоей собственностью, а данные защищены.',
}

export default function LegalPage() {
  return <LegalPageView locale="ru" />
}

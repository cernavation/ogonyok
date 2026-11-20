import { LegalPageView } from '@/components/ogonek/landing/legal-view'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Priday — Условия и конфиденциальность (RU)',
  description: 'Честные, прозрачные правила сервиса Priday. Твой контент остаётся твоей собственностью, а данные защищены.',
}

export default function RuLegalPage() {
  return <LegalPageView locale="ru" />
}

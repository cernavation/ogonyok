import { LocaleLandingView } from '@/components/ogonek/landing/locale-landing-view'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Winlog — Твоя жизнь состоит из побед. Запиши их.',
  description: 'Winlog — личная летопись гордости и благодарности. Две минуты в день, бесплатно.',
  alternates: { canonical: 'https://winlog.life/ru' },
}

export default function RuLandingPage() {
  return <LocaleLandingView locale="ru" />
}

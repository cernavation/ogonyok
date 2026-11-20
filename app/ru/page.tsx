import { LandingPage } from '@/components/ogonek/landing/landing-page'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Priday — Твоя жизнь состоит из побед. Запиши их.',
  description: 'Огонёк (Priday) — личная летопись гордости и благодарности. Две минуты в день, бесплатно.',
}

export default function RuLandingPage() {
  return <LandingPage locale="ru" />
}

import { LocaleLandingView } from '@/components/ogonek/landing/locale-landing-view'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Winlog — Your life is made of victories. Write them down.',
  description: 'Winlog is a personal journal of pride and gratitude. Two minutes a day, free.',
  alternates: { canonical: 'https://winlog.life/en' },
}

export default function EnLandingPage() {
  return <LocaleLandingView locale="en" />
}

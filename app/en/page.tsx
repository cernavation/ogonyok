import { LocaleLandingView } from '@/components/ogonek/landing/locale-landing-view'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Priday — Your life is made of victories. Write them down.',
  description: 'Priday is a personal journal of pride and gratitude. Two minutes a day, free.',
}

export default function EnLandingPage() {
  return <LocaleLandingView locale="en" />
}

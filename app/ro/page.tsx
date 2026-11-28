import { LocaleLandingView } from '@/components/ogonek/landing/locale-landing-view'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Winlog — Viața ta e formată din victorii. Notează-le.',
  description: 'Winlog — cronica personală a mândriei și recunoștinței. Două minute pe zi, gratuit.',
  alternates: { canonical: 'https://winlog.life/ro' },
}

export default function RoLandingPage() {
  return <LocaleLandingView locale="ro" />
}

import { LocaleLandingView } from '@/components/ogonek/landing/locale-landing-view'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Priday — Viața ta e formată din victorii. Notează-le.',
  description: 'Priday — cronica personală a mândriei și recunoștinței. Două minute pe zi, gratuit.',
}

export default function RoLandingPage() {
  return <LocaleLandingView locale="ro" />
}

import { LegalPageView } from '@/components/ogonek/landing/legal-view'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Priday — Termeni și confidențialitate (RO)',
  description: 'Reguli clare și transparente ale serviciului Priday. Conținutul tău rămâne proprietatea ta, iar datele sunt protejate.',
}

export default function RoLegalPage() {
  return <LegalPageView locale="ro" />
}

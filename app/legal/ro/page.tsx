import { LegalPageView } from '@/components/ogonek/landing/legal-view'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Winlog — Termeni și confidențialitate (RO)',
  description: 'Reguli clare și transparente ale serviciului Winlog. Conținutul tău rămâne proprietatea ta, iar datele sunt protejate.',
}

export default function RoLegalPage() {
  return <LegalPageView locale="ro" />
}

import { LegalPageView } from '@/components/ogonek/landing/legal-view'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Winlog — Terms & Privacy (EN)',
  description: 'Fair, transparent terms for Winlog. Your content remains your exclusive property, and your data is protected.',
}

export default function EnLegalPage() {
  return <LegalPageView locale="en" />
}

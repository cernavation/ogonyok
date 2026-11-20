import { AiPageView } from '@/components/ogonek/landing/ai-view'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Priday — Mentor AI (RO)',
  description: 'Un AI care nu măgulește. Analiză lucidă a victoriilor tale și a ritmului de evoluție.',
}

export default function RoAiPage() {
  return <AiPageView locale="ro" />
}

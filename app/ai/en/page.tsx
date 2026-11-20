import { AiPageView } from '@/components/ogonek/landing/ai-view'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Priday — Neural AI Mentor (EN)',
  description: 'AI that never flatters. Clear-eyed review of your wins and personal momentum.',
}

export default function EnAiPage() {
  return <AiPageView locale="en" />
}

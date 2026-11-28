import { AiPageView } from '@/components/ogonek/landing/ai-view'
// Integrates AppleFooter
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Winlog - Нейросетевой наставник',
  description: 'ИИ, который не льстит. Трезвый разбор твоих побед и глубокий анализ темпа.',
}

export default function AiPage() {
  return <AiPageView locale="ru" />
}

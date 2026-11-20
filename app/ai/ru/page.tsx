import { AiPageView } from '@/components/ogonek/landing/ai-view'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Priday — Нейросетевой наставник (RU)',
  description: 'ИИ, который не льстит. Трезвый разбор твоих побед и глубокий анализ темпа.',
}

export default function RuAiPage() {
  return <AiPageView locale="ru" />
}

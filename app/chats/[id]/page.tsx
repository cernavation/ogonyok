import { FullscreenMessenger } from '@/components/ogonek/messenger/fullscreen-messenger'

export const metadata = {
  title: 'Диалог — Winlog',
  description: 'Полноэкранный мессенджер Winlog',
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function ChatRoutePage({ params }: Props) {
  const resolvedParams = await params
  return <FullscreenMessenger initialThreadId={resolvedParams.id} />
}


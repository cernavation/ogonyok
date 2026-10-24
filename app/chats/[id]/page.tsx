import { FullscreenMessenger } from '@/components/ogonek/messenger/fullscreen-messenger'

export const metadata = {
  title: 'Диалог — Огонёк',
  description: 'Полноэкранный мессенджер Огонёк',
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function ChatRoutePage({ params }: Props) {
  const resolvedParams = await params
  return <FullscreenMessenger initialThreadId={resolvedParams.id} />
}


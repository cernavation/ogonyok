import { StandaloneChatPage } from '@/components/ogonek/messenger/standalone-chat-page'

type Props = {
  params: Promise<{ id: string }> | { id: string }
}

export default async function ChatRoutePage({ params }: Props) {
  const resolvedParams = await params
  return <StandaloneChatPage friendId={resolvedParams.id} />
}

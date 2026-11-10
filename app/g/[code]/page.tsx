import { GroupInviteClient } from './group-invite-client'

export default async function GroupInvitePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  return <GroupInviteClient code={code} />
}

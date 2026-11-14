import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerSupabase } from '@/lib/supabase/server'
import { FALLBACK_SEED_PROFILES } from '@/lib/supabase/api'
import { InviteClientCard } from './invite-client-card'

interface Props {
  params: Promise<{ username: string }>
}

async function getInviterProfile(rawUsername: string) {
  const username = rawUsername.replace(/^@+/, '').toLowerCase()
  const supabase = getServerSupabase()

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', username)
        .maybeSingle()

      if (!error && data) {
        return {
          id: data.id,
          username: data.username,
          displayName: data.display_name || `@${data.username}`,
          avatarUrl: data.avatar_url || data.avatar_image || null,
          bio: data.bio || '',
          city: data.city || '',
          streak: Number(data.streak_count ?? data.streak ?? 0),
          verified: Boolean(data.verified),
          level: Number(data.level ?? 1),
          createdAt: data.created_at,
        }
      }
    } catch {}
  }

  // Fallback к seed профилям
  const seed = FALLBACK_SEED_PROFILES.find((p) => p.username.toLowerCase() === username)
  if (seed) {
    return {
      id: seed.id,
      username: seed.username,
      displayName: seed.display_name,
      avatarUrl: seed.avatar_url || null,
      bio: seed.bio || '',
      city: seed.city || '',
      streak: seed.streak_count ?? 0,
      verified: Boolean(seed.verified),
      level: seed.level ?? 1,
      createdAt: seed.created_at,
    }
  }

  return null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const profile = await getInviterProfile(username)

  if (!profile) {
    return {
      title: 'Приглашение в Огонёк',
      description: 'Присоединяйся к Огоньку — летописи ежедневных побед и гордостей.',
    }
  }

  const title = `${profile.displayName} (@${profile.username}) приглашает тебя в Огонёк`
  const description = `Держит огонь ${profile.streak} ${
    profile.streak === 1 ? 'день' : profile.streak >= 2 && profile.streak <= 4 ? 'дня' : 'дней'
  }. Присоединяйся к Огоньку, чтобы вести дневник побед вместе!`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [profile.avatarUrl || '/og-image.png'],
      type: 'profile',
      username: profile.username,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [profile.avatarUrl || '/og-image.png'],
    },
  }
}

export default async function InvitePage({ params }: Props) {
  const { username } = await params
  const profile = await getInviterProfile(username)

  return (
    <main className="min-h-screen bg-[var(--bg,#000)] text-[var(--text,#fff)] flex flex-col items-center justify-center p-4 selection:bg-[var(--accent)] selection:text-white">
      <InviteClientCard username={username} initialProfile={profile} />
    </main>
  )
}

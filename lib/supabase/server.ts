import { createClient, SupabaseClient } from '@supabase/supabase-js'

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export function getServerSupabase(): SupabaseClient {
  if (!SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server Supabase operations and must not fall back to anon key')
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

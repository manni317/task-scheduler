import { createServerSupabaseClient, getUser as getServerUser, getSession as getServerSession } from '@/lib/supabase/server'
import { createBrowserSupabaseClient, getBrowserSupabaseClient } from '@/lib/supabase/browser'
import { Database } from '@/types/supabase'

export type User = Database['public']['Tables']['users']['Row']
export type Session = Database['public']['Tables']['sessions']['Row']

export async function getUser(): Promise<User | null> {
  return getServerUser()
}

export async function getSession() {
  return getServerSession()
}

export async function getUserProfile(userId: string) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) return null
  return data
}

export async function signOut() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
}

export function getBrowserClient() {
  return getBrowserSupabaseClient()
}

export async function signInWithGoogle() {
  const supabase = getBrowserSupabaseClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: 'openid email profile https://www.googleapis.com/auth/calendar',
    },
  })
  return { data, error }
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = getBrowserSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export async function signUpWithEmail(email: string, password: string) {
  const supabase = getBrowserSupabaseClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  return { data, error }
}

export async function resetPassword(email: string) {
  const supabase = getBrowserSupabaseClient()
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })
  return { data, error }
}

export async function updatePassword(password: string) {
  const supabase = getBrowserSupabaseClient()
  const { data, error } = await supabase.auth.updateUser({ password })
  return { data, error }
}
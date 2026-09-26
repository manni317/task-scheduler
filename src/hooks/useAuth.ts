'use client'

import { useSession } from 'next-auth/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/lib/supabase-provider'
import type { Profile } from '@/types/database'
import { useEffect, useState } from 'react'

export function useAuth() {
  const { data: session, status } = useSession()
  const supabase = useSupabase()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile(session.user.id)
    } else {
      setProfile(null)
      setLoading(false)
    }
  }, [session, supabase])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setProfile(data)
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = profile?.role === 'admin'
  const isMember = profile?.role === 'member' || isAdmin

  return {
    session,
    profile,
    loading: status === 'loading' || loading,
    isAuthenticated: status === 'authenticated',
    isAdmin,
    isMember,
    role: profile?.role ?? 'viewer',
  }
}

export function useProfile() {
  const { profile, loading, isAuthenticated, session } = useAuth()
  const queryClient = useQueryClient()
  const supabase = useSupabase()

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!session?.user?.id) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', session.user.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', session?.user?.id], data)
      setProfile(data)
    },
  })

  return { profile, loading, isAuthenticated, updateProfile: updateProfile.mutate }
}
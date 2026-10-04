'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '@/lib/supabase-provider'
import type { Profile } from '@/types/database'
import { useEffect, useState } from 'react'

export function useAuth() {
  const supabase = useSupabase()
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const getInitialSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        if (mounted) {
          setSession(currentSession)
          if (currentSession?.user) {
            await fetchProfile(currentSession.user.id, currentSession.user.email)
          } else {
            setProfile(null)
            setLoading(false)
          }
        }
      } catch (err) {
        console.error('Session fetch error:', err)
        if (mounted) setLoading(false)
      }
    }

    getInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return
        setSession(newSession)
        if (newSession?.user) {
          await fetchProfile(newSession.user.id, newSession.user.email)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const fetchProfile = async (userId: string, email?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        
      if (error && error.code !== 'PGRST116') {
        throw error
      }
      
      // If profile doesn't have email but session does, use session email
      setProfile({
        ...data,
        email: data?.email || email || 'user@example.com',
        full_name: data?.full_name || 'User'
      })
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      // Fallback to basic auth info if profile fetch fails
      setProfile({
        id: userId,
        email: email || 'user@example.com',
        full_name: 'User',
        role: 'employee',
        avatar_url: null,
        created_at: new Date().toISOString()
      } as any)
    } finally {
      setLoading(false)
    }
  }

  const role = profile?.role ?? 'doer'
  const isAdmin = role === 'admin'
  const isManager = role === 'manager'
  const isEmployee = role === 'doer'

  return {
    session,
    profile,
    loading,
    isLoading: loading,
    isAuthenticated: !!session,
    isAdmin,
    isManager,
    isEmployee,
    role,
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
        .eq('id', session.user.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', session?.user?.id], data)
      // Note: Full state sync would require exposing setProfile from useAuth, but React Query will cache the new data.
    },
  })

  return { profile, loading, isAuthenticated, updateProfile: updateProfile.mutateAsync }
}
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase, useRealtimeSubscription } from '@/lib/supabase-provider'
import type { Project, ProjectMember, Profile, Database } from '@/types/database'
import { useEffect } from 'react'

export function useProjects() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()

  const { data: projects = [], isLoading, error, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          owner:profiles!projects_owner_id_fkey(id, full_name, avatar_url),
          members:project_members(count)
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as (Project & {
        owner: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
        members: { count: number }[]
      })[]
    },
  })

  const { data: realtimeProjects } = useRealtimeSubscription<Project>('projects')

  useEffect(() => {
    if (realtimeProjects.length > 0) {
      queryClient.setQueryData(['projects'], (old: Project[] = []) => {
        const merged = [...old]
        realtimeProjects.forEach((rt) => {
          const idx = merged.findIndex((p) => p.id === rt.id)
          if (idx >= 0) merged[idx] = rt
          else merged.push(rt)
        })
        return merged
      })
    }
  }, [realtimeProjects, queryClient])

  const createProject = useMutation({
    mutationFn: async (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const updateProject = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  return {
    projects,
    isLoading,
    error,
    refetch,
    createProject: createProject.mutateAsync,
    updateProject: updateProject.mutateAsync,
    deleteProject: deleteProject.mutateAsync,
  }
}

export function useProject(projectId: string) {
  const supabase = useSupabase()

  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          owner:profiles!projects_owner_id_fkey(id, full_name, avatar_url),
          members:project_members(
            id,
            role,
            user:profiles(id, full_name, avatar_url, email)
          )
        `)
        .eq('id', projectId)
        .single()
      if (error) throw error
      return data as Project & {
        owner: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
        members: (ProjectMember & { user: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'email'> })[]
      }
    },
    enabled: !!projectId,
  })
}

export function useProjectMembers(projectId: string) {
  const supabase = useSupabase()
  const queryClient = useQueryClient()

  const { data: members = [], isLoading, error } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          *,
          user:profiles(id, full_name, avatar_url, email)
        `)
        .eq('project_id', projectId)
      if (error) throw error
      return data as (ProjectMember & { user: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'email'> })[]
    },
    enabled: !!projectId,
  })

  const { data: realtimeMembers } = useRealtimeSubscription<ProjectMember>(
    'project_members',
    `project_id=eq.${projectId}`
  )

  useEffect(() => {
    if (realtimeMembers.length > 0) {
      queryClient.setQueryData(['project-members', projectId], (old: ProjectMember[] = []) => {
        const merged = [...old]
        realtimeMembers.forEach((rt) => {
          const idx = merged.findIndex((m) => m.id === rt.id)
          if (idx >= 0) merged[idx] = rt
          else merged.push(rt)
        })
        return merged
      })
    }
  }, [realtimeMembers, queryClient, projectId])

  const addMember = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: ProjectMember['role'] }) => {
      const { data, error } = await supabase
        .from('project_members')
        .insert({ project_id: projectId, user_id: userId, role })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
    },
  })

  const updateMemberRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: ProjectMember['role'] }) => {
      const { data, error } = await supabase
        .from('project_members')
        .update({ role })
        .eq('id', memberId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
    },
  })

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('project_members').delete().eq('id', memberId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
    },
  })

  return {
    members,
    isLoading,
    error,
    addMember: addMember.mutateAsync,
    updateMemberRole: updateMemberRole.mutateAsync,
    removeMember: removeMember.mutateAsync,
  }
}
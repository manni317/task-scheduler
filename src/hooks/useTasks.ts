'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase, useRealtimeSubscription } from '@/lib/supabase-provider'
import type { Task, Database } from '@/types/database'
import { useEffect, useState } from 'react'

type TaskStatus = Task['status']
type TaskPriority = Task['priority']

interface TaskFilters {
  status?: TaskStatus | TaskStatus[]
  priority?: TaskPriority | TaskPriority[]
  assigneeId?: string
  projectId?: string
  search?: string
}

interface UseTasksOptions {
  projectId?: string
  filters?: TaskFilters
  enabled?: boolean
}

export function useTasks({ projectId, filters = {}, enabled = true }: UseTasksOptions = {}) {
  const supabase = useSupabase()
  const queryClient = useQueryClient()

  const { data: tasks = [], isLoading, error, refetch } = useQuery({
    queryKey: ['tasks', projectId, filters],
    queryFn: async () => {
      let query = supabase.from('tasks').select(`
        *,
        assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url),
        reporter:profiles!tasks_reporter_id_fkey(id, full_name, avatar_url)
      `)

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      if (filters.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
        query = query.in('status', statuses)
      }

      if (filters.priority) {
        const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority]
        query = query.in('priority', priorities)
      }

      if (filters.assigneeId) {
        query = query.eq('assignee_id', filters.assigneeId)
      }

      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`)
      }

      query = query.order('position', { ascending: true }).order('created_at', { ascending: false })

      const { data, error } = await query
      if (error) throw error
      return data as Task[]
    },
    enabled: enabled && !!projectId,
  })

  const { data: realtimeTasks } = useRealtimeSubscription<Task>(
    'tasks',
    projectId ? `project_id=eq.${projectId}` : undefined
  )

  useEffect(() => {
    if (realtimeTasks.length > 0) {
      queryClient.setQueryData(['tasks', projectId, filters], (old: Task[] = []) => {
        const merged = [...old]
        realtimeTasks.forEach((rt) => {
          const idx = merged.findIndex((t) => t.id === rt.id)
          if (idx >= 0) merged[idx] = rt
          else merged.push(rt)
        })
        return merged
      })
    }
  }, [realtimeTasks, queryClient, projectId, filters])

  const createTask = useMutation({
    mutationFn: async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
  })

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
  })

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
  })

  const reorderTasks = useMutation({
    mutationFn: async (taskOrders: { id: string; position: number }[]) => {
      const updates = taskOrders.map(({ id, position }) =>
        supabase.from('tasks').update({ position }).eq('id', id)
      )
      const results = await Promise.all(updates)
      const error = results.find((r) => r.error)
      if (error) throw error.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
  })

  const moveTask = useMutation({
    mutationFn: async ({ taskId, newStatus, newPosition }: { taskId: string; newStatus: TaskStatus; newPosition: number }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: newStatus, position: newPosition })
        .eq('id', taskId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
  })

  return {
    tasks,
    isLoading,
    error,
    refetch,
    createTask: createTask.mutateAsync,
    updateTask: updateTask.mutateAsync,
    deleteTask: deleteTask.mutateAsync,
    reorderTasks: reorderTasks.mutateAsync,
    moveTask: moveTask.mutateAsync,
  }
}

export function useTask(taskId: string) {
  const supabase = useSupabase()

  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url),
          reporter:profiles!tasks_reporter_id_fkey(id, full_name, avatar_url),
          project:projects(id, name, key, color)
        `)
        .eq('id', taskId)
        .single()
      if (error) throw error
      return data as Task & {
        assignee: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url'> | null
        reporter: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url'>
        project: Pick<Database['public']['Tables']['projects']['Row'], 'id' | 'name' | 'key' | 'color'>
      }
    },
    enabled: !!taskId,
  })
}
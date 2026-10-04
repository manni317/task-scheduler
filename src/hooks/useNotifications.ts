'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase, useRealtime } from '@/lib/supabase-provider'
import type { Notification, Database } from '@/types/database'
import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'

export function useNotifications() {
  const { session } = useAuth()
  const supabase = useSupabase()
  const queryClient = useQueryClient()
  const [unreadCount, setUnreadCount] = useState(0)

  const { data: notifications = [], isLoading, error, refetch } = useQuery({
    queryKey: ['notifications', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as Notification[]
    },
    enabled: !!session?.user?.id,
  })

  useEffect(() => {
    const unread = notifications.filter((n) => !n.read).length
    setUnreadCount(unread)
  }, [notifications])

  const { isConnected } = useRealtime<Notification>({
    table: 'notifications',
    filter: `user_id=eq.${session?.user?.id}`,
    event: 'INSERT',
    onInsert: (payload) => {
      queryClient.setQueryData(['notifications', session?.user?.id], (old: Notification[] = []) => [
        payload.new,
        ...old,
      ])
      setUnreadCount((prev) => prev + 1)
    },
    enabled: !!session?.user?.id,
  })

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', session?.user?.id] })
    },
  })

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', session?.user?.id)
        .eq('read', false)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', session?.user?.id] })
      setUnreadCount(0)
    },
  })

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', session?.user?.id] })
    },
  })

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    isConnected,
    refetch,
    markAsRead: markAsRead.mutateAsync,
    markAllAsRead: markAllAsRead.mutateAsync,
    deleteNotification: deleteNotification.mutateAsync,
  }
}

export function useNotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)

  const toggle = () => setIsOpen((prev) => !prev)
  const close = () => setIsOpen(false)
  const open = () => setIsOpen(true)

  return {
    notifications,
    unreadCount,
    isLoading,
    isOpen,
    toggle,
    open,
    close,
    markAsRead,
    markAllAsRead,
  }
}
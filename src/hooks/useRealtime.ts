'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/lib/supabase-provider'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

interface UseRealtimeOptions<T> {
  table: string
  event?: RealtimeEvent
  filter?: string
  schema?: string
  onInsert?: (payload: RealtimePostgresChangesPayload<T>) => void
  onUpdate?: (payload: RealtimePostgresChangesPayload<T>) => void
  onDelete?: (payload: RealtimePostgresChangesPayload<T>) => void
  enabled?: boolean
}

interface UseRealtimeResult<T> {
  channel: RealtimeChannel | null
  isConnected: boolean
  error: Error | null
  subscribe: () => void
  unsubscribe: () => void
}

export function useRealtime<T = any>({
  table,
  event = '*',
  filter,
  schema = 'public',
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseRealtimeOptions<T>): UseRealtimeResult<T> {
  const supabase = useSupabase()
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const subscribe = useCallback(() => {
    if (!enabled || channel) return

    try {
      const newChannel = supabase
        .channel(`realtime:${table}:${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event,
            schema,
            table,
            filter,
          },
          (payload) => {
            switch (payload.eventType) {
              case 'INSERT':
                onInsert?.(payload as RealtimePostgresChangesPayload<T>)
                break
              case 'UPDATE':
                onUpdate?.(payload as RealtimePostgresChangesPayload<T>)
                break
              case 'DELETE':
                onDelete?.(payload as RealtimePostgresChangesPayload<T>)
                break
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true)
            setError(null)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsConnected(false)
            setError(new Error(`Realtime subscription failed: ${status}`))
          } else if (status === 'CLOSED') {
            setIsConnected(false)
          }
        })

      setChannel(newChannel)
    } catch (err) {
      setError(err as Error)
    }
  }, [supabase, table, event, filter, schema, onInsert, onUpdate, onDelete, enabled, channel])

  const unsubscribe = useCallback(() => {
    if (channel) {
      supabase.removeChannel(channel)
      setChannel(null)
      setIsConnected(false)
    }
  }, [channel, supabase])

  useEffect(() => {
    if (enabled) {
      subscribe()
    }
    return () => {
      unsubscribe()
    }
  }, [enabled, subscribe, unsubscribe])

  return { channel, isConnected, error, subscribe, unsubscribe }
}

export function useRealtimeQuery<T = any>(
  table: string,
  queryKey: string[],
  event: RealtimeEvent = '*',
  filter?: string
) {
  const supabase = useSupabase()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let channel: RealtimeChannel | null = null
    let initialDataLoaded = false

    const setupSubscription = async () => {
      try {
        // Fetch initial data
        const { data: initialData, error: fetchError } = await supabase
          .from(table)
          .select('*')

        if (fetchError) throw fetchError

        setData(initialData as T[])
        initialDataLoaded = true
        setLoading(false)

        // Setup realtime subscription
        channel = supabase
          .channel(`realtime-query:${table}:${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event,
              schema: 'public',
              table,
              filter,
            },
            (payload) => {
              setData((prev) => {
                if (payload.eventType === 'INSERT') {
                  return [...prev, payload.new as T]
                }
                if (payload.eventType === 'UPDATE') {
                  return prev.map((item) =>
                    (item as any).id === (payload.new as any).id ? payload.new : item
                  )
                }
                if (payload.eventType === 'DELETE') {
                  return prev.filter((item) => (item as any).id !== (payload.old as any).id)
                }
                return prev
              })
            }
          )
          .subscribe()
      } catch (err) {
        setError(err as Error)
        setLoading(false)
      }
    }

    setupSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [supabase, table, event, filter])

  return { data, loading, error }
}

export function usePresence(channelName: string, userData: Record<string, any>) {
  const supabase = useSupabase()
  const [presenceState, setPresenceState] = useState<Record<string, any>>({})
  const [myPresence, setMyPresence] = useState<Record<string, any> | null>(null)

  useEffect(() => {
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userData.id || 'anonymous',
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState()
        setPresenceState(newState)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(userData)
          setMyPresence(userData)
        }
      })

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [supabase, channelName, userData])

  return { presenceState, myPresence }
}
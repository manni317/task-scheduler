'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

interface SupabaseContextType {
  client: SupabaseClient<Database> | null
}

const SupabaseContext = createContext<SupabaseContextType>({ client: null })

export function SupabaseProvider({ client, children }: { client: SupabaseClient<Database>; children: ReactNode }) {
  return (
    <SupabaseContext.Provider value={{ client }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (!context.client) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context.client
}

export function useRealtimeSubscription<T = any>(
  table: string,
  filter?: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*'
) {
  const client = useSupabase()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let channel: ReturnType<typeof client.channel> | null = null

    const setupSubscription = async () => {
      try {
        channel = client
          .channel(`realtime:${table}`)
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
                if (event === 'INSERT') {
                  return [...prev, payload.new as T]
                }
                if (event === 'UPDATE') {
                  return prev.map((item) =>
                    (item as any).id === (payload.new as any).id ? payload.new : item
                  )
                }
                if (event === 'DELETE') {
                  return prev.filter((item) => (item as any).id !== (payload.old as any).id)
                }
                return prev
              })
            }
          )
          .subscribe()

        setLoading(false)
      } catch (err) {
        setError(err as Error)
        setLoading(false)
      }
    }

    setupSubscription()

    return () => {
      if (channel) {
        client.removeChannel(channel)
      }
    }
  }, [client, table, filter, event])

  return { data, loading, error }
}
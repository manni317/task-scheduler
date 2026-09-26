import { inngest } from './utils'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createNotification } from './utils'

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

export const gcalSync = inngest.createFunction(
  { id: 'gcal-sync', name: 'Google Calendar Two-Way Sync' },
  { cron: '*/15 * * * *' },
  async ({ event, step }) => {
    const supabase = await createServerSupabaseClient()
    
    const { data: syncConfigs, error } = await supabase
      .from('google_calendar_sync')
      .select('*')
      .eq('sync_enabled', true)

    if (error) throw error

    let synced = 0
    let conflicts = 0

    for (const config of syncConfigs || []) {
      await step.run(`sync-user-${config.user_id}`, async () => {
        const accessToken = await step.run(`refresh-token-${config.user_id}`, async () => {
          return await refreshAccessToken(config)
        })

        if (!accessToken) {
          await createNotification(config.user_id, 'calendar_event', 'Calendar Sync Failed', 'Google Calendar access token expired. Please re-authenticate.')
          return
        }

        const result = await step.run(`sync-events-${config.user_id}`, async () => {
          return await syncCalendarEvents(config, accessToken, supabase)
        })

        synced += result.synced
        conflicts += result.conflicts
      })
    }

    return { synced, conflicts }
  }
)

async function refreshAccessToken(config: any): Promise<string | null> {
  const now = new Date()
  const expiresAt = new Date(config.token_expires_at)

  if (expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
    return config.access_token
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: config.refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    const supabase = await createServerSupabaseClient()

    await supabase
      .from('google_calendar_sync')
      .update({
        access_token: data.access_token,
        token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      })
      .eq('id', config.id)

    return data.access_token
  } catch {
    return null
  }
}

async function syncCalendarEvents(config: any, accessToken: string, supabase: any) {
  let synced = 0
  let conflicts = 0

  const localEvents = await getLocalEvents(config.user_id, supabase)
  const remoteEvents = await getRemoteEvents(config.google_calendar_id, accessToken)

  const remoteMap = new Map(remoteEvents.map((e: any) => [e.id, e]))
  const localMap = new Map(localEvents.map((e: any) => [e.google_event_id, e]))

  for (const local of localEvents) {
    if (local.google_event_id && remoteMap.has(local.google_event_id)) {
      const remote = remoteMap.get(local.google_event_id)!
      const localUpdated = new Date(local.updated_at).getTime()
      const remoteUpdated = new Date((remote as any).updated).getTime()

      if (local.sync_status === 'pending' || localUpdated > remoteUpdated) {
        await pushToGoogle(local, config.google_calendar_id, accessToken)
        synced++
      } else if (remoteUpdated > localUpdated) {
        await pullFromGoogle(remote, config.user_id, supabase)
        synced++
      }
    } else if (!local.google_event_id && local.sync_status !== 'synced') {
      const created = await createInGoogle(local, config.google_calendar_id, accessToken)
      if (created) {
        await supabase
          .from('calendar_events')
          .update({ google_event_id: created.id, sync_status: 'synced', last_synced_at: new Date().toISOString() })
          .eq('id', local.id)
        synced++
      }
    }
  }

  for (const remote of remoteEvents) {
    if (!localMap.has(remote.id) && remote.status !== 'cancelled') {
      await pullFromGoogle(remote, config.user_id, supabase)
      synced++
    }
  }

  return { synced, conflicts }
}

async function getLocalEvents(userId: string, supabase: any) {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'cancelled')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data || []
}

async function getRemoteEvents(calendarId: string, accessToken: string) {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${new Date().toISOString()}&singleEvents=true&orderBy=startTime`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!response.ok) throw new Error('Failed to fetch remote events')
  const data = await response.json()
  return data.items || []
}

async function pushToGoogle(local: any, calendarId: string, accessToken: string) {
  const event = {
    summary: local.title,
    description: local.description,
    start: local.all_day
      ? { date: local.start_time.split('T')[0] }
      : { dateTime: local.start_time, timeZone: 'UTC' },
    end: local.all_day
      ? { date: local.end_time.split('T')[0] }
      : { dateTime: local.end_time, timeZone: 'UTC' },
    location: local.location,
    status: local.status,
  }

  const url = local.google_event_id
    ? `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${local.google_event_id}`
    : `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`

  const response = await fetch(url, {
    method: local.google_event_id ? 'PUT' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  })

  if (!response.ok) throw new Error('Failed to push to Google')
  return await response.json()
}

async function createInGoogle(local: any, calendarId: string, accessToken: string) {
  return pushToGoogle(local, calendarId, accessToken)
}

async function pullFromGoogle(remote: any, userId: string, supabase: any) {
  const startTime = remote.start?.dateTime || remote.start?.date
  const endTime = remote.end?.dateTime || remote.end?.date

  const { error } = await supabase
    .from('calendar_events')
    .upsert({
      user_id: userId,
      google_event_id: remote.id,
      title: remote.summary || 'Untitled Event',
      description: remote.description,
      start_time: startTime,
      end_time: endTime,
      all_day: !!remote.start?.date,
      location: remote.location,
      meeting_link: remote.hangoutLink,
      status: remote.status,
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
    }, { onConflict: 'google_event_id' })

  if (error) throw error
}
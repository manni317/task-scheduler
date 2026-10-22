import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export const dynamic = 'force-dynamic'

const vapidPublicKey = 'BNnfzDUWPasOiywWfzdmVbiK_ty759QaN38x1g2kjblALVAWfpYAzjC-zwu_oiMCF8O204haJ7OdjG15NM1nKWA'
const vapidPrivateKey = 'pxooLKj6LPMaQlnGM9FsqlrAwVG51kYpmqESlKFqhXk'

try {
  webpush.setVapidDetails(
    'mailto:support@task-scheduler.com',
    vapidPublicKey,
    vapidPrivateKey
  )
} catch (e) {
  console.error('Error setting VAPID:', e)
}

function getSupabase() {
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder'))
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey,
    {
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
      }
    }
  )
}

async function handlePush(userId?: string | null, customTitle?: string, customBody?: string) {
  const supabase = getSupabase()

  let query = supabase.from('push_subscriptions').select('*')
  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data: subscriptions, error } = await query

  if (error) {
    return { success: false, error: 'DB Error', details: error }
  }

  if (!subscriptions || subscriptions.length === 0) {
    return { 
      success: false, 
      error: 'No push subscription found. Please tap "Test Instant Push" or allow notifications in your browser first.',
      userId 
    }
  }

  const payload = JSON.stringify({
    title: customTitle || '⚡ Instant Push Notification',
    body: customBody || 'Notification system is working instantly on your device! 🚀',
    url: '/tasks',
    icon: '/icon-192x192.png',
    badge: '/icons/icon-72x72.svg',
    tag: 'test-push-' + Date.now(),
    renotify: true,
  })

  const results = []
  for (const sub of subscriptions) {
    try {
      const res = await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      }, payload, {
        urgency: 'high',
        TTL: 86400,
        headers: {
          'Urgency': 'high',
        }
      })
      results.push({ subId: sub.id, success: true, statusCode: res.statusCode })
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
      results.push({ subId: sub.id, success: false, error: err.message, statusCode: err.statusCode })
    }
  }

  const anySuccess = results.some(r => r.success)
  return {
    success: anySuccess,
    subscriptionsFound: subscriptions.length,
    results,
    message: anySuccess ? 'Instant notification sent successfully!' : 'Failed to deliver notification'
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const result = await handlePush(userId)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { userId, title, message } = body
    const result = await handlePush(userId, title, message)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

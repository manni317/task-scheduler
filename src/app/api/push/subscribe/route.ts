import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { subscription, userId } = await req.json()

    if (!subscription || !subscription.endpoint || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder'))
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey,
      {
        global: {
          fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
        }
      }
    )

    // Check if it already exists for this endpoint
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id, user_id')
      .eq('endpoint', subscription.endpoint)
      .maybeSingle()

    if (existing) {
      if (existing.user_id !== userId) {
        await supabase
          .from('push_subscriptions')
          .update({
            user_id: userId,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          })
          .eq('id', existing.id)
      }
      return NextResponse.json({ success: true, message: 'Subscription active' })
    }

    const { error } = await supabase.from('push_subscriptions').insert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    })

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Push subscribe error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

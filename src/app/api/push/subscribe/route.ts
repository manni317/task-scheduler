import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const { subscription, userId } = await req.json()

    if (!subscription || !subscription.endpoint || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {},
          remove(name: string, options: any) {},
        }
      }
    )

    // Check if it already exists to avoid duplicates
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', subscription.endpoint)
      .eq('user_id', userId)
      .single()

    if (existing) {
      return NextResponse.json({ success: true, message: 'Already subscribed' })
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

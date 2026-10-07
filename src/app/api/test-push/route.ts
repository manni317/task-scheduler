import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || 'ce52e250-d95d-4ec0-bb91-08151c718d36' // Default to Gaurav

  try {
    const vapidPublicKey = 'BNnfzDUWPasOiywWfzdmVbiK_ty759QaN38x1g2kjblALVAWfpYAzjC-zwu_oiMCF8O204haJ7OdjG15NM1nKWA'
    const vapidPrivateKey = 'pxooLKj6LPMaQlnGM9FsqlrAwVG51kYpmqESlKFqhXk'

    webpush.setVapidDetails(
      'mailto:support@task-scheduler.com',
      vapidPublicKey,
      vapidPrivateKey
    )

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      return NextResponse.json({ success: false, error: 'DB Error', details: error })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: false, error: 'No subscriptions found for user', userId, supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL })
    }

    const payload = JSON.stringify({
      title: 'Debug Push',
      body: 'This is a test from the debug route',
      url: '/'
    })

    const results = []
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        }, payload)
        results.push({ subId: sub.id, success: true })
      } catch (err: any) {
        results.push({ subId: sub.id, success: false, error: err.message, statusCode: err.statusCode })
      }
    }

    return NextResponse.json({
      success: true,
      subscriptionsFound: subscriptions.length,
      results,
      keysUsed: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        usedVapidPublic: vapidPublicKey,
        vapidPrivateLength: vapidPrivateKey.length
      }
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Catch block error', message: err.message, stack: err.stack })
  }
}

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const vapidPublicKey = 'BNnfzDUWPasOiywWfzdmVbiK_ty759QaN38x1g2kjblALVAWfpYAzjC-zwu_oiMCF8O204haJ7OdjG15NM1nKWA'
const vapidPrivateKey = 'pxooLKj6LPMaQlnGM9FsqlrAwVG51kYpmqESlKFqhXk'

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(
      'mailto:support@task-scheduler.com',
      vapidPublicKey,
      vapidPrivateKey
    )
  } catch (error) {
    console.warn('Failed to set VAPID details:', error)
  }
} else {
  console.warn('VAPID keys not found, push notifications are disabled.')
}

export async function sendPushNotification(userId: string, title: string, body: string, url: string = '/') {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys not configured, skipping push notification.')
    return
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (!subscriptions || subscriptions.length === 0) return

    const payload = JSON.stringify({ title, body, url })

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        }
      }

      try {
        await webpush.sendNotification(pushSubscription, payload)
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription has expired or is no longer valid
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        } else {
          console.error('Error sending push notification:', error)
        }
      }
    })

    await Promise.all(sendPromises)
  } catch (error) {
    console.error('Failed to process push notifications:', error)
  }
}

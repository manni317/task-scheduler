'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

// Utility to convert VAPID public key
const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

const VAPID_PUBLIC_KEY = 'BNnfzDUWPasOiywWfzdmVbiK_ty759QaN38x1g2kjblALVAWfpYAzjC-zwu_oiMCF8O204haJ7OdjG15NM1nKWA'

const getVapidPublicKey = (): string => {
  const envKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  // Only use env key if it looks like a valid URL-safe base64 string (no padding or quotes)
  if (envKey && !envKey.includes('=') && !envKey.includes('"') && envKey.length > 50) {
    return envKey
  }
  return VAPID_PUBLIC_KEY
}

const saveSubscriptionToServer = async (subscription: PushSubscription, userId: string) => {
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription, userId }),
  })
  return res.ok
}

export async function testPushSubscription(userId: string) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { success: false, message: 'Push notifications are not supported in this browser' }
    }

    const registration = await navigator.serviceWorker.ready
    
    // FORCE UNSUBSCRIBE to ensure new VAPID keys are used
    const existing = await registration.pushManager.getSubscription()
    if (existing) {
      await existing.unsubscribe()
    }
    
    if (Notification.permission === 'denied') {
      return { success: false, message: 'Notifications are blocked in browser settings' }
    }
    
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return { success: false, message: 'Permission denied for notifications' }
    }

    const vapidPublicKey = getVapidPublicKey()

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })

    const saved = await saveSubscriptionToServer(subscription, userId)
    if (!saved) throw new Error('Server could not save subscription')

    return { success: true, message: 'Push notification setup successful!' }
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to setup push' }
  }
}

export function PushManager() {
  const { profile } = useAuth()

  useEffect(() => {
    if (!profile?.id) return
    
    const subscribeToPush = async () => {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          return
        }

        const registration = await navigator.serviceWorker.ready
        const vapidPublicKey = getVapidPublicKey()
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)

        let subscription = await registration.pushManager.getSubscription()

        if (subscription) {
          // Validate that the existing subscription was made with our current VAPID key
          const existingKeyBytes = new Uint8Array(subscription.options?.applicationServerKey as ArrayBuffer)
          const newKeyBytes = applicationServerKey
          
          const keysMatch = existingKeyBytes.length === newKeyBytes.length &&
            existingKeyBytes.every((b, i) => b === newKeyBytes[i])

          if (!keysMatch) {
            // Subscription was made with a different VAPID key — force re-subscribe
            console.log('[PushManager] VAPID key mismatch, re-subscribing...')
            await subscription.unsubscribe()
            subscription = null
          } else {
            // Keys match, just ensure it's in the DB (handles cases where DB was cleared)
            await saveSubscriptionToServer(subscription, profile.id)
            return
          }
        }

        // Ask for permission if not granted or denied
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission()
          if (permission !== 'granted') return
        } else if (Notification.permission === 'denied') {
          return
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        })

        await saveSubscriptionToServer(subscription, profile.id)
        console.log('[PushManager] Successfully subscribed to push notifications')

      } catch (error) {
        console.error('[PushManager] Error subscribing to push notifications:', error)
      }
    }

    subscribeToPush()
  }, [profile?.id])

  return null
}

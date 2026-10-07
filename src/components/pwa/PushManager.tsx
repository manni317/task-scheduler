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

export async function testPushSubscription(userId: string) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { success: false, message: 'Push notifications are not supported in this browser' }
    }

    const registration = await navigator.serviceWorker.ready
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription()
    
    if (!subscription) {
      if (Notification.permission === 'denied') {
        return { success: false, message: 'Notifications are blocked in browser settings' }
      }
      
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        return { success: false, message: 'Permission denied for notifications' }
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        return { success: false, message: 'VAPID public key not found in environment' }
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })
    }

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, userId }),
    })
    
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Server error')

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
          return // Push not supported
        }

        const registration = await navigator.serviceWorker.ready
        
        // Check if already subscribed
        const existingSubscription = await registration.pushManager.getSubscription()
        if (existingSubscription) {
          // Send it to server just in case it's not saved yet
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: existingSubscription, userId: profile.id }),
          })
          return
        }

        // Ask for permission if not granted or denied
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission()
          if (permission !== 'granted') return
        } else if (Notification.permission === 'denied') {
          return
        }

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidPublicKey) return

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        })

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription, userId: profile.id }),
        })

      } catch (error) {
        console.error('Error subscribing to push notifications:', error)
      }
    }

    subscribeToPush()
  }, [profile?.id])

  return null
}

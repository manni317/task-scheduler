'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export function SWRegister() {
  const [swRegistered, setSwRegistered] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })

        console.log('[SW] Registered:', registration.scope)
        setSwRegistered(true)

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true)
                toast.info('New version available!', {
                  action: {
                    label: 'Refresh',
                    onClick: () => window.location.reload(),
                  },
                  duration: Infinity,
                })
              }
            })
          }
        })

        // Listen for messages from SW
        navigator.serviceWorker.addEventListener('message', event => {
          if (event.data?.type === 'SYNC_COMPLETE') {
            toast.success('Tasks synced!')
          }
        })

        // Online/offline detection
        const handleOnline = () => {
          setOffline(false)
          toast.success('Back online!')
          registration.sync?.register('sync-tasks')
        }
        const handleOffline = () => {
          setOffline(true)
          toast.warning('You are offline. Changes will sync when online.')
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        setOffline(!navigator.onLine)

        return () => {
          window.removeEventListener('online', handleOnline)
          window.removeEventListener('offline', handleOffline)
        }
      } catch (error) {
        console.error('[SW] Registration failed:', error)
      }
    }

    registerSW()
  }, [])

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return
    
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      toast.success('Notifications enabled!')
    }
  }

  // Check for PWA install prompt
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setInstallPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      toast.success('App installed!')
      setInstallPrompt(null)
    }
  }

  // Don't render anything - this component just registers the SW
  // The install button and offline indicator can be added to the header
  if (typeof window === 'undefined') return null

  return (
    <>
      {updateAvailable && (
        <div className="fixed bottom-4 right-4 z-50" id="sw-update-toast">
          <div className="bg-card border shadow-lg rounded-xl p-4 flex items-center gap-3">
            <span className="text-sm">New version available</span>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
      {offline && !swRegistered && (
        <div className="fixed bottom-4 left-4 z-50" id="offline-indicator">
          <div className="bg-amber-500/90 text-amber-500-foreground shadow-lg rounded-xl px-3 py-2 text-sm flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Offline mode
          </div>
        </div>
      )}
      {installPrompt && !swRegistered && (
        <div className="fixed bottom-4 left-4 z-40" id="pwa-install-prompt">
          <div className="bg-card border shadow-lg rounded-xl p-4 flex items-center gap-3 max-w-sm">
            <div className="flex-1">
              <p className="font-medium">Install Muze Tasks</p>
              <p className="text-sm text-muted-foreground">Add to home screen for offline access</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
              >
                Install
              </button>
              <button
                onClick={() => setInstallPrompt(null)}
                className="px-3 py-1 text-muted-foreground rounded text-sm hover:bg-muted"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
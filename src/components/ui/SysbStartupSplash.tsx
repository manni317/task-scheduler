'use client'

import React, { useEffect, useRef, useState } from 'react'

export function SysbStartupSplash() {
  const [isVisible, setIsVisible] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // If already marked as seen in this browser session, hide immediately
    try {
      if (
        sessionStorage.getItem('sysb_splash_played') ||
        document.documentElement.classList.contains('splash-skip')
      ) {
        setIsVisible(false)
        return
      }
      sessionStorage.setItem('sysb_splash_played', 'true')
    } catch (e) {}

    // Ensure video plays immediately upon hydration
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }

    // Safety fallback timeout (dismisses after max 5.2s even if video stalls)
    const fallbackTimer = setTimeout(() => {
      dismissSplash()
    }, 5200)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        dismissSplash()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      clearTimeout(fallbackTimer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const dismissSplash = () => {
    setIsFadingOut(true)
    setTimeout(() => {
      setIsVisible(false)
    }, 450)
  }

  if (!isVisible) {
    return null
  }

  return (
    <div
      id="sysb-startup-splash-overlay"
      onClick={dismissSplash}
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ease-out cursor-pointer select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        willChange: 'opacity',
        transform: 'translateZ(0)',
      }}
      title="Click anywhere to skip"
    >
      <div className="relative flex flex-col items-center justify-center max-w-xl w-full px-6">
        {/* Animated SysB Video */}
        <div className="w-full max-w-[520px] aspect-[1632/612] flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            src="/SysB_Logo_Animation_Preview.mp4"
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={dismissSplash}
            className="w-full h-full object-contain"
            style={{
              backgroundColor: '#ffffff',
            }}
          />
        </div>

        {/* Subtle skip badge */}
        <div className="mt-8 flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors">
          <span>Click anywhere to skip</span>
          <span className="text-slate-300">·</span>
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Esc</span>
        </div>
      </div>
    </div>
  )
}

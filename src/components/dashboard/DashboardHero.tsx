'use client'

import { Bell, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useColorTheme } from '@/contexts/ColorThemeContext'

interface DashboardHeroProps {
  userName: string
  newTasksCount: number
  avatarUrl?: string
}

const THEME_BANNER_MAP: Record<string, { gradient: string; shadow: string; glow1: string; glow2: string }> = {
  aurora: {
    gradient: 'from-indigo-600 via-purple-600 to-pink-500',
    shadow: 'shadow-indigo-500/25',
    glow1: 'bg-white/25',
    glow2: 'bg-amber-400/25',
  },
  ocean: {
    gradient: 'from-blue-600 via-sky-600 to-cyan-500',
    shadow: 'shadow-blue-500/25',
    glow1: 'bg-cyan-300/30',
    glow2: 'bg-blue-400/25',
  },
  emerald: {
    gradient: 'from-emerald-600 via-teal-600 to-cyan-500',
    shadow: 'shadow-emerald-500/25',
    glow1: 'bg-emerald-300/30',
    glow2: 'bg-teal-400/25',
  },
  sunset: {
    gradient: 'from-rose-600 via-orange-600 to-amber-500',
    shadow: 'shadow-orange-500/25',
    glow1: 'bg-amber-300/30',
    glow2: 'bg-rose-400/25',
  },
  cyberpunk: {
    gradient: 'from-fuchsia-600 via-pink-600 to-violet-600',
    shadow: 'shadow-fuchsia-500/25',
    glow1: 'bg-cyan-300/30',
    glow2: 'bg-pink-400/25',
  },
  midnight: {
    gradient: 'from-zinc-950 via-slate-900 to-amber-600',
    shadow: 'shadow-amber-500/20',
    glow1: 'bg-amber-400/30',
    glow2: 'bg-yellow-500/20',
  },
  ruby: {
    gradient: 'from-red-600 via-rose-600 to-pink-600',
    shadow: 'shadow-red-500/25',
    glow1: 'bg-rose-300/30',
    glow2: 'bg-red-400/25',
  },
  slate: {
    gradient: 'from-slate-800 via-slate-900 to-indigo-950',
    shadow: 'shadow-slate-600/25',
    glow1: 'bg-sky-400/25',
    glow2: 'bg-indigo-400/20',
  },
}

export function DashboardHero({ userName, newTasksCount, avatarUrl }: DashboardHeroProps) {
  const router = useRouter()
  const { colorTheme } = useColorTheme()
  const themeStyle = THEME_BANNER_MAP[colorTheme] || THEME_BANNER_MAP.aurora
  const firstName = userName?.split(' ')[0] || 'User'

  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const getGreeting = () => {
    if (!time) return 'Welcome,'
    const hour = time.getHours()
    if (hour < 12) return 'Good Morning,'
    if (hour < 17) return 'Good Afternoon,'
    return 'Good Evening,'
  }

  const formatTime = () => {
    if (!time) return ''
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }
  const formatDate = () => {
    if (!time) return ''
    return time.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className={cn(
      "relative overflow-hidden rounded-[2.25rem] p-6 sm:p-9 bg-gradient-to-br shadow-2xl text-white animate-in fade-in slide-in-from-bottom-4 duration-500 border border-white/20 transition-all duration-500",
      themeStyle.gradient,
      themeStyle.shadow
    )}>
      
      {/* Decorative Lighting Accents */}
      <div className={cn("absolute -top-32 -right-32 w-80 h-80 rounded-full blur-[3.5rem] pointer-events-none transition-colors duration-500", themeStyle.glow1)} />
      <div className={cn("absolute -bottom-32 -left-32 w-80 h-80 rounded-full blur-[3.5rem] pointer-events-none transition-colors duration-500", themeStyle.glow2)} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)] pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3 drop-shadow-sm">
            {getGreeting()} <br className="sm:hidden" />
            <span className="bg-gradient-to-r from-white via-white to-pink-100 bg-clip-text text-transparent">
              {firstName}! 👋
            </span>
          </h1>
          
          <div className="flex flex-col gap-2.5">
            <p className="text-white/90 text-sm sm:text-base font-semibold drop-shadow-sm">Ready to conquer your day?</p>
            
            <div className="flex items-center gap-2 mt-0.5 text-white bg-black/15 w-fit px-4 py-2 rounded-full backdrop-blur-xl border border-white/20 text-xs sm:text-sm font-semibold shadow-inner">
              <Clock className="w-3.5 h-3.5 opacity-90 text-pink-200" />
              <span className="tabular-nums tracking-wide">{time ? `${formatDate()} • ${formatTime()}` : 'Loading...'}</span>
            </div>
          </div>
        </div>

        {avatarUrl && (
          <div className="hidden sm:flex shrink-0 self-start items-center">
            <div className="w-16 h-16 rounded-full border-2 border-white/50 p-1 backdrop-blur-xl bg-white/10 shadow-xl overflow-hidden aspect-square">
              <img src={avatarUrl} alt={userName} className="h-full w-full rounded-full object-cover aspect-square" />
            </div>
          </div>
        )}
      </div>

      {newTasksCount > 0 && (
        <div 
          onClick={() => router.push('/tasks?filter=today')}
          className={cn(
            "relative z-10 mt-6 sm:mt-8 inline-flex items-center gap-3 rounded-full py-2.5 px-5 cursor-pointer",
            "bg-white/20 hover:bg-white/30 backdrop-blur-xl border border-white/40",
            "transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
            "shadow-lg shadow-black/10 animate-pulse"
          )}
        >
          <div className="h-8 w-8 rounded-full bg-white text-indigo-600 flex items-center justify-center shrink-0 shadow-md">
            <Bell className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm sm:text-base">
            You have {newTasksCount} new task{newTasksCount > 1 ? 's' : ''} today
          </span>
          <span className="ml-1 opacity-80 font-bold">→</span>
        </div>
      )}
    </div>
  )
}

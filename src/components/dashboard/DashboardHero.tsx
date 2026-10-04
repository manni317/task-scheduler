'use client'

import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface DashboardHeroProps {
  userName: string
  newTasksCount: number
  avatarUrl?: string
}

export function DashboardHero({ userName, newTasksCount, avatarUrl }: DashboardHeroProps) {
  const router = useRouter()
  const firstName = userName?.split(' ')[0] || 'User'

  return (
    <div className="relative overflow-hidden rounded-[2rem] p-6 sm:p-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-xl shadow-purple-500/20 text-white animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Decorative Blur Orbs */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/20 rounded-full blur-[3rem] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-orange-400/30 rounded-full blur-[3rem] pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
            Good Morning, <br className="sm:hidden" />
            {firstName}! 👋
          </h1>
          <p className="text-white/80 font-medium">Ready to conquer your day?</p>
        </div>

        {avatarUrl && (
          <div className="hidden sm:block shrink-0">
            <div className="h-16 w-16 rounded-full border-2 border-white/50 p-1 backdrop-blur-md">
              <img src={avatarUrl} alt={userName} className="h-full w-full rounded-full object-cover" />
            </div>
          </div>
        )}
      </div>

      {newTasksCount > 0 && (
        <div 
          onClick={() => router.push('/tasks')}
          className={cn(
            "relative z-10 mt-6 sm:mt-8 inline-flex items-center gap-3 rounded-full py-2.5 px-5 cursor-pointer",
            "bg-white/20 backdrop-blur-md border border-white/30",
            "hover:bg-white/30 transition-all duration-300 hover:scale-[1.02]",
            "animate-pulse" // Subtle pulse animation for new tasks
          )}
        >
          <div className="h-8 w-8 rounded-full bg-white text-pink-500 flex items-center justify-center shrink-0">
            <Bell className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm sm:text-base">
            You have {newTasksCount} new task{newTasksCount > 1 ? 's' : ''} today
          </span>
          <span className="ml-2 opacity-60">→</span>
        </div>
      )}
    </div>
  )
}

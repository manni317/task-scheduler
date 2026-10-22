'use client'

import { Card } from '@/components/ui/card'
import { CheckCircle, Clock, AlertTriangle, ListTodo, TrendingUp, TrendingDown, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  iconClass: string
  bgClass: string
  glowBorderClass: string
  glowShadowClass: string
  description?: string
  onClick?: () => void
}

function StatCard({ title, value, change, icon, iconClass, bgClass, glowBorderClass, glowShadowClass, description, onClick }: StatCardProps) {
  const isPositive = change !== undefined ? change >= 0 : null

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative rounded-[1.75rem] border p-5 transition-all duration-300 overflow-hidden",
        "bg-card/75 dark:bg-card/60 backdrop-blur-xl",
        "hover:-translate-y-1 hover:scale-[1.01]",
        glowBorderClass,
        glowShadowClass,
        onClick && "cursor-pointer active:scale-[0.98]"
      )}>
      {/* Top ambient highlight line */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent" />
      
      {/* Ambient background bloom */}
      <div className={cn(
        "absolute -bottom-8 -right-8 w-28 h-28 rounded-full blur-[2.5rem] opacity-40 dark:opacity-25 pointer-events-none transition-opacity duration-300 group-hover:opacity-70",
        bgClass
      )} />

      <div className="relative z-10 flex items-center gap-3.5 mb-4">
        <div className={cn('h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-sm', bgClass)}>
          <span className={cn('', iconClass)}>{icon}</span>
        </div>
        <p className="text-xs sm:text-sm font-bold text-foreground/85 tracking-tight leading-tight">{title}</p>
      </div>

      <div className="relative z-10 text-3xl sm:text-4xl font-extrabold text-foreground mb-1 tracking-tight">
        {value.toString().padStart(2, '0')}
      </div>
      
      {(change !== undefined || description) && (
        <div className="relative z-10 mt-2">
          {change !== undefined ? (
            <div className={cn('flex items-center gap-1 text-xs font-bold', isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
              {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              <span>{isPositive ? '+' : ''}{change}%</span>
            </div>
          ) : (
            <p className="text-xs font-medium text-muted-foreground">{description}</p>
          )}
        </div>
      )}
    </div>
  )
}

interface StatsCardsProps {
  stats: {
    totalTasks: number
    completedTasks: number
    inProgressTasks: number
    reviewTasks?: number
    overdueTasks: number
    completionRate: number
    avgCompletionTime: number
  }
  userRole?: string
}

export function StatsCards({ stats, userRole }: StatsCardsProps) {
  const router = useRouter()

  const cards = [
    {
      title: 'Total Tasks',
      value: stats.totalTasks,
      icon: <ListTodo className="h-5 w-5" />,
      iconClass: 'text-indigo-600 dark:text-indigo-400',
      bgClass: 'bg-gradient-to-br from-indigo-500/20 to-blue-500/10 border border-indigo-500/20',
      glowBorderClass: 'border-indigo-500/25 hover:border-indigo-500/50',
      glowShadowClass: 'shadow-[0_8px_30px_-6px_rgba(99,102,241,0.15)] dark:shadow-[0_8px_30px_-6px_rgba(99,102,241,0.08)] hover:shadow-[0_12px_36px_-4px_rgba(99,102,241,0.25)]',
      description: 'All assigned tasks',
      onClick: () => router.push('/tasks')
    },
    {
      title: 'Completed',
      value: stats.completedTasks,
      change: 5,
      icon: <CheckCircle className="h-5 w-5" />,
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20',
      glowBorderClass: 'border-emerald-500/25 hover:border-emerald-500/50',
      glowShadowClass: 'shadow-[0_8px_30px_-6px_rgba(16,185,129,0.15)] dark:shadow-[0_8px_30px_-6px_rgba(16,185,129,0.08)] hover:shadow-[0_12px_36px_-4px_rgba(16,185,129,0.25)]',
      onClick: () => router.push('/tasks?status=done')
    },
    {
      title: 'In Progress',
      value: stats.inProgressTasks,
      icon: <Clock className="h-5 w-5" />,
      iconClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20',
      glowBorderClass: 'border-amber-500/25 hover:border-amber-500/50',
      glowShadowClass: 'shadow-[0_8px_30px_-6px_rgba(245,158,11,0.15)] dark:shadow-[0_8px_30px_-6px_rgba(245,158,11,0.08)] hover:shadow-[0_12px_36px_-4px_rgba(245,158,11,0.25)]',
      description: 'Currently active',
      onClick: () => router.push('/tasks?status=in_progress')
    },
  ]

  if ((userRole === 'admin' || userRole === 'manager') && stats.reviewTasks !== undefined) {
    cards.push({
      title: 'Pending Review',
      value: stats.reviewTasks,
      icon: <ClipboardCheck className="h-5 w-5" />,
      iconClass: 'text-purple-600 dark:text-purple-400',
      bgClass: 'bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/20',
      glowBorderClass: 'border-purple-500/25 hover:border-purple-500/50',
      glowShadowClass: 'shadow-[0_8px_30px_-6px_rgba(168,85,247,0.15)] dark:shadow-[0_8px_30px_-6px_rgba(168,85,247,0.08)] hover:shadow-[0_12px_36px_-4px_rgba(168,85,247,0.25)]',
      description: 'Waiting for approval',
      onClick: () => router.push('/tasks?status=review')
    })
  }

  cards.push({
    title: 'Overdue',
    value: stats.overdueTasks,
    change: stats.overdueTasks > 0 ? -stats.overdueTasks : 0,
    icon: <AlertTriangle className="h-5 w-5" />,
    iconClass: 'text-rose-600 dark:text-rose-400',
    bgClass: 'bg-gradient-to-br from-rose-500/20 to-red-500/10 border border-rose-500/20',
    glowBorderClass: 'border-rose-500/25 hover:border-rose-500/50',
    glowShadowClass: 'shadow-[0_8px_30px_-6px_rgba(244,63,94,0.15)] dark:shadow-[0_8px_30px_-6px_rgba(244,63,94,0.08)] hover:shadow-[0_12px_36px_-4px_rgba(244,63,94,0.25)]',
    onClick: () => router.push('/tasks?status=overdue')
  })

  const gridColsClass = cards.length === 5 
    ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-5" 
    : "grid-cols-2 md:grid-cols-4 lg:grid-cols-4";

  return (
    <div className={cn("grid gap-4 w-full", gridColsClass)}>
      {cards.map((card) => (
        <StatCard key={card.title} {...card} />
      ))}
    </div>
  )
}
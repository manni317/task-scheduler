'use client'

import { Card } from '@/components/ui/card'
import { CheckCircle, Clock, AlertTriangle, ListTodo, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  iconClass: string
  bgClass: string
  description?: string
  onClick?: () => void
}

function StatCard({ title, value, change, icon, iconClass, bgClass, description, onClick }: StatCardProps) {
  const isPositive = change !== undefined ? change >= 0 : null

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative rounded-[1.5rem] border p-4 transition-all duration-300 overflow-hidden",
        "bg-card/50 backdrop-blur-xl border-border/50",
        "hover:shadow-lg hover:-translate-y-1",
        onClick && "cursor-pointer active:scale-[0.98]",
        // Subdued neon glow at the bottom matching the card's color theme
        title === 'Total Tasks' && "shadow-[0_8px_30px_rgb(59,130,246,0.12)] dark:shadow-[0_8px_30px_rgb(59,130,246,0.05)]",
        title === 'Completed' && "shadow-[0_8px_30px_rgb(16,185,129,0.12)] dark:shadow-[0_8px_30px_rgb(16,185,129,0.05)]",
        title === 'In Progress' && "shadow-[0_8px_30px_rgb(245,158,11,0.12)] dark:shadow-[0_8px_30px_rgb(245,158,11,0.05)]",
        title === 'Overdue' && "shadow-[0_8px_30px_rgb(239,68,68,0.12)] dark:shadow-[0_8px_30px_rgb(239,68,68,0.05)]"
      )}>
      {/* Soft gradient background blob */}
      <div className={cn(
        "absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-[2xl] opacity-50 dark:opacity-30 pointer-events-none",
        bgClass.replace('100', '300').replace('900/40', '600')
      )} />

      <div className="flex items-center gap-3 mb-4">
        <div className={cn('h-10 w-10 rounded-2xl flex items-center justify-center shrink-0', bgClass)}>
          <span className={cn('', iconClass)}>{icon}</span>
        </div>
        <p className="text-sm font-semibold text-foreground/80 tracking-tight leading-tight">{title}</p>
      </div>

      <div className="text-3xl font-black text-foreground mb-1 tracking-tighter">
        {value.toString().padStart(2, '0')}
      </div>
      
      {(change !== undefined || description) && (
        <div className="mt-2">
          {change !== undefined ? (
            <div className={cn('flex items-center gap-1 text-xs font-semibold', isPositive ? 'text-emerald-500' : 'text-red-500')}>
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
    overdueTasks: number
    completionRate: number
    avgCompletionTime: number
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  const router = useRouter()

  const cards = [
    {
      title: 'Total Tasks',
      value: stats.totalTasks,
      icon: <ListTodo className="h-5 w-5" />,
      iconClass: 'text-blue-600 dark:text-blue-400',
      bgClass: 'bg-blue-100 dark:bg-blue-900/40',
      description: 'All assigned tasks',
      onClick: () => router.push('/tasks')
    },
    {
      title: 'Completed',
      value: stats.completedTasks,
      change: 5,
      icon: <CheckCircle className="h-5 w-5" />,
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-100 dark:bg-emerald-900/40',
      onClick: () => router.push('/tasks')
    },
    {
      title: 'In Progress',
      value: stats.inProgressTasks,
      icon: <Clock className="h-5 w-5" />,
      iconClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-100 dark:bg-amber-900/40',
      description: 'Currently active',
      onClick: () => router.push('/tasks')
    },
    {
      title: 'Overdue',
      value: stats.overdueTasks,
      change: stats.overdueTasks > 0 ? -stats.overdueTasks : 0,
      icon: <AlertTriangle className="h-5 w-5" />,
      iconClass: 'text-red-600 dark:text-red-400',
      bgClass: 'bg-red-100 dark:bg-red-900/40',
      onClick: () => router.push('/tasks')
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 w-full">
      {cards.map((card) => (
        <StatCard key={card.title} {...card} />
      ))}
    </div>
  )
}
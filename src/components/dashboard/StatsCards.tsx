'use client'

import { Card } from '@/components/ui/card'
import { CheckCircle, Clock, AlertTriangle, ListTodo, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  iconClass: string
  bgClass: string
  description?: string
}

function StatCard({ title, value, change, icon, iconClass, bgClass, description }: StatCardProps) {
  const isPositive = change !== undefined ? change >= 0 : null

  return (
    <div className="group relative bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
      {/* Glow blob in background */}
      <div className={cn('absolute top-3 right-3 h-12 w-12 rounded-xl flex items-center justify-center', bgClass)}>
        <span className={cn('', iconClass)}>{icon}</span>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 pr-16">{title}</p>
      <div className="text-3xl font-extrabold text-foreground mb-1">{value}</div>
      {change !== undefined && (
        <div className={cn('flex items-center gap-1 text-xs font-semibold', isPositive ? 'text-emerald-500' : 'text-red-500')}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>{isPositive ? '+' : ''}{change}% vs last period</span>
        </div>
      )}
      {description && !change && (
        <p className="text-xs text-muted-foreground">{description}</p>
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
  const cards = [
    {
      title: 'Total Tasks',
      value: stats.totalTasks,
      icon: <ListTodo className="h-5 w-5" />,
      iconClass: 'text-blue-600 dark:text-blue-400',
      bgClass: 'bg-blue-100 dark:bg-blue-900/40',
      description: 'All assigned tasks',
    },
    {
      title: 'Completed',
      value: stats.completedTasks,
      change: 5,
      icon: <CheckCircle className="h-5 w-5" />,
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-100 dark:bg-emerald-900/40',
    },
    {
      title: 'In Progress',
      value: stats.inProgressTasks,
      icon: <Clock className="h-5 w-5" />,
      iconClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-100 dark:bg-amber-900/40',
      description: 'Currently active',
    },
    {
      title: 'Overdue',
      value: stats.overdueTasks,
      change: stats.overdueTasks > 0 ? -stats.overdueTasks : 0,
      icon: <AlertTriangle className="h-5 w-5" />,
      iconClass: 'text-red-600 dark:text-red-400',
      bgClass: 'bg-red-100 dark:bg-red-900/40',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full">
      {cards.map((card) => (
        <StatCard key={card.title} {...card} />
      ))}
    </div>
  )
}
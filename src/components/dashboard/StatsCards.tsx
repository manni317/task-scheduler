'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, CheckCircle, Clock, AlertTriangle, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  iconColor: string
  bgColor: string
}

function StatCard({ title, value, change, icon, iconColor, bgColor }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', bgColor)}>
          <span className={cn('text-xl', iconColor)}>{icon}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p className={cn('text-xs mt-1', change >= 0 ? 'text-green-500' : 'text-red-500')}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% from last period
          </p>
        )}
      </CardContent>
    </Card>
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
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full min-w-0">
      <StatCard
        title="Total Tasks"
        value={stats.totalTasks}
        icon={<Users className="h-5 w-5" />}
        iconColor="text-blue-500"
        bgColor="bg-blue-100 dark:bg-blue-900/30"
      />
      <StatCard
        title="Completed"
        value={stats.completedTasks}
        change={5}
        icon={<CheckCircle className="h-5 w-5" />}
        iconColor="text-green-500"
        bgColor="bg-green-100 dark:bg-green-900/30"
      />
      <StatCard
        title="In Progress"
        value={stats.inProgressTasks}
        icon={<Clock className="h-5 w-5" />}
        iconColor="text-yellow-500"
        bgColor="bg-yellow-100 dark:bg-yellow-900/30"
      />
      <StatCard
        title="Overdue"
        value={stats.overdueTasks}
        change={-2}
        icon={<AlertTriangle className="h-5 w-5" />}
        iconColor="text-red-500"
        bgColor="bg-red-100 dark:bg-red-900/30"
      />
    </div>
  )
}
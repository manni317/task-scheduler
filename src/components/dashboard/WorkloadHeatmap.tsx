'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Task, User } from '@/types/task'
import { cn } from '@/lib/utils'
import { 
  Users, 
  Flame, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  TrendingUp, 
  Filter,
  ArrowUpRight,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'

interface WorkloadHeatmapProps {
  tasks: Task[]
  users: User[]
  className?: string
}

type WorkloadLevel = 'available' | 'optimal' | 'overloaded'

interface MemberWorkload {
  user: User
  activeCount: number
  inProgressCount: number
  todoCount: number
  reviewCount: number
  doneCount: number
  overdueCount: number
  level: WorkloadLevel
  capacityPercent: number
}

// Healthy baseline capacity threshold: 5 active tasks = 100%
const MAX_HEALTHY_CAPACITY = 5

export function WorkloadHeatmap({ tasks, users, className }: WorkloadHeatmapProps) {
  const [filterLevel, setFilterLevel] = useState<'all' | WorkloadLevel>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Calculate workload data for each user
  const workloadData: MemberWorkload[] = useMemo(() => {
    const now = new Date()

    return users.map(user => {
      const userTasks = tasks.filter(t => t.assigneeId === user.id)
      
      const inProgressCount = userTasks.filter(t => t.status === 'in_progress').length
      const todoCount = userTasks.filter(t => t.status === 'todo').length
      const reviewCount = userTasks.filter(t => t.status === 'review').length
      const doneCount = userTasks.filter(t => t.status === 'done').length

      const activeCount = inProgressCount + todoCount + reviewCount
      
      const overdueCount = userTasks.filter(t => {
        if (!t.dueDate || t.status === 'done') return false
        return new Date(t.dueDate) < now
      }).length

      let level: WorkloadLevel = 'available'
      if (activeCount >= 6 || overdueCount >= 2) {
        level = 'overloaded'
      } else if (activeCount >= 3) {
        level = 'optimal'
      } else {
        level = 'available'
      }

      const capacityPercent = Math.min(100, Math.round((activeCount / MAX_HEALTHY_CAPACITY) * 100))

      return {
        user,
        activeCount,
        inProgressCount,
        todoCount,
        reviewCount,
        doneCount,
        overdueCount,
        level,
        capacityPercent
      }
    })
  }, [tasks, users])

  // Count summaries
  const counts = useMemo(() => {
    return {
      all: workloadData.length,
      available: workloadData.filter(w => w.level === 'available').length,
      optimal: workloadData.filter(w => w.level === 'optimal').length,
      overloaded: workloadData.filter(w => w.level === 'overloaded').length,
    }
  }, [workloadData])

  // Filtered members
  const filteredData = useMemo(() => {
    return workloadData
      .filter(item => {
        if (filterLevel !== 'all' && item.level !== filterLevel) return false
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          return (
            item.user.name.toLowerCase().includes(q) ||
            item.user.email.toLowerCase().includes(q) ||
            item.user.role.toLowerCase().includes(q)
          )
        }
        return true
      })
      .sort((a, b) => {
        // High load / overloaded first by default
        const orderWeight: Record<WorkloadLevel, number> = {
          overloaded: 3,
          optimal: 2,
          available: 1
        }
        return orderWeight[b.level] - orderWeight[a.level] || b.activeCount - a.activeCount
      })
  }, [workloadData, filterLevel, searchQuery])

  return (
    <Card className={cn("overflow-hidden border border-border/80 shadow-md backdrop-blur-sm bg-card", className)}>
      <CardHeader className="pb-4 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  Employee Workload Heatmap
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest text-primary border-primary/30 bg-primary/5">
                    Live Capacity
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Monitor team bandwidth, prevent burnout, and balance task distribution in real-time
                </CardDescription>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-muted/50 border border-border/60 self-start sm:self-auto">
            <button
              onClick={() => setFilterLevel('all')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                filterLevel === 'all'
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setFilterLevel('available')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                filterLevel === 'available'
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm"
                  : "text-muted-foreground hover:text-emerald-600"
              )}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Available ({counts.available})
            </button>
            <button
              onClick={() => setFilterLevel('optimal')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                filterLevel === 'optimal'
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm"
                  : "text-muted-foreground hover:text-amber-600"
              )}
            >
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Optimal ({counts.optimal})
            </button>
            <button
              onClick={() => setFilterLevel('overloaded')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                filterLevel === 'overloaded'
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-sm"
                  : "text-muted-foreground hover:text-rose-600"
              )}
            >
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              Overloaded ({counts.overloaded})
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {filteredData.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-semibold text-sm">No team members match this workload filter</p>
            <p className="text-xs text-muted-foreground mt-1">Switch filter or add new members to view their capacity</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredData.map(({ user, activeCount, inProgressCount, todoCount, reviewCount, doneCount, overdueCount, level, capacityPercent }) => {
              const statusConfig = {
                available: {
                  badge: 'Available (Light)',
                  badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                  dotClass: 'bg-emerald-500',
                  barGradient: 'from-emerald-500 to-teal-400',
                  subtitle: 'Ready for new assignments'
                },
                optimal: {
                  badge: 'Optimal (Balanced)',
                  badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                  dotClass: 'bg-amber-500',
                  barGradient: 'from-amber-500 to-yellow-400',
                  subtitle: 'Working at healthy pace'
                },
                overloaded: {
                  badge: 'Overloaded (High)',
                  badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                  dotClass: 'bg-rose-500 animate-pulse',
                  barGradient: 'from-rose-500 to-red-600',
                  subtitle: 'Action required - rebalance load'
                }
              }[level]

              return (
                <div 
                  key={user.id}
                  className={cn(
                    "relative flex flex-col justify-between p-4 rounded-2xl border transition-all duration-200 hover:shadow-lg group",
                    level === 'overloaded'
                      ? "bg-rose-50/30 dark:bg-rose-950/10 border-rose-200/60 dark:border-rose-900/30 hover:border-rose-400"
                      : level === 'optimal'
                      ? "bg-amber-50/20 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-900/30 hover:border-amber-400"
                      : "bg-background/80 hover:bg-card border-border/80 hover:border-primary/40"
                  )}
                >
                  {/* Top user row */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-11 w-11 shrink-0 rounded-2xl border-2 border-background shadow-sm ring-1 ring-border">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback className="rounded-2xl bg-primary/10 text-primary font-bold text-sm">
                            {user.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {user.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                              {user.role}
                            </span>
                            {overdueCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-rose-500 text-white">
                                {overdueCount} overdue
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Workload Badge */}
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shrink-0",
                        statusConfig.badgeClass
                      )}>
                        <span className={cn("h-2 w-2 rounded-full", statusConfig.dotClass)} />
                        {statusConfig.badge}
                      </span>
                    </div>

                    {/* Capacity Visual Progress Bar */}
                    <div className="my-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-muted-foreground flex items-center gap-1">
                          Capacity Load:
                          <strong className="text-foreground">{activeCount} active tasks</strong>
                        </span>
                        <span className={cn("font-bold", level === 'overloaded' ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
                          {capacityPercent}%
                        </span>
                      </div>
                      
                      <div className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden p-0.5 border border-border/40">
                        <div 
                          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", statusConfig.barGradient)}
                          style={{ width: `${Math.max(8, Math.min(100, capacityPercent))}%` }}
                        />
                      </div>
                    </div>

                    {/* Breakdown Chips */}
                    <div className="grid grid-cols-4 gap-1.5 py-2 my-1 border-t border-b border-border/40 text-center">
                      <div className="rounded-lg bg-muted/40 py-1.5 px-1">
                        <span className="block text-[10px] font-semibold uppercase text-muted-foreground">In Prog</span>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{inProgressCount}</span>
                      </div>
                      <div className="rounded-lg bg-muted/40 py-1.5 px-1">
                        <span className="block text-[10px] font-semibold uppercase text-muted-foreground">To Do</span>
                        <span className="text-xs font-bold text-foreground">{todoCount}</span>
                      </div>
                      <div className="rounded-lg bg-muted/40 py-1.5 px-1">
                        <span className="block text-[10px] font-semibold uppercase text-muted-foreground">Review</span>
                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{reviewCount}</span>
                      </div>
                      <div className="rounded-lg bg-muted/40 py-1.5 px-1">
                        <span className="block text-[10px] font-semibold uppercase text-muted-foreground">Done</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{doneCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Action */}
                  <div className="mt-3 pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground italic truncate">
                      {statusConfig.subtitle}
                    </span>
                    <Link
                      href={`/tasks?status=all`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
                    >
                      View Tasks <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

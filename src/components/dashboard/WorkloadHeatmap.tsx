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
  Sparkles,
  Plus,
  ExternalLink,
  ChevronDown,
  FolderKanban,
  Calendar,
  Search,
  X,
  ListTodo
} from 'lucide-react'
import Link from 'next/link'
import { useUIStore } from '@/hooks/use-ui-store'

interface WorkloadHeatmapProps {
  tasks: Task[]
  users: User[]
  projects?: { id: string; name: string }[]
  className?: string
  initialSelectedUserId?: string
  userRole?: string
  currentUserId?: string
}

type WorkloadLevel = 'available' | 'optimal' | 'overloaded'

interface MemberWorkload {
  user: User
  tasks: Task[]
  activeTasks: Task[]
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

export function WorkloadHeatmap({ 
  tasks, 
  users, 
  projects = [], 
  className, 
  initialSelectedUserId,
  userRole = 'employee',
  currentUserId
}: WorkloadHeatmapProps) {
  const { openCreateTaskModal } = useUIStore()
  const isManagement = userRole === 'admin' || userRole === 'manager'

  // Role helpers
  const isManagerRole = (role?: string) => (role || '').toLowerCase().trim() === 'manager'
  const isAdminRole = (role?: string) => (role || '').toLowerCase().trim() === 'admin'
  const isEmployeeRole = (role?: string) => !isManagerRole(role) && !isAdminRole(role)

  // User visibility rules:
  // - Employee / Doer: Only see their own workload
  // - Manager: Only see employees (who do tasks)
  // - Admin: Sees Managers ALSO along with Employees (does not include Admins)
  const effectiveUsers = useMemo(() => {
    if (userRole === 'admin') {
      return users.filter(u => isEmployeeRole(u.role) || isManagerRole(u.role))
    }
    if (userRole === 'manager') {
      return users.filter(u => isEmployeeRole(u.role))
    }
    if (currentUserId) {
      const match = users.filter(u => u.id === currentUserId)
      if (match.length > 0) return match
    }
    return users.filter(u => isEmployeeRole(u.role)).slice(0, 1)
  }, [users, userRole, currentUserId])

  const [filterLevel, setFilterLevel] = useState<'all' | WorkloadLevel>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | 'employee' | 'manager'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialSelectedUserId || null)
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all')
  const [taskSearchQuery, setTaskSearchQuery] = useState('')

  // Map project names
  const projectMap = useMemo(() => {
    return new Map(projects.map(p => [p.id, p.name]))
  }, [projects])

  // Calculate workload data for each user
  const workloadData: MemberWorkload[] = useMemo(() => {
    const now = new Date()

    return effectiveUsers.map(user => {
      const userTasks = tasks.filter(t => t.assigneeId === user.id)
      
      const inProgressTasks = userTasks.filter(t => t.status === 'in_progress')
      const todoTasks = userTasks.filter(t => t.status === 'todo')
      const reviewTasks = userTasks.filter(t => t.status === 'review')
      const doneTasks = userTasks.filter(t => t.status === 'done' || (t as any).status === 'approved')

      const activeTasks = [...inProgressTasks, ...todoTasks, ...reviewTasks]
      const activeCount = activeTasks.length
      
      const overdueTasks = userTasks.filter(t => {
        if (!t.dueDate || t.status === 'done' || (t as any).status === 'approved') return false
        return new Date(t.dueDate) < now
      })

      let level: WorkloadLevel = 'available'
      if (activeCount >= 6 || overdueTasks.length >= 2) {
        level = 'overloaded'
      } else if (activeCount >= 3) {
        level = 'optimal'
      } else {
        level = 'available'
      }

      const capacityPercent = Math.min(100, Math.round((activeCount / MAX_HEALTHY_CAPACITY) * 100))

      return {
        user,
        tasks: userTasks,
        activeTasks,
        activeCount,
        inProgressCount: inProgressTasks.length,
        todoCount: todoTasks.length,
        reviewCount: reviewTasks.length,
        doneCount: doneTasks.length,
        overdueCount: overdueTasks.length,
        level,
        capacityPercent
      }
    })
  }, [tasks, effectiveUsers])

  // Automatically select the first user who has tasks if none selected
  const activeSelectedUserId = useMemo(() => {
    if (selectedUserId && workloadData.some(w => w.user.id === selectedUserId)) {
      return selectedUserId
    }
    const withTasks = workloadData.find(w => w.tasks.length > 0)
    return withTasks ? withTasks.user.id : workloadData[0]?.user.id || null
  }, [selectedUserId, workloadData])

  // Find currently selected member data
  const selectedMember = useMemo(() => {
    return workloadData.find(w => w.user.id === activeSelectedUserId) || null
  }, [workloadData, activeSelectedUserId])

  // Filter tasks for selected member
  const filteredSelectedTasks = useMemo(() => {
    if (!selectedMember) return []
    const now = new Date()

    return selectedMember.tasks.filter(task => {
      // Status filter
      if (taskStatusFilter === 'overdue') {
        if (!task.dueDate || task.status === 'done') return false
        if (new Date(task.dueDate) >= now) return false
      } else if (taskStatusFilter === 'active') {
        if (task.status === 'done') return false
      } else if (taskStatusFilter !== 'all') {
        if (task.status !== taskStatusFilter) return false
      }

      // Search query filter
      if (taskSearchQuery.trim()) {
        const q = taskSearchQuery.toLowerCase()
        const matchesTitle = task.title.toLowerCase().includes(q)
        const matchesDesc = task.description?.toLowerCase().includes(q)
        const matchesTags = task.tags?.some(tag => tag.toLowerCase().includes(q))
        if (!matchesTitle && !matchesDesc && !matchesTags) return false
      }

      return true
    })
  }, [selectedMember, taskStatusFilter, taskSearchQuery])

  // Count summaries
  const counts = useMemo(() => {
    return {
      all: workloadData.length,
      available: workloadData.filter(w => w.level === 'available').length,
      optimal: workloadData.filter(w => w.level === 'optimal').length,
      overloaded: workloadData.filter(w => w.level === 'overloaded').length,
      employees: workloadData.filter(w => isEmployeeRole(w.user.role)).length,
      managers: workloadData.filter(w => isManagerRole(w.user.role)).length,
    }
  }, [workloadData])

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return workloadData
      .filter(item => {
        if (roleFilter === 'employee' && !isEmployeeRole(item.user.role)) return false
        if (roleFilter === 'manager' && !isManagerRole(item.user.role)) return false
        if (filterLevel !== 'all' && item.level !== filterLevel) return false
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          return (
            (item.user?.name || '').toLowerCase().includes(q) ||
            (item.user?.email || '').toLowerCase().includes(q) ||
            (item.user?.role || '').toLowerCase().includes(q)
          )
        }
        return true
      })
      .sort((a, b) => {
        const orderWeight: Record<WorkloadLevel, number> = {
          overloaded: 3,
          optimal: 2,
          available: 1
        }
        return orderWeight[b.level] - orderWeight[a.level] || b.activeCount - a.activeCount
      })
  }, [workloadData, roleFilter, filterLevel, searchQuery])

  return (
    <div className={cn("space-y-6", className)}>
      {/* Top Heatmap Card */}
      <Card className="overflow-hidden border border-border/80 shadow-md backdrop-blur-sm bg-card">
        <CardHeader className="pb-4 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    {userRole === 'admin' 
                      ? "Team Workload & Capacity Heatmap" 
                      : userRole === 'manager' 
                        ? "Employee Workload Heatmap" 
                        : "My Workload & Capacity"}
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest text-primary border-primary/30 bg-primary/5">
                      Live Capacity
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    {userRole === 'admin'
                      ? "Monitor bandwidth and active tasks across all managers and employees"
                      : userRole === 'manager'
                        ? "Click any employee to inspect their assigned tasks and capacity"
                        : "Track your personal active tasks, deadlines, and bandwidth in real-time"}
                  </CardDescription>
                </div>
              </div>
            </div>

            {/* Filter Pills (Visible for Managers and Admins) */}
            {isManagement && (
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                {userRole === 'admin' && (
                  <div className="flex items-center gap-1 p-1 rounded-2xl bg-muted/60 border border-border/60">
                    <button
                      onClick={() => setRoleFilter('all')}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                        roleFilter === 'all'
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      All ({counts.all})
                    </button>
                    <button
                      onClick={() => setRoleFilter('employee')}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                        roleFilter === 'employee'
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm"
                          : "text-muted-foreground hover:text-emerald-600"
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Employees ({counts.employees})
                    </button>
                    <button
                      onClick={() => setRoleFilter('manager')}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                        roleFilter === 'manager'
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-sm"
                          : "text-muted-foreground hover:text-blue-600"
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      Managers ({counts.managers})
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-muted/50 border border-border/60">
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
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {filteredMembers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-semibold text-sm">No team members match this filter</p>
              <p className="text-xs text-muted-foreground mt-1">Switch filter to view other employees</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map(({ user, tasks: userTasks, activeTasks, activeCount, inProgressCount, todoCount, reviewCount, doneCount, overdueCount, level, capacityPercent }) => {
                const isSelected = activeSelectedUserId === user.id

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
                    subtitle: 'Action required - high load'
                  }
                }[level]

                return (
                  <div 
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={cn(
                      "relative flex flex-col justify-between p-4 rounded-2xl border transition-all duration-200 cursor-pointer group",
                      isSelected 
                        ? "ring-2 ring-primary border-primary bg-primary/5 shadow-md"
                        : level === 'overloaded'
                        ? "bg-rose-50/20 dark:bg-rose-950/10 border-rose-200/60 dark:border-rose-900/30 hover:border-rose-400 hover:shadow-sm"
                        : level === 'optimal'
                        ? "bg-amber-50/15 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-900/30 hover:border-amber-400 hover:shadow-sm"
                        : "bg-background/80 hover:bg-card border-border/80 hover:border-primary/40 hover:shadow-sm"
                    )}
                  >
                    <div>
                      {/* Top User Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-11 w-11 shrink-0 rounded-2xl border-2 border-background shadow-sm ring-1 ring-border">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="rounded-2xl bg-primary/10 text-primary font-bold text-sm">
                              {(user?.name || 'User').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors flex items-center gap-1.5">
                              {user.name}
                              {isSelected && (
                                <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                              )}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
                                isManagerRole(user.role)
                                  ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25" 
                                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                              )}>
                                {isManagerRole(user.role) ? 'Manager' : 'Employee'}
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

                      {/* Breakdown Counts */}
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

                      {/* Quick Task Titles Preview */}
                      <div className="mt-2.5 pt-1 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Assigned Tasks Preview ({userTasks.length})
                        </span>
                        {userTasks.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-1">No tasks assigned yet</p>
                        ) : (
                          <div className="space-y-1">
                            {userTasks.slice(0, 2).map(task => (
                              <div key={task.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-muted/30 border border-border/50">
                                <span className="font-semibold text-foreground truncate max-w-[180px]" title={task.title}>
                                  {task.title}
                                </span>
                                <span className={cn(
                                  "text-[10px] font-bold px-1.5 py-0.2 rounded-md uppercase shrink-0",
                                  task.status === 'done' ? "bg-emerald-500/10 text-emerald-600" :
                                  task.status === 'in_progress' ? "bg-indigo-500/10 text-indigo-600" :
                                  task.status === 'review' ? "bg-purple-500/10 text-purple-600" :
                                  "bg-muted text-muted-foreground"
                                )}>
                                  {task.status.replace('_', ' ')}
                                </span>
                              </div>
                            ))}
                            {userTasks.length > 2 && (
                              <p className="text-[11px] text-primary font-semibold pl-1">
                                +{userTasks.length - 2} more tasks...
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="mt-4 pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedUserId(user.id)
                        }}
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all",
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted/60 hover:bg-muted text-foreground"
                        )}
                      >
                        <ListTodo className="h-3.5 w-3.5" />
                        {isSelected ? "Inspecting Tasks ↓" : `Inspect Tasks (${userTasks.length})`}
                      </button>

                      {isManagement && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openCreateTaskModal({ assigneeId: user.id })
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors py-1 px-2 rounded-lg hover:bg-primary/5"
                          title={`Assign task to ${user.name}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Assign Task
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Employee Detailed Tasks Inspector */}
      {selectedMember && (
        <Card id="employee-task-inspector" className="border-2 border-primary/30 shadow-xl bg-card overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader className="bg-muted/30 border-b border-border/60 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 rounded-2xl border-2 border-primary shadow-sm">
                  <AvatarImage src={selectedMember.user.avatar} alt={selectedMember.user.name} />
                  <AvatarFallback className="rounded-2xl bg-primary text-primary-foreground font-bold">
                    {(selectedMember.user?.name || 'User').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-bold text-foreground">
                      {isManagement ? `Tasks Assigned to ${selectedMember.user.name}` : `My Assigned Tasks`}
                    </CardTitle>
                    <Badge variant="outline" className={cn(
                      "text-xs font-bold uppercase",
                      isManagerRole(selectedMember.user.role)
                        ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    )}>
                      {isManagerRole(selectedMember.user.role) ? 'Manager' : 'Employee'}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    {selectedMember.tasks.length} total tasks assigned &bull; {selectedMember.activeCount} currently active &bull; {selectedMember.doneCount} completed
                  </CardDescription>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {isManagement && (
                  <button
                    type="button"
                    onClick={() => openCreateTaskModal({ assigneeId: selectedMember.user.id })}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold shadow-sm transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    Assign New Task
                  </button>
                )}
                <Link
                  href={isManagement ? `/tasks?assignee=${selectedMember.user.id}` : '/tasks'}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-muted/70 hover:bg-muted text-foreground text-xs font-semibold transition-all border border-border"
                >
                  Kanban View <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Filter toolbar for employee tasks */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 mt-2 border-t border-border/40">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: `All (${selectedMember.tasks.length})` },
                  { id: 'active', label: `Active (${selectedMember.activeCount})` },
                  { id: 'in_progress', label: `In Progress (${selectedMember.inProgressCount})` },
                  { id: 'todo', label: `To Do (${selectedMember.todoCount})` },
                  { id: 'review', label: `Review (${selectedMember.reviewCount})` },
                  { id: 'done', label: `Done (${selectedMember.doneCount})` },
                  { id: 'overdue', label: `Overdue (${selectedMember.overdueCount})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setTaskStatusFilter(tab.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                      taskStatusFilter === tab.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Task search input */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search this employee's tasks..."
                  value={taskSearchQuery}
                  onChange={e => setTaskSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {filteredSelectedTasks.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <ListTodo className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="font-semibold text-sm">No tasks found matching filter</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isManagement 
                    ? `Try clearing the search or status filter, or assign a new task to ${selectedMember.user.name}.`
                    : `No tasks found matching this filter.`}
                </p>
                {isManagement && (
                  <button
                    type="button"
                    onClick={() => openCreateTaskModal({ assigneeId: selectedMember.user.id })}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
                  >
                    <Plus className="h-4 w-4" />
                    Assign Task Now
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredSelectedTasks.map(task => {
                  const now = new Date()
                  const isOverdue = task.dueDate && new Date(task.dueDate) < now && task.status !== 'done'
                  const projectName = projectMap.get(task.projectId) || task.project?.name

                  return (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className={cn(
                        "flex flex-col justify-between p-4 rounded-2xl border transition-all hover:shadow-md group",
                        isOverdue 
                          ? "bg-rose-50/20 dark:bg-rose-950/10 border-rose-300/70 hover:border-rose-500" 
                          : "bg-background/80 hover:bg-card border-border/80 hover:border-primary/50"
                      )}
                    >
                      <div>
                        {/* Status & Priority header */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                            task.status === 'done' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                            task.status === 'in_progress' ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20" :
                            task.status === 'review' ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20" :
                            "bg-muted text-muted-foreground border border-border"
                          )}>
                            {task.status.replace('_', ' ')}
                          </span>

                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                            task.priority === 'urgent' ? "bg-red-500/10 text-red-600 border border-red-500/20" :
                            task.priority === 'high' ? "bg-orange-500/10 text-orange-600 border border-orange-500/20" :
                            task.priority === 'medium' ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" :
                            "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                          )}>
                            {task.priority}
                          </span>
                        </div>

                        {/* Title */}
                        <h5 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {task.title}
                        </h5>

                        {/* Description */}
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Meta Footer */}
                      <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                        {/* Project Name */}
                        <span className="flex items-center gap-1 text-[11px] font-semibold truncate max-w-[140px]">
                          <FolderKanban className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                          {projectName || 'General'}
                        </span>

                        {/* Due Date */}
                        {task.dueDate ? (
                          <span className={cn(
                            "flex items-center gap-1 text-[11px] font-bold shrink-0",
                            isOverdue ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
                          )}>
                            <Calendar className="h-3.5 w-3.5" />
                            {isOverdue ? 'Overdue: ' : 'Due: '}
                            {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60 italic">No deadline</span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

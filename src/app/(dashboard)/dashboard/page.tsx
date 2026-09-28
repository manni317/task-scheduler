'use client'

import { useState, useEffect } from 'react'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines'
import { TeamVelocityChart } from '@/components/dashboard/TeamVelocityChart'
import { OverdueTable } from '@/components/dashboard/OverdueTable'
import { EmployeePerformanceTable } from '@/components/dashboard/EmployeePerformanceTable'
import { Task, User } from '@/types/task'
import { createClient } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useUIStore } from '@/hooks/use-ui-store'

const mockVelocity = [
  { sprint: 'Sprint 1', completed: 34, committed: 40, velocity: 34 },
  { sprint: 'Sprint 2', completed: 38, committed: 38, velocity: 38 },
  { sprint: 'Sprint 3', completed: 42, committed: 45, velocity: 42 },
  { sprint: 'Sprint 4', completed: 36, committed: 40, velocity: 36 },
  { sprint: 'Sprint 5', completed: 45, committed: 45, velocity: 45 },
]

export default function DashboardPage() {
  const [userRole, setUserRole] = useState('manager')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    setUserRole(localStorage.getItem('userRole') || 'manager')
    setUserId(localStorage.getItem('userId') || '')
  }, [])

  const { refreshCount } = useUIStore()

  const { data: { tasks = [], users = [] } = {}, isLoading } = useQuery({
    queryKey: ['dashboard_tasks', refreshCount],
    queryFn: async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const [{ data: profilesData }, { data: tasksData }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('tasks').select('*')
      ])

      const mappedUsers: User[] = (profilesData || []).map((u: any) => ({
        id: u.id,
        name: u.full_name || 'Unknown',
        email: u.email || '',
        avatar: u.avatar_url || '',
        role: u.role || 'member'
      }))
      
      let mappedTasks: Task[] = []
      if (tasksData) {
        mappedTasks = tasksData.map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description || '',
          status: t.status || 'todo',
          priority: (() => { const p = Number(t.priority); return p === 1 ? 'low' : p === 3 ? 'high' : p === 4 ? 'urgent' : 'medium' })(),
          projectId: t.project_id || '1',
          assigneeId: t.assignee_id || null,
          assignee: mappedUsers.find(u => u.id === t.assignee_id),
          reporterId: t.reporter_id || null,
          reporter: mappedUsers.find(u => u.id === t.reporter_id),
          dueDate: t.due_date ? new Date(t.due_date) : undefined,
          estimatedHours: t.time_spent || 0,
          tags: t.tags || [],
          checklistItems: [],
          comments: [],
          commentsCount: 0,
          attachments: [],
          timeEntries: [],
          dependencies: [],
          activityLog: [],
          order: t.order_index || 0,
          isCompleted: t.status === 'done',
          createdAt: new Date(t.created_at || Date.now()),
          updatedAt: new Date(t.updated_at || Date.now())
        }))
      }
      return { tasks: mappedTasks, users: mappedUsers }
    }
  })

  if (isLoading) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Filter tasks based on role
  const displayTasks = userRole === 'manager' 
    ? tasks 
    : tasks.filter(t => t.assigneeId === userId)

  const completedCount = displayTasks.filter(t => t.status === 'done').length
  const inProgressCount = displayTasks.filter(t => t.status === 'in_progress').length
  const overdueCount = displayTasks.filter(t => t.dueDate && t.dueDate < new Date() && t.status !== 'done').length

  const stats = {
    totalTasks: displayTasks.length,
    completedTasks: completedCount,
    inProgressTasks: inProgressCount,
    overdueTasks: overdueCount,
    completionRate: displayTasks.length ? Math.round((completedCount / displayTasks.length) * 100) : 0,
    avgCompletionTime: 0,
  }

  // Generate dynamic performance based on tasks
  const performanceMap = new Map()
  displayTasks.forEach(task => {
    if (!task.assigneeId) return
    if (!performanceMap.has(task.assigneeId)) {
      performanceMap.set(task.assigneeId, {
        userId: task.assigneeId,
        user: task.assignee,
        tasksAssigned: 0,
        tasksCompleted: 0,
        tasksOverdue: 0,
        avgCompletionTime: 0,
        completionRate: 0
      })
    }
    const perf = performanceMap.get(task.assigneeId)
    perf.tasksAssigned++
    if (task.status === 'done') perf.tasksCompleted++
    if (task.dueDate && task.dueDate < new Date() && task.status !== 'done') perf.tasksOverdue++
    perf.completionRate = Math.round((perf.tasksCompleted / perf.tasksAssigned) * 100)
  })

  let performanceData = Array.from(performanceMap.values())
  if (userRole !== 'manager') {
    performanceData = performanceData.filter(p => p.userId === userId)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening with your tasks.</p>
        </div>
      </div>

      <StatsCards stats={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingDeadlines tasks={displayTasks} users={users} />
        {userRole === 'manager' && <TeamVelocityChart data={mockVelocity} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OverdueTable tasks={displayTasks} users={users} />
        <EmployeePerformanceTable data={performanceData} users={users} />
      </div>
    </div>
  )
}
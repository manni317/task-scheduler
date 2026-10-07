'use client'

import { useState } from 'react'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines'
import { OverdueTable } from '@/components/dashboard/OverdueTable'
import { EmployeePerformanceTable } from '@/components/dashboard/EmployeePerformanceTable'
import { DashboardHero } from '@/components/dashboard/DashboardHero'
import { Task, User } from '@/types/task'
import { createBrowserClient } from '@supabase/ssr'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/hooks/use-ui-store'


export default function DashboardPage() {
  const { profile, loading: authLoading } = useAuth()
  const { refreshCount } = useUIStore()

  const userRole = profile?.role || 'employee'
  const userId = profile?.id || ''

  const [selectedOrgId, setSelectedOrgId] = useState<string>('all')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all')

  const { data: { tasks = [], users = [], projects = [], organizations = [] } = {}, isLoading } = useQuery({
    queryKey: ['dashboard_tasks', refreshCount],
    queryFn: async () => {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      
      const [{ data: profilesData }, { data: tasksData }, { data: projectsData }, { data: orgsData }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('tasks').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('organizations').select('*')
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
          project: projectsData?.find(p => p.id === t.project_id) || null,
          orgId: projectsData?.find(p => p.id === t.project_id)?.org_id || null,
          organization: orgsData?.find(o => o.id === projectsData?.find(p => p.id === t.project_id)?.org_id) || null,
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
          updatedAt: new Date(t.updated_at || Date.now()),
          rejectionReason: t.rejection_reason || null
        }))
      }
      return { tasks: mappedTasks, users: mappedUsers, projects: projectsData || [], organizations: orgsData || [] }
    },
    enabled: !!profile
  })

  if (authLoading || isLoading) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Filter tasks based on role
  let displayTasks = userRole === 'admin' || userRole === 'manager' 
    ? tasks 
    : tasks.filter(t => t.assigneeId === userId)

  if (selectedOrgId !== 'all') {
    displayTasks = displayTasks.filter(t => t.orgId === selectedOrgId)
  }
  if (selectedProjectId !== 'all') {
    displayTasks = displayTasks.filter(t => t.projectId === selectedProjectId)
  }
  if (selectedEmployeeId !== 'all') {
    displayTasks = displayTasks.filter(t => t.assigneeId === selectedEmployeeId)
  }

  const completedCount = displayTasks.filter(t => t.status === 'done').length
  const inProgressCount = displayTasks.filter(t => t.status === 'in_progress').length
  const reviewCount = displayTasks.filter(t => t.status === 'review').length
  const overdueCount = displayTasks.filter(t => t.dueDate && t.dueDate < new Date() && t.status !== 'done').length

  const stats = {
    totalTasks: displayTasks.length,
    completedTasks: completedCount,
    inProgressTasks: inProgressCount,
    reviewTasks: reviewCount,
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
  if (userRole !== 'admin' && userRole !== 'manager') {
    performanceData = performanceData.filter(p => p.userId === userId)
  }

  // Check for tasks assigned today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const newTasksToday = displayTasks.filter(t => 
    t.assigneeId === userId && 
    t.createdAt >= today
  ).length

  const rejectedTasks = displayTasks.filter(t => 
    t.rejectionReason && 
    t.status === 'in_progress' && 
    t.assigneeId === userId
  )

  return (
    <div className="space-y-6">
      <DashboardHero 
        userName={profile?.full_name || 'User'} 
        newTasksCount={newTasksToday} 
        avatarUrl={profile?.avatar_url}
      />

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">Filter Tasks:</span>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <select 
            value={selectedOrgId} 
            onChange={(e) => { setSelectedOrgId(e.target.value); setSelectedProjectId('all') }}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent/50 cursor-pointer sm:min-w-[200px]"
          >
            <option value="all">All Organizations</option>
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
          <select 
            value={selectedProjectId} 
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 hover:bg-accent/50 cursor-pointer sm:min-w-[200px]"
            disabled={selectedOrgId !== 'all' && !projects.some(p => p.org_id === selectedOrgId)}
          >
            <option value="all">All Projects</option>
            {projects
              .filter(p => selectedOrgId === 'all' || p.org_id === selectedOrgId)
              .map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          {(userRole === 'admin' || userRole === 'manager') && (
            <select 
              value={selectedEmployeeId} 
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent/50 cursor-pointer sm:min-w-[180px]"
            >
              <option value="all">All Employees</option>
              {users
                .filter(u => u.role !== 'admin' && u.role !== 'manager')
                .map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {rejectedTasks.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm flex items-start gap-4">
          <div className="p-2 bg-red-100 rounded-full mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <div>
            <h3 className="text-red-800 font-bold text-lg">Action Required: {rejectedTasks.length} {rejectedTasks.length === 1 ? 'Task' : 'Tasks'} Rejected</h3>
            <p className="text-red-700 text-sm mt-1">
              Your manager has rejected some of your submitted tasks. Please check the <strong>Tasks</strong> tab, look for the red "REJECTED" badges, and read the manager's feedback to make corrections.
            </p>
          </div>
        </div>
      )}

      <StatsCards stats={stats} userRole={userRole} />

      {(userRole === 'admin' || userRole === 'manager') ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2 w-full min-w-0">
            <div className="min-w-0"><UpcomingDeadlines tasks={displayTasks} users={users} /></div>
            <div className="min-w-0"><EmployeePerformanceTable data={performanceData} users={users} /></div>
          </div>

          <div className="grid gap-6 w-full min-w-0">
            <div className="min-w-0"><OverdueTable tasks={displayTasks} users={users} /></div>
          </div>
        </>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 w-full min-w-0">
          <div className="min-w-0"><UpcomingDeadlines tasks={displayTasks} users={users} /></div>
          <div className="min-w-0"><OverdueTable tasks={displayTasks} users={users} /></div>
        </div>
      )}
    </div>
  )
}
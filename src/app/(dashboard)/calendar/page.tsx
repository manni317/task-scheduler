'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addWeeks, addMonths, subMonths, isSameMonth, isSameDay, isToday, isPast, isFuture, parseISO } from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight, Plus, MoreHorizontal, Check, Clock, Flag, User, AlertTriangle } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { Task, User as UserType } from '@/types/task'
import { useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/hooks/use-ui-store'
import { useRouter } from 'next/navigation'

type CalendarView = 'month' | 'week' | 'day'

export default function CalendarPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const { openCreateTaskModal, refreshCount } = useUIStore()
  const queryClient = useQueryClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<CalendarView>('month')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const userRole = profile?.role || 'employee'
  const userId = profile?.id || ''

  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  const [selectedOrgId, setSelectedOrgId] = useState<string>('all')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all')

  const { data: { tasks = [], users = [], projects = [], organizations = [] } = {}, isLoading } = useQuery({
    queryKey: ['calendar_tasks', refreshCount, currentDate],
    queryFn: async () => {
      const start = startOfMonth(currentDate)
      const end = endOfMonth(currentDate)
      
      let query = supabase
        .from('tasks')
        .select('*, sub_tasks(*), task_updates(*, profiles(*))')
        .gte('due_date', start.toISOString())
        .lte('due_date', end.toISOString())
        .order('due_date', { ascending: true })

      if (userRole === 'employee' && userId) {
        query = query.eq('assignee_id', userId)
      }

      const { data, error } = await query
      if (error) throw error

      const [{ data: profilesData }, { data: projectsData }, { data: orgsData }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('organizations').select('*')
      ])

      const mappedUsers = (profilesData || []).map((u: any) => ({
        id: u.id,
        name: u.full_name || 'Unknown',
        email: u.email || '',
        avatar: u.avatar_url || '',
        role: u.role || 'employee'
      }))

      const mappedTasks: Task[] = (data || []).map((t: any) => {
        const nonAdminUpdates = t.task_updates?.filter((upd: any) => upd.profiles?.role !== 'admin' && upd.profiles?.role !== 'manager') || []
        const latestUpdate = nonAdminUpdates.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

        return {
          id: t.id,
          title: t.title,
          description: t.description || '',
          status: t.status || 'todo',
          priority: (() => { const p = Number(t.priority); return p === 1 ? 'low' : p === 3 ? 'high' : p === 4 ? 'urgent' : 'medium' })(),
          projectId: t.project_id || null,
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
          checklistItems: t.sub_tasks ? t.sub_tasks.map((st: any) => ({
            id: st.id,
            title: st.title,
            completed: st.is_completed,
            order: st.order_index
          })) : [],
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
          latestUpdate: latestUpdate ? {
            content: latestUpdate.content,
            user: latestUpdate.profiles?.full_name,
            createdAt: latestUpdate.created_at,
            audioUrl: latestUpdate.content?.match(/\[audio:(.*?)\]/)?.[1] || null
          } : null,
          rejectionReason: t.rejection_reason || null
        }
      })

      return { tasks: mappedTasks, users: mappedUsers, projects: projectsData || [], organizations: orgsData || [] }
    },
    enabled: !!profile && !authLoading
  })

  // Filter tasks based on selected org/project
  let displayTasks = tasks
  if (selectedOrgId !== 'all') {
    displayTasks = displayTasks.filter(t => t.orgId === selectedOrgId)
  }
  if (selectedProjectId !== 'all') {
    displayTasks = displayTasks.filter(t => t.projectId === selectedProjectId)
  }
  if (selectedEmployeeId !== 'all') {
    displayTasks = displayTasks.filter(t => t.assigneeId === selectedEmployeeId)
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const tasksByDate = displayTasks.reduce((acc, task) => {
    if (!task.dueDate) return acc
    const dateKey = format(task.dueDate, 'yyyy-MM-dd')
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  const getDaysInMonth = (date: Date) => {
    const start = startOfWeek(startOfMonth(date))
    const end = endOfWeek(endOfMonth(date))
    const days: Date[] = []
    let current = start
    while (current <= end) {
      days.push(current)
      current = addDays(current, 1)
    }
    return days
  }

  const getWeeksInMonth = (date: Date) => {
    const days = getDaysInMonth(date)
    const weeks: Date[][] = []
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7))
    }
    return weeks
  }

  const goToPrevious = () => {
    setCurrentDate(prev => view === 'month' ? subMonths(prev, 1) : view === 'week' ? addWeeks(prev, -1) : addDays(prev, -1))
  }

  const goToNext = () => {
    setCurrentDate(prev => view === 'month' ? addMonths(prev, 1) : view === 'week' ? addWeeks(prev, 1) : addDays(prev, 1))
  }

  const goToToday = () => setCurrentDate(new Date())

  const handleTaskClick = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedTask(task)
  }

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  const statusColors = {
    todo: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    review: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  }

  const getTaskColor = (task: Task) => {
    if (task.status === 'done') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    if (task.dueDate && isPast(task.dueDate) && !isToday(task.dueDate) && task.status !== 'done') {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    if (task.status === 'in_progress') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    return statusColors[task.status as keyof typeof statusColors] || statusColors.todo
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground text-lg">{format(currentDate, 'MMMM yyyy')}</p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3">
          <select 
            value={selectedOrgId} 
            onChange={(e) => { setSelectedOrgId(e.target.value); setSelectedProjectId('all') }}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Organizations</option>
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
          <select 
            value={selectedProjectId} 
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
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
              className="h-9 px-3 rounded-md border border-input bg-background text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent/50 cursor-pointer sm:min-w-[150px]"
            >
              <option value="all">All Employees</option>
              {users
                .filter(u => u.role !== 'admin' && u.role !== 'manager')
                .map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          )}

          <div className="flex bg-muted rounded-lg p-1 ml-auto sm:ml-0" role="radiogroup">
            {(['month', 'week', 'day'] as CalendarView[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  view === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
                role="radio"
                aria-checked={view === v}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={goToPrevious} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday} className="px-3">
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={goToNext} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
          {(userRole === 'admin' || userRole === 'manager') && (
            <Button onClick={openCreateTaskModal} className="gap-2">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          )}
        </div>
      </div>

      {/* Month View */}
      {view === 'month' && (
        <div className="flex-1 overflow-hidden rounded-xl border bg-card">
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          <div className="flex-1 overflow-auto p-2">
            <div className="grid grid-cols-7 min-h-[500px]">
              {getWeeksInMonth(currentDate).map((week, weekIndex) =>
                week.map((day, dayIndex) => {
                  const isCurrentMonth = isSameMonth(day, currentDate)
                  const dayTasks = tasksByDate[format(day, 'yyyy-MM-dd')] || []
                  const isSelected = selectedDate && isSameDay(day, selectedDate)
                  const today = isToday(day)

                  return (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        'relative min-h-[100px] border p-2 transition-colors',
                        !isCurrentMonth && 'bg-muted/30 text-muted-foreground',
                        today && 'bg-primary/10 ring-2 ring-primary',
                        isSelected && 'bg-primary/20 ring-2 ring-primary'
                      )}
                    >
                      <div className={cn(
                        'flex items-center justify-between mb-1',
                        today && 'font-bold text-primary'
                      )}>
                        <span className="text-sm">{format(day, 'd')}</span>
                        {dayTasks.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{dayTasks.length - 3} more
                          </Badge>
                        )}
                      </div>
                      <div className="h-[80px] overflow-y-auto">
                        <div className="space-y-1">
                          {dayTasks.slice(0, 3).map(task => (
                            <div
                              key={task.id}
                              onClick={e => handleTaskClick(task, e)}
                              className={cn(
                                'px-2 py-1 rounded text-xs truncate cursor-pointer hover:shadow-sm',
                                getTaskColor(task)
                              )}
                            >
                              {(userRole === 'admin' || userRole === 'manager') && task.assignee?.name 
                                ? `${task.assignee.name.split(' ')[0]}: ${task.title}`
                                : task.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <div className="flex-1 overflow-hidden rounded-xl border bg-card">
          <div className="flex border-b bg-muted/50">
            {Array.from({ length: 7 }, (_, i) => {
              const day = addDays(startOfWeek(currentDate), i)
              const dayTasks = tasksByDate[format(day, 'yyyy-MM-dd')] || []
              const today = isToday(day)

              return (
                <div
                  key={i}
                  className={cn(
                    'flex-1 min-w-0 border-r p-3',
                    today && 'bg-primary/10'
                  )}
                >
                  <div className={cn(
                    'flex items-center justify-between mb-3',
                    today && 'text-primary font-bold'
                  )}>
                    <div>
                      <p className="text-sm text-muted-foreground">{format(day, 'EEE')}</p>
                      <p className="text-lg font-medium">{format(day, 'd')}</p>
                    </div>
                    {dayTasks.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {dayTasks.length}
                      </Badge>
                    )}
                  </div>
                  <div className="h-[500px] overflow-y-auto">
                    <div className="space-y-2">
                      {dayTasks.map(task => (
                        <div
                          key={task.id}
                          onClick={e => handleTaskClick(task, e)}
                          className={cn(
                            'px-3 py-2 rounded-lg cursor-pointer hover:shadow-sm border-l-4',
                            getTaskColor(task).replace('text-', 'border-')
                          )}
                        >
                          <p className="font-medium truncate">{task.title}</p>
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {task.organization && (
                              <Badge variant="outline" className="text-[9px] h-3 px-1 py-0">{task.organization.name}</Badge>
                            )}
                            {task.project && (
                              <Badge variant="secondary" className="text-[9px] h-3 px-1 py-0">{task.project.name}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {task.assignee && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {task.assignee.name}
                              </span>
                            )}
                            <Badge variant="outline" className={statusColors[task.status]}>
                              {task.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Day View */}
      {view === 'day' && (
        <div className="flex-1 overflow-hidden rounded-xl border bg-card">
          <div className="flex border-b bg-muted/50">
            <div className="w-20 border-r p-3 text-center bg-muted/50">
              <p className="text-sm text-muted-foreground">{format(currentDate, 'EEE')}</p>
              <p className="text-3xl font-bold">{format(currentDate, 'd')}</p>
              <p className="text-sm text-muted-foreground">{format(currentDate, 'MMM yyyy')}</p>
            </div>
            <div className="flex-1 min-w-0 overflow-y-auto p-4">
              <div className="space-y-4" style={{ height: '600px' }}>
                {Array.from({ length: 24 }, (_, hour) => {
                  const hourDate = new Date(currentDate)
                  hourDate.setHours(hour, 0, 0, 0)
                  const hourTasks = tasks.filter(t => 
                    t.dueDate && t.dueDate.getHours() === hour && isSameDay(t.dueDate, currentDate)
                  )

                  return (
                    <div key={hour} className="relative border-b last:border-0">
                      <div className="absolute left-0 top-0 w-16 text-right pr-2 text-xs text-muted-foreground">
                        {format(hourDate, 'h a')}
                      </div>
                      <div className="ml-16">
                        {hourTasks.map(task => (
                          <div
                            key={task.id}
                            onClick={e => handleTaskClick(task, e)}
                            className={cn(
                              'mb-2 px-3 py-2 rounded-lg cursor-pointer hover:shadow-sm border-l-4',
                              getTaskColor(task).replace('text-', 'border-')
                            )}
                          >
                            <p className="font-medium">{task.title}</p>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {task.organization && (
                                <Badge variant="outline" className="text-[9px] h-3 px-1 py-0">{task.organization.name}</Badge>
                              )}
                              {task.project && (
                                <Badge variant="secondary" className="text-[9px] h-3 px-1 py-0">{task.project.name}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Badge variant="outline" className={statusColors[task.status]}>
                                {task.status.replace('_', ' ')}
                              </Badge>
                              {task.assignee && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {task.assignee.name}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {hourTasks.length === 0 && (
                          <div className="h-12 border-dashed border-muted rounded-lg" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Popover */}
      {selectedTask && (
        <Popover open={!!selectedTask} onOpenChange={open => !open && setSelectedTask(null)}>
          <PopoverTrigger asChild>
            <button className="sr-only" onClick={() => setSelectedTask(null)}>Close</button>
          </PopoverTrigger>
          <PopoverContent className="w-96 max-h-[80vh] overflow-auto" align="center" sideOffset={10}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{selectedTask.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{selectedTask.description || 'No description'}</p>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
            <Separator className="my-3" />
            <div className="space-y-3">
              {(selectedTask.organization || selectedTask.project) && (
                <div className="flex items-center gap-2">
                  {selectedTask.organization && (
                    <Badge variant="outline" className="text-xs">{selectedTask.organization.name}</Badge>
                  )}
                  {selectedTask.project && (
                    <Badge variant="secondary" className="text-xs">{selectedTask.project.name}</Badge>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={priorityColors[selectedTask.priority]}>
                  <Flag className="h-3 w-3 mr-1" />
                  {selectedTask.priority}
                </Badge>
                <Badge variant="outline" className={statusColors[selectedTask.status]}>
                  <Check className="h-3 w-3 mr-1" />
                  {selectedTask.status.replace('_', ' ')}
                </Badge>
              </div>
              {selectedTask.dueDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(selectedTask.dueDate, 'MMM d, yyyy')}</span>
                  {isPast(selectedTask.dueDate) && selectedTask.status !== 'done' && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              )}
              {selectedTask.assignee && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Assigned to: {selectedTask.assignee.name}</span>
                </div>
              )}
              {selectedTask.estimatedHours && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Estimated: {selectedTask.estimatedHours}h</span>
                </div>
              )}
              {selectedTask.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedTask.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
            <Separator className="my-3" />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedTask(null)}>
                Close
              </Button>
              <Button className="flex-1" onClick={() => router.push(`/tasks/${selectedTask.id}`)}>
                View Details
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
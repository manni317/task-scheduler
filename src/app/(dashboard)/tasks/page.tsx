'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@supabase/supabase-js'
import { KanbanBoard } from '@/components/task/KanbanBoard'
import { Task, User } from '@/types/task'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Filter, Funnel, Plus, Mic } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/hooks/use-ui-store'

const mockUsers: User[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', avatar: '', role: 'admin' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', avatar: '', role: 'member' },
  { id: '3', name: 'Carol Williams', email: 'carol@example.com', avatar: '', role: 'member' },
  { id: '4', name: 'David Brown', email: 'david@example.com', avatar: '', role: 'member' },
]

const mockTasks: Task[] = []

const mockProjects = [
  { id: '1', name: 'Website Redesign', key: 'WEB' },
  { id: '2', name: 'Mobile App', key: 'MOB' },
  { id: '3', name: 'API Integration', key: 'API' },
]

export default function TasksPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { openCreateTaskModal, refreshCount } = useUIStore()
  const { data: { tasks = [], users = [], projects = [] } = {}, isLoading: loading } = useQuery({
    queryKey: ['tasks', refreshCount],
    queryFn: async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const [{ data: profilesData }, { data: projectsData }, { data: tasksData }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('tasks').select('*, sub_tasks(*), task_updates(*, profiles(*))')
      ])

      const mappedUsers = (profilesData || []).map((u: any) => ({
        id: u.id,
        name: u.full_name || 'Unknown',
        email: u.email || '',
        avatar: u.avatar_url || '',
        role: u.role || 'member'
      }))
      
      let mappedTasks: any[] = []
      if (tasksData && tasksData.length > 0) {
        mappedTasks = tasksData.map((t: any) => {
          // Find the latest update from a non-admin (doer)
          const nonAdminUpdates = t.task_updates?.filter((upd: any) => upd.profiles?.role !== 'admin' && upd.profiles?.role !== 'manager') || []
          const latestUpdate = nonAdminUpdates.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

          return {
          id: t.id,
          title: t.title,
          description: t.description || '',
          status: t.status || 'todo',
          priority: (() => { const p = Number(t.priority); return p === 1 ? 'low' : p === 3 ? 'high' : p === 4 ? 'urgent' : 'medium' })(),
          projectId: t.project_id || null,
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
          } : null
        }
      })
      }
      return { tasks: mappedTasks, users: mappedUsers, projects: projectsData || [] }
    }
  })

  const [activeTab, setActiveTab] = useState<'board' | 'list' | 'calendar'>('board')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')

  const [userRole, setUserRole] = useState('manager')
  const [userId, setUserId] = useState('')
  
  useEffect(() => {
    setUserRole(localStorage.getItem('userRole') || 'manager')
    setUserId(localStorage.getItem('userId') || '')
  }, [])

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
    const matchesAssignee = assigneeFilter === 'all' || task.assigneeId === assigneeFilter
    const matchesProject = projectFilter === 'all' || task.projectId === projectFilter
    const matchesRole = userRole === 'manager' || task.assigneeId === userId
    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesProject && matchesRole
  })

  return (
    <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
              <p className="text-muted-foreground">Manage and track all your tasks</p>
            </div>
            {userRole === 'manager' && (
              <Button onClick={openCreateTaskModal} className="gap-2 bg-primary">
                <Plus className="h-4 w-4" />
                New Task
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative w-[250px] shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                <SelectItem value="">Unassigned</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                <SelectItem value="">No Project</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="mb-4">
              <TabsTrigger value="board">Kanban Board</TabsTrigger>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
            </TabsList>

            <TabsContent value="board" className="min-h-[600px]">
                <KanbanBoard
                  tasks={filteredTasks}
                  onTaskClick={(task) => router.push(`/tasks/${task.id}`)}
                  onTaskDragEnd={async (taskId, newStatus, newOrder) => {
                    try {
                      const supabase = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                      )
                      
                      await supabase.from('tasks')
                        .update({ status: newStatus, order_index: newOrder })
                        .eq('id', taskId)
                        
                      queryClient.invalidateQueries({ queryKey: ['tasks'] })
                    } catch (error) {
                      console.error('Failed to update task:', error)
                    }
                  }}
                      
                  onAddTask={(status) => openCreateTaskModal({ status })}
                  users={users}
                  projects={projects}
                />
            </TabsContent>

            <TabsContent value="list" className="min-h-[600px]">
              <div className="space-y-2 pb-6">
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No tasks found matching your filters
                  </div>
                ) : (
                  filteredTasks.map(task => (
                    <div
                      key={task.id}
                      className="p-4 bg-card border rounded-lg hover:bg-muted/30 hover:border-primary/30 transition-all cursor-pointer group"
                      onClick={() => router.push(`/tasks/${task.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4">
                            {/* Left: title + description */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
                                {task.title}
                              </h3>
                              {task.description && (
                                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                                  {task.description}
                                </p>
                              )}
                            </div>
                            {/* Right: metadata */}
                            <div className="flex items-center gap-3 flex-shrink-0 text-sm">
                              {/* Priority */}
                              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                                task.priority === 'urgent' && 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
                                task.priority === 'high' && 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
                                task.priority === 'medium' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
                                task.priority === 'low' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
                              )}>
                                {task.priority}
                              </span>
                              {/* Status */}
                              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                                task.status === 'todo' && 'bg-gray-100 text-gray-700',
                                task.status === 'in_progress' && 'bg-blue-100 text-blue-700',
                                task.status === 'review' && 'bg-purple-100 text-purple-700',
                                task.status === 'done' && 'bg-green-100 text-green-700',
                              )}>
                                {task.status.replace('_', ' ')}
                              </span>
                              {/* Assignee */}
                              {task.assignee && (
                                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                                  <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                                    {task.assignee.name[0]}
                                  </span>
                                  {task.assignee.name}
                                </span>
                              )}
                              {/* Due date */}
                              {task.dueDate && (
                                <span className={cn('text-xs', new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-500' : 'text-muted-foreground')}>
                                  Due {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                              {/* Last updated */}
                              <span className="text-xs text-muted-foreground hidden sm:block">
                                Updated {new Date(task.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          {/* Tags */}
                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {task.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {/* Latest Update */}
                          {task.latestUpdate && (
                            <div className="mt-3 p-2 rounded-lg bg-muted/40 border border-muted-foreground/10 text-sm flex items-start gap-2">
                              <span className="font-medium text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded flex-shrink-0">
                                {task.latestUpdate.user}
                              </span>
                              <div className="flex items-center gap-2 text-muted-foreground text-xs mt-0.5">
                                {task.latestUpdate.audioUrl && (
                                  <div onClick={e => e.stopPropagation()} className="flex items-center flex-shrink-0">
                                    <audio src={task.latestUpdate.audioUrl} controls className="h-7 w-48 max-w-full" />
                                  </div>
                                )}
                                <span className="line-clamp-1 italic">
                                  {task.latestUpdate.content?.replace(/\[audio:.*?\]/, '').trim() || (!task.latestUpdate.audioUrl ? 'Voice note' : '')}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="calendar" className="min-h-[600px]">
              <div className="text-center py-12 text-muted-foreground">
                Calendar view coming soon
              </div>
            </TabsContent>
          </Tabs>
    </div>
  )
}
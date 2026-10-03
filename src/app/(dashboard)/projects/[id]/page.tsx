'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { KanbanBoard } from '@/components/task/KanbanBoard'
import { Task, User } from '@/types/task'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useUIStore } from '@/hooks/use-ui-store'
import { ProjectCard } from '@/components/project/ProjectCard'
import { Project, User as UserType } from '@/types/task'
import { cn } from '@/lib/utils'
import { createClient } from '@supabase/supabase-js'

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.id as string
  const { openCreateTaskModal, refreshCount } = useUIStore()

  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState('manager')
  const [userId, setUserId] = useState('')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'manager'
    setUserRole(role)
    setUserId(localStorage.getItem('userId') || '')
    async function fetchData() {
      setIsLoading(true)
      try {
        // Fetch users
        const { data: usersData } = await supabase.from('profiles').select('*')
        const mappedUsers = (usersData || []).map((u: any) => ({
          id: u.id,
          name: u.full_name || 'Unknown',
          email: u.email || '',
          avatar: u.avatar_url || '',
          role: u.role || 'member'
        }))
        setUsers(mappedUsers)

        // Fetch project
        const { data: projData } = await supabase.from('projects').select('*').eq('id', projectId).single()
        if (projData) {
          setProject({
            id: projData.id,
            name: projData.name,
            description: projData.description || '',
            key: 'PRJ',
            color: '#3B82F6',
            icon: '🌐',
            ownerId: '',
            owner: null,
            members: mappedUsers,
            tasks: [],
            createdAt: new Date(projData.created_at || Date.now()),
            updatedAt: new Date(projData.updated_at || Date.now()),
            isArchived: false,
          } as Project)
        }

        // Fetch tasks
        const { data: tasksData } = await supabase.from('tasks').select('*').eq('project_id', projectId)
        if (tasksData) {
          setTasks(tasksData.map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description || '',
            status: t.status,
            priority: t.priority === 1 ? 'high' : t.priority === 2 ? 'medium' : 'low',
            projectId: t.project_id,
            assigneeId: t.assignee_id,
            assignee: mappedUsers.find(u => u.id === t.assignee_id),
            reporterId: t.reporter_id,
            dueDate: t.due_date ? new Date(t.due_date) : undefined,
            estimatedHours: t.time_spent || 0,
            tags: [],
            checklistItems: [],
            comments: [],
            commentsCount: 0,
            attachments: [],
            timeEntries: [],
            dependencies: [],
            activityLog: [],
            order: 0,
            isCompleted: t.status === 'done',
            createdAt: new Date(t.created_at),
            updatedAt: new Date(t.updated_at)
          } as Task)))
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [projectId, refreshCount])

  if (isLoading) return <div className="h-full flex items-center justify-center">Loading project details...</div>
  if (!project) return <div className="h-full flex items-center justify-center text-red-500">Project not found</div>

  const displayTasks = userRole === 'manager' ? tasks : tasks.filter(t => t.assigneeId === userId)

  return (
    <div className="h-full flex flex-col">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                'h-12 w-12 rounded-lg flex items-center justify-center',
                `bg-[${project.color}]/20 text-[${project.color}]`
              )}>
                <span className="text-2xl">{project.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold truncate">{project.name}</h1>
                <p className="text-muted-foreground truncate">{project.description}</p>
              </div>
              {userRole !== 'doer' && (
                <Button onClick={() => openCreateTaskModal({ projectId })} className="gap-2 bg-primary whitespace-nowrap">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Task</span>
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-mono rounded-full">
                {project.key}
              </span>
              <span className="px-3 py-1 bg-muted text-muted-foreground text-sm rounded-full">
                {project.members?.length || 0} members
              </span>
              <span className="px-3 py-1 bg-muted text-muted-foreground text-sm rounded-full">
                {displayTasks.length} tasks
              </span>
            </div>
          </div>

          <Tabs defaultValue="list" className="h-[calc(100%-200px)]">
            <TabsList className="mb-4 h-auto flex-wrap w-full justify-start">
              <TabsTrigger value="board">Kanban Board</TabsTrigger>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="board" className="h-[calc(100%-50px)]">
              <KanbanBoard
                tasks={displayTasks}
                onTaskClick={(task) => console.log('Task clicked:', task)}
                onTaskDragEnd={async (taskId, newStatus, newOrder) => {
                  try {
                    setTasks(prev => prev.map(t => 
                      t.id === taskId ? { ...t, status: newStatus, order: newOrder } : t
                    ))
                    await supabase.from('tasks')
                      .update({ status: newStatus, order_index: newOrder })
                      .eq('id', taskId)
                  } catch (error) {
                    console.error('Failed to update task:', error)
                  }
                }}
                onAddTask={(status) => openCreateTaskModal({ projectId, status })}
                users={users}
                projects={[project]}
              />
            </TabsContent>

            <TabsContent value="list" className="h-[calc(100%-50px)] overflow-y-auto">
              <div className="space-y-2">
                {displayTasks.map(task => (
                  <div key={task.id} className="p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <input type="checkbox" className="mt-1 h-4 w-4" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium">{task.title}</h3>
                        <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
                          <span className={cn('px-2 py-0.5 rounded-full', 
                            task.priority === 'urgent' && 'bg-red-100 text-red-700',
                            task.priority === 'high' && 'bg-orange-100 text-orange-700',
                            task.priority === 'medium' && 'bg-yellow-100 text-yellow-700',
                            task.priority === 'low' && 'bg-blue-100 text-blue-700'
                          )}>
                            {task.priority}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-muted">
                            {task.status.replace('_', ' ')}
                          </span>
                          {task.assignee && (
                            <span>{task.assignee.name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="calendar" className="h-[calc(100%-50px)]">
              <div className="text-center py-12 text-muted-foreground">
                Calendar view coming soon
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="h-[calc(100%-50px)]">
              <div className="text-center py-12 text-muted-foreground">
                Timeline view coming soon
              </div>
            </TabsContent>
          </Tabs>
        </div>
  )
}
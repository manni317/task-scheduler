'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { KanbanBoard } from '@/components/task/KanbanBoard'
import { Task, User } from '@/types/task'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Plus, X, UserPlus, User as UserIcon, Building2 } from 'lucide-react'
import { useUIStore } from '@/hooks/use-ui-store'
import { ProjectCard } from '@/components/project/ProjectCard'
import { Project, User as UserType } from '@/types/task'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const { openCreateTaskModal, refreshCount } = useUIStore()
  const { profile, loading: authLoading } = useAuth()

  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  useEffect(() => {
    if (authLoading) return
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
        const { data: projData } = await supabase.from('projects').select('*, organizations(id, name, logo_url, organization_members(user_id))').eq('id', projectId).single()
        if (projData) {
          let orgMembersIds: string[] = []
          if (projData.organizations?.organization_members) {
            orgMembersIds = projData.organizations.organization_members.map((m: any) => m.user_id)
          }

          const members = projData.member_ids && projData.member_ids.length > 0
            ? mappedUsers.filter((u: User) => projData.member_ids.includes(u.id))
            : orgMembersIds.length > 0
              ? mappedUsers.filter((u: User) => orgMembersIds.includes(u.id))
              : mappedUsers

          setProject({
            id: projData.id,
            name: projData.name,
            description: projData.description || '',
            key: 'PRJ',
            color: '#3B82F6',
            icon: '🌐',
            ownerId: '',
            owner: null as any,
            orgId: projData.org_id,
            organization: projData.organizations,
            members: members,
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
  }, [projectId, refreshCount, authLoading])

  if (authLoading || isLoading) return <div className="h-full flex items-center justify-center">Loading project details...</div>
  if (!project) return <div className="h-full flex items-center justify-center text-red-500">Project not found</div>

  const userRole = profile?.role || 'employee'
  const userId = profile?.id || ''

  const displayTasks = (userRole === 'manager' || userRole === 'admin') ? tasks : tasks.filter(t => t.assigneeId === userId)

  const handleRemoveMember = async (userIdToRemove: string) => {
    const currentMembers = project?.members || []
    const newMemberIds = currentMembers.map(m => m.id).filter(id => id !== userIdToRemove)
    try {
      await supabase.from('projects').update({ member_ids: newMemberIds }).eq('id', project!.id)
      setProject(prev => prev ? { ...prev, members: prev.members.filter(m => m.id !== userIdToRemove) } : prev)
      toast.success('Member removed from project')
    } catch (err) {
      toast.error('Failed to remove member')
    }
  }

  const handleAddMember = async (userIdToAdd: string) => {
    if (project?.members.some(m => m.id === userIdToAdd)) return
    
    const currentMembers = project?.members || []
    const newMemberIds = [...currentMembers.map(m => m.id), userIdToAdd]
    try {
      await supabase.from('projects').update({ member_ids: newMemberIds }).eq('id', project!.id)
      const userObj = users.find(u => u.id === userIdToAdd)
      if (userObj) {
        setProject(prev => prev ? { ...prev, members: [...prev.members, userObj] } : prev)
      }
      toast.success('Member added to project')
    } catch (err) {
      toast.error('Failed to add member')
    }
  }

  const isManagerOrAdmin = userRole === 'manager' || userRole === 'admin'

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
              {(userRole === 'manager' || userRole === 'admin') && (
                <Button onClick={() => openCreateTaskModal({ projectId })} className="gap-2 bg-primary whitespace-nowrap">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Task</span>
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {project.organization && (
                <span className="px-3 py-1 bg-muted border text-foreground text-sm font-medium rounded-full flex items-center gap-2 cursor-pointer hover:bg-muted/80" onClick={() => router.push(`/organizations/${project.orgId}`)}>
                  <Building2 className="h-3 w-3" />
                  {project.organization.name}
                </span>
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
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="board" className="h-[calc(100%-50px)]">
              <KanbanBoard
                tasks={displayTasks}
                onTaskClick={(task) => router.push(`/tasks/${task.id}`)}
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
                userRole={userRole}
              />
            </TabsContent>

            <TabsContent value="list" className="h-[calc(100%-50px)] overflow-y-auto">
              <div className="space-y-2">
                {displayTasks.map(task => (
                  <div 
                    key={task.id} 
                    className="p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/tasks/${task.id}`)}
                  >
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

            <TabsContent value="members" className="h-[calc(100%-50px)] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-semibold">Project Members</h2>
                  <p className="text-sm text-muted-foreground">Manage who has access to this project</p>
                </div>
                {isManagerOrAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Add Member
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {users.filter(u => !project.members.some(m => m.id === u.id)).length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">All users are in this project</div>
                      ) : (
                        users.filter(u => !project.members.some(m => m.id === u.id)).map(u => (
                          <DropdownMenuItem key={u.id} onClick={() => handleAddMember(u.id)}>
                            {u.name} ({u.role})
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.members.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-4 bg-card border rounded-xl hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>{member.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                      </div>
                    </div>
                    {isManagerOrAdmin && member.role !== 'admin' && (
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(member.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {project.members.length === 0 && (
                  <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                    <UserIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No members in this project</p>
                  </div>
                )}
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
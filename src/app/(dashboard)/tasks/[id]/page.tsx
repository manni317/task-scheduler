'use client'

import { useParams } from 'next/navigation'
import { TaskDetail } from '@/components/task/TaskDetail'
import { Task, User } from '@/types/task'

const mockUsers: User[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', avatar: '', role: 'admin' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', avatar: '', role: 'member' },
  { id: '3', name: 'Carol Williams', email: 'carol@example.com', avatar: '', role: 'member' },
]

const mockTask: Task = {
  id: '1',
  title: 'Design new dashboard layout',
  description: 'Create wireframes and mockups for the new dashboard. Need to consider responsive design for mobile, tablet, and desktop.',
  status: 'in_progress',
  priority: 'high',
  projectId: '1',
  assigneeId: '1',
  assignee: mockUsers[0],
  reporterId: '2',
  reporter: mockUsers[1],
  dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  estimatedHours: 8,
  actualHours: 4.5,
  tags: ['design', 'ui', 'dashboard'],
  checklistItems: [
    { id: '1', title: 'Wireframes', completed: true, order: 0 },
    { id: '2', title: 'Mockups', completed: false, order: 1 },
    { id: '3', title: 'Review with team', completed: false, order: 2 },
    { id: '4', title: 'Final revisions', completed: false, order: 3 },
  ],
  comments: [
    {
      id: '1',
      taskId: '1',
      userId: '2',
      user: mockUsers[1],
      content: 'Started working on the wireframes. Will share initial concepts by EOD.',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: '2',
      taskId: '1',
      userId: '1',
      user: mockUsers[0],
      content: 'Wireframes look good! Moving to mockups now.',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  ],
  commentsCount: 2,
  attachments: [],
  timeEntries: [
    {
      id: '1',
      taskId: '1',
      userId: '1',
      user: mockUsers[0],
      startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      duration: 120,
      description: 'Created initial wireframes',
    },
    {
      id: '2',
      taskId: '1',
      userId: '1',
      user: mockUsers[0],
      startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 2.5 * 60 * 60 * 1000),
      duration: 150,
      description: 'Designed mockups',
    },
  ],
  dependencies: [],
  activityLog: [
    {
      id: '1',
      taskId: '1',
      userId: '1',
      user: mockUsers[0],
      action: 'created',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: '2',
      taskId: '1',
      userId: '1',
      user: mockUsers[0],
      action: 'updated',
      field: 'status',
      oldValue: 'todo',
      newValue: 'in_progress',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ],
  order: 0,
  isCompleted: false,
  createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
}

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@supabase/supabase-js'

export default function TaskDetailPage() {
  const params = useParams()
  const taskId = params.id as string
  const queryClient = useQueryClient()

  const { data: { task = null, users = [], projects = [] } = {}, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const [{ data: profilesData }, { data: projectsData }, { data: taskData }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('tasks').select('*, sub_tasks(*)').eq('id', taskId).single()
      ])

      const mappedUsers = (profilesData || []).map((u: any) => ({
        id: u.id,
        name: u.full_name || 'Unknown',
        email: u.email || '',
        avatar: u.avatar_url || '',
        role: u.role || 'member'
      }))
      
      let mappedTask = null
      if (taskData) {
        mappedTask = {
          id: taskData.id,
          title: taskData.title,
          description: taskData.description || '',
          status: taskData.status || 'todo',
          priority: taskData.priority || 'medium',
          projectId: taskData.project_id || null,
          assigneeId: taskData.assignee_id || null,
          assignee: mappedUsers.find(u => u.id === taskData.assignee_id),
          reporterId: taskData.reporter_id || null,
          reporter: mappedUsers.find(u => u.id === taskData.reporter_id),
          dueDate: taskData.due_date ? new Date(taskData.due_date) : undefined,
          estimatedHours: taskData.time_spent || 0,
          tags: taskData.tags || [],
          checklistItems: taskData.sub_tasks ? taskData.sub_tasks.map((st: any) => ({
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
          order: taskData.order_index || 0,
          isCompleted: taskData.status === 'done',
          createdAt: new Date(taskData.created_at || Date.now()),
          updatedAt: new Date(taskData.updated_at || Date.now())
        }
      } else {
        mappedTask = mockTask
      }
      
      return { task: mappedTask, users: mappedUsers.length > 0 ? mappedUsers : mockUsers, projects: projectsData || [] }
    }
  })

  if (isLoading || !task) {
    return <div className="p-8 text-center">Loading task details...</div>
  }

  const handleUpdate = async (data: Partial<Task>) => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      // Build update object - always update status if provided
      const updateObj: any = {
        updated_at: new Date().toISOString(),
      }
      if (data.status) updateObj.status = data.status
      if (data.title) updateObj.title = data.title
      if (data.description !== undefined) updateObj.description = data.description
      if (data.tags) updateObj.tags = data.tags
      if (data.priority) updateObj.priority = data.priority
      if (data.projectId !== undefined) updateObj.project_id = data.projectId
      if (data.assigneeId !== undefined) updateObj.assignee_id = data.assigneeId === 'unassigned' ? null : data.assigneeId
      if (data.dueDate !== undefined) updateObj.due_date = data.dueDate?.toISOString() || null

      await supabase.from('tasks').update(updateObj).eq('id', taskId)

      // Sync checklist items if provided
      if (data.checklistItems && data.title) {
        await supabase.from('sub_tasks').delete().eq('task_id', taskId)
        
        if (data.checklistItems.length > 0) {
          const subTasksToInsert = data.checklistItems.map((item: any, index: number) => ({
            task_id: taskId,
            title: item.title,
            is_completed: item.completed,
            order_index: index
          }))
          await supabase.from('sub_tasks').insert(subTasksToInsert)
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    } catch (error) {
      console.error('Update failed', error)
    }
  }

  const handleToggleChecklist = async (taskId: string, itemId: string) => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      // We need to fetch the current value first, or just find it from the local data
      const currentItem = task.checklistItems.find(c => c.id === itemId)
      if (currentItem) {
        await supabase.from('sub_tasks').update({ is_completed: !currentItem.completed }).eq('id', itemId)
        queryClient.invalidateQueries({ queryKey: ['task', taskId] })
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
      }
    } catch (error) {
      console.error('Toggle checklist failed', error)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <TaskDetail
        task={task}
        users={users}
        projects={projects}
        onUpdate={handleUpdate}
        onDelete={async (id) => console.log('Delete task:', id)}
        onAddComment={async (taskId, content) => console.log('Add comment:', content)}
        onAddTimeEntry={async (taskId, entry) => console.log('Add time entry:', entry)}
        onToggleChecklist={handleToggleChecklist}
      />
    </div>
  )
}
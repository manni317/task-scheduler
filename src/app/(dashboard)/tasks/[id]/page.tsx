'use client'

import { useParams, useRouter } from 'next/navigation'
import { TaskDetail } from '@/components/task/TaskDetail'
import { Task, User } from '@/types/task'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createBrowserClient } from '@supabase/ssr'
import { notifyTaskUpdate } from '@/app/actions/task'

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string
  const queryClient = useQueryClient()

  const { data: { task = null, users = [], projects = [] } = {}, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      
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
          estimatedHours: taskData.estimated_hours || 0,
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
          audioUrl: taskData.audio_url || null,
          rejectionReason: taskData.rejection_reason || null,
          createdAt: new Date(taskData.created_at || Date.now()),
          updatedAt: new Date(taskData.updated_at || Date.now())
        }
      } else {
        mappedTask = null
      }
      
      return { task: mappedTask, users: mappedUsers.length > 0 ? mappedUsers : mockUsers, projects: projectsData || [] }
    }
  })

  if (isLoading || !task) {
    return <div className="p-8 text-center">Loading task details...</div>
  }

  const handleUpdate = async (data: Partial<Task>) => {
    // Optimistic UI update
    queryClient.setQueryData(['task', taskId], (oldData: any) => {
      if (!oldData || !oldData.task) return oldData
      return {
        ...oldData,
        task: { ...oldData.task, ...data }
      }
    })

    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      
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
      if (data.startDate !== undefined) updateObj.start_date = data.startDate?.toISOString() || null
      if (data.estimatedHours !== undefined) updateObj.estimated_hours = data.estimatedHours
      if (data.rejectionReason !== undefined) updateObj.rejection_reason = data.rejectionReason

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

      // Handle push notifications for task updates
      const originalTask = task
      
      if (data.rejectionReason && !originalTask.rejectionReason) {
        // Task was rejected
        if (originalTask.assigneeId) {
          notifyTaskUpdate(taskId, originalTask.title, 'rejected', originalTask.assigneeId, data.rejectionReason)
        }
      } else if (data.status === 'approved' && originalTask.status !== 'approved') {
        // Task was approved
        if (originalTask.assigneeId) {
          notifyTaskUpdate(taskId, originalTask.title, 'approved', originalTask.assigneeId)
        }
      } else if (data.status && data.status !== originalTask.status) {
        // General status change
        // If assignee changes status, notify reporter. If reporter/admin changes status, notify assignee.
        const currentUser = (await supabase.auth.getUser()).data.user?.id
        const targetUser = currentUser === originalTask.assigneeId ? originalTask.reporterId : originalTask.assigneeId
        if (targetUser) {
          notifyTaskUpdate(taskId, originalTask.title, 'status_changed', targetUser, data.status)
        }
      }

    } catch (error) {
      console.error('Update failed', error)
    }
  }

  const handleToggleChecklist = async (taskId: string, itemId: string) => {
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      
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

  const handleDelete = async (id: string) => {
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      await supabase.from('tasks').delete().eq('id', id)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      router.push('/tasks')
    } catch (error) {
      console.error('Delete failed', error)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <TaskDetail
        task={task}
        users={users}
        projects={projects}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onAddComment={async (taskId, content) => console.log('Add comment:', content)}
        onAddTimeEntry={async (taskId, entry) => console.log('Add time entry:', entry)}
        onToggleChecklist={handleToggleChecklist}
      />
    </div>
  )
}
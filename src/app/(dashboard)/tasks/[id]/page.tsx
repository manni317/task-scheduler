'use client'

import { useParams } from 'next/navigation'
import { TaskDetail } from '@/components/task/TaskDetail'
import { Task, User } from '@/types/task'
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
          priority: (() => { const p = Number(taskData.priority); return p === 1 ? 'low' : p === 3 ? 'high' : p === 4 ? 'urgent' : 'medium' })(),
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
          audioUrl: taskData.audio_url || null,
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
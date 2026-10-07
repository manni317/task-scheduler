'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { sendPushNotification } from '@/lib/push'

export async function createTask(formData: FormData) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try { cookieStore.set({ name, value, ...options }) } catch (error) {}
          },
          remove(name: string, options: any) {
            try { cookieStore.set({ name, value: '', ...options }) } catch (error) {}
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('Auth error in createTask:', authError)
    }
    const reporterId = user?.id || null

    if (!reporterId) {
      return { success: false, error: 'Unauthorized: Could not identify user' }
    }

    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const projectId = formData.get('projectId') as string
    const priorityStr = formData.get('priority') as string
    const assigneeId = formData.get('assigneeId') as string
    const dueDate = formData.get('dueDate') as string
    const status = formData.get('status') as string || 'todo'

    const tagsStr = formData.get('tags') as string
    const checklistStr = formData.get('checklistItems') as string
    const tags = tagsStr ? JSON.parse(tagsStr) : []
    const checklistItems = checklistStr ? JSON.parse(checklistStr) : []

    let priorityNum = 2 // medium
    if (priorityStr === 'low') priorityNum = 1
    if (priorityStr === 'high') priorityNum = 3
    if (priorityStr === 'urgent') priorityNum = 4

    const audioUrl = formData.get('audioUrl') as string

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        project_id: projectId && projectId !== 'unassigned' ? projectId : null,
        assignee_id: assigneeId && assigneeId !== 'unassigned' ? assigneeId : null,
        reporter_id: reporterId,
        status: status,
        priority: priorityNum,
        due_date: dueDate || null,
        tags: tags,
        task_key: `TSK-${Math.floor(Math.random() * 10000)}`,
        audio_url: audioUrl || null,
      })
      .select()

    if (error) {
      console.error('Error creating task:', error)
      return { success: false, error: 'Failed to create task: ' + error.message }
    }

    if (data && data[0] && checklistItems.length > 0) {
      const taskId = data[0].id
      const subTasksToInsert = checklistItems.map((item: any, index: number) => ({
        task_id: taskId,
        title: item.title,
        is_completed: item.completed,
        order_index: index
      }))
      
      const { error: subTaskError } = await supabase.from('sub_tasks').insert(subTasksToInsert)
      if (subTaskError) {
        console.error('Error creating checklist items:', subTaskError)
      }
    }

    revalidatePath('/dashboard')
    revalidatePath('/tasks')
    revalidatePath('/projects')
    
    // Send push notification to assignee if it's not the reporter
    if (assigneeId && assigneeId !== 'unassigned' && assigneeId !== reporterId) {
      // MUST await in serverless functions, otherwise it gets killed when the response is sent!
      await sendPushNotification(
        assigneeId,
        'New Task Assigned',
        `You have been assigned to: ${title}`,
        '/tasks'
      ).catch(err => console.error('Push error:', err))
    }
    
    return { success: true, task: data[0] }
  } catch (err: any) {
    console.error('Unhandled error in createTask:', err)
    return { success: false, error: err.message || 'Internal server error during task creation' }
  }
}

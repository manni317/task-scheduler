'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function createTask(formData: FormData) {
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

  let { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    // Fallback for dev: find the admin user
    const { data: adminUser } = await supabase.from('profiles').select('id').limit(1).single()
    if (!adminUser) throw new Error('Not authenticated')
    user = { id: adminUser.id } as any
  }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const projectId = formData.get('projectId') as string
  const priorityStr = formData.get('priority') as string
  const assigneeId = formData.get('assigneeId') as string
  const dueDate = formData.get('dueDate') as string
  const status = formData.get('status') as string || 'todo'

  let priorityNum = 2 // medium
  if (priorityStr === 'low') priorityNum = 1
  if (priorityStr === 'high') priorityNum = 3
  if (priorityStr === 'urgent') priorityNum = 4

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title,
      description,
      project_id: projectId || null,
      assignee_id: assigneeId || null,
      reporter_id: user.id,
      status: status,
      priority: priorityStr,
      due_date: dueDate || null,
      task_key: `TSK-${Math.floor(Math.random() * 10000)}` // Mock task key
    })
    .select()

  if (error) {
    console.error('Error creating task:', error)
    throw new Error('Failed to create task: ' + error.message)
  }

  revalidatePath('/dashboard')
  revalidatePath('/tasks')
  revalidatePath('/projects')
  
  return { success: true, task: data[0] }
}

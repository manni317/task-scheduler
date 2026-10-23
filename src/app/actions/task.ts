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
    const isRecurring = formData.get('isRecurring') === 'true'
    const recurringSchedule = (formData.get('recurringSchedule') as string) || (isRecurring ? 'daily' : null)

    const finalTags = [...tags]
    if (isRecurring && !finalTags.includes('recurring')) {
      finalTags.push('recurring')
    }

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
        tags: finalTags,
        task_key: `TSK-${Math.floor(Math.random() * 10000)}`,
        audio_url: audioUrl || null,
        is_recurring: isRecurring,
        recurring_schedule: recurringSchedule,
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
    
    // Send push notification to assignee
    if (assigneeId && assigneeId !== 'unassigned') {
      // MUST await in serverless functions, otherwise it gets killed when the response is sent!
      await sendPushNotification(
        assigneeId,
        '✨ New Task Assigned',
        `You have been assigned to: "${title}"`,
        `/tasks/${data[0].id}`,
        {
          icon: '/logo.png',
          badge: '/icons/icon-72x72.svg',
          image: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80', // A nice productivity/planning image
          actions: [{ action: 'view', title: 'Open Task' }]
        }
      ).catch(err => console.error('Push error:', err))
    }
    
    return { success: true, task: data[0] }
  } catch (err: any) {
    console.error('Unhandled error in createTask:', err)
    return { success: false, error: err.message || 'Internal server error during task creation' }
  }
}

export async function notifyTaskUpdate(
  taskId: string, 
  title: string, 
  action: 'rejected' | 'approved' | 'status_changed' | 'assigned', 
  targetUserId: string,
  extraInfo?: string
) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: any) {},
          remove(name: string, options: any) {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const actorId = user?.id

    if (!actorId) return { success: false, error: 'Unauthorized' }

    let pushTitle = 'Task Update'
    let pushBody = `Task "${title}" was updated.`
    let pushOptions: any = {
      icon: '/logo.png', // A nicer high-res icon if available
      badge: '/icons/icon-72x72.svg', // Small monochrome icon
    }

    if (action === 'rejected') {
      pushTitle = '🚨 Task Rejected'
      pushBody = `Your task "${title}" was rejected.\nReason: ${extraInfo || 'No reason provided.'}`
      pushOptions.image = 'https://images.unsplash.com/photo-1594322436404-5a0526db4d13?w=800&q=80' // A visually striking dramatic image for rejection
      pushOptions.actions = [{ action: 'view', title: 'Review Task' }]
    } else if (action === 'approved') {
      pushTitle = '🎉 Task Approved!'
      pushBody = `Amazing work! Your task "${title}" was approved.`
      pushOptions.image = 'https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?w=800&q=80' // A beautiful celebration image
      pushOptions.actions = [{ action: 'view', title: 'Celebrate' }]
    } else if (action === 'assigned') {
      pushTitle = '✨ New Task Assigned'
      pushBody = `You have been assigned to: "${title}"`
      pushOptions.image = 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80' // A nice productivity/planning image
      pushOptions.actions = [{ action: 'view', title: 'Open Task' }]
    } else if (action === 'status_changed') {
      if (extraInfo === 'done') {
        pushTitle = '✅ Task Completed!'
        pushBody = `Awesome! Task "${title}" is now done.`
        pushOptions.image = 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80' // Beautiful completion/teamwork image
        pushOptions.actions = [{ action: 'view', title: 'View Task' }]
      } else {
        pushTitle = '🔄 Status Changed'
        pushBody = `Task "${title}" moved to ${extraInfo}.`
        pushOptions.actions = [{ action: 'view', title: 'View Update' }]
      }
    }

    await sendPushNotification(
      targetUserId,
      pushTitle,
      pushBody,
      `/tasks/${taskId}`,
      pushOptions
    ).catch(err => console.error('Push error:', err))

    return { success: true }
  } catch (err: any) {
    console.error('Error in notifyTaskUpdate:', err)
    return { success: false }
  }
}

/**
 * Checks for recurring master tasks and auto-spawns today's instance
 * if one has not already been created for today.
 */
export async function checkAndSpawnDailyRecurringTasks() {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: any) {},
          remove(name: string, options: any) {},
        },
      }
    )

    // Find recurring daily master tasks (parent_task_id is null)
    const { data: masterTasks, error: masterError } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_recurring', true)
      .is('parent_task_id', null)

    if (masterError) {
      console.error('Error querying recurring tasks:', masterError)
      return { success: false, error: masterError.message }
    }

    if (!masterTasks || masterTasks.length === 0) {
      return { success: true, spawnedCount: 0 }
    }

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    let spawnedCount = 0

    for (const master of masterTasks) {
      // Check if today's instance already exists
      const { data: existingInstances } = await supabase
        .from('tasks')
        .select('id')
        .eq('parent_task_id', master.id)
        .gte('created_at', startOfToday.toISOString())
        .limit(1)

      if (!existingInstances || existingInstances.length === 0) {
        // Spawn today's task copy with 'todo' status and end of today due date
        const { data: spawned, error: spawnError } = await supabase
          .from('tasks')
          .insert({
            title: master.title,
            description: master.description,
            project_id: master.project_id,
            assignee_id: master.assignee_id,
            reporter_id: master.reporter_id,
            status: 'todo',
            priority: master.priority,
            due_date: endOfToday.toISOString(),
            tags: master.tags?.includes('recurring') ? master.tags : [...(master.tags || []), 'recurring'],
            task_key: `TSK-${Math.floor(1000 + Math.random() * 9000)}`,
            parent_task_id: master.id,
            is_recurring: false,
            recurring_schedule: null,
          })
          .select()
          .single()

        if (!spawnError && spawned) {
          spawnedCount++
          
          // Send push notification to the assigned employee
          if (master.assignee_id) {
            await sendPushNotification(
              master.assignee_id,
              '🔁 Today\'s Recurring Task Ready',
              `Your daily task "${master.title}" has been spawned for today.`,
              `/tasks/${spawned.id}`,
              {
                icon: '/logo.png',
                badge: '/icons/icon-72x72.svg',
                image: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80',
                actions: [{ action: 'view', title: 'Open Task' }]
              }
            ).catch(err => console.error('Push error for recurring spawn:', err))
          }
        }
      }
    }

    if (spawnedCount > 0) {
      try {
        revalidatePath('/dashboard')
        revalidatePath('/tasks')
      } catch (e) {
        // Safe ignore
      }
    }

    return { success: true, spawnedCount }
  } catch (err: any) {
    console.error('Error in checkAndSpawnDailyRecurringTasks:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Toggle (enable/disable) recurrence for a master task.
 * When isRecurring is set to false, it stops auto-spawning daily tasks.
 */
export async function toggleTaskRecurrence(taskId: string, isRecurring: boolean, schedule: string = 'daily') {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: any) {},
          remove(name: string, options: any) {},
        },
      }
    )

    const updateData: any = {
      is_recurring: isRecurring,
      updated_at: new Date().toISOString(),
    }
    if (isRecurring) {
      updateData.recurring_schedule = schedule
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      console.error('Error toggling recurrence:', error)
      return { success: false, error: error.message }
    }

    try {
      revalidatePath('/dashboard')
      revalidatePath('/tasks')
      revalidatePath(`/tasks/${taskId}`)
    } catch (e) {
      // Safe ignore
    }

    return { success: true, task: data }
  } catch (err: any) {
    console.error('Error in toggleTaskRecurrence:', err)
    return { success: false, error: err.message || 'Failed to update recurrence' }
  }
}

/**
 * Checks for overdue tasks and sends push notification alerts to 
 * the manager (reporter) and admins.
 */
export async function notifyOverdueTasks() {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: any) {},
          remove(name: string, options: any) {},
        },
      }
    )

    const nowIso = new Date().toISOString()

    // Query overdue tasks that are not yet done or approved
    const { data: overdueTasks } = await supabase
      .from('tasks')
      .select('id, title, due_date, assignee_id, reporter_id, status')
      .lt('due_date', nowIso)
      .not('status', 'in', '("done","approved")')
      .limit(10)

    if (!overdueTasks || overdueTasks.length === 0) {
      return { success: true, notifiedCount: 0 }
    }

    // Get managers and admins
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('role', ['admin', 'manager'])

    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, full_name')

    const nameMap = new Map((allProfiles || []).map((p: any) => [p.id, p.full_name || 'Employee']))

    let notifiedCount = 0

    for (const task of overdueTasks) {
      const assigneeName = task.assignee_id ? nameMap.get(task.assignee_id) || 'Employee' : 'Unassigned'
      const targetUserIds = new Set<string>()

      // Add task reporter (creator/manager)
      if (task.reporter_id) targetUserIds.add(task.reporter_id)
      
      // Add all admins and managers
      if (adminProfiles) {
        adminProfiles.forEach(a => targetUserIds.add(a.id))
      }

      for (const targetId of Array.from(targetUserIds)) {
        await sendPushNotification(
          targetId,
          '⚠️ Task Delayed Alert',
          `"${task.title}" is overdue (Assigned to: ${assigneeName}). Immediate attention needed.`,
          `/tasks/${task.id}`,
          {
            icon: '/logo.png',
            badge: '/icons/icon-72x72.svg',
            image: 'https://images.unsplash.com/photo-1594322436404-5a0526db4d13?w=800&q=80',
            actions: [{ action: 'view', title: 'Inspect Task' }]
          }
        ).catch(err => console.error('Push error for overdue task:', err))
        notifiedCount++
      }
    }

    return { success: true, notifiedCount }
  } catch (err: any) {
    console.error('Error in notifyOverdueTasks:', err)
    return { success: false, error: err.message }
  }
}


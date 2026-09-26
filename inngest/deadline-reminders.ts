import { inngest } from './utils'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getUpcomingDeadlines, getOverdueTasks, createNotification, sendEmail } from './utils'

export const deadlineReminders = inngest.createFunction(
  { id: 'deadline-reminders', name: 'Deadline Reminders' },
  { cron: '0 * * * *' },
  async ({ event, step }) => {
    const supabase = await createServerSupabaseClient()
    
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name, settings')
      .eq('settings->deadline_reminders', true)

    if (error) throw error

    let notificationsSent = 0

    for (const user of users || []) {
      await step.run(`check-deadlines-${user.id}`, async () => {
        const upcoming = await getUpcomingDeadlines(user.id, 24)
        const overdue = await getOverdueTasks(user.id)

        for (const task of upcoming) {
          const dueDate = new Date(task.due_date as string)
          const hoursUntilDue = Math.round((dueDate.getTime() - Date.now()) / (1000 * 60 * 60))
          
          if (hoursUntilDue <= 24 && hoursUntilDue > 0) {
            const reminderKey = `deadline-${task.id}-${hoursUntilDue}h`
            
            const { data: existing } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', user.id)
              .eq('type', 'task_due')
              .like('data->>task_id', task.id)
              .like('data->>hours', String(hoursUntilDue))
              .single()

            if (!existing) {
              await createNotification(
                user.id,
                'task_due',
                `Task Due in ${hoursUntilDue} Hour${hoursUntilDue !== 1 ? 's' : ''}`,
                `"${task.title}" is due ${hoursUntilDue <= 1 ? 'soon' : `in ${hoursUntilDue} hours`}.`,
                { task_id: task.id, hours: hoursUntilDue }
              )
              notificationsSent++
            }
          }
        }

        for (const task of overdue) {
          const overdueKey = `overdue-${task.id}`
          
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', 'task_overdue')
            .like('data->>task_id', task.id)
            .single()

          if (!existing) {
            await createNotification(
              user.id,
              'task_overdue',
              'Task Overdue',
              `"${task.title}" was due ${new Date(task.due_date as string).toLocaleDateString()} and is now overdue.`,
              { task_id: task.id }
            )
            notificationsSent++
          }
        }
      })
    }

    return { notificationsSent }
  }
)
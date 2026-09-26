import { inngest } from './utils'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createNotification } from './utils'

export const recurringTasks = inngest.createFunction(
  { id: 'recurring-tasks', name: 'Process Recurring Tasks' },
  { cron: '0 6 * * *' },
  async ({ event, step }) => {
    const supabase = await createServerSupabaseClient()
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const { data: recurringTasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_recurring', true)
      .not('recurrence_rule', 'is', null)
      .lte('start_date', today.toISOString())

    if (error) throw error

    let created = 0

    for (const task of recurringTasks || []) {
      await step.run(`process-recurring-${task.id}`, async () => {
        const rule = task.recurrence_rule
        if (!rule) return

        const shouldCreate = evaluateRecurrenceRule(rule, task.start_date ? new Date(task.start_date) : today, today)
        
        if (shouldCreate) {
          const { data: newTask, error: createError } = await supabase
            .from('tasks')
            .insert({
              title: task.title,
              description: task.description,
              status: 'todo',
              priority: task.priority,
              project_id: task.project_id,
              assignee_id: task.assignee_id,
              reporter_id: task.reporter_id,
              due_date: calculateNextDueDate(rule, today),
              start_date: today.toISOString(),
              estimated_minutes: task.estimated_minutes,
              position: 0,
              is_recurring: false,
              parent_task_id: task.id,
            })
            .select()
            .single()

          if (createError) throw createError

          if (task.assignee_id) {
            await createNotification(
              task.assignee_id,
              'task_assigned',
              'New Recurring Task Created',
              `Recurring task "${task.title}" has been created for today.`,
              { task_id: newTask.id, parent_task_id: task.id }
            )
          }

          created++
        }
      })
    }

    return { processed: recurringTasks?.length || 0, created }
  }
)

function evaluateRecurrenceRule(rule: string, startDate: Date, currentDate: Date): boolean {
  const [type, ...params] = rule.split('|')
  
  switch (type) {
    case 'daily':
      return currentDate >= startDate
    case 'weekly':
      const weekDays = params[0]?.split(',').map(Number) || [startDate.getDay()]
      return currentDate >= startDate && weekDays.includes(currentDate.getDay())
    case 'monthly':
      const monthDay = parseInt(params[0] || String(startDate.getDate()))
      return currentDate >= startDate && currentDate.getDate() === monthDay
    case 'custom':
      const interval = parseInt(params[0] || '1')
      const unit = params[1] || 'days'
      const diffMs = currentDate.getTime() - startDate.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      
      if (unit === 'days') return diffDays % interval === 0
      if (unit === 'weeks') return Math.floor(diffDays / 7) % interval === 0
      if (unit === 'months') {
        const diffMonths = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                          currentDate.getMonth() - startDate.getMonth()
        return diffMonths % interval === 0
      }
      return false
    default:
      return false
  }
}

function calculateNextDueDate(rule: string, fromDate: Date): string | null {
  const [type, ...params] = rule.split('|')
  const nextDate = new Date(fromDate)
  
  switch (type) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1)
      break
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7)
      break
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1)
      break
    case 'custom':
      const interval = parseInt(params[0] || '1')
      const unit = params[1] || 'days'
      if (unit === 'days') nextDate.setDate(nextDate.getDate() + interval)
      else if (unit === 'weeks') nextDate.setDate(nextDate.getDate() + interval * 7)
      else if (unit === 'months') nextDate.setMonth(nextDate.getMonth() + interval)
      break
    default:
      return null
  }
  
  return nextDate.toISOString()
}
import { inngest } from './utils'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendEmail, generateWeeklyReportHtml, createNotification } from './utils'

export const weeklyReport = inngest.createFunction(
  { id: 'weekly-report', name: 'Weekly Report' },
  { cron: '0 9 * * 1' },
  async ({ event, step }) => {
    const supabase = await createServerSupabaseClient()
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('settings->weekly_report', true)

    if (error) throw error

    let sent = 0

    for (const user of users || []) {
      await step.run(`generate-report-${user.id}`, async () => {
        const stats = await getWeeklyStats(user.id, weekStart, weekEnd, supabase)
        const topProjects = await getTopProjects(user.id, weekStart, weekEnd, supabase)

        const html = generateWeeklyReportHtml(stats, topProjects, user.full_name || 'there')

        await sendEmail(
          user.email,
          `Weekly Report - ${weekStart.toLocaleDateString()} to ${weekEnd.toLocaleDateString()}`,
          html
        )

        await createNotification(
          user.id,
          'digest',
          'Weekly Report Sent',
          'Your weekly productivity report has been sent to your email.'
        )

        sent++
      })
    }

    return { sent }
  }
)

async function getWeeklyStats(userId: string, weekStart: Date, weekEnd: Date, supabase: any) {
  const [completedResult, createdResult, overdueResult, hoursResult] = await Promise.all([
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assignee_id', userId)
      .eq('status', 'done')
      .gte('completed_at', weekStart.toISOString())
      .lte('completed_at', weekEnd.toISOString()),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('reporter_id', userId)
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString()),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assignee_id', userId)
      .in('status', ['backlog', 'todo', 'in_progress', 'review'])
      .lt('due_date', weekStart.toISOString()),
    supabase
      .from('tasks')
      .select('actual_minutes')
      .eq('assignee_id', userId)
      .gte('updated_at', weekStart.toISOString())
      .lte('updated_at', weekEnd.toISOString()),
  ])

  const totalMinutes = (hoursResult.data || []).reduce((sum: number, t: any) => sum + (t.actual_minutes || 0), 0)

  return {
    completed: completedResult.count || 0,
    created: createdResult.count || 0,
    overdue: overdueResult.count || 0,
    totalHours: Math.round(totalMinutes / 60),
  }
}

async function getTopProjects(userId: string, weekStart: Date, weekEnd: Date, supabase: any) {
  const { data, error } = await supabase
    .from('tasks')
    .select('project_id, projects(name, color)')
    .eq('assignee_id', userId)
    .eq('status', 'done')
    .gte('completed_at', weekStart.toISOString())
    .lte('completed_at', weekEnd.toISOString())
    .not('project_id', 'is', null)

  if (error) return []

  const projectCounts = new Map<string, { name: string; color: string; count: number }>()

  for (const task of data || []) {
    if (task.projects) {
      const key = task.project_id
      const existing = projectCounts.get(key) || { name: task.projects.name, color: task.projects.color, count: 0 }
      existing.count++
      projectCounts.set(key, existing)
    }
  }

  return Array.from(projectCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(p => ({ name: p.name, completed: p.count, color: p.color }))
}
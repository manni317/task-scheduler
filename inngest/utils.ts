import { Inngest } from 'inngest'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatDate, formatRelativeTime, formatTime } from '@/lib/utils'

export const inngest = new Inngest({
  id: 'muze-satwik-task-manager',
  name: 'Muze Satwik Task Manager',
  credentials: {
    signingKey: process.env.INNGEST_SIGNING_KEY!,
    eventKey: process.env.INNGEST_EVENT_KEY!,
  },
})

export async function getUserTasks(userId: string, status?: string[]) {
  const supabase = await createServerSupabaseClient()
  let query = supabase
    .from('tasks')
    .select('*, projects(name, color)')
    .eq('assignee_id', userId)
    .order('due_date', { ascending: true })

  if (status && status.length > 0) {
    query = query.in('status', status as any[])
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getUpcomingDeadlines(userId: string, hours = 24) {
  const supabase = await createServerSupabaseClient()
  const now = new Date()
  const future = new Date(now.getTime() + hours * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from('tasks')
    .select('*, projects(name, color)')
    .eq('assignee_id', userId)
    .in('status', ['backlog', 'todo', 'in_progress', 'review'])
    .lte('due_date', future.toISOString())
    .gte('due_date', now.toISOString())
    .order('due_date', { ascending: true })

  if (error) throw error
  return data
}

export async function getOverdueTasks(userId: string) {
  const supabase = await createServerSupabaseClient()
  const now = new Date()

  const { data, error } = await supabase
    .from('tasks')
    .select('*, projects(name, color)')
    .eq('assignee_id', userId)
    .in('status', ['backlog', 'todo', 'in_progress', 'review'])
    .lt('due_date', now.toISOString())
    .order('due_date', { ascending: true })

  if (error) throw error
  return data
}

export async function getUserCalendarEvents(userId: string, start: Date, end: Date) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', start.toISOString())
    .lte('start_time', end.toISOString())
    .order('start_time', { ascending: true })

  if (error) throw error
  return data
}

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: Record<string, unknown>
) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type: type as any,
    title,
    message,
    data: (data || null) as any,
  })
  if (error) throw error
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured, skipping email')
    return { success: false, error: 'Email not configured' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Muze Satwik <noreply@muze-satwik.com>',
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to send email')
    }

    return { success: true, data: await response.json() }
  } catch (error) {
    console.error('Email send failed:', error)
    return { success: false, error }
  }
}

export function generateDailyDigestHtml(tasks: any[], events: any[], userName: string): string {
  const today = new Date()
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

  const todaysTasks = tasks.filter(t => {
    if (!t.due_date) return false
    const due = new Date(t.due_date)
    return due >= today && due < tomorrow
  })

  const upcomingTasks = tasks.filter(t => {
    if (!t.due_date) return false
    const due = new Date(t.due_date)
    return due >= tomorrow
  }).slice(0, 5)

  const todaysEvents = events.filter(e => {
    const start = new Date(e.start_time)
    return start >= today && start < tomorrow
  })

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Good morning, ${userName}! ☀️</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Your daily digest for ${formatDate(today)}</p>
      </div>
      
      <div style="background: #fafafa; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #eee; border-top: none;">
        ${todaysTasks.length > 0 ? `
        <section style="margin-bottom: 30px;">
          <h2 style="color: #667eea; font-size: 18px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
            <span style="background: #667eea; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${todaysTasks.length}</span>
            Tasks Due Today
          </h2>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${todaysTasks.map(task => `
              <li style="background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; border-left: 4px solid ${task.projects?.color || '#667eea'};">
                <strong>${task.title}</strong>
                ${task.projects ? `<span style="color: #666; font-size: 14px; margin-left: 10px;">${task.projects.name}</span>` : ''}
                <div style="color: #999; font-size: 12px; margin-top: 5px;">Due: ${formatRelativeTime(task.due_date)}</div>
              </li>
            `).join('')}
          </ul>
        </section>
        ` : ''}

        ${todaysEvents.length > 0 ? `
        <section style="margin-bottom: 30px;">
          <h2 style="color: #764ba2; font-size: 18px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
            <span style="background: #764ba2; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${todaysEvents.length}</span>
            Calendar Events
          </h2>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${todaysEvents.map(event => `
              <li style="background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; border-left: 4px solid #764ba2;">
                <strong>${event.title}</strong>
                <div style="color: #666; font-size: 14px; margin-top: 5px;">
                  ${formatTime(event.start_time)} - ${formatTime(event.end_time)}
                  ${event.location ? ` • ${event.location}` : ''}
                </div>
              </li>
            `).join('')}
          </ul>
        </section>
        ` : ''}

        ${upcomingTasks.length > 0 ? `
        <section>
          <h2 style="color: #333; font-size: 18px; margin-bottom: 15px;">Upcoming This Week</h2>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${upcomingTasks.map(task => `
              <li style="background: white; padding: 12px; margin-bottom: 8px; border-radius: 8px; border: 1px solid #eee;">
                <strong>${task.title}</strong>
                ${task.projects ? `<span style="color: #666; font-size: 14px; margin-left: 10px;">${task.projects.name}</span>` : ''}
                <div style="color: #999; font-size: 12px; margin-top: 5px;">Due: ${formatRelativeTime(task.due_date)}</div>
              </li>
            `).join('')}
          </ul>
        </section>
        ` : ''}

        ${todaysTasks.length === 0 && todaysEvents.length === 0 && upcomingTasks.length === 0 ? `
        <div style="text-align: center; padding: 40px; color: #999;">
          <p style="font-size: 18px;">🎉 No tasks or events scheduled for today!</p>
          <p>Enwell deserved break.</p>
        </div>
        ` : ''}
      </div>

      <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p>You received this because you enabled daily digests in your settings.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color: #667eea;">Manage preferences</a></p>
      </div>
    </body>
    </html>
  `
}

export function generateWeeklyReportHtml(
  stats: { completed: number; created: number; overdue: number; totalHours: number },
  topProjects: { name: string; completed: number; color: string }[],
  userName: string
): string {
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Weekly Report 📊</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">${userName}'s week of ${formatDate(weekStart)} - ${formatDate(weekEnd)}</p>
      </div>
      
      <div style="background: #fafafa; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #eee; border-top: none;">
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px;">
          <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; border-top: 4px solid #22c55e;">
            <div style="font-size: 32px; font-weight: bold; color: #22c55e;">${stats.completed}</div>
            <div style="color: #666; font-size: 14px;">Tasks Completed</div>
          </div>
          <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; border-top: 4px solid #3b82f6;">
            <div style="font-size: 32px; font-weight: bold; color: #3b82f6;">${stats.created}</div>
            <div style="color: #666; font-size: 14px;">Tasks Created</div>
          </div>
          <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; border-top: 4px solid #ef4444;">
            <div style="font-size: 32px; font-weight: bold; color: #ef4444;">${stats.overdue}</div>
            <div style="color: #666; font-size: 14px;">Overdue Tasks</div>
          </div>
          <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; border-top: 4px solid #f59e0b;">
            <div style="font-size: 32px; font-weight: bold; color: #f59e0b;">${stats.totalHours}h</div>
            <div style="color: #666; font-size: 14px;">Hours Tracked</div>
          </div>
        </div>

        ${topProjects.length > 0 ? `
        <section>
          <h2 style="color: #333; font-size: 18px; margin-bottom: 15px;">Top Projects</h2>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${topProjects.map((project, index) => `
              <li style="background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; border-left: 4px solid ${project.color}; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="background: ${project.color}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">#${index + 1}</span>
                  <strong>${project.name}</strong>
                </div>
                <div style="color: #666;">${project.completed} completed</div>
              </li>
            `).join('')}
          </ul>
        </section>
        ` : ''}
      </div>

      <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="color: #667eea;">View full dashboard</a></p>
      </div>
    </body>
    </html>
  `
}
import { inngest } from './utils'
import { getUserTasks, createNotification, sendEmail, generateDailyDigestHtml } from './utils'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dailyDigest = inngest.createFunction(
  { id: 'daily-digest', name: 'Daily Digest' },
  { cron: '0 8 * * *' },
  async ({ event, step }) => {
    const supabase = await createServerSupabaseClient()
    
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('settings->daily_digest', true)

    if (error) throw error

    for (const user of users || []) {
      await step.run(`send-digest-${user.id}`, async () => {
        const tasks = await getUserTasks(user.id)
        const today = new Date()
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
        
        const { data: events } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', user.id)
          .gte('start_time', today.toISOString())
          .lt('start_time', tomorrow.toISOString())
          .order('start_time', { ascending: true })

        const html = generateDailyDigestHtml(tasks || [], events || [], user.full_name || 'there')
        
        await sendEmail(user.email, `Your Daily Digest - ${today.toLocaleDateString()}`, html)
        
        await createNotification(user.id, 'digest', 'Daily Digest Sent', 'Your daily digest has been sent to your email.')
      })
    }

    return { sent: users?.length || 0 }
  }
)
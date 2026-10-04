import { inngest } from '@/inngest/utils'
import { dailyDigest } from '@/inngest/daily-digest'
import { deadlineReminders } from '@/inngest/deadline-reminders'
import { gcalSync } from '@/inngest/gcal-sync'
import { recurringTasks } from '@/inngest/recurring-tasks'
import { webhookDispatcher } from '@/inngest/webhook-dispatcher'
import { weeklyReport } from '@/inngest/weekly-report'
import { serve } from 'inngest/next'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    dailyDigest,
    deadlineReminders,
    gcalSync,
    recurringTasks,
    webhookDispatcher,
    weeklyReport,
  ],
})
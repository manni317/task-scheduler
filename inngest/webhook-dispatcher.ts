import { inngest } from './utils'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createNotification } from './utils'

const MAX_RETRIES = 5
const BASE_DELAY_MS = 1000

export const webhookDispatcher = inngest.createFunction(
  { id: 'webhook-dispatcher', name: 'Webhook Dispatcher with Retry & DLQ' },
  { event: 'webhook/received' },
  async ({ event, step }) => {
    const { source, eventType, payload, webhookId } = event.data

    const supabase = await createServerSupabaseClient()

    await step.run('record-webhook', async () => {
      const { error } = await supabase
        .from('webhook_events')
        .insert({
          id: webhookId,
          source,
          event_type: eventType,
          payload,
          status: 'processing',
        })
      if (error) throw error
    })

    let attempt = 0
    let success = false
    let lastError: string | null = null

    while (attempt < MAX_RETRIES && !success) {
      attempt++
      
      await step.run(`attempt-${attempt}`, async () => {
        try {
          await dispatchWebhook(source, eventType, payload)
          
          await supabase
            .from('webhook_events')
            .update({
              status: 'completed',
              processed_at: new Date().toISOString(),
              retry_count: attempt - 1,
            })
            .eq('id', webhookId)
          
          success = true
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Unknown error'
          
          const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1)
          await new Promise(resolve => setTimeout(resolve, delay))
          
          await supabase
            .from('webhook_events')
            .update({
              status: attempt >= MAX_RETRIES ? 'dead_letter' : 'pending',
              retry_count: attempt,
              last_attempt_at: new Date().toISOString(),
            })
            .eq('id', webhookId)
        }
      })
    }

    if (!success) {
      await step.run('notify-dlq', async () => {
        await createNotification(
          'system',
          'webhook_dlq',
          'Webhook Moved to Dead Letter Queue',
          `Webhook ${webhookId} (${source}/${eventType}) failed after ${MAX_RETRIES} attempts. Last error: ${lastError}`,
          { webhookId, source, eventType, error: lastError }
        )
      })
    }

    return { success, attempts: attempt, webhookId }
  }
)

async function dispatchWebhook(source: string, eventType: string, payload: Record<string, unknown>) {
  const handlers: Record<string, (eventType: string, payload: Record<string, unknown>) => Promise<void>> = {
    stripe: handleStripeWebhook,
    slack: handleSlackWebhook,
    whatsapp: handleWhatsAppWebhook,
    google_calendar: handleGoogleCalendarWebhook,
  }

  const handler = handlers[source]
  if (!handler) {
    throw new Error(`No handler for source: ${source}`)
  }

  await handler(eventType, payload)
}

async function handleStripeWebhook(eventType: string, payload: Record<string, unknown>) {
  console.log('Processing Stripe webhook:', eventType)
  // Implement Stripe-specific handling
  // e.g., subscription.created, invoice.payment_failed, etc.
}

async function handleSlackWebhook(eventType: string, payload: Record<string, unknown>) {
  console.log('Processing Slack webhook:', eventType)
  // Implement Slack-specific handling
  // e.g., message.channels, reaction.added, etc.
}

async function handleWhatsAppWebhook(eventType: string, payload: Record<string, unknown>) {
  console.log('Processing WhatsApp webhook:', eventType)
  // Implement WhatsApp-specific handling
  // e.g., message.received, message.sent, etc.
}

async function handleGoogleCalendarWebhook(eventType: string, payload: Record<string, unknown>) {
  console.log('Processing Google Calendar webhook:', eventType)
  // Implement Google Calendar-specific handling
  // e.g., events.insert, events.update, events.delete, etc.
}

export async function enqueueWebhook(source: string, eventType: string, payload: Record<string, unknown>) {
  const { inngest } = await import('./utils')
  const webhookId = crypto.randomUUID()
  
  await inngest.send({
    name: 'webhook/received',
    data: { source, eventType, payload, webhookId },
  })
  
  return webhookId
}
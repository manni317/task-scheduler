import { z } from 'zod'

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().min(1).max(255).nullable(),
  avatar_url: z.string().url().nullable(),
  timezone: z.string().default('UTC'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  icon: z.string().nullable(),
  owner_id: z.string().uuid(),
  is_archived: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().nullable(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  project_id: z.string().uuid().nullable(),
  assignee_id: z.string().uuid().nullable(),
  reporter_id: z.string().uuid(),
  due_date: z.string().datetime().nullable(),
  start_date: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
  estimated_minutes: z.number().int().nonnegative().nullable(),
  actual_minutes: z.number().int().nonnegative().default(0),
  position: z.number().int().default(0),
  is_recurring: z.boolean().default(false),
  recurrence_rule: z.string().nullable(),
  parent_task_id: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const taskCreateSchema = taskSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  completed_at: true,
  actual_minutes: true,
  position: true,
})

export const taskUpdateSchema = taskCreateSchema.partial()

export const tagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  created_at: z.string().datetime(),
})

export const taskTagSchema = z.object({
  task_id: z.string().uuid(),
  tag_id: z.string().uuid(),
})

export const commentSchema = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid(),
  user_id: z.string().uuid(),
  content: z.string().min(1),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const attachmentSchema = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid(),
  file_name: z.string().min(1),
  file_url: z.string().url(),
  file_size: z.number().int().positive(),
  mime_type: z.string(),
  uploaded_by: z.string().uuid(),
  created_at: z.string().datetime(),
})

export const calendarEventSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  google_event_id: z.string().nullable(),
  title: z.string().min(1).max(500),
  description: z.string().nullable(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  all_day: z.boolean().default(false),
  location: z.string().nullable(),
  meeting_link: z.string().url().nullable(),
  status: z.enum(['confirmed', 'tentative', 'cancelled']),
  sync_status: z.enum(['synced', 'pending', 'failed', 'conflict']),
  last_synced_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const notificationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.enum(['task_assigned', 'task_due', 'task_overdue', 'comment', 'mention', 'calendar_event', 'digest']),
  title: z.string().min(1).max(255),
  message: z.string(),
  data: z.record(z.unknown()).nullable(),
  is_read: z.boolean().default(false),
  created_at: z.string().datetime(),
})

export const settingsSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  email_notifications: z.boolean().default(true),
  push_notifications: z.boolean().default(true),
  daily_digest: z.boolean().default(true),
  weekly_report: z.boolean().default(true),
  deadline_reminders: z.boolean().default(true),
  timezone: z.string().default('UTC'),
  working_hours_start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  working_hours_end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const googleCalendarSyncSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  google_calendar_id: z.string(),
  access_token: z.string(),
  refresh_token: z.string(),
  token_expires_at: z.string().datetime(),
  sync_enabled: z.boolean().default(true),
  last_synced_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const webhookEventSchema = z.object({
  id: z.string().uuid(),
  source: z.enum(['stripe', 'slack', 'whatsapp', 'google_calendar']),
  event_type: z.string(),
  payload: z.record(z.unknown()),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'dead_letter']),
  retry_count: z.number().int().default(0),
  last_attempt_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  processed_at: z.string().datetime().nullable(),
})

export type User = z.infer<typeof userSchema>
export type Project = z.infer<typeof projectSchema>
export type Task = z.infer<typeof taskSchema>
export type TaskCreate = z.infer<typeof taskCreateSchema>
export type TaskUpdate = z.infer<typeof taskUpdateSchema>
export type Tag = z.infer<typeof tagSchema>
export type TaskTag = z.infer<typeof taskTagSchema>
export type Comment = z.infer<typeof commentSchema>
export type Attachment = z.infer<typeof attachmentSchema>
export type CalendarEvent = z.infer<typeof calendarEventSchema>
export type Notification = z.infer<typeof notificationSchema>
export type Settings = z.infer<typeof settingsSchema>
export type GoogleCalendarSync = z.infer<typeof googleCalendarSyncSchema>
export type WebhookEvent = z.infer<typeof webhookEventSchema>
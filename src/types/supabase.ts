export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          timezone: string
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          timezone?: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          timezone?: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          color: string
          icon: string | null
          owner_id: string
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          color: string
          icon?: string | null
          owner_id: string
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          color?: string
          icon?: string | null
          owner_id?: string
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'projects_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          project_id: string | null
          assignee_id: string | null
          reporter_id: string
          due_date: string | null
          start_date: string | null
          completed_at: string | null
          estimated_minutes: number | null
          actual_minutes: number
          position: number
          is_recurring: boolean
          recurrence_rule: string | null
          parent_task_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          project_id?: string | null
          assignee_id?: string | null
          reporter_id: string
          due_date?: string | null
          start_date?: string | null
          completed_at?: string | null
          estimated_minutes?: number | null
          actual_minutes?: number
          position?: number
          is_recurring?: boolean
          recurrence_rule?: string | null
          parent_task_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          project_id?: string | null
          assignee_id?: string | null
          reporter_id?: string
          due_date?: string | null
          start_date?: string | null
          completed_at?: string | null
          estimated_minutes?: number | null
          actual_minutes?: number
          position?: number
          is_recurring?: boolean
          recurrence_rule?: string | null
          parent_task_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_assignee_id_fkey'
            columns: ['assignee_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_reporter_id_fkey'
            columns: ['reporter_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_parent_task_id_fkey'
            columns: ['parent_task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          }
        ]
      }
      tags: {
        Row: {
          id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          color: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          created_at?: string
        }
        Relationships: []
      }
      task_tags: {
        Row: {
          task_id: string
          tag_id: string
        }
        Insert: {
          task_id: string
          tag_id: string
        }
        Update: {
          task_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'task_tags_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_tags_tag_id_fkey'
            columns: ['tag_id']
            isOneToOne: false
            referencedRelation: 'tags'
            referencedColumns: ['id']
          }
        ]
      }
      comments: {
        Row: {
          id: string
          task_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comments_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      attachments: {
        Row: {
          id: string
          task_id: string
          file_name: string
          file_url: string
          file_size: number
          mime_type: string
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          file_name: string
          file_url: string
          file_size: number
          mime_type: string
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          file_name?: string
          file_url?: string
          file_size?: number
          mime_type?: string
          uploaded_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'attachments_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'attachments_uploaded_by_fkey'
            columns: ['uploaded_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      calendar_events: {
        Row: {
          id: string
          user_id: string
          google_event_id: string | null
          title: string
          description: string | null
          start_time: string
          end_time: string
          all_day: boolean
          location: string | null
          meeting_link: string | null
          status: 'confirmed' | 'tentative' | 'cancelled'
          sync_status: 'synced' | 'pending' | 'failed' | 'conflict'
          last_synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          google_event_id?: string | null
          title: string
          description?: string | null
          start_time: string
          end_time: string
          all_day?: boolean
          location?: string | null
          meeting_link?: string | null
          status?: 'confirmed' | 'tentative' | 'cancelled'
          sync_status?: 'synced' | 'pending' | 'failed' | 'conflict'
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          google_event_id?: string | null
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          all_day?: boolean
          location?: string | null
          meeting_link?: string | null
          status?: 'confirmed' | 'tentative' | 'cancelled'
          sync_status?: 'synced' | 'pending' | 'failed' | 'conflict'
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'calendar_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'task_assigned' | 'task_due' | 'task_overdue' | 'comment' | 'mention' | 'calendar_event' | 'digest'
          title: string
          message: string
          data: Json | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'task_assigned' | 'task_due' | 'task_overdue' | 'comment' | 'mention' | 'calendar_event' | 'digest'
          title: string
          message: string
          data?: Json | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'task_assigned' | 'task_due' | 'task_overdue' | 'comment' | 'mention' | 'calendar_event' | 'digest'
          title?: string
          message?: string
          data?: Json | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      settings: {
        Row: {
          id: string
          user_id: string
          email_notifications: boolean
          push_notifications: boolean
          daily_digest: boolean
          weekly_report: boolean
          deadline_reminders: boolean
          timezone: string
          working_hours_start: string
          working_hours_end: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_notifications?: boolean
          push_notifications?: boolean
          daily_digest?: boolean
          weekly_report?: boolean
          deadline_reminders?: boolean
          timezone?: string
          working_hours_start: string
          working_hours_end: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_notifications?: boolean
          push_notifications?: boolean
          daily_digest?: boolean
          weekly_report?: boolean
          deadline_reminders?: boolean
          timezone?: string
          working_hours_start?: string
          working_hours_end?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'settings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      google_calendar_sync: {
        Row: {
          id: string
          user_id: string
          google_calendar_id: string
          access_token: string
          refresh_token: string
          token_expires_at: string
          sync_enabled: boolean
          last_synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          google_calendar_id: string
          access_token: string
          refresh_token: string
          token_expires_at: string
          sync_enabled?: boolean
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          google_calendar_id?: string
          access_token?: string
          refresh_token?: string
          token_expires_at?: string
          sync_enabled?: boolean
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'google_calendar_sync_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      webhook_events: {
        Row: {
          id: string
          source: 'stripe' | 'slack' | 'whatsapp' | 'google_calendar'
          event_type: string
          payload: Json
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter'
          retry_count: number
          last_attempt_at: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          source: 'stripe' | 'slack' | 'whatsapp' | 'google_calendar'
          event_type: string
          payload: Json
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter'
          retry_count?: number
          last_attempt_at?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          source?: 'stripe' | 'slack' | 'whatsapp' | 'google_calendar'
          event_type?: string
          payload?: Json
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter'
          retry_count?: number
          last_attempt_at?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      task_status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled'
      task_priority: 'low' | 'medium' | 'high' | 'urgent'
      event_status: 'confirmed' | 'tentative' | 'cancelled'
      sync_status: 'synced' | 'pending' | 'failed' | 'conflict'
      notification_type: 'task_assigned' | 'task_due' | 'task_overdue' | 'comment' | 'mention' | 'calendar_event' | 'digest'
      webhook_source: 'stripe' | 'slack' | 'whatsapp' | 'google_calendar'
      webhook_status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
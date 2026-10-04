export interface Profile {
  id: string
  user_id: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
  role: 'admin' | 'manager' | 'employee' | 'viewer'
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  key: string
  color: string
  owner_id: string
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  created_at: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string | null
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee_id: string | null
  reporter_id: string
  due_date: string | null
  position: number
  created_at: string
  updated_at: string
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'task_assigned' | 'task_updated' | 'comment_added' | 'project_invite' | 'mention'
  title: string
  message: string
  data: Record<string, any> | null
  read: boolean
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
      }
      projects: {
        Row: Project
        Insert: Omit<Project, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>
      }
      project_members: {
        Row: ProjectMember
        Insert: Omit<ProjectMember, 'created_at'>
        Update: Partial<Omit<ProjectMember, 'id' | 'created_at'>>
      }
      tasks: {
        Row: Task
        Insert: Omit<Task, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>
      }
      task_comments: {
        Row: TaskComment
        Insert: Omit<TaskComment, 'created_at' | 'updated_at'>
        Update: Partial<Omit<TaskComment, 'id' | 'created_at' | 'updated_at'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'created_at'>
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'manager' | 'employee' | 'viewer'
      project_role: 'owner' | 'admin' | 'member' | 'viewer'
      task_status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
      task_priority: 'low' | 'medium' | 'high' | 'urgent'
      notification_type: 'task_assigned' | 'task_updated' | 'comment_added' | 'project_invite' | 'mention'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
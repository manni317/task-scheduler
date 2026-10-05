export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'admin' | 'manager' | 'employee' | 'viewer'
}

export interface Organization {
  id: string
  name: string
  description?: string
  createdAt: Date
  members?: User[]
}

export interface ChecklistItem {
  id: string
  title: string
  completed: boolean
  order: number
}

export interface Comment {
  id: string
  taskId: string
  userId: string
  user: User
  content: string
  createdAt: Date
  updatedAt?: Date
}

export interface Attachment {
  id: string
  name: string
  url: string
  type: string
  size: number
  uploadedBy: string
  uploadedAt: Date
}

export interface TimeEntry {
  id: string
  taskId: string
  userId: string
  user: User
  startTime: Date
  endTime?: Date
  duration?: number
  description?: string
}

export interface ActivityLog {
  id: string
  taskId: string
  userId: string
  user: User
  action: string
  field?: string
  oldValue?: string
  newValue?: string
  createdAt: Date
}

export interface TaskDependency {
  id: string
  taskId: string
  dependsOnTaskId: string
  type: 'blocks' | 'is blocked by' | 'relates to'
}

export interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  projectId: string
  assigneeId?: string
  assignee?: User
  reporterId: string
  reporter: User
  dueDate?: Date
  startDate?: Date
  estimatedHours?: number
  actualHours?: number
  tags: string[]
  checklistItems: ChecklistItem[]
  comments: Comment[]
  commentsCount: number
  attachments: Attachment[]
  timeEntries: TimeEntry[]
  dependencies: TaskDependency[]
  activityLog: ActivityLog[]
  order: number
  isCompleted: boolean
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
  latestUpdate?: {
    content?: string
    user?: string
    createdAt?: string
    audioUrl?: string | null
  }
  rejectionReason?: string
}

export interface Project {
  id: string
  name: string
  description?: string
  key: string
  color: string
  icon?: string
  ownerId: string
  owner: User
  orgId?: string
  organization?: Organization
  members: User[]
  tasks: Task[]
  createdAt: Date
  updatedAt: Date
  isArchived: boolean
}

export interface DashboardStats {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
  tasksByStatus: Record<string, number>
  tasksByPriority: Record<string, number>
  tasksByAssignee: Record<string, number>
  completionRate: number
  avgCompletionTime: number
}

export interface TeamVelocity {
  sprint: string
  completed: number
  committed: number
  velocity: number
}

export interface EmployeePerformance {
  userId: string
  user: User
  tasksAssigned: number
  tasksCompleted: number
  tasksOverdue: number
  avgCompletionTime: number
  completionRate: number
}

export type TaskStatus = Task['status']
export type TaskPriority = Task['priority']
export type ProjectRole = User['role']
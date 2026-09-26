
import { StatsCards } from '@/components/dashboard/StatsCards'
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines'
import { TeamVelocityChart } from '@/components/dashboard/TeamVelocityChart'
import { OverdueTable } from '@/components/dashboard/OverdueTable'
import { EmployeePerformanceTable } from '@/components/dashboard/EmployeePerformanceTable'
import { Task, User } from '@/types/task'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const mockUsers: User[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', avatar: '', role: 'admin' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', avatar: '', role: 'member' },
  { id: '3', name: 'Carol Williams', email: 'carol@example.com', avatar: '', role: 'member' },
  { id: '4', name: 'David Brown', email: 'david@example.com', avatar: '', role: 'member' },
]

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Prepare Monthly Client Report',
    description: 'Review financials and compile the monthly report for clients',
    status: 'in_progress',
    priority: 'high',
    projectId: '1',
    assigneeId: '1',
    assignee: mockUsers[0],
    reporterId: '2',
    reporter: mockUsers[1],
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    estimatedHours: 4,
    tags: ['reporting', 'finance'],
    checklistItems: [
      { id: '1', title: 'Collect data', completed: true, order: 0 },
      { id: '2', title: 'Draft report', completed: false, order: 1 },
      { id: '3', title: 'Manager review', completed: false, order: 2 },
    ],
    comments: [],
    commentsCount: 0,
    attachments: [],
    timeEntries: [],
    dependencies: [],
    activityLog: [],
    order: 0,
    isCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    title: 'Follow up with HR on onboarding',
    description: 'Ensure new employees have their equipment and access',
    status: 'review',
    priority: 'urgent',
    projectId: '1',
    assigneeId: '2',
    assignee: mockUsers[1],
    reporterId: '1',
    reporter: mockUsers[0],
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    estimatedHours: 2,
    tags: ['hr', 'onboarding'],
    checklistItems: [],
    comments: [],
    commentsCount: 0,
    attachments: [],
    timeEntries: [],
    dependencies: [],
    activityLog: [],
    order: 1,
    isCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    title: 'Organize vendor contracts',
    description: 'Review and sign the pending vendor agreements',
    status: 'todo',
    priority: 'medium',
    projectId: '1',
    assigneeId: '3',
    assignee: mockUsers[2],
    reporterId: '1',
    reporter: mockUsers[0],
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    estimatedHours: 3,
    tags: ['legal', 'admin'],
    checklistItems: [],
    comments: [],
    commentsCount: 0,
    attachments: [],
    timeEntries: [],
    dependencies: [],
    activityLog: [],
    order: 2,
    isCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const mockVelocity = [
  { sprint: 'Sprint 1', completed: 34, committed: 40, velocity: 34 },
  { sprint: 'Sprint 2', completed: 38, committed: 38, velocity: 38 },
  { sprint: 'Sprint 3', completed: 42, committed: 45, velocity: 42 },
  { sprint: 'Sprint 4', completed: 36, committed: 40, velocity: 36 },
  { sprint: 'Sprint 5', completed: 45, committed: 45, velocity: 45 },
]

const mockPerformance = [
  { userId: '1', user: mockUsers[0], tasksAssigned: 12, tasksCompleted: 10, tasksOverdue: 1, avgCompletionTime: 4.5, completionRate: 83.3 },
  { userId: '2', user: mockUsers[1], tasksAssigned: 8, tasksCompleted: 6, tasksOverdue: 2, avgCompletionTime: 6.2, completionRate: 75 },
  { userId: '3', user: mockUsers[2], tasksAssigned: 10, tasksCompleted: 9, tasksOverdue: 0, avgCompletionTime: 3.8, completionRate: 90 },
  { userId: '4', user: mockUsers[3], tasksAssigned: 6, tasksCompleted: 3, tasksOverdue: 3, avgCompletionTime: 8.1, completionRate: 50 },
]

export default async function DashboardPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  
  // Fetch real tasks from database
  let dbTasks: Task[] = []
  
  if (user) {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
      
    if (data) {
      dbTasks = data.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description || '',
        status: t.status,
        priority: t.priority === 1 ? 'high' : t.priority === 2 ? 'medium' : 'low',
        projectId: '1',
        assigneeId: t.user_id,
        reporterId: t.user_id,
        dueDate: t.due_date ? new Date(t.due_date) : undefined,
        estimatedHours: t.time_spent || 0,
        tags: [],
        checklistItems: [],
        comments: [],
        commentsCount: 0,
        attachments: [],
        timeEntries: [],
        dependencies: [],
        activityLog: [],
        order: 0,
        isCompleted: t.status === 'done',
        createdAt: new Date(t.created_at),
        updatedAt: new Date(t.updated_at)
      })) as Task[]
    }
  }

  // Use real tasks if they exist, otherwise fallback to mock data just so the dashboard doesn't look empty immediately
  const displayTasks = dbTasks.length > 0 ? dbTasks : mockTasks
  const stats = {
    totalTasks: 24,
    completedTasks: 18,
    inProgressTasks: 4,
    overdueTasks: 3,
    completionRate: 75,
    avgCompletionTime: 5.2,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s what&apos;s happening with your projects.</p>
        </div>
      </div>

      <StatsCards stats={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingDeadlines tasks={displayTasks} users={mockUsers} />
        <TeamVelocityChart data={mockVelocity} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OverdueTable tasks={displayTasks} users={mockUsers} />
        <EmployeePerformanceTable data={mockPerformance} users={mockUsers} />
      </div>
    </div>
  )
}
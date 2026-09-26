'use client'

import { useParams } from 'next/navigation'
import { TaskDetail } from '@/components/task/TaskDetail'
import { Task, User } from '@/types/task'

const mockUsers: User[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', avatar: '', role: 'admin' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', avatar: '', role: 'member' },
  { id: '3', name: 'Carol Williams', email: 'carol@example.com', avatar: '', role: 'member' },
]

const mockTask: Task = {
  id: '1',
  title: 'Design new dashboard layout',
  description: 'Create wireframes and mockups for the new dashboard. Need to consider responsive design for mobile, tablet, and desktop.',
  status: 'in_progress',
  priority: 'high',
  projectId: '1',
  assigneeId: '1',
  assignee: mockUsers[0],
  reporterId: '2',
  reporter: mockUsers[1],
  dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  estimatedHours: 8,
  actualHours: 4.5,
  tags: ['design', 'ui', 'dashboard'],
  checklistItems: [
    { id: '1', title: 'Wireframes', completed: true, order: 0 },
    { id: '2', title: 'Mockups', completed: false, order: 1 },
    { id: '3', title: 'Review with team', completed: false, order: 2 },
    { id: '4', title: 'Final revisions', completed: false, order: 3 },
  ],
  comments: [
    {
      id: '1',
      taskId: '1',
      userId: '2',
      user: mockUsers[1],
      content: 'Started working on the wireframes. Will share initial concepts by EOD.',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: '2',
      taskId: '1',
      userId: '1',
      user: mockUsers[0],
      content: 'Wireframes look good! Moving to mockups now.',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  ],
  commentsCount: 2,
  attachments: [],
  timeEntries: [
    {
      id: '1',
      taskId: '1',
      userId: '1',
      user: mockUsers[0],
      startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      duration: 120,
      description: 'Created initial wireframes',
    },
    {
      id: '2',
      taskId: '1',
      userId: '1',
      user: mockUsers[0],
      startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 2.5 * 60 * 60 * 1000),
      duration: 150,
      description: 'Designed mockups',
    },
  ],
  dependencies: [],
  activityLog: [
    {
      id: '1',
      taskId: '1',
      userId: '1',
      user: mockUsers[0],
      action: 'created',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: '2',
      taskId: '1',
      userId: '1',
      user: mockUsers[0],
      action: 'updated',
      field: 'status',
      oldValue: 'todo',
      newValue: 'in_progress',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ],
  order: 0,
  isCompleted: false,
  createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
}

export default function TaskDetailPage() {
  const params = useParams()
  const taskId = params.id as string

  return (
    <div className="h-full flex flex-col">
          <TaskDetail
            task={mockTask}
            users={mockUsers}
            projects={[{ id: '1', name: 'Website Redesign', key: 'WEB' }]}
            onUpdate={async (data) => console.log('Update task:', data)}
            onDelete={async (id) => console.log('Delete task:', id)}
            onAddComment={async (taskId, content) => console.log('Add comment:', content)}
            onAddTimeEntry={async (taskId, entry) => console.log('Add time entry:', entry)}
            onToggleChecklist={async (taskId, itemId) => console.log('Toggle checklist:', itemId)}
          />
        </div>
  )
}
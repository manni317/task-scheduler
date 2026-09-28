'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskCard } from './TaskCard'
import { Task, TaskStatus } from '@/types/task'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { TaskForm } from './TaskForm'
import { User } from '@/types/task'

interface KanbanColumnProps {
  status: TaskStatus
  title: string
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onTaskDragStart: (event: React.DragEvent, task: Task) => void
  onAddTask: (status: TaskStatus) => void
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => void
}

function KanbanColumn({ status, title, tasks, onTaskClick, onTaskDragStart, onAddTask, onTaskStatusChange }: KanbanColumnProps) {
  return (
    <div className="flex flex-col min-w-[220px] flex-1">
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="font-semibold text-sm text-muted-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <SortableContext
        items={tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[500px]">
          {tasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              onDragStart={(e) => onTaskDragStart(e, task)}
              onStatusChange={onTaskStatusChange}
              draggable
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

interface KanbanBoardProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onTaskDragEnd: (taskId: string, newStatus: TaskStatus, newOrder: number) => void
  onAddTask: (status: TaskStatus) => void
  users: User[]
  projects: { id: string; name: string; key: string }[]
}

const statusColumns: { status: TaskStatus; title: string }[] = [
  { status: 'todo', title: 'To Do' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'review', title: 'Review' },
  { status: 'done', title: 'Done' },
]

export function KanbanBoard({ 
  tasks, 
  onTaskClick, 
  onTaskDragEnd, 
  onAddTask,
  users,
  projects
}: KanbanBoardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>('todo')
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const activeTask = tasks.find(t => t.id === active.id)
      const overTask = tasks.find(t => t.id === over.id)
      
      if (activeTask && overTask) {
        const newStatus = overTask.status
        const overIndex = tasks
          .filter(t => t.status === newStatus)
          .findIndex(t => t.id === over.id)
        
        onTaskDragEnd(active.id, newStatus, overIndex)
      }
    }
  }

  const handleAddTask = (status: TaskStatus) => {
    setSelectedStatus(status)
    setDialogOpen(true)
  }

  const handleFormSubmit = async (data: any) => {
    await onTaskDragEnd('', selectedStatus, 0)
    setDialogOpen(false)
  }

  const columns = statusColumns.map(({ status, title }) => ({
    status,
    title,
    tasks: tasks.filter(t => t.status === status).sort((a, b) => a.order - b.order),
  }))

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-6 min-h-[600px]">
        {columns.map(({ status, title, tasks: columnTasks }) => (
          <KanbanColumn
            key={status}
            status={status}
            title={title}
            tasks={columnTasks}
            onTaskClick={onTaskClick}
            onTaskDragStart={() => {}}
            onAddTask={handleAddTask}
            onTaskStatusChange={(taskId, newStatus) => {
              const newOrder = tasks.filter(t => t.status === newStatus).length;
              onTaskDragEnd(taskId, newStatus, newOrder);
            }}
          />
        ))}
      </div>

    </DndContext>
  )
}
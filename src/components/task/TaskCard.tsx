'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar, Clock, Flag, User, MessageSquare, Paperclip, GitBranch } from 'lucide-react'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import { Task } from '@/types/task'

interface TaskCardProps {
  task: Task
  onClick?: () => void
  onDragStart?: (e: React.DragEvent) => void
  draggable?: boolean
  compact?: boolean
}

export function TaskCard({ 
  task, 
  onClick, 
  onDragStart, 
  draggable = true, 
  compact = false 
}: TaskCardProps) {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null
  const isOverdueTask = dueDate && isPast(dueDate) && !isToday(dueDate)
  const isDueToday = dueDate && isToday(dueDate)
  const isDueTomorrow = dueDate && isTomorrow(dueDate)

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  const statusColors = {
    todo: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    review: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  }

  if (compact) {
    return (
      <div
        className={cn(
          'group relative flex items-center gap-3 p-3 rounded-lg border bg-card transition-all hover:shadow-md',
          draggable && 'cursor-grab active:cursor-grabbing',
          task.isCompleted && 'opacity-60 line-through'
        )}
        onClick={onClick}
        onDragStart={onDragStart}
        draggable={draggable}
      >
        <Checkbox
          checked={task.isCompleted}
          onCheckedChange={() => {}}
          className="h-4 w-4"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{task.title}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {dueDate && (
              <span className={cn(
                'flex items-center gap-1',
                isOverdueTask && 'text-red-500',
                isDueToday && 'text-orange-500',
                isDueTomorrow && 'text-yellow-500'
              )}>
                <Calendar className="h-3 w-3" />
                {format(dueDate, 'MMM d')}
              </span>
            )}
            <Badge variant="outline" className={priorityColors[task.priority]}>
              {task.priority}
            </Badge>
            {task.assignee && (
              <Avatar className="h-6 w-6">
                <AvatarImage src={task.assignee.avatar} alt={task.assignee.name} />
                <AvatarFallback>{task.assignee.name[0]}</AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
        {task.tags.length > 0 && (
          <div className="flex gap-1">
            {task.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {task.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{task.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group relative p-4 rounded-lg border bg-card shadow-sm transition-all hover:shadow-md',
        draggable && 'cursor-grab active:cursor-grabbing',
        task.isCompleted && 'opacity-60'
      )}
      onClick={onClick}
      onDragStart={onDragStart}
      draggable={draggable}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={task.isCompleted}
          onCheckedChange={() => {}}
          className="mt-0.5 h-4 w-4"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-lg line-clamp-1">{task.title}</h3>
            <Badge variant="outline" className={priorityColors[task.priority]}>
              {task.priority}
            </Badge>
          </div>
          
          {task.description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {dueDate && (
              <span className={cn(
                'flex items-center gap-1',
                isOverdueTask && 'text-red-500',
                isDueToday && 'text-orange-500',
                isDueTomorrow && 'text-yellow-500'
              )}>
                <Calendar className="h-3 w-3" />
                {format(dueDate, 'MMM d, yyyy')}
                {isOverdueTask && ' (Overdue)'}
                {isDueToday && ' (Today)'}
                {isDueTomorrow && ' (Tomorrow)'}
              </span>
            )}
            
            {task.estimatedHours && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {task.estimatedHours}h
              </span>
            )}

            {task.assignee && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {task.assignee.name}
              </span>
            )}

            <Badge variant="outline" className={statusColors[task.status]}>
              {task.status.replace('_', ' ')}
            </Badge>
          </div>

          {(task.checklistItems?.length || 0) > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${(task.checklistItems.filter(c => c.completed).length / task.checklistItems.length) * 100}%`
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {task.checklistItems.filter(c => c.completed).length}/{task.checklistItems.length}
              </span>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {task.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {task.dependencies?.length && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <GitBranch className="h-3 w-3" />
                {task.dependencies.length} deps
              </span>
            )}
            {task.commentsCount && task.commentsCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                {task.commentsCount}
              </span>
            )}
            {task.attachments?.length && task.attachments.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                {task.attachments.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
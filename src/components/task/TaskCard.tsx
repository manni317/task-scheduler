'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar, Clock, Flag, User, MessageSquare, Paperclip, GitBranch, Mic, RotateCw } from 'lucide-react'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import { Task } from '@/types/task'
import { TaskStatus } from '@/types/task'
import { SwipeToComplete } from '@/components/ui/swipe-to-complete'
import { useState, useEffect } from 'react'

export function TaskCard({ 
  task, 
  onClick, 
  onDragStart, 
  onStatusChange,
  draggable = true, 
  compact = false,
  userRole: propUserRole
}: TaskCardProps) {
  const [userRole, setUserRole] = useState(propUserRole || 'employee')
  useEffect(() => {
    if (!propUserRole) {
      setUserRole(localStorage.getItem('userRole') || 'employee')
    }
  }, [propUserRole])

  const tags = Array.isArray(task.tags) ? task.tags : []

  const dueDate = task.dueDate ? new Date(task.dueDate) : null
  const isOverdueTask = dueDate && isPast(dueDate) && !isToday(dueDate)
  const isDueToday = dueDate && isToday(dueDate)
  const isDueTomorrow = dueDate && isTomorrow(dueDate)

  const priorityColors = {
    low: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-semibold capitalize',
    medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold capitalize',
    high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 font-semibold capitalize',
    urgent: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-semibold capitalize',
  }

  const statusColors = {
    todo: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/20 font-semibold',
    in_progress: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-semibold',
    review: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-semibold',
    approved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold',
    done: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold',
  }

  if (compact) {
    return (
      <div
        className={cn(
          'group relative flex items-center gap-3 p-3.5 rounded-xl border border-border/70 bg-card/80 backdrop-blur-xl transition-all duration-300 hover:shadow-md hover:border-primary/40',
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
            {task.isRecurring && (
              <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[10px] font-semibold flex items-center gap-1">
                <RotateCw className="h-2.5 w-2.5 animate-spin-slow" />
                Recurring
              </Badge>
            )}
            {task.parentTaskId && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px] font-semibold flex items-center gap-1">
                <RotateCw className="h-2.5 w-2.5" />
                Daily Copy
              </Badge>
            )}
            {task.assignee && (
              <Avatar className="h-6 w-6">
                <AvatarImage src={task.assignee.avatar} alt={task.assignee.name} />
                <AvatarFallback>{task.assignee.name[0]}</AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
        {tags.length > 0 && (
          <div className="flex gap-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 3}
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
        'group relative p-4 rounded-2xl border border-border/70 bg-card/85 dark:bg-card/70 backdrop-blur-xl shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 hover:-translate-y-0.5',
        draggable && 'cursor-grab active:cursor-grabbing',
        task.isCompleted && 'opacity-60',
        task.rejectionReason && task.status === 'in_progress' && 'border-rose-400/80 bg-rose-500/10 dark:bg-rose-950/20'
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
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {task.isRecurring && (
                <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-xs font-semibold flex items-center gap-1 shadow-sm">
                  <RotateCw className="h-3 w-3 animate-spin-slow" />
                  Recurring
                </Badge>
              )}
              {task.parentTaskId && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xs font-semibold flex items-center gap-1 shadow-sm">
                  <RotateCw className="h-3 w-3" />
                  Daily Copy
                </Badge>
              )}
              <Badge variant="outline" className={priorityColors[task.priority]}>
                {task.priority}
              </Badge>
            </div>
          </div>
         
          {task.description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}

          {task.rejectionReason && task.status === 'in_progress' && (
            <div className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              REJECTED - NEEDS WORK
            </div>
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

          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {task.dependencies?.length ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <GitBranch className="h-3 w-3" />
                {task.dependencies.length} deps
              </span>
            ) : null}
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
         
          {task.latestUpdate && (
            <div className="mt-4 pt-3 border-t">
              <div className="text-xs font-medium text-primary mb-1 flex items-center justify-between">
                <span>Latest Update by {task.latestUpdate.user}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs mt-0.5" onClick={e => e.stopPropagation()}>
                {task.latestUpdate.audioUrl && (
                  <div className="flex items-center flex-shrink-0">
                    <audio src={task.latestUpdate.audioUrl} controls className="h-7 w-48 max-w-[200px]" />
                  </div>
                )}
                <span className="line-clamp-2 italic">
                  {task.latestUpdate.content?.replace(/\[audio:.*?\]/, '').trim() || (!task.latestUpdate.audioUrl ? 'Voice note' : '')}
                </span>
              </div>
            </div>
          )}
          {/* Buttons removed to enforce mandatory rejection reason via TaskDetail */}
          
          {/* Swipe to Complete for Employees */}
          {(userRole === 'employee' || userRole === 'doer') && task.status !== 'done' && task.status !== 'review' && onStatusChange && (
            <div className="mt-4 pt-4 border-t" onClick={e => e.stopPropagation()}>
              <SwipeToComplete 
                text={task.status === 'in_progress' ? 'Swipe to complete' : 'Swipe to start task'} 
                onComplete={() => {
                  onStatusChange(task.id, task.status === 'in_progress' ? 'review' : 'in_progress')
                }} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface TaskCardProps {
  task: Task
  onClick?: () => void
  onDragStart?: (e: React.DragEvent) => void
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void
  draggable?: boolean
  compact?: boolean
  userRole?: string
}
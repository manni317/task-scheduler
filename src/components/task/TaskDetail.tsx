'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar, Clock, User, Tag, X, Edit, Trash2, MessageSquare, Paperclip, GitBranch, ArrowUpDown, MoreHorizontal } from 'lucide-react'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import { Task, User as UserType, ChecklistItem, Comment, Attachment, TimeEntry, ActivityLog } from '@/types/task'
import { cn, formatDate } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { TaskForm } from './TaskForm'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

interface TaskDetailProps {
  task: Task
  users: UserType[]
  projects: { id: string; name: string; key: string }[]
  onUpdate: (task: Partial<Task>) => Promise<void>
  onDelete: (taskId: string) => Promise<void>
  onAddComment: (taskId: string, content: string) => Promise<void>
  onAddTimeEntry: (taskId: string, entry: Omit<TimeEntry, 'id' | 'userId' | 'user'>) => Promise<void>
  onToggleChecklist: (taskId: string, itemId: string) => Promise<void>
}

export function TaskDetail({ 
  task, 
  users, 
  projects, 
  onUpdate, 
  onDelete, 
  onAddComment,
  onAddTimeEntry,
  onToggleChecklist
}: TaskDetailProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'checklist' | 'comments' | 'activity' | 'attachments' | 'time' | 'dependencies'>('details')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [newTimeEntry, setNewTimeEntry] = useState({ description: '', hours: 0 })

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

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newComment.trim()) {
      await onAddComment(task.id, newComment.trim())
      setNewComment('')
    }
  }

  const handleSubmitTimeEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newTimeEntry.hours > 0) {
      await onAddTimeEntry(task.id, {
        startTime: new Date(),
        duration: newTimeEntry.hours * 60,
        description: newTimeEntry.description,
      })
      setNewTimeEntry({ description: '', hours: 0 })
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-4 p-4 border-b">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold truncate">{task.title}</h1>
            <Badge variant="outline" className={priorityColors[task.priority]}>
              {task.priority}
            </Badge>
            <Badge variant="outline" className={statusColors[task.status]}>
              {task.status.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {task.projectId && (
              <span className="flex items-center gap-1">
                <Tag className="h-4 w-4" />
                {task.projectId}
              </span>
            )}
            {dueDate && (
              <span className={cn(
                'flex items-center gap-1',
                isOverdueTask && 'text-red-500',
                isDueToday && 'text-orange-500',
                isDueTomorrow && 'text-yellow-500'
              )}>
                <Calendar className="h-4 w-4" />
                {format(dueDate, 'MMM d, yyyy')}
                {isOverdueTask && ' (Overdue)'}
                {isDueToday && ' (Today)'}
                {isDueTomorrow && ' (Tomorrow)'}
              </span>
            )}
            {task.assignee && (
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {task.assignee.name}
              </span>
            )}
            {task.estimatedHours && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {task.estimatedHours}h estimated
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Task</DialogTitle>
              </DialogHeader>
              <TaskForm
                initialData={task}
                users={users}
                projects={projects}
                onSubmit={async (data) => {
                  await onUpdate(data)
                  setEditDialogOpen(false)
                }}
                onCancel={() => setEditDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-500" onClick={() => onDelete(task.id)}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {task.description && (
        <div className="px-4 py-4 border-b">
          <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
        <TabsList className="border-b px-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="checklist">Checklist ({task.checklistItems?.filter(c => c.completed).length || 0}/{task.checklistItems?.length || 0})</TabsTrigger>
          <TabsTrigger value="comments">Comments ({task.commentsCount || 0})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="attachments">Attachments ({task.attachments?.length || 0})</TabsTrigger>
          <TabsTrigger value="time">Time Tracking</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies ({task.dependencies?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="p-4 overflow-y-auto">
          <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
            <div>
              <Label>Status</Label>
              <Badge variant="outline" className={cn('mt-1', statusColors[task.status])}>
                {task.status.replace('_', ' ')}
              </Badge>
            </div>
            <div>
              <Label>Priority</Label>
              <Badge variant="outline" className={cn('mt-1', priorityColors[task.priority])}>
                {task.priority}
              </Badge>
            </div>
            <div>
              <Label>Assignee</Label>
              {task.assignee ? (
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={task.assignee.avatar} alt={task.assignee.name} />
                    <AvatarFallback>{task.assignee.name[0]}</AvatarFallback>
                  </Avatar>
                  <span>{task.assignee.name}</span>
                </div>
              ) : (
                <span className="text-muted-foreground mt-1 block">Unassigned</span>
              )}
            </div>
            <div>
              <Label>Reporter</Label>
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={task.reporter.avatar} alt={task.reporter.name} />
                  <AvatarFallback>{task.reporter.name[0]}</AvatarFallback>
                </Avatar>
                <span>{task.reporter.name}</span>
              </div>
            </div>
            {dueDate && (
              <div>
                <Label>Due Date</Label>
                <div className={cn('mt-1', isOverdueTask && 'text-red-500', isDueToday && 'text-orange-500', isDueTomorrow && 'text-yellow-500')}>
                  {format(dueDate, 'MMMM d, yyyy')}
                </div>
              </div>
            )}
            {task.startDate && (
              <div>
                <Label>Start Date</Label>
                <div className="mt-1">{format(new Date(task.startDate), 'MMMM d, yyyy')}</div>
              </div>
            )}
            {task.estimatedHours && (
              <div>
                <Label>Estimated Hours</Label>
                <div className="mt-1">{task.estimatedHours}h</div>
              </div>
            )}
            {task.actualHours && (
              <div>
                <Label>Actual Hours</Label>
                <div className="mt-1">{task.actualHours}h</div>
              </div>
            )}
            {task.tags.length > 0 && (
              <div className="sm:col-span-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {task.tags.map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="sm:col-span-2">
              <Label>Created</Label>
              <div className="mt-1 text-muted-foreground">{format(new Date(task.createdAt), 'MMMM d, yyyy h:mm a')}</div>
            </div>
            <div className="sm:col-span-2">
              <Label>Updated</Label>
              <div className="mt-1 text-muted-foreground">{format(new Date(task.updatedAt), 'MMMM d, yyyy h:mm a')}</div>
            </div>
            {task.completedAt && (
              <div className="sm:col-span-2">
                <Label>Completed</Label>
                <div className="mt-1 text-green-500">{format(new Date(task.completedAt), 'MMMM d, yyyy h:mm a')}</div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="checklist" className="p-4 overflow-y-auto">
          <div className="space-y-2 max-w-xl">
            {task.checklistItems?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No checklist items. Add some to track progress.</p>
            ) : (
              task.checklistItems?.map((item: ChecklistItem) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => onToggleChecklist(task.id, item.id)}
                  />
                  <span className={cn('flex-1', item.completed && 'line-through text-muted-foreground')}>
                    {item.title}
                  </span>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="comments" className="p-4 overflow-y-auto">
          <div className="space-y-4 max-w-2xl">
            {task.comments?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No comments yet. Start the conversation!</p>
            ) : (
              task.comments?.map((comment: Comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.user.avatar} alt={comment.user.name} />
                    <AvatarFallback>{comment.user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{comment.user.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
            <form onSubmit={handleSubmitComment} className="flex gap-3 pt-4 border-t">
              <Avatar className="h-8 w-8">
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className="mt-1"
                  rows={2}
                />
                <div className="flex justify-end mt-2">
                  <Button type="submit" size="sm" disabled={!newComment.trim()}>
                    <MessageSquare className="h-4 w-4 mr-1" /> Comment
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="p-4 overflow-y-auto">
          <div className="space-y-3 max-w-2xl">
            {task.activityLog?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No activity recorded.</p>
            ) : (
              task.activityLog?.map((activity: ActivityLog) => (
                <div key={activity.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                    <AvatarFallback>{activity.user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user.name}</span>{' '}
                      {activity.action}
                      {activity.field && (
                        <>
                          {' '}<span className="font-mono text-xs bg-muted px-1 rounded">{activity.field}</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(activity.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="attachments" className="p-4 overflow-y-auto">
          <div className="space-y-2 max-w-2xl">
            {task.attachments?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No attachments.</p>
            ) : (
              task.attachments?.map((attachment: Attachment) => (
                <div key={attachment.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{attachment.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(attachment.size / 1024).toFixed(1)} KB • {attachment.type}
                    </p>
                  </div>
                  <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Download
                  </a>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="time" className="p-4 overflow-y-auto">
          <form onSubmit={handleSubmitTimeEntry} className="max-w-xl mb-6 p-4 bg-muted/50 rounded-lg space-y-4">
            <h3 className="font-medium">Log Time</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Hours</Label>
                <Input
                  type="number"
                  step="0.25"
                  min="0.25"
                  value={newTimeEntry.hours}
                  onChange={e => setNewTimeEntry({ ...newTimeEntry, hours: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Input
                  placeholder="What did you work on?"
                  value={newTimeEntry.description}
                  onChange={e => setNewTimeEntry({ ...newTimeEntry, description: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <Button type="submit" disabled={newTimeEntry.hours <= 0}>
              <Clock className="h-4 w-4 mr-1" /> Log Time
            </Button>
          </form>

          <div className="space-y-2 max-w-xl">
            {task.timeEntries?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No time entries logged.</p>
            ) : (
              task.timeEntries?.map((entry: TimeEntry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={entry.user.avatar} alt={entry.user.name} />
                      <AvatarFallback>{entry.user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{entry.user.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(entry.startTime), 'MMM d, yyyy h:mm a')}
                        {entry.duration && ` • ${(entry.duration / 60).toFixed(2)}h`}
                      </p>
                      {entry.description && (
                        <p className="text-sm">{entry.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="dependencies" className="p-4 overflow-y-auto">
          <div className="space-y-2 max-w-xl">
            {task.dependencies?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No dependencies.</p>
            ) : (
              task.dependencies?.map((dep: any) => (
                <div key={dep.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <GitBranch className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{dep.type.replace('_', ' ')}</p>
                    <p className="text-sm text-muted-foreground">Task: {dep.dependsOnTaskId}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
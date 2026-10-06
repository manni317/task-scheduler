'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn, formatDate } from '@/lib/utils'
import { Calendar as CalendarIcon, Clock, User, Tag, X } from 'lucide-react'
import { Task, TaskPriority, TaskStatus, User as UserType } from '@/types/task'

interface TaskFormProps {
  initialData?: Partial<Task>
  users: UserType[]
  projects?: { id: string; name: string; key: string }[]
  onSubmit: (data: TaskFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  projectId: z.string().min(1, 'Project is required'),
  assigneeId: z.string().optional(),
  reporterId: z.string().min(1, 'Reporter is required'),
  dueDate: z.date().optional(),
  startDate: z.date().optional(),
  estimatedHours: z.number().min(0).optional(),
  tags: z.array(z.string()).default([]),
  checklistItems: z.array(z.object({
    id: z.string(),
    title: z.string(),
    completed: z.boolean(),
    order: z.number(),
  })).default([]),
})

export type TaskFormData = z.infer<typeof taskFormSchema>

export function TaskForm({ 
  initialData, 
  users, 
  projects = [], 
  onSubmit, 
  onCancel, 
}: TaskFormProps) {
  const [userRole, setUserRole] = useState('manager')

  useEffect(() => {
    setUserRole(localStorage.getItem('userRole') || 'manager')
  }, [])
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [newTag, setNewTag] = useState('')
  const [checklistItems, setChecklistItems] = useState<TaskFormData['checklistItems']>(
    initialData?.checklistItems || []
  )
  const [newChecklistItem, setNewChecklistItem] = useState('')

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      status: initialData?.status || 'todo',
      priority: initialData?.priority || 'medium',
      projectId: initialData?.projectId || '',
      assigneeId: initialData?.assigneeId || '',
      reporterId: initialData?.reporterId || '',
      dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : undefined,
      startDate: initialData?.startDate ? new Date(initialData.startDate) : undefined,
      estimatedHours: initialData?.estimatedHours,
      tags: initialData?.tags || [],
      checklistItems: initialData?.checklistItems || [],
    },
  })

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      const newItem = {
        id: `checklist-${Date.now()}`,
        title: newChecklistItem.trim(),
        completed: false,
        order: checklistItems.length,
      }
      setChecklistItems([...checklistItems, newItem])
      setNewChecklistItem('')
    }
  }

  const handleToggleChecklistItem = (id: string) => {
    setChecklistItems(checklistItems.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ))
  }

  const handleRemoveChecklistItem = (id: string) => {
    setChecklistItems(checklistItems.filter(item => item.id !== id))
  }

  const onFormSubmit = async (data: TaskFormData) => {
    await onSubmit({
      ...data,
      tags,
      checklistItems,
    })
  }

  const priorityColors: Record<TaskPriority, string> = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  return (
    <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            placeholder="Enter task title"
            {...form.register('title')}
            className="mt-1"
            disabled={userRole === 'doer'}
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Enter task description"
            {...form.register('description')}
            className="mt-1"
            rows={4}
            disabled={userRole === 'doer'}
          />
        </div>

        <div>
          <Label htmlFor="projectId">Project *</Label>
          <Select
            onValueChange={form.setValue('projectId')}
            defaultValue={form.getValues('projectId')}
            disabled={userRole === 'doer'}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.key} - {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="reporterId">Reporter *</Label>
          <Select
            onValueChange={form.setValue('reporterId')}
            defaultValue={form.getValues('reporterId')}
            disabled={userRole === 'doer'}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select reporter" />
            </SelectTrigger>
            <SelectContent>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    {user.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="assigneeId">Assignee</Label>
          <Select
            onValueChange={form.setValue('assigneeId')}
            defaultValue={form.getValues('assigneeId')}
            disabled={userRole === 'doer'}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Unassigned</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    {user.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            onValueChange={form.setValue('status')}
            defaultValue={form.getValues('status')}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select
            onValueChange={form.setValue('priority')}
            defaultValue={form.getValues('priority')}
            disabled={userRole === 'doer'}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map(priority => (
                <SelectItem key={priority} value={priority}>
                  <span className={cn('flex items-center gap-2', priorityColors[priority])}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="dueDate">Due Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn('w-full justify-start text-left font-normal', !form.getValues('dueDate') && 'text-muted-foreground')}
                {...form.register('dueDate')}
                disabled={userRole === 'doer'}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {form.getValues('dueDate') 
                  ? formatDate(form.getValues('dueDate')!) 
                  : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={form.getValues('dueDate')}
                onSelect={form.setValue('dueDate')}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn('w-full justify-start text-left font-normal', !form.getValues('startDate') && 'text-muted-foreground')}
                {...form.register('startDate')}
                disabled={userRole === 'doer'}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {form.getValues('startDate') 
                  ? formatDate(form.getValues('startDate')!) 
                  : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={form.getValues('startDate')}
                onSelect={form.setValue('startDate')}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label htmlFor="estimatedHours">Estimated Hours</Label>
          <Input
            id="estimatedHours"
            type="number"
            step="0.5"
            min="0"
            placeholder="0"
            {...form.register('estimatedHours', { valueAsNumber: true })}
            className="mt-1"
            disabled={userRole === 'doer'}
          />
        </div>
      </div>

      <div className="space-y-4">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Add tag..."
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              className="w-48"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>
              <Tag className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Checklist</Label>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Add checklist item..."
              value={newChecklistItem}
              onChange={e => setNewChecklistItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
              className="w-64"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAddChecklistItem}>
              Add
            </Button>
          </div>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {checklistItems.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <Checkbox
                checked={item.completed}
                onCheckedChange={() => handleToggleChecklistItem(item.id)}
              />
              <Input
                value={item.title}
                onChange={e => setChecklistItems(checklistItems.map(i => 
                  i.id === item.id ? { ...i, title: e.target.value } : i
                ))}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveChecklistItem(item.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : initialData?.id ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </form>
  )
}
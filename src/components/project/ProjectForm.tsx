'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Project, User } from '@/types/task'
import { Check } from 'lucide-react'

interface ProjectFormProps {
  initialData?: Partial<Project>
  users?: User[]
  organizations?: any[]
  onSubmit: (data: ProjectFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

const projectFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  orgId: z.string().optional(),
  memberIds: z.array(z.string()).default([]),
})

export type ProjectFormData = z.infer<typeof projectFormSchema>

const predefinedColors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
]

export function ProjectForm({ initialData, users = [], organizations = [], onSubmit, onCancel, isLoading }: ProjectFormProps) {
  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      orgId: initialData?.orgId || '',
      memberIds: initialData?.memberIds || [],
    },
    watch: ['memberIds'],
  })

  const watchedMembers = form.watch('memberIds') || []

  const toggleMember = (userId: string) => {
    const isSelected = watchedMembers.includes(userId)
    if (isSelected) {
      form.setValue('memberIds', watchedMembers.filter(id => id !== userId))
    } else {
      form.setValue('memberIds', [...watchedMembers, userId])
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Project Name *</Label>
          <Input
            id="name"
            placeholder="Enter project name"
            {...form.register('name')}
            className="mt-1"
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Enter project description"
            {...form.register('description')}
            className="mt-1"
            rows={3}
          />
        </div>

        {organizations.length > 0 && (
          <div className="sm:col-span-2">
            <Label htmlFor="orgId">Organization</Label>
            <select
              id="orgId"
              {...form.register('orgId')}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">No Organization (System wide)</option>
              {organizations.map((org: any) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Label>Team Members</Label>
        <div className="flex flex-wrap gap-3">
          {users.map(user => {
            const isSelected = watchedMembers.includes(user.id)
            return (
              <div 
                key={user.id} 
                onClick={() => toggleMember(user.id)}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-full border cursor-pointer transition-all select-none",
                  isSelected ? "bg-primary/10 border-primary text-primary" : "bg-card border-border hover:bg-muted"
                )}
              >
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold uppercase overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    user.name.charAt(0)
                  )}
                </div>
                <span className="text-sm font-medium pr-2">{user.name}</span>
                {isSelected && <Check className="h-4 w-4 mr-1" />}
              </div>
            )
          })}
          {users.length === 0 && (
            <p className="text-sm text-muted-foreground">No users available. They will be added automatically when they join.</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : initialData?.id ? 'Update Project' : 'Create Project'}
        </Button>
      </div>
    </form>
  )
}
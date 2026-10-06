'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUIStore } from '@/hooks/use-ui-store'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

export function CreateOrganizationModal() {
  const { isCreateOrgModalOpen, closeCreateOrgModal, triggerRefresh } = useUIStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { profile } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

      // 1. Create Organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: name.trim(),
          description: description.trim()
        })
        .select()
        .single()

      if (orgError) throw orgError

      // 2. Add current user as member (if they exist)
      if (profile) {
        await supabase.from('organization_members').insert({
          org_id: org.id,
          user_id: profile.id,
          role: 'admin'
        })
      }

      toast.success('Organization created successfully')
      closeCreateOrgModal()
      setName('')
      setDescription('')
      triggerRefresh() // Refresh UI state
    } catch (error) {
      console.error('Failed to create organization:', error)
      toast.error('Failed to create organization')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isCreateOrgModalOpen} onOpenChange={closeCreateOrgModal}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corp"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the organization..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={closeCreateOrgModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Creating...' : 'Create Organization'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

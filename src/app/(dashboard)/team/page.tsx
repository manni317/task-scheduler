'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createEmployee } from '@/app/actions/team'
import { toast } from 'sonner'
import { Loader2, Plus, UserPlus, Shield, User } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

export default function TeamPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const queryClient = useQueryClient()

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    }
  })

  if (error) {
    toast.error('Failed to load team')
  }

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsCreating(true)
    
    try {
      const formData = new FormData(e.currentTarget)
      await createEmployee(formData)
      toast.success('Employee created successfully!')
      setIsModalOpen(false)
      ;(e.target as HTMLFormElement).reset()
      queryClient.invalidateQueries({ queryKey: ['team'] })
    } catch (error: any) {
      toast.error(error.message || 'Failed to create employee')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">Manage your employees, roles, and access.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg"
        >
          <UserPlus className="h-4 w-4" />
          Add Employee
        </button>
      </div>

      {/* Employee List */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>
        ) : users.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No employees found. Create your first employee!</p>
        ) : (
          <div className="space-y-4">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border bg-background">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold uppercase">
                    {user.avatar_url ? <img src={user.avatar_url} className="rounded-full" /> : user.full_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">{user.full_name || 'Unknown User'}</h3>
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="font-semibold text-slate-300">ID:</span> 
                        {user.email || `${user.full_name?.toLowerCase().replace(/\s+/g, '')}@taskflow.com`}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="font-semibold text-slate-300">Pass:</span> 
                        123456
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'manager' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'}`}>
                    {user.role || 'Member'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h2 className="mb-4 text-xl font-bold">Add New Employee</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">Full Name</label>
                <input required name="fullName" type="text" className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder="e.g. Rahul Kumar" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">Email (Login ID)</label>
                <input required name="email" type="email" className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder="rahul@company.com" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">Password</label>
                <input required name="password" type="password" className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder="Set a password for them" minLength={6} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">Role</label>
                <select name="role" className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                  <option value="doer">Doer (Executes tasks)</option>
                  <option value="manager">Manager (Assigns & Approves)</option>
                </select>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">Cancel</button>
                <button type="submit" disabled={isCreating} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                  {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

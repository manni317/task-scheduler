'use client'

import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Plus, Users } from 'lucide-react'
import { useUIStore } from '@/hooks/use-ui-store'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

export default function OrganizationsPage() {
  const router = useRouter()
  const { openCreateOrgModal, refreshCount } = useUIStore()
  const { profile } = useAuth()
  const userRole = profile?.role || 'employee'
  const isManagerOrAdmin = userRole === 'manager' || userRole === 'admin'

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['organizations', refreshCount],
    queryFn: async () => {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      
      const { data } = await supabase
        .from('organizations')
        .select('*, organization_members(user_id, profiles(full_name, avatar_url))')
        .order('created_at', { ascending: false })

      return data || []
    }
  })

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">Manage your organizations and their members</p>
        </div>
        {isManagerOrAdmin && (
          <Button onClick={openCreateOrgModal} className="gap-2 bg-primary">
            <Plus className="h-4 w-4" />
            New Organization
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : orgs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border rounded-2xl bg-card border-dashed">
          <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Users className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No Organizations Found</h2>
          <p className="text-muted-foreground max-w-md mb-8">
            Create an organization to group your projects and team members efficiently.
          </p>
          {isManagerOrAdmin && (
            <Button onClick={openCreateOrgModal} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Create Organization
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orgs.map((org: any) => (
            <div 
              key={org.id} 
              onClick={() => router.push(`/organizations/${org.id}`)}
              className="p-6 bg-card border rounded-2xl hover:shadow-md transition-all flex flex-col cursor-pointer"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                  {org.logo_url ? (
                    <img src={org.logo_url} alt={org.name} className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="text-primary font-bold text-xl">{org.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{org.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {org.organization_members?.length || 0} Members
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground flex-1 line-clamp-3">
                {org.description || 'No description provided.'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProjectList } from '@/components/project/ProjectList'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { ArrowLeft, Plus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Project, User } from '@/types/task'

export default function OrganizationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params.id as string
  const { profile } = useAuth()
  
  const [org, setOrg] = useState<any>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [orgMembers, setOrgMembers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const userRole = profile?.role || 'employee'
  const isManagerOrAdmin = userRole === 'manager' || userRole === 'admin'

  useEffect(() => {
    if (orgId) {
      fetchData()
    }
  }, [orgId])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch Org Details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()
      
      if (orgError) throw orgError
      setOrg(orgData)

      // Fetch all system users to pass to ProjectList
      const { data: allUsers } = await supabase.from('profiles').select('*')
      const mappedUsers = (allUsers || []).map((u: any) => ({
        id: u.id,
        name: u.full_name || 'Unknown',
        email: u.email || '',
        avatar: u.avatar_url || '',
        role: u.role || 'member'
      }))
      setUsers(mappedUsers)

      // Fetch org members specifically for the Members tab
      const { data: membersData } = await supabase
        .from('organization_members')
        .select('role, user_id, profiles(*)')
        .eq('org_id', orgId)
      
      setOrgMembers(membersData || [])

      // Fetch projects for this org
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('org_id', orgId)

      const mappedProjects = (projectsData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        key: p.key_prefix || 'PRJ',
        orgId: p.org_id,
        color: '#3B82F6',
        icon: '📁',
        ownerId: '',
        owner: null,
        members: mappedUsers, // You'd ideally map actual project members here
        tasks: [],
        createdAt: new Date(p.created_at || Date.now()),
        updatedAt: new Date(p.updated_at || Date.now()),
        isArchived: false,
      }))

      setProjects(mappedProjects)

    } catch (err: any) {
      console.error(err)
      toast.error('Failed to load organization details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProject = async (data: any) => {
    try {
      const newProject = {
        name: data.name,
        description: data.description,
        org_id: orgId, // Force bind to this org
      }

      const { error } = await supabase.from('projects').insert([newProject])
      if (error) throw error
      
      toast.success('Project created successfully!')
      fetchData()
    } catch (error: any) {
      console.error(error)
      toast.error('Failed to create project')
    }
  }

  const handleUpdateProject = async (data: any) => {
    try {
      const { error } = await supabase.from('projects').update({
        name: data.name,
        description: data.description,
      }).eq('id', data.id)
      
      if (error) throw error
      toast.success('Project updated!')
      fetchData()
    } catch (error: any) {
      console.error(error)
      toast.error('Failed to update project')
    }
  }

  const handleDeleteProject = async (id: string) => {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
      toast.success('Project deleted!')
      fetchData()
    } catch (error: any) {
      console.error(error)
      toast.error('Failed to delete project')
    }
  }

  const handleArchiveProject = async (id: string) => {
    toast.info('Archiving not supported in current schema')
  }

  if (isLoading) {
    return <div className="h-full flex items-center justify-center">Loading organization...</div>
  }

  if (!org) {
    return <div className="h-full flex items-center justify-center">Organization not found.</div>
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/organizations')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{org.name}</h1>
          <p className="text-muted-foreground">{org.description || 'No description provided.'}</p>
        </div>
      </div>

      <Tabs defaultValue="projects" className="flex-1 flex flex-col">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>
        
        <TabsContent value="projects" className="flex-1 mt-4">
          <ProjectList
            userRole={userRole}
            projects={projects}
            users={users}
            organizations={[org]}
            onProjectClick={(project) => router.push(`/projects/${project.id}`)}
            onCreateProject={handleCreateProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onArchiveProject={handleArchiveProject}
          />
        </TabsContent>
        
        <TabsContent value="members" className="flex-1 mt-4">
          <div className="bg-card border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Organization Members ({orgMembers.length})</h3>
              {isManagerOrAdmin && (
                <Button variant="outline" onClick={() => router.push('/team')}>
                  Manage Team
                </Button>
              )}
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {orgMembers.map((member) => {
                const p = member.profiles
                return (
                  <div key={member.user_id} className="flex items-center gap-4 p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={p.avatar_url || ''} alt={p.full_name} />
                      <AvatarFallback>{p.full_name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none">{p.full_name}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{p.email}</p>
                    </div>
                    <div className="text-xs font-semibold capitalize px-2 py-1 bg-primary/10 text-primary rounded-md">
                      {member.role || 'Member'}
                    </div>
                  </div>
                )
              })}
            </div>
            {orgMembers.length === 0 && (
              <p className="text-muted-foreground text-center py-8">No members found in this organization.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

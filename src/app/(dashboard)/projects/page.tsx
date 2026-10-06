'use client'

import { useState, useEffect } from 'react'
import { ProjectList } from '@/components/project/ProjectList'
import { Project, User } from '@/types/task'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

export default function ProjectsPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  useEffect(() => {
    if (authLoading) return
    fetchData()
  }, [authLoading])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const { data: usersData, error: usersError } = await supabase.from('profiles').select('*')
      if (usersError) throw usersError
      
      const mappedUsers = (usersData || []).map((u: any) => ({
        id: u.id,
        name: u.full_name || 'Unknown',
        email: u.email || '',
        avatar: u.avatar_url || '',
        role: u.role || 'member'
      }))
      setUsers(mappedUsers)

      let { data: projectsData, error: projError } = await supabase.from('projects').select('*')
      if (projError) throw projError

      const { data: orgsData, error: orgsError } = await supabase.from('organizations').select('*')
      if (!orgsError && orgsData) setOrganizations(orgsData)

      const userRole = profile?.role || 'employee'
      const userId = profile?.id

      if (userRole === 'employee' && userId) {
        const { data: userTasks } = await supabase.from('tasks').select('project_id').eq('assignee_id', userId)
        const allowedProjectIds = new Set((userTasks || []).map(t => t.project_id))
        projectsData = (projectsData || []).filter(p => allowedProjectIds.has(p.id))
      }

      const mappedProjects = (projectsData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        key: p.key_prefix || 'PRJ',
        orgId: p.org_id,
        organization: orgsData?.find((o: any) => o.id === p.org_id),
        color: '#3B82F6',
        icon: '📁',
        ownerId: '',
        owner: null,
        members: mappedUsers,
        tasks: [],
        createdAt: new Date(p.created_at || Date.now()),
        updatedAt: new Date(p.updated_at || Date.now()),
        isArchived: false,
      }))
      
      setProjects(mappedProjects)
    } catch (err: any) {
      console.error('Error fetching data:', err)
      toast.error('Failed to load projects')
    } finally {
      setIsLoading(false)
    }
  }

  const userRole = profile?.role || 'employee'
  const userId = profile?.id

  const handleCreateProject = async (data: any) => {
    try {
      const newProject = {
        name: data.name,
        description: data.description,
        org_id: data.orgId || null,
      }

      const { error } = await supabase.from('projects').insert([newProject])
      if (error) throw error
      
      toast.success('Project created successfully!')
      fetchData()
    } catch (error: any) {
      console.error(error)
      toast.error('Failed to create project: ' + error.message)
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
    toast.info('Archiving not supported in current database schema')
  }

  if (authLoading) {
    return <div className="h-full flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="h-full flex flex-col">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">Loading projects...</div>
      ) : (
        <ProjectList
          userRole={userRole}
          projects={projects}
          users={users}
          organizations={organizations}
          onProjectClick={(project) => router.push(`/projects/${project.id}`)}
          onCreateProject={handleCreateProject}
          onUpdateProject={handleUpdateProject}
          onDeleteProject={handleDeleteProject}
          onArchiveProject={handleArchiveProject}
        />
      )}
    </div>
  )
}
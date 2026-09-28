'use client'

import { useState, useEffect } from 'react'
import { ProjectList } from '@/components/project/ProjectList'
import { Project, User } from '@/types/task'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState('manager')
  const [userId, setUserId] = useState('')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'manager'
    const id = localStorage.getItem('userId') || ''
    setUserRole(role)
    setUserId(id)
    fetchData(role, id)
  }, [])

  const fetchData = async (role: string, currentUserId: string) => {
    try {
      setIsLoading(true)
      const { data: usersData, error: usersError } = await supabase.from('profiles').select('*')
      if (usersError) throw usersError
      
      const mappedUsers = (usersData || []).map((u: any) => ({
        id: u.id,
        name: u.full_name || 'Unknown',
        email: u.email || '', // Email might not be in profiles
        avatar: u.avatar_url || '',
        role: u.role || 'member'
      }))
      setUsers(mappedUsers)

      let { data: projectsData, error: projError } = await supabase.from('projects').select('*')
      if (projError) throw projError

      if (role === 'doer' && currentUserId) {
        const { data: userTasks } = await supabase.from('tasks').select('project_id').eq('assignee_id', currentUserId)
        const allowedProjectIds = new Set((userTasks || []).map(t => t.project_id))
        projectsData = (projectsData || []).filter(p => allowedProjectIds.has(p.id))
      }

      const mappedProjects = (projectsData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        key: 'PRJ', // Default since not in DB
        color: '#3B82F6', // Default since not in DB
        icon: '📁', // Default since not in DB
        ownerId: '', // Default since not in DB
        owner: null,
        members: mappedUsers, // In a real app, query project_members
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

  const handleCreateProject = async (data: any) => {
    try {
      const newProject = {
        name: data.name,
        description: data.description,
      }

      const { error } = await supabase.from('projects').insert([newProject])
      if (error) throw error
      
      toast.success('Project created successfully!')
      fetchData(userRole, userId)
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
      fetchData(userRole, userId)
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
      fetchData(userRole, userId)
    } catch (error: any) {
      console.error(error)
      toast.error('Failed to delete project')
    }
  }

  const handleArchiveProject = async (id: string) => {
    // Project status doesn't exist in this schema, so maybe just delete or ignore
    toast.info('Archiving not supported in current database schema')
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
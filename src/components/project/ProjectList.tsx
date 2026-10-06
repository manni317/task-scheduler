'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ProjectCard } from './ProjectCard'
import { ProjectForm } from './ProjectForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Project, User } from '@/types/task'
import { Plus, Search, Filter, Grid, List } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProjectListProps {
  userRole?: string
  projects: Project[]
  users: User[]
  organizations?: any[]
  onProjectClick: (project: Project) => void
  onCreateProject: (data: any) => Promise<void>
  onUpdateProject: (data: any) => Promise<void>
  onDeleteProject: (projectId: string) => Promise<void>
  onArchiveProject: (projectId: string) => Promise<void>
}

export function ProjectList({ 
  userRole = 'manager',
  projects, 
  users, 
  organizations = [],
  onProjectClick, 
  onCreateProject, 
  onUpdateProject,
  onDeleteProject,
  onArchiveProject
}: ProjectListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('all')
  const [filterOrg, setFilterOrg] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.key.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'active' && !project.isArchived) ||
      (filterStatus === 'archived' && project.isArchived)
    const matchesOrg = filterOrg === 'all' || project.orgId === filterOrg
    return matchesSearch && matchesFilter && matchesOrg
  })

  const handleCreateProject = async (data: any) => {
    await onCreateProject(data)
    setDialogOpen(false)
  }

  const handleUpdateProject = async (data: any) => {
    await onUpdateProject({ ...data, id: editingProject?.id })
    setDialogOpen(false)
    setEditingProject(null)
  }

  const handleEditClick = (project: Project) => {
    setEditingProject(project)
    setDialogOpen(true)
  }

  const handleDeleteClick = async (projectId: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      await onDeleteProject(projectId)
    }
  }

  const handleArchiveClick = async (projectId: string) => {
    await onArchiveProject(projectId)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          {organizations.length > 0 && (
            <select
              value={filterOrg}
              onChange={e => setFilterOrg(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-background max-w-[150px] truncate"
            >
              <option value="all">All Orgs</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          )}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <div className="flex border rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-2 transition-colors', viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-2 transition-colors', viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={userRole === 'doer'} className={userRole === 'doer' ? 'hidden' : ''}>
                <Plus className="h-4 w-4 mr-2" /> New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
              </DialogHeader>
              <ProjectForm
                initialData={editingProject}
                users={users}
                organizations={organizations}
                onSubmit={editingProject ? handleUpdateProject : handleCreateProject}
                onCancel={() => { setDialogOpen(false); setEditingProject(null); }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              userRole={userRole}
              onClick={() => onProjectClick(project)}
              onEdit={() => handleEditClick(project)}
              onDelete={() => handleDeleteClick(project.id)}
              onArchive={() => handleArchiveClick(project.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map(project => (
            <div
              key={project.id}
              className="flex items-center gap-4 p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => onProjectClick(project)}
            >
              <div className={cn(
                'h-12 w-12 rounded-lg flex items-center justify-center',
                `bg-[${project.color}]/20 text-[${project.color}]`
              )}>
                {project.icon ? <span className="text-xl">{project.icon}</span> : <FolderKanban className="h-6 w-6" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{project.name}</h3>
                  <Badge variant="secondary" className="font-mono">{project.key}</Badge>
                  {project.isArchived && <Badge variant="outline">Archived</Badge>}
                </div>
                <p className="text-sm text-muted-foreground truncate mt-1">{project.description || 'No description'}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{project.members?.length || 0} members</span>
                  <span>{project.tasks?.length || 0} tasks</span>
                </div>
              </div>
              {userRole !== 'doer' && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); handleEditClick(project); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={e => { e.stopPropagation(); handleDeleteClick(project.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {filteredProjects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <FolderKanban className="h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-1">No projects found</h3>
          <p className="text-sm">Create your first project to get started</p>
        </div>
      )}
    </div>
  )
}

import { FolderKanban, Edit, Trash2 } from 'lucide-react'
'use client'

import { useAuth } from '@/hooks/useAuth'
import { useProjects } from '@/hooks/useProjects'
import { useTasks } from '@/hooks/useTasks'
import Link from 'next/link'

export default function DashboardPage() {
  const { profile, isLoading: authLoading } = useAuth()
  const { projects, isLoading: projectsLoading } = useProjects()

  if (authLoading || projectsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse-soft">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {profile?.full_name || 'User'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your projects today.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.slice(0, 6).map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="card-hover p-6 bg-card rounded-xl border"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: project.color || '#3b82f6' }}
                >
                  {project.key}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{project.name}</h3>
                  <p className="text-sm text-muted-foreground">{project.members?.[0]?.count || 0} members</p>
                </div>
              </div>
            </div>
            {project.description && (
              <p className="mt-4 text-sm text-muted-foreground line-clamp-2">{project.description}</p>
            )}
          </Link>
        ))}
        {projects.length === 0 && (
          <Link
            href="/projects/new"
            className="col-span-full card-hover p-12 text-center border-2 border-dashed"
          >
            <div className="text-4xl mb-2">📁</div>
            <h3 className="text-lg font-medium mb-1">No projects yet</h3>
            <p className="text-muted-foreground mb-4">Create your first project to get started</p>
            <span className="btn-primary">Create Project</span>
          </Link>
        )}
      </div>
    </div>
  )
}
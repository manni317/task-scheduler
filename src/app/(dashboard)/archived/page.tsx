'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Archive, FolderKanban, CheckSquare, Search, RefreshCw, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export default function ArchivedPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isRestoring, setIsRestoring] = useState<string | null>(null)
  
  const { data: { completedTasks = [], archivedProjects = [] } = {}, isLoading, refetch } = useQuery({
    queryKey: ['archived_data'],
    queryFn: async () => {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      
      const [{ data: tasksData }, { data: projectsData }] = await Promise.all([
        supabase.from('tasks').select('*, profiles!tasks_assignee_id_fkey(*)').eq('status', 'done').order('updated_at', { ascending: false }),
        supabase.from('projects').select('*').eq('is_archived', true).order('updated_at', { ascending: false }).catch(() => ({ data: [] })) // Catch error if is_archived doesn't exist
      ])

      return { 
        completedTasks: tasksData || [],
        archivedProjects: projectsData || []
      }
    }
  })

  const handleRestore = async (type: 'task' | 'project', id: string) => {
    setIsRestoring(id)
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    
    if (type === 'task') {
      await supabase.from('tasks').update({ status: 'todo' }).eq('id', id)
    } else {
      await supabase.from('projects').update({ is_archived: false }).eq('id', id)
    }
    
    await refetch()
    setIsRestoring(null)
  }

  const filteredTasks = completedTasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredProjects = archivedProjects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Archive className="h-8 w-8 text-primary" />
            Vault / Archived
          </h1>
          <p className="text-muted-foreground mt-1">
            Access completed tasks and archived projects in your secure vault.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-card rounded-xl border shadow-sm flex flex-col overflow-hidden">
        <Tabs defaultValue="tasks" className="flex-1 flex flex-col h-full">
          <div className="px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20">
            <TabsList className="bg-muted/50 w-full sm:w-auto">
              <TabsTrigger value="tasks" className="flex items-center gap-2 flex-1 sm:flex-none">
                <CheckSquare className="h-4 w-4" />
                Completed Tasks
                <span className="ml-1.5 bg-primary/10 text-primary text-xs py-0.5 px-2 rounded-full font-medium">
                  {completedTasks.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="projects" className="flex items-center gap-2 flex-1 sm:flex-none">
                <FolderKanban className="h-4 w-4" />
                Archived Projects
                <span className="ml-1.5 bg-primary/10 text-primary text-xs py-0.5 px-2 rounded-full font-medium">
                  {archivedProjects.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vault..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="tasks" className="m-0 h-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  Loading vault data...
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <CheckSquare className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="font-medium text-lg">No completed tasks</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mt-1">
                    When tasks are marked as Done, they will appear here in the vault.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-4 rounded-lg border bg-background hover:border-primary/30 transition-colors group">
                      <div className="flex items-start gap-4">
                        <div className="mt-1 flex-shrink-0">
                          <div className="h-8 w-8 rounded bg-green-500/10 flex items-center justify-center">
                            <CheckSquare className="h-4 w-4 text-green-500" />
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{task.title}</h4>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>Completed: {new Date(task.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            {task.profiles && (
                              <>
                                <span>•</span>
                                <span>Assignee: {task.profiles.full_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity gap-2 text-muted-foreground hover:text-primary"
                        onClick={() => handleRestore('task', task.id)}
                        disabled={isRestoring === task.id}
                      >
                        {isRestoring === task.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            Restore
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="projects" className="m-0 h-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  Loading vault data...
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <FolderKanban className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="font-medium text-lg">No archived projects</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mt-1">
                    Projects that are archived to reduce clutter will be securely stored here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProjects.map((project: any) => (
                    <div key={project.id} className="p-5 rounded-lg border bg-background hover:shadow-md transition-all group flex flex-col h-full">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                            style={{ backgroundColor: project.color || '#3b82f6' }}
                          >
                            {project.icon || project.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground line-clamp-1">{project.name}</h4>
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">{project.key}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-auto pt-4 border-t flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Archive className="h-3 w-3" />
                          Archived {new Date(project.updated_at).toLocaleDateString()}
                        </span>
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 gap-1 text-xs"
                          onClick={() => handleRestore('project', project.id)}
                          disabled={isRestoring === project.id}
                        >
                          {isRestoring === project.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="h-3 w-3" />
                              Restore
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

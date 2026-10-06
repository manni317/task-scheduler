'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
} from '@/components/ui/chart'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createBrowserClient } from '@supabase/ssr'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function AnalyticsPage() {
  const { profile, loading: authLoading } = useAuth()
  
  const userRole = profile?.role || 'employee'
  const userId = profile?.id || ''

  const { data: { tasks = [], users = [], projects = [] } = {}, isLoading } = useQuery({
    queryKey: ['analytics_data'],
    queryFn: async () => {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      
      const [{ data: profilesData }, { data: tasksData }, { data: projectsData }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('tasks').select('*'),
        supabase.from('projects').select('*')
      ])

      return { 
        tasks: tasksData || [], 
        users: profilesData || [],
        projects: projectsData || [] 
      }
    }
  })

  const displayTasks = useMemo(() => {
    if (userRole === 'admin' || userRole === 'manager') return tasks
    return tasks.filter((t: any) => t.assignee_id === userId)
  }, [tasks, userRole, userId])

  // Calculate Stats
  const {
    overviewData,
    statusData,
    priorityData,
    teamPerformanceData,
    projectDistributionData,
    summary
  } = useMemo(() => {
    const summary = {
      created: displayTasks.length,
      completed: displayTasks.filter((t: any) => t.status === 'done').length,
      rate: 0,
      avgTime: 0
    }
    summary.rate = summary.created ? Math.round((summary.completed / summary.created) * 100) : 0

    // Status Data
    const statusCounts: Record<string, number> = { todo: 0, in_progress: 0, review: 0, done: 0 }
    displayTasks.forEach((t: any) => { if (statusCounts[t.status] !== undefined) statusCounts[t.status]++ })
    const statusData = [
      { name: 'To Do', value: statusCounts.todo, color: 'hsl(var(--chart-1))' },
      { name: 'In Progress', value: statusCounts.in_progress, color: 'hsl(var(--chart-2))' },
      { name: 'Review', value: statusCounts.review, color: 'hsl(var(--chart-3))' },
      { name: 'Done', value: statusCounts.done, color: 'hsl(var(--chart-4))' },
    ].filter(d => d.value > 0)

    // Priority Data
    const priorityCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
    displayTasks.forEach((t: any) => { priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1 })
    const priorityData = [
      { name: 'Low', value: priorityCounts[4] || 0, color: 'hsl(var(--chart-1))' },
      { name: 'Medium', value: priorityCounts[3] || 0, color: 'hsl(var(--chart-2))' },
      { name: 'High', value: priorityCounts[2] || 0, color: 'hsl(var(--chart-3))' },
      { name: 'Urgent', value: priorityCounts[1] || 0, color: 'hsl(var(--chart-4))' },
    ].filter(d => d.value > 0)

    // Project Distribution
    const projMap: Record<string, number> = {}
    displayTasks.forEach((t: any) => {
      const pid = t.project_id || 'unassigned'
      projMap[pid] = (projMap[pid] || 0) + 1
    })
    const projectDistributionData = Object.keys(projMap).map((pid, idx) => {
      const proj = projects.find((p: any) => p.id === pid)
      return {
        name: proj ? proj.name : 'Unknown',
        value: projMap[pid],
        color: `hsl(var(--chart-${(idx % 5) + 1}))`
      }
    })

    // Team Performance
    const teamMap: Record<string, any> = {}
    displayTasks.forEach((t: any) => {
      if (!t.assignee_id) return
      if (!teamMap[t.assignee_id]) {
        const u = users.find((u: any) => u.id === t.assignee_id)
        teamMap[t.assignee_id] = { name: u ? u.full_name : 'Unknown', completed: 0, overdue: 0, avgTime: t.time_spent || 0 }
      }
      if (t.status === 'done') teamMap[t.assignee_id].completed++
      if (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done') teamMap[t.assignee_id].overdue++
    })
    const teamPerformanceData = Object.values(teamMap)

    // Overview data (last 6 months dummy mapped to current)
    // For simplicity, grouping by month for current year
    const overviewMap: Record<string, any> = {}
    displayTasks.forEach((t: any) => {
      const d = new Date(t.created_at)
      const m = d.toLocaleString('default', { month: 'short' })
      if (!overviewMap[m]) overviewMap[m] = { month: m, tasksCreated: 0, tasksCompleted: 0, tasksOverdue: 0 }
      overviewMap[m].tasksCreated++
      if (t.status === 'done') overviewMap[m].tasksCompleted++
      if (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done') overviewMap[m].tasksOverdue++
    })
    const overviewData = Object.values(overviewMap)

    return { overviewData, statusData, priorityData, teamPerformanceData, projectDistributionData, summary }
  }, [displayTasks, users, projects])

  if (authLoading || isLoading) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Insights into your team's productivity and project health</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Created</CardTitle>
            <span className="text-3xl font-bold text-blue-500">{summary.created}</span>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <span className="text-3xl font-bold text-green-500">{summary.completed}</span>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <span className="text-3xl font-bold text-primary">{summary.rate}%</span>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Cycle Time</CardTitle>
            <span className="text-3xl font-bold text-orange-500">-</span>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {userRole === 'manager' && <TabsTrigger value="team">Team Performance</TabsTrigger>}
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Tasks Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ChartContainer
                    config={{
                      tasksCreated: { label: 'Created', color: 'hsl(var(--chart-1))' },
                      tasksCompleted: { label: 'Completed', color: 'hsl(var(--chart-2))' },
                      tasksOverdue: { label: 'Overdue', color: 'hsl(var(--chart-3))' },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={overviewData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Area type="monotone" dataKey="tasksCreated" stroke="hsl(var(--chart-1))" fillOpacity={1} fill="url(#colorCreated)" strokeWidth={2} />
                        <Area type="monotone" dataKey="tasksCompleted" stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#colorCompleted)" strokeWidth={2} />
                        <Line type="monotone" dataKey="tasksOverdue" stroke="hsl(var(--chart-3))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tasks by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ChartContainer config={{ status: { label: 'Status' } }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}
                          dataKey="value" nameKey="name"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(value: any) => [value, 'tasks']} content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <ChartLegend payload={statusData.map(d => ({ value: d.name, color: d.color }))} className="mt-4 justify-center" />
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tasks by Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ChartContainer config={{ priority: { label: 'Priority' } }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={priorityData}
                          cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}
                          dataKey="value" nameKey="name"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {priorityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(value: any) => [value, 'tasks']} content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <ChartLegend payload={priorityData.map(d => ({ value: d.name, color: d.color }))} className="mt-4 justify-center" />
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {userRole === 'manager' && (
          <TabsContent value="team">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Team Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px] w-full">
                    <ChartContainer
                      config={{
                        completed: { label: 'Completed', color: 'hsl(var(--chart-1))' },
                        overdue: { label: 'Overdue', color: 'hsl(var(--chart-2))' },
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={teamPerformanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Bar dataKey="completed" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="overdue" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        <TabsContent value="projects">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Project Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full">
                  <ChartContainer config={{ project: { label: 'Project' } }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={projectDistributionData}
                          cx="50%" cy="50%" innerRadius={60} outerRadius={120} paddingAngle={2}
                          dataKey="value" nameKey="name"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {projectDistributionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(value: any) => [value, 'tasks']} content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <ChartLegend payload={projectDistributionData.map(d => ({ value: d.name, color: d.color }))} className="mt-4 justify-center" />
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

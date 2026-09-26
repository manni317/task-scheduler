'use client'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const overviewData = [
  { month: 'Jan', tasksCreated: 45, tasksCompleted: 40, tasksOverdue: 5 },
  { month: 'Feb', tasksCreated: 52, tasksCompleted: 48, tasksOverdue: 4 },
  { month: 'Mar', tasksCreated: 48, tasksCompleted: 45, tasksOverdue: 3 },
  { month: 'Apr', tasksCreated: 60, tasksCompleted: 55, tasksOverdue: 5 },
  { month: 'May', tasksCreated: 55, tasksCompleted: 50, tasksOverdue: 5 },
  { month: 'Jun', tasksCreated: 65, tasksCompleted: 60, tasksOverdue: 5 },
]

const statusData = [
  { name: 'To Do', value: 24, color: 'hsl(var(--chart-1))' },
  { name: 'In Progress', value: 18, color: 'hsl(var(--chart-2))' },
  { name: 'Review', value: 12, color: 'hsl(var(--chart-3))' },
  { name: 'Done', value: 46, color: 'hsl(var(--chart-4))' },
]

const priorityData = [
  { name: 'Low', value: 30, color: 'hsl(var(--chart-1))' },
  { name: 'Medium', value: 35, color: 'hsl(var(--chart-2))' },
  { name: 'High', value: 25, color: 'hsl(var(--chart-3))' },
  { name: 'Urgent', value: 10, color: 'hsl(var(--chart-4))' },
]

const velocityData = [
  { sprint: 'Sprint 1', completed: 34, committed: 40 },
  { sprint: 'Sprint 2', completed: 38, committed: 38 },
  { sprint: 'Sprint 3', completed: 42, committed: 45 },
  { sprint: 'Sprint 4', completed: 36, committed: 40 },
  { sprint: 'Sprint 5', completed: 45, committed: 45 },
  { sprint: 'Sprint 6', completed: 41, committed: 42 },
]

const teamPerformanceData = [
  { name: 'Alice', completed: 15, overdue: 2, avgTime: 4.2 },
  { name: 'Bob', completed: 12, overdue: 3, avgTime: 5.8 },
  { name: 'Carol', completed: 18, overdue: 1, avgTime: 3.5 },
  { name: 'David', completed: 8, overdue: 4, avgTime: 7.2 },
]

const projectDistributionData = [
  { name: 'Website Redesign', value: 35, color: 'hsl(var(--chart-1))' },
  { name: 'Mobile App', value: 25, color: 'hsl(var(--chart-2))' },
  { name: 'API Integration', value: 20, color: 'hsl(var(--chart-3))' },
  { name: 'Internal Tools', value: 15, color: 'hsl(var(--chart-4))' },
  { name: 'Documentation', value: 5, color: 'hsl(var(--chart-5))' },
]

export default function AnalyticsPage() {
  return (
    <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
              <p className="text-muted-foreground">Insights into your team&apos;s productivity and project health</p>
            </div>
            <Select defaultValue="30d" className="w-[160px]">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasks Created</CardTitle>
                <span className="text-3xl font-bold text-blue-500">245</span>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-green-500">+12% from last period</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
                <span className="text-3xl font-bold text-green-500">218</span>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-green-500">+8% from last period</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <span className="text-3xl font-bold text-primary">89%</span>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-green-500">+3% from last period</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Cycle Time</CardTitle>
                <span className="text-3xl font-bold text-orange-500">4.2 days</span>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-red-500">-0.5 days from last period</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="velocity">Velocity</TabsTrigger>
              <TabsTrigger value="team">Team Performance</TabsTrigger>
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
                            <Area
                              type="monotone"
                              dataKey="tasksCreated"
                              stroke="hsl(var(--chart-1))"
                              fillOpacity={1}
                              fill="url(#colorCreated)"
                              strokeWidth={2}
                            />
                            <Area
                              type="monotone"
                              dataKey="tasksCompleted"
                              stroke="hsl(var(--chart-2))"
                              fillOpacity={1}
                              fill="url(#colorCompleted)"
                              strokeWidth={2}
                            />
                            <Line
                              type="monotone"
                              dataKey="tasksOverdue"
                              stroke="hsl(var(--chart-3))"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={{ r: 4 }}
                            />
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
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={2}
                              dataKey="value"
                              nameKey="name"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number) => [value, 'tasks']}
                              content={<ChartTooltipContent />}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <ChartLegend
                          payload={statusData.map(d => ({ value: d.name, color: d.color }))}
                          className="mt-4 justify-center"
                        />
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
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={2}
                              dataKey="value"
                              nameKey="name"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {priorityData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number) => [value, 'tasks']}
                              content={<ChartTooltipContent />}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <ChartLegend
                          payload={priorityData.map(d => ({ value: d.name, color: d.color }))}
                          className="mt-4 justify-center"
                        />
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="velocity">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Team Velocity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[350px] w-full">
                      <ChartContainer
                        config={{
                          completed: { label: 'Completed', color: 'hsl(var(--chart-1))' },
                          committed: { label: 'Committed', color: 'hsl(var(--chart-2))' },
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={velocityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                            <XAxis dataKey="sprint" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Legend />
                            <Bar dataKey="completed" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="committed" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Velocity Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ChartContainer
                        config={{
                          velocity: { label: 'Velocity', color: 'hsl(var(--chart-3))' },
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={velocityData.map(d => ({ ...d, velocity: d.completed }))} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                            <XAxis dataKey="sprint" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Line
                              type="monotone"
                              dataKey="velocity"
                              stroke="hsl(var(--chart-3))"
                              strokeWidth={3}
                              dot={{ r: 6, strokeWidth: 2 }}
                              activeDot={{ r: 8, strokeWidth: 2 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

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

                <Card>
                  <CardHeader>
                    <CardTitle>Avg. Completion Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ChartContainer
                        config={{
                          avgTime: { label: 'Avg Time (hours)', color: 'hsl(var(--chart-3))' },
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={teamPerformanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                            <XAxis type="number" tick={{ fontSize: 12 }} />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="avgTime" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} layout="vertical" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

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
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={120}
                              paddingAngle={2}
                              dataKey="value"
                              nameKey="name"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {projectDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number) => [value, 'tasks']}
                              content={<ChartTooltipContent />}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <ChartLegend
                          payload={projectDistributionData.map(d => ({ value: d.name, color: d.color }))}
                          className="mt-4 justify-center"
                        />
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Completion Rate by Project</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { name: 'Website Redesign', rate: 85 },
                        { name: 'Mobile App', rate: 72 },
                        { name: 'API Integration', rate: 90 },
                        { name: 'Internal Tools', rate: 60 },
                        { name: 'Documentation', rate: 100 },
                      ].map(project => (
                        <div key={project.name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{project.name}</span>
                            <span className="font-medium">{project.rate}%</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${project.rate}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
  )
}
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Calendar, Clock, User, AlertTriangle } from 'lucide-react'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import { Task, User as UserType } from '@/types/task'
import { cn } from '@/lib/utils'

interface UpcomingDeadlinesProps {
  tasks: Task[]
  users: UserType[]
}

export function UpcomingDeadlines({ tasks, users }: UpcomingDeadlinesProps) {
  const upcomingTasks = tasks
    .filter(t => t.dueDate && !t.isCompleted)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 10)

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Deadlines</CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingTasks.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No upcoming deadlines</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Task</TableHead>
                  <TableHead className="min-w-[120px]">Due Date</TableHead>
                  <TableHead className="min-w-[100px]">Priority</TableHead>
                  <TableHead className="min-w-[150px]">Assignee</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingTasks.map(task => {
                  const dueDate = task.dueDate ? new Date(task.dueDate) : null
                  const isOverdueTask = dueDate && isPast(dueDate) && !isToday(dueDate)
                  const isDueToday = dueDate && isToday(dueDate)
                  const isDueTomorrow = dueDate && isTomorrow(dueDate)

                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <span>{task.title}</span>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {task.organization && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 whitespace-nowrap">{task.organization.name}</Badge>
                            )}
                            {task.project && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1 py-0 whitespace-nowrap">{task.project.name}</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className={cn(
                        isOverdueTask && 'text-red-500 font-medium',
                        isDueToday && 'text-orange-500 font-medium',
                        isDueTomorrow && 'text-yellow-500 font-medium'
                      )}>
                        {dueDate ? (
                          <span className="flex items-center gap-1">
                            {isOverdueTask && <AlertTriangle className="h-3 w-3" />}
                            {isDueToday && <Clock className="h-3 w-3" />}
                            {format(dueDate, 'MMM d, yyyy')}
                          </span>
                        ) : 'No due date'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={priorityColors[task.priority]}>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.assignee ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={task.assignee.avatar} alt={task.assignee.name} />
                              <AvatarFallback>{task.assignee.name[0]}</AvatarFallback>
                            </Avatar>
                            <span>{task.assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
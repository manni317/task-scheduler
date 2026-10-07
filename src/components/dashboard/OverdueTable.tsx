'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Calendar, AlertTriangle, Clock, User } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import { Task, User as UserType } from '@/types/task'
import { cn } from '@/lib/utils'

interface OverdueTableProps {
  tasks: Task[]
  users: UserType[]
}

export function OverdueTable({ tasks, users }: OverdueTableProps) {
  const overdueTasks = tasks
    .filter(t => t.dueDate && !t.isCompleted && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)))
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  const statusColors = {
    todo: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    review: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Overdue Tasks</CardTitle>
          <Badge variant="destructive">{overdueTasks.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {overdueTasks.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No overdue tasks 🎉</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueTasks.map(task => {
                  const dueDate = task.dueDate ? new Date(task.dueDate) : null
                  const daysOverdue = dueDate 
                    ? Math.ceil((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
                    : 0

                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <span>{task.title}</span>
                          <div className="flex items-center gap-1">
                            {task.organization && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 py-0">{task.organization.name}</Badge>
                            )}
                            {task.project && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1 py-0">{task.project.name}</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-red-500 font-medium">
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {format(dueDate!, 'MMM d, yyyy')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'font-medium',
                          daysOverdue > 7 ? 'text-red-500' : 'text-orange-500'
                        )}>
                          {daysOverdue} day{daysOverdue !== 1 ? 's' : ''}
                        </span>
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
                        <Badge variant="outline" className={statusColors[task.status]}>
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
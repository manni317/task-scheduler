'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { TrendingUp, TrendingDown, Minus, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { EmployeePerformance, User } from '@/types/task'
import { cn } from '@/lib/utils'

interface EmployeePerformanceTableProps {
  data: EmployeePerformance[]
  users: User[]
}

export function EmployeePerformanceTable({ data, users }: EmployeePerformanceTableProps) {
  const getPerformanceColor = (rate: number) => {
    if (rate >= 80) return 'text-green-500'
    if (rate >= 50) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getPerformanceIcon = (rate: number) => {
    if (rate >= 80) return <TrendingUp className="h-4 w-4" />
    if (rate >= 50) return <Minus className="h-4 w-4" />
    return <TrendingDown className="h-4 w-4" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No performance data available</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Member</TableHead>
                  <TableHead className="text-right">Assigned</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Overdue</TableHead>
                  <TableHead className="text-right">Completion Rate</TableHead>
                  <TableHead className="text-right">Avg. Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(perf => {
                  const user = users.find(u => u.id === perf.userId)
                  return (
                    <TableRow key={perf.userId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={perf.user.avatar} alt={perf.user.name} />
                            <AvatarFallback>{perf.user.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{perf.user.name}</p>
                            <p className="text-xs text-muted-foreground">{perf.user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{perf.tasksAssigned}</TableCell>
                      <TableCell className="text-right font-medium text-green-500">{perf.tasksCompleted}</TableCell>
                      <TableCell className="text-right font-medium text-red-500">{perf.tasksOverdue}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={cn('font-medium', getPerformanceColor(perf.completionRate))}>
                            {perf.completionRate.toFixed(1)}%
                          </span>
                          {getPerformanceIcon(perf.completionRate)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {perf.avgCompletionTime > 0 ? `${perf.avgCompletionTime.toFixed(1)}h` : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={perf.completionRate >= 80 ? 'default' : perf.completionRate >= 50 ? 'secondary' : 'destructive'}
                          className="gap-1"
                        >
                          {perf.completionRate >= 80 && <CheckCircle className="h-3 w-3" />}
                          {perf.completionRate >= 50 && perf.completionRate < 80 && <Clock className="h-3 w-3" />}
                          {perf.completionRate < 50 && <AlertCircle className="h-3 w-3" />}
                          {perf.completionRate >= 80 ? 'On Track' : perf.completionRate >= 50 ? 'At Risk' : 'Behind'}
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
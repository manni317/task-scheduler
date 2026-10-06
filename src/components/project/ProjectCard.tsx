'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Users, FolderKanban, Clock, TrendingUp, MoreHorizontal, Edit, Trash2, Archive, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import { Project, User } from '@/types/task'
import { cn } from '@/lib/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

interface ProjectCardProps {
  project: Project
  userRole?: string
  onClick: () => void
  onEdit?: () => void
  onDelete?: () => void
  onArchive?: () => void
}
export function ProjectCard({ project, userRole = 'manager', onClick, onEdit, onDelete, onArchive }: ProjectCardProps) {
  const totalTasks = project.tasks?.length || 0
  const completedTasks = project.tasks?.filter(t => t.isCompleted).length || 0
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <Card className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={cn(
              'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
              `bg-[${project.color}]/20 text-[${project.color}]`
            )}>
              {project.icon ? (
                <span className="text-xl">{project.icon}</span>
              ) : (
                <FolderKanban className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg truncate">{project.name}</CardTitle>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-[10px] text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-md shrink-0">{project.key}</span>
                {project.organization && (
                  <span className="text-[10px] text-primary flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 shrink-0 max-w-[130px]">
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{project.organization.name}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          {userRole !== 'doer' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </DropdownMenuItem>
                )}
                {onArchive && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(); }}>
                    <Archive className="h-4 w-4 mr-2" /> {project.isArchived ? 'Unarchive' : 'Archive'}
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-500" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        {project.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{project.description}</p>
        )}

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {completedTasks} of {totalTasks} tasks completed
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-1.5 bg-muted/50 rounded-lg flex flex-col items-center justify-center">
              <Users className="h-4 w-4 text-muted-foreground mb-1" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Members</p>
              <p className="font-medium text-sm">{project.members?.length || 0}</p>
            </div>
            <div className="p-1.5 bg-muted/50 rounded-lg flex flex-col items-center justify-center">
              <FolderKanban className="h-4 w-4 text-muted-foreground mb-1" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tasks</p>
              <p className="font-medium text-sm">{totalTasks}</p>
            </div>
            <div className="p-1.5 bg-muted/50 rounded-lg flex flex-col items-center justify-center">
              <TrendingUp className="h-4 w-4 text-muted-foreground mb-1" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Complete</p>
              <p className="font-medium text-sm text-green-500">{progress}%</p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 border-t">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {project.members?.slice(0, 3).map((member: User) => (
              <Avatar key={member.id} className="h-6 w-6 ring-2 ring-background -ml-1">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback>{member.name[0]}</AvatarFallback>
              </Avatar>
            ))}
            {(project.members?.length || 0) > 3 && (
              <Badge variant="outline" className="text-xs ml-1">
                +{(project.members?.length || 0) - 3}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            Updated {format(new Date(project.updatedAt), 'MMM d')}
          </span>
        </div>
      </CardFooter>
    </Card>
  )
}
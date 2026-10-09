'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  BarChart,
  Settings,
  Users,
  Archive,
  Plus,
  ChevronRight,
  ChevronDown,
  Calendar,
} from 'lucide-react'
import { useState } from 'react'
import { useUIStore } from '@/hooks/use-ui-store'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/contexts/OrganizationContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const mainNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Organizations', href: '/organizations', icon: Users },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Analytics', href: '/analytics', icon: BarChart },
]

const secondaryNavigation = [
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Archived', href: '/archived', icon: Archive },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar({ isOpen = true, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname()
  const { openCreateTaskModal } = useUIStore()
  const { profile } = useAuth()
  const { organizations, activeOrganization, setActiveOrganization } = useOrganization()
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    main: false,
    secondary: false,
  })

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const userRole = profile?.role || 'employee'

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col fixed left-0 top-0 z-50 h-full border-r bg-card transition-all duration-200',
        isOpen ? 'w-64' : 'w-16'
      )}
      aria-label="Sidebar"
    >
      <div className="flex flex-col h-full">
        <div className="flex flex-col border-b">
          <div className="flex h-16 items-center justify-between px-4">
            {isOpen && (
              <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
                <div className="h-8 w-8 rounded-xl overflow-hidden flex items-center justify-center shrink-0 shadow-sm border bg-white">
                  <img src="/logo.png" alt="TaskFlow Logo" className="h-full w-full object-cover" />
                </div>
                <span>TaskFlow</span>
              </Link>
            )}
          </div>
          
          {isOpen && activeOrganization && (
            <div className="px-4 pb-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between px-3 h-10 border-input bg-background">
                    <div className="flex items-center gap-2 truncate">
                      <div className="h-5 w-5 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {activeOrganization.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate text-sm font-medium">{activeOrganization.name}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start">
                  <DropdownMenuLabel className="text-xs text-muted-foreground uppercase">Workspaces</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {organizations.map(org => (
                    <DropdownMenuItem 
                      key={org.id} 
                      onClick={() => setActiveOrganization(org)}
                      className={cn("flex items-center gap-2 cursor-pointer", activeOrganization.id === org.id && "bg-accent/50")}
                    >
                      <div className="h-5 w-5 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{org.name}</span>
                    </DropdownMenuItem>
                  ))}
                  {userRole === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/organizations" className="cursor-pointer text-primary w-full flex items-center">
                          <Plus className="mr-2 h-4 w-4" />
                          <span>Create Workspace</span>
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-6" aria-label="Main navigation">
          <div>
            {isOpen && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Main
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => toggleSection('main')}
                  aria-label={collapsedSections.main ? 'Expand' : 'Collapse'}
                >
                  {collapsedSections.main ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            )}
            {!collapsedSections.main && (
              <ul className="space-y-1" role="list">
                {mainNavigation.map(item => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  const Icon = item.icon
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                          !isOpen && 'justify-center px-2'
                        )}
                        title={isOpen ? undefined : item.name}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                        {isOpen && <span>{item.name}</span>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div>
            {isOpen && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  More
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => toggleSection('secondary')}
                  aria-label={collapsedSections.secondary ? 'Expand' : 'Collapse'}
                >
                  {collapsedSections.secondary ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            )}
            {!collapsedSections.secondary && (
              <ul className="space-y-1" role="list">
                {secondaryNavigation
                  .filter(item => userRole === 'admin' || userRole === 'manager' || item.name !== 'Team')
                  .map(item => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  const Icon = item.icon
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                          !isOpen && 'justify-center px-2'
                        )}
                        title={isOpen ? undefined : item.name}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                        {isOpen && <span>{item.name}</span>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {isOpen && (userRole === 'admin' || userRole === 'manager') && (
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 border-primary/20 text-primary hover:bg-primary/10 transition-colors"
                onClick={openCreateTaskModal}
              >
                <Plus className="h-4 w-4" />
                <span>New Task</span>
              </Button>
            </div>
          )}
        </nav>

        <div className="p-4 border-t">
          {isOpen ? (
            <div className="flex items-center gap-3 px-2">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm font-medium uppercase">{profile?.full_name?.charAt(0) || 'U'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate capitalize">{profile?.full_name || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.email || 'user@example.com'}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm font-medium uppercase">{profile?.full_name?.charAt(0) || 'U'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
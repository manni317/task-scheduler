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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  Flame,
} from 'lucide-react'
import { useState } from 'react'
import { useUIStore } from '@/hooks/use-ui-store'
import { useAuth } from '@/hooks/useAuth'

const mainNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Organizations', href: '/organizations', icon: Users },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Analytics', href: '/analytics', icon: BarChart },
]

const secondaryNavigation = [
  { name: 'Workload Heatmap', href: '/dashboard?tab=workload', icon: Flame },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Archived', href: '/archived', icon: Archive },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar({ 
  isOpen = true, 
  onClose,
  onToggle,
}: { 
  isOpen?: boolean; 
  onClose?: () => void;
  onToggle?: () => void;
}) {
  const pathname = usePathname()
  const { openCreateTaskModal } = useUIStore()
  const { profile } = useAuth()
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    main: false,
    secondary: false,
  })

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const userRole = profile?.role || 'employee'

  const handleLinkClick = () => {
    // Only close sidebar on mobile viewport (< 768px). Keep open on desktop.
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      onClose?.()
    }
  }

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col fixed left-0 top-0 z-50 h-full border-r bg-card transition-all duration-200',
        isOpen ? 'w-64' : 'w-16'
      )}
      aria-label="Sidebar"
    >
      <div className="flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="flex h-16 items-center px-3 border-b">
          {isOpen ? (
            <div className="flex items-center justify-between w-full">
              <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-lg min-w-0">
                <div className="h-8 w-8 rounded-xl overflow-hidden flex items-center justify-center shrink-0 shadow-sm border bg-white p-0.5">
                  <img src="/logo.png" alt="SysB International" className="h-full w-full object-contain" />
                </div>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="truncate font-extrabold tracking-tight text-foreground">SysB</span>
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider -mt-0.5">International</span>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 shrink-0 hidden md:flex"
                title="Collapse Sidebar (Ctrl+B)"
                aria-label="Collapse Sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-10 w-10 rounded-xl hover:bg-muted p-0 text-muted-foreground hover:text-foreground transition-all group relative"
                title="Expand Sidebar (Click to expand or Ctrl+B)"
                aria-label="Expand Sidebar"
              >
                <div className="h-8 w-8 rounded-xl overflow-hidden flex items-center justify-center shrink-0 shadow-sm border bg-white p-0.5 group-hover:scale-105 group-hover:ring-2 group-hover:ring-primary/40 transition-all">
                  <img src="/logo.png" alt="SysB International" className="h-full w-full object-contain" />
                </div>
              </Button>
            </div>
          )}
        </div>

        {/* Navigation list */}
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
                        onClick={handleLinkClick}
                        className={cn(
                          'group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                          isActive
                            ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm shadow-primary/5 dark:bg-primary/15'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
                          !isOpen && 'justify-center px-2'
                        )}
                        title={isOpen ? undefined : item.name}
                      >
                        {isActive && <div className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-primary" />}
                        <Icon className={cn("h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-105", isActive ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                        {isOpen && <span className="ml-0.5">{item.name}</span>}
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
                  const isHeatmapItem = item.href === '/dashboard?tab=workload'
                  const displayName = isHeatmapItem 
                    ? (userRole === 'admin' || userRole === 'manager' ? 'Workload Heatmap' : 'My Workload')
                    : item.name

                  const isActive = pathname === item.href || (item.href === '/dashboard?tab=workload' && pathname === '/dashboard' && typeof window !== 'undefined' && window.location.search.includes('tab=workload'))
                  const Icon = item.icon
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={handleLinkClick}
                        className={cn(
                          'group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                          isActive
                            ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm shadow-primary/5 dark:bg-primary/15'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
                          !isOpen && 'justify-center px-2'
                        )}
                        title={isOpen ? undefined : displayName}
                      >
                        {isActive && <div className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-primary" />}
                        <Icon className={cn("h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-105", isActive ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                        {isOpen && <span className="ml-0.5">{displayName}</span>}
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

        {/* Sidebar Footer with Expand/Collapse Controls */}
        <div className="p-3 border-t">
          {isOpen ? (
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold uppercase">{profile?.full_name?.charAt(0) || 'U'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate capitalize text-foreground">{profile?.full_name || 'User'}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{profile?.email || 'user@example.com'}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 shrink-0 hidden md:flex"
                title="Collapse Sidebar (Ctrl+B)"
                aria-label="Collapse Sidebar"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-8 w-8 rounded-xl text-primary hover:bg-primary/10 border border-primary/20 hover:border-primary/40 shadow-xs transition-all"
                title="Expand Sidebar (Click to expand or Ctrl+B)"
                aria-label="Expand Sidebar"
              >
                <ChevronRight className="h-4 w-4 animate-pulse" />
              </Button>
              <div 
                className="h-7 w-7 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all" 
                onClick={onToggle} 
                title={`${profile?.full_name || 'User'} (Click to expand)`}
              >
                <span className="text-xs font-medium uppercase">{profile?.full_name?.charAt(0) || 'U'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
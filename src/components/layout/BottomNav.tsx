'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  BarChart2,
  Plus,
} from 'lucide-react'
import { useUIStore } from '@/hooks/use-ui-store'
import { useAuth } from '@/hooks/useAuth'

const navigation = [
  { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Stats', href: '/analytics', icon: BarChart2 },
]

export function BottomNav() {
  const pathname = usePathname()
  const { openCreateTaskModal } = useUIStore()
  const { profile } = useAuth()
  const [userRole, setUserRole] = useState('employee')
  const isManager = userRole === 'admin' || userRole === 'manager'

  useEffect(() => {
    setUserRole(profile?.role || 'employee')
  }, [profile])

  return (
    <nav
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden"
      style={{ width: isManager ? '92%' : '88%', maxWidth: '440px' }}
      aria-label="Bottom navigation"
    >
      <div className="relative flex h-[64px] items-center justify-around rounded-[22px] bg-card border border-border shadow-xl shadow-black/10 dark:shadow-black/30 px-2">

        {navigation.map((item, idx) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          // If manager, leave a gap in the middle for FAB
          const isAfterFab = isManager && idx >= 2

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-2xl transition-all duration-200 relative',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
                isAfterFab && isManager && 'ml-8'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* active pill indicator */}
              {isActive && (
                <span className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary" />
              )}
              <div className={cn(
                'flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-200',
                isActive ? 'bg-primary/10' : ''
              )}>
                <Icon className={cn('h-[18px] w-[18px]', isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]')} aria-hidden="true" />
              </div>
              <span className={cn('text-[10px] font-semibold leading-none', isActive ? 'text-primary' : '')}>
                {item.name}
              </span>
            </Link>
          )
        })}

        {/* Floating action button — centered absolutely */}
        {isManager && (
          <div className="absolute left-1/2 -translate-x-1/2 -top-5">
            <button
              onClick={openCreateTaskModal}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-200 hover:scale-105 hover:shadow-primary/50 active:scale-95"
              aria-label="Create new task"
            >
              <Plus className="h-6 w-6 stroke-[2.5px]" />
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
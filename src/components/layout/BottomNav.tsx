'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  BarChart,
  Settings,
  Plus,
} from 'lucide-react'
import { useUIStore } from '@/hooks/use-ui-store'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Analytics', href: '/analytics', icon: BarChart },
]

export function BottomNav() {
  const pathname = usePathname()
  const { openCreateTaskModal } = useUIStore()
  const [userRole, setUserRole] = useState('manager')

  useEffect(() => {
    setUserRole(localStorage.getItem('userRole') || 'manager')
  }, [])

  return (
    <nav
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-md rounded-2xl border border-white/20 bg-background/70 backdrop-blur-xl shadow-2xl supports-[backdrop-filter]:bg-background/50 md:hidden overflow-hidden"
      aria-label="Bottom navigation"
    >
      <div className="flex h-16 items-center justify-around">
        {navigation.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1.5 px-3 py-3 text-xs font-semibold transition-all duration-300 ease-in-out relative',
                isActive
                  ? 'text-primary scale-110'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <span className="absolute -top-1 left-1/2 w-1 h-1 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
              )}
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.name}</span>
            </Link>
          )
        })}
        {userRole !== 'doer' && (
          <div className="relative -top-3">
            <button
              onClick={openCreateTaskModal}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-indigo-500 text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-300 hover:scale-110 hover:shadow-primary/50"
              aria-label="Create new project or task"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Search, Bell, Menu, Sun, Moon, LogOut, User, Settings, ChevronDown, Calendar } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import { startOfDay } from 'date-fns'
import { useAuth } from '@/hooks/useAuth'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { name: 'Tasks', href: '/tasks', icon: 'CheckSquare' },
  { name: 'Projects', href: '/projects', icon: 'FolderKanban' },
  { name: 'Calendar', href: '/calendar', icon: 'Calendar' },
  { name: 'Analytics', href: '/analytics', icon: 'BarChart' },
  { name: 'Settings', href: '/settings', icon: 'Settings' },
]

export function Header() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { profile } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
      // Notification check
      const checkNotifications = async () => {
        if (sessionStorage.getItem('notified_today')) return
        sessionStorage.setItem('notified_today', 'true')

        const userRole = profile?.role || 'employee'
        const userId = profile?.id

        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const today = startOfDay(new Date()).toISOString()

        try {
          if (userRole === 'employee' && userId) {
            const { count } = await supabase
              .from('tasks')
              .select('id', { count: 'exact' })
              .eq('assignee_id', userId)
              .gte('created_at', today)

            if (count && count > 0) {
              setTimeout(() => toast.info(`You have ${count} new task(s) assigned today! 📝`, { duration: 6000 }), 1000)
            }
          } else if ((userRole === 'manager' || userRole === 'admin') && userId) {
            const { count } = await supabase
              .from('task_updates')
              .select('id', { count: 'exact' })
              .gte('created_at', today)
              .neq('user_id', userId)
        
            if (count && count > 0) {
              setTimeout(() => toast.info(`There are ${count} new task updates from your team today! 🔔`, { duration: 6000 }), 1000)
            }
          }
        } catch (err) {
          console.error('Failed to fetch notifications', err)
        }
      }

      checkNotifications()
    }, [profile])

  const userName = profile?.full_name || 'User'
  const userEmail = profile?.email || 'user@example.com'

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">M</span>
            </div>
            <span className="hidden sm:block">TaskFlow</span>
          </Link>

          <div className="hidden md:flex md:gap-1">
            {navigation.map(item => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  pathname === item.href || pathname.startsWith(item.href + '/')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks, projects..."
              className="h-9 w-64 pl-10 pr-4 text-sm"
              onFocus={e => setSearchOpen(true)}
              onBlur={e => setTimeout(() => setSearchOpen(false), 200)}
            />
            {searchOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg p-2 z-50">
                <p className="text-sm text-muted-foreground px-2 py-1">Search results would appear here</p>
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative cursor-pointer">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-y-auto">
                <DropdownMenuItem className="cursor-pointer p-3 flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2 w-full">
                    <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                    <span className="font-medium text-sm">New Task Assigned</span>
                    <span className="text-xs text-muted-foreground ml-auto">2m ago</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-4 line-clamp-1">Gaurav assigned you to "Update Landing Page"</p>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer p-3 flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2 w-full">
                    <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                    <span className="font-medium text-sm">Task Completed</span>
                    <span className="text-xs text-muted-foreground ml-auto">1h ago</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-4 line-clamp-1">"Setup Database" has been moved to Done</p>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer p-3 flex flex-col items-start gap-1 opacity-60">
                  <div className="flex items-center gap-2 w-full">
                    <span className="font-medium text-sm">Welcome to TaskFlow</span>
                    <span className="text-xs text-muted-foreground ml-auto">1d ago</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">Your account has been successfully created. Start by creating a project!</p>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer justify-center text-primary font-medium">
                Mark all as read
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile?.avatar_url || "/avatar.png"} alt={userName} />
                  <AvatarFallback className="uppercase">{userName.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none capitalize">{userName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-500 focus:text-red-500 cursor-pointer" 
                onClick={async () => {
                  try {
                    const supabase = createBrowserClient(
                      process.env.NEXT_PUBLIC_SUPABASE_URL!,
                      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                    )
                    await supabase.auth.signOut()
                    window.location.href = '/login'
                  } catch (error) {
                    console.error('Logout failed:', error)
                    window.location.href = '/login'
                  }
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl" onClick={() => setMobileMenuOpen(false)}>
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">M</span>
              </div>
              <span>TaskFlow</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
              <span className="h-5 w-5 flex items-center justify-center text-xl">×</span>
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground px-2 mb-2">Main</p>
              {navigation.map(item => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors',
                    pathname === item.href || pathname.startsWith(item.href + '/')
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
            <div className="space-y-1 pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground px-2 mb-2">More</p>
              <Link href="/team" className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-muted-foreground hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                Team
              </Link>
              <Link href="/archived" className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-muted-foreground hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                Archived
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
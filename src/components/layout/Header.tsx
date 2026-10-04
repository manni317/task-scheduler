'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
import { InstallPWA } from '@/components/pwa/InstallPWA'

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
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden rounded-xl h-9 w-9"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link href="/dashboard" className="flex items-center gap-2.5 font-extrabold text-lg">
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/30">
              <span className="text-primary-foreground font-black text-sm">T</span>
            </div>
            <span className="hidden sm:block tracking-tight">TaskFlow</span>
          </Link>

          <nav className="hidden md:flex md:items-center md:gap-1 ml-2">
            {navigation.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search tasks..."
              className="h-9 w-56 pl-10 pr-4 text-sm rounded-full border-border/60 bg-muted/50 focus:bg-card focus:w-64 transition-all duration-300"
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            />
            {searchOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-lg p-2 z-50 animate-pop">
                <p className="text-sm text-muted-foreground px-3 py-2">Type to search tasks & projects…</p>
              </div>
            )}
          </div>

          <InstallPWA />
          
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

      {/* Mobile Drawer */}
      {mobileMenuOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer panel */}
          <div className="relative z-10 w-72 max-w-[85vw] bg-background h-full flex flex-col shadow-2xl animate-slide-up" style={{ animation: 'slide-in-from-left 0.3s cubic-bezier(.16,1,.3,1)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <Link href="/dashboard" className="flex items-center gap-2.5 font-extrabold text-lg" onClick={() => setMobileMenuOpen(false)}>
                <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/30">
                  <span className="text-primary-foreground font-black text-sm">T</span>
                </div>
                <span>TaskFlow</span>
              </Link>
              <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8" onClick={() => setMobileMenuOpen(false)}>
                <span className="text-lg leading-none">×</span>
              </Button>
            </div>

            {/* Nav links */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-3 mb-3">Navigation</p>
              {navigation.map(item => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3.5 rounded-2xl text-base font-semibold transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                )
              })}
              <div className="pt-4 border-t border-border mt-4 space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-3 mb-3">More</p>
                <Link href="/team" className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-base font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all" onClick={() => setMobileMenuOpen(false)}>
                  Team
                </Link>
                <Link href="/archived" className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-base font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all" onClick={() => setMobileMenuOpen(false)}>
                  Archived
                </Link>
              </div>
            </div>

            {/* User info at bottom */}
            <div className="px-4 py-4 border-t border-border">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile?.avatar_url || ''} alt={userName} />
                  <AvatarFallback className="uppercase font-bold text-sm bg-primary text-primary-foreground">{userName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold capitalize truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  )
}
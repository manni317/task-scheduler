import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/supabase'

export async function createMiddlewareSupabaseClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  return { supabase, response }
}

export async function getUser(request: NextRequest) {
  const { supabase } = await createMiddlewareSupabaseClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  return { user, supabase }
}

export async function getSession(request: NextRequest) {
  const { supabase } = await createMiddlewareSupabaseClient(request)
  const { data: { session } } = await supabase.auth.getSession()
  return { session, supabase }
}

export function createRouteMatcher(routes: string[]) {
  return (request: NextRequest) => {
    const pathname = request.nextUrl.pathname
    return routes.some(route => {
      if (route.endsWith('*')) {
        return pathname.startsWith(route.slice(0, -1))
      }
      return pathname === route
    })
  }
}

const protectedRoutes = createRouteMatcher([
  '/dashboard*',
  '/tasks*',
  '/projects*',
  '/calendar*',
  '/settings*',
])

const authRoutes = createRouteMatcher([
  '/login',
  '/signup',
  '/auth/*',
])

export async function middleware(request: NextRequest) {
  // DEV BYPASS: Skip auth checks in development mode for UI preview
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next()
  }

  const { supabase, response } = await createMiddlewareSupabaseClient(request)
  const { data: { session } } = await supabase.auth.getSession()

  const isProtectedRoute = protectedRoutes(request)
  const isAuthRoute = authRoutes(request)

  // Redirect unauthenticated users to login
  if (isProtectedRoute && !session) {
    // BYPASSED for development: let user see the UI without login
    // const redirectUrl = new URL('/login', request.url)
    // redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    // return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && session) {
    // BYPASSED
    // return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Role-based access control for admin routes
  if (session && request.nextUrl.pathname.startsWith('/dashboard/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Project-specific role checks
  if (session) {
    const projectMatch = request.nextUrl.pathname.match(/^\/projects\/([^/]+)/)
    if (projectMatch) {
      const projectId = projectMatch[1]

      // Check project membership for project routes (except view)
      if (request.nextUrl.pathname !== `/projects/${projectId}`) {
        const { data: membership } = await supabase
          .from('project_members')
          .select('role')
          .eq('project_id', projectId)
          .eq('user_id', session.user.id)
          .single()

        if (!membership) {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }

        // Member-only routes (edit, delete, manage members)
        const memberRoutes = [
          `/projects/${projectId}/edit`,
          `/projects/${projectId}/delete`,
          `/projects/${projectId}/members`,
          `/projects/${projectId}/settings`,
        ]
        const isMemberRoute = memberRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

        if (isMemberRoute && membership.role === 'viewer') {
          return NextResponse.redirect(new URL(`/projects/${projectId}`, request.url))
        }

        // Admin-only routes within project
        const projectAdminRoutes = [`/projects/${projectId}/members`, `/projects/${projectId}/settings`]
        const isProjectAdminRoute = projectAdminRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

        if (isProjectAdminRoute && !['owner', 'admin'].includes(membership.role)) {
          return NextResponse.redirect(new URL(`/projects/${projectId}`, request.url))
        }
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
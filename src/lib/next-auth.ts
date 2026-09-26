import { NextAuthOptions } from 'next-auth'
import { SupabaseAdapter } from '@auth/supabase-adapter'
import GitHubProvider from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'
import { createClient } from '@supabase/supabase-js'

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  }),
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID || 'placeholder',
      clientSecret: process.env.GITHUB_SECRET || 'placeholder',
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'placeholder',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder',
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
    verifyRequest: '/login',
    newUser: '/onboarding',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role || 'member'
      }
      if (trigger === 'update' && session) {
        token.role = session.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).role = token.role
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  events: {
    async createUser({ user }) {
      // Create profile for new user
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
      )
      await supabase.from('profiles').insert({
        user_id: user.id,
        full_name: user.name || user.email?.split('@')[0],
        email: user.email,
        avatar_url: user.image,
        role: 'member',
      })
    },
  },
  debug: process.env.NODE_ENV === 'development',
}
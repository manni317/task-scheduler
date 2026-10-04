'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginWithEmail, signUpWithEmail, bypassedLogin } from '@/app/actions/auth'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, Zap } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  const handleEmailAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    
    const formData = new FormData(e.currentTarget)
    
    try {
      if (isSignUp) {
        const res = await signUpWithEmail(formData)
        if (res.error) {
          toast.error(res.error)
          setIsLoading(false)
          return
        }
        toast.success('Account created! Please check your email to verify (or try logging in).')
        setIsSignUp(false)
        setIsLoading(false)
      } else {
        const res = await loginWithEmail(formData)
        if (res.error) {
          toast.error(res.error)
          setIsLoading(false)
          return
        }
        toast.success('Logged in successfully! Taking you to dashboard...')
        setTimeout(() => {
          router.push('/dashboard')
        }, 1000)
      }
    } catch (err) {
      toast.error('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[hsl(220,20%,97%)] px-4">
      {/* EverSync-style background blobs */}
      <div className="absolute top-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full bg-blue-500/15 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-400/10 blur-[100px] pointer-events-none" />
      <div className="absolute top-[30%] left-[5%] w-[30%] h-[30%] rounded-full bg-sky-300/10 blur-[80px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo & title */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-5 shadow-xl shadow-primary/30">
            <Zap className="w-8 h-8 text-white fill-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {isSignUp ? 'Create Account' : 'Welcome back'}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            {isSignUp ? 'Join your team on TaskFlow' : 'Sign in to access your workflow'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-3xl shadow-lg shadow-black/5 p-8">
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-foreground">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-foreground">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-sm"
                placeholder="••••••••"
              />
            </div>
            
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-primary hover:bg-primary/90 text-white font-semibold rounded-full shadow-lg shadow-primary/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed text-sm"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign in to Dashboard')}
              </button>
            </div>
          </form>

          {/* Feature hints */}
          {!isSignUp && (
            <div className="mt-6 space-y-2.5">
              {[
                'Manage tasks with your team',
                'Real-time updates & notifications',
                'Mobile-first PWA experience',
              ].map(hint => (
                <div key={hint} className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs text-muted-foreground">{hint}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="text-center pt-5 mt-4 border-t border-border">
            <button 
              type="button" 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <span className="text-primary font-semibold hover:underline">{isSignUp ? 'Sign in' : 'Sign up'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
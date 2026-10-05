'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginWithEmail, signUpWithEmail } from '@/app/actions/auth'
import { toast } from 'sonner'
import { Loader2, Zap, Lock, Mail } from 'lucide-react'
import { AnimatedBackground } from '@/components/ui/animated-background'

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
        toast.success('Account created! Please check your email to verify.')
        setIsSignUp(false)
        setIsLoading(false)
      } else {
        const res = await loginWithEmail(formData)
        if (res.error) {
          toast.error(res.error)
          setIsLoading(false)
          return
        }
        toast.success('Logged in successfully!')
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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 px-4 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300">
      
      <div className="relative z-10 w-full max-w-[420px]">
        {/* Card */}
        <div className="bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-white/10 rounded-3xl shadow-xl p-8 sm:p-10 relative overflow-hidden transition-all duration-300">
          
          {/* Logo & title */}
          <div className="text-center mb-8 relative z-10">
            <div className="mx-auto w-14 h-14 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30 ring-1 ring-black/5 dark:ring-white/20">
              <Zap className="w-7 h-7 text-white fill-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
              {isSignUp ? 'Create Account' : 'Task Manager'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {isSignUp ? 'Start managing tasks like a pro.' : 'Sign in to your high-performance workspace.'}
            </p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-5 relative z-10">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <label htmlFor="fullName" className="text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      className="w-full pl-4 pr-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-300 text-sm hover:bg-slate-50 dark:hover:bg-white/10"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="companyName" className="text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Company Name
                  </label>
                  <div className="relative">
                    <input
                      id="companyName"
                      name="companyName"
                      type="text"
                      required
                      className="w-full pl-4 pr-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-300 text-sm hover:bg-slate-50 dark:hover:bg-white/10"
                      placeholder="Acme Corp"
                    />
                  </div>
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                Work Email
              </label>
              <div className="relative group">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-300 text-sm hover:bg-slate-50 dark:hover:bg-white/10"
                  placeholder="you@example.com"
                />
                <Mail className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                {!isSignUp && (
                  <a href="#" className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                    Forgot Password?
                  </a>
                )}
              </div>
              <div className="relative group">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-300 text-sm hover:bg-slate-50 dark:hover:bg-white/10"
                  placeholder="••••••••"
                />
                <Lock className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
              </div>
            </div>
            
            <div className="pt-4">
              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 dark:hover:from-indigo-400 dark:hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed text-sm border border-transparent dark:border-white/10 overflow-hidden relative group"
              >
                {/* Shine effect on hover */}
                <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
                
                {isLoading && <Loader2 className="h-4 w-4 animate-spin relative z-10" />}
                <span className="relative z-10">
                  {isLoading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign In')}
                </span>
              </button>
            </div>
          </form>
          
        </div>

        <div className="text-center mt-6">
          <button 
            type="button" 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-200"
          >
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">{isSignUp ? 'Sign In' : 'Sign Up'}</span>
          </button>
        </div>
        
        <div className="text-center mt-12 text-xs text-slate-500 dark:text-slate-500 flex justify-center gap-4">
          <a href="#" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Product</a>
          <a href="#" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Features</a>
          <a href="#" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Support</a>
        </div>
      </div>
    </div>
  )
}
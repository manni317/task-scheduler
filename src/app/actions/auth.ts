'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export async function bypassedLogin(email: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  const { data, error } = await supabaseAdmin.from('profiles').select('id, role, full_name').eq('email', email).single()
  
  if (error || !data) {
    // If user not found, default to 'doer' instead of manager for safety
    return { id: 'dummy-id', role: 'doer', full_name: 'Unknown User', email }
  }

  return { id: data.id, role: data.role || 'doer', full_name: data.full_name, email }
}

export async function loginWithEmail(formData: FormData) {
  const email = (formData.get('email') as string).trim()
  const password = formData.get('password') as string

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function signUpWithEmail(formData: FormData) {
  const email = (formData.get('email') as string).trim()
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string || 'Admin User'
  const companyName = formData.get('companyName') as string || 'My Company'

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        company_name: companyName
      }
    }
  })

  if (error) {
    return { error: error.message }
  }
  
  if (data.user) {
    // Attempt to manually update the profiles table immediately
    // since we want them to default to admin with company_name
    await supabase.from('profiles').update({
      full_name: fullName,
      company_name: companyName,
      email: email,
      role: 'admin'
    }).eq('id', data.user.id)
  }
  
  return { success: true }
}

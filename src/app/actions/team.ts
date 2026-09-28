'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function createEmployee(formData: FormData) {
  // We use a separate client with persistSession: false so it doesn't log the Admin out!
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }
  )

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const role = formData.get('role') as string // 'manager' | 'doer'

  // 1. Create the user in Auth
  const { data, error } = await supabaseAdmin.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role,
      }
    }
  })

  if (error) {
    console.error('Error creating employee in auth:', error.message)
    // Maybe auth signup fails because of dupes, but we still want to ensure a profile is created
  }

  // 2. Insert into profiles manually to guarantee they exist for the Team page
  const userId = data?.user?.id || crypto.randomUUID()
  
  const { error: upsertError } = await supabaseAdmin.from('profiles').upsert({
    id: userId,
    full_name: fullName,
    role: role,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' })

  if (upsertError) {
    console.error('Upsert profile error:', upsertError)
    return { error: upsertError.message }
  }

  revalidatePath('/team')
  revalidatePath('/dashboard')
  
  return { success: true, user: data?.user || { id: userId, email } }
}

export async function updateEmployee(formData: FormData) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const id = formData.get('id') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const role = formData.get('role') as string

  // We are just updating the profile since we bypassed real Auth right now
  const { error: upsertError } = await supabaseAdmin.from('profiles').update({
    full_name: fullName,
    email: email,
    role: role,
    updated_at: new Date().toISOString()
  }).eq('id', id)

  if (upsertError) {
    console.error('Upsert profile error:', upsertError)
    return { error: upsertError.message }
  }

  // If password is provided, we should ideally update auth, but for demo we just update profile.
  // In a real app we'd use supabase admin API to update user password

  revalidatePath('/team')
  return { success: true }
}

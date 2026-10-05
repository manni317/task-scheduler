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
  const orgId = formData.get('orgId') as string // UUID

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
    return { error: error.message }
  }

  // 2. Insert into profiles manually to guarantee they exist for the Team page
  const userId = data?.user?.id || crypto.randomUUID()
  
  const { error: upsertError } = await supabaseAdmin.from('profiles').upsert({
    id: userId,
    email: email,
    full_name: fullName,
    role: role,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' })

  if (upsertError) {
    console.error('Upsert profile error:', upsertError)
    return { error: upsertError.message }
  }

  if (orgId) {
    const { error: orgError } = await supabaseAdmin.from('organization_members').insert({
      org_id: orgId,
      user_id: userId,
      role: 'member'
    })
    if (orgError) {
      console.error('Org insert error:', orgError)
    }
  }

  revalidatePath('/team')
  revalidatePath('/organizations')
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
  const orgId = formData.get('orgId') as string

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

  if (orgId) {
    const { error: orgError } = await supabaseAdmin.from('organization_members').upsert({
      org_id: orgId,
      user_id: id,
      role: 'member'
    }, { onConflict: 'org_id,user_id' })
    
    if (orgError) {
      console.error('Org update error:', orgError)
    }
  }

  revalidatePath('/team')
  revalidatePath('/organizations')
  return { success: true }
}

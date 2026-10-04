const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function deleteUnassigned() {
  const { data, error } = await supabase
    .from('tasks')
    .delete()
    .or('assignee_id.is.null,assignee_id.eq.unassigned')
  
  if (error) {
    console.error('Error deleting unassigned tasks:', error)
  } else {
    console.log('Successfully deleted unassigned tasks.')
  }
}

deleteUnassigned()

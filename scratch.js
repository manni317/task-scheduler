require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function test() {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: 'Test Task',
      description: 'Test description',
      project_id: null,
      assignee_id: null,
      reporter_id: 'dummy-id',
      status: 'todo',
      priority: 2,
      due_date: null,
      tags: [],
      task_key: `TSK-${Math.floor(Math.random() * 10000)}`
    })
    .select()
    
  if (error) {
    console.error('ERROR:', error)
  } else {
    console.log('SUCCESS:', data)
  }
}

test()

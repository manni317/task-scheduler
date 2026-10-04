const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/tasks?assignee_id=is.null';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

fetch(url, {
  method: 'DELETE',
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key
  }
}).then(res => {
  if (res.ok) {
    console.log('Successfully deleted unassigned tasks!');
  } else {
    res.text().then(text => console.error('Error:', res.status, text));
  }
}).catch(console.error);

const url2 = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/tasks?assignee_id=eq.unassigned';
fetch(url2, {
  method: 'DELETE',
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key
  }
}).then(res => {
  if (res.ok) {
    console.log('Successfully deleted unassigned tasks (unassigned string)!');
  } else {
    res.text().then(text => console.error('Error:', res.status, text));
  }
}).catch(console.error);

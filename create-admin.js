const URL = 'https://eiznewvggntckhggmjqz.supabase.co/auth/v1/signup';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpem5ld3ZnZ250Y2toZ2dtanF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNDQ3NzgsImV4cCI6MjEwNTgyMDc3OH0.Z-2puujxYEWNgfXSdLWlbyBf09gl6D1nZct82vzs-hI';

async function createAdmin() {
  const response = await fetch(URL, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'admin@gmail.com',
      password: 'adminpassword123',
      data: {
        full_name: 'Master Admin',
        role: 'admin'
      }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Error:', data);
  } else {
    console.log('Success! Admin created:', data.user.email);
  }
}

createAdmin();

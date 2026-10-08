const fs = require('fs');
const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const vapidPublicKey = 'BNnfzDUWPasOiywWfzdmVbiK_ty759QaN38x1g2kjblALVAWfpYAzjC-zwu_oiMCF8O204haJ7OdjG15NM1nKWA';
const vapidPrivateKey = 'pxooLKj6LPMaQlnGM9FsqlrAwVG51kYpmqESlKFqhXk';

webpush.setVapidDetails(
  'mailto:support@task-scheduler.com',
  vapidPublicKey,
  vapidPrivateKey
);

async function testPush(userId, title, body, url = '/') {
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        fetch: (url, options) => {
          return fetch(url, { ...options, cache: 'no-store' });
        }
      }
    }
  );

  console.log('Querying push_subscriptions for userId:', userId);
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  console.log('Query error:', error);
  console.log('Subscriptions found:', subscriptions);

  if (!subscriptions || subscriptions.length === 0) {
    console.log('No subscriptions found!');
    return;
  }

  const payload = JSON.stringify({ title, body, url });

  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      }
    };

    try {
      const res = await webpush.sendNotification(pushSubscription, payload);
      console.log('Notification sent successfully! Status code:', res.statusCode);
    } catch (sendErr) {
      console.error('Notification send failed:', sendErr.statusCode, sendErr.message);
      if (sendErr.statusCode === 410 || sendErr.statusCode === 404) {
        console.log('Deleting expired subscription...');
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
      }
    }
  }
}

testPush('ce52e250-d95d-4ec0-bb91-08151c718d36', 'New Task Assigned', 'You have been assigned to: test demo task', '/tasks');

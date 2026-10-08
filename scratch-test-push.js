const webpush = require('web-push');

const vapidPublicKey = 'BNnfzDUWPasOiywWfzdmVbiK_ty759QaN38x1g2kjblALVAWfpYAzjC-zwu_oiMCF8O204haJ7OdjG15NM1nKWA';
const vapidPrivateKey = 'pxooLKj6LPMaQlnGM9FsqlrAwVG51kYpmqESlKFqhXk';

webpush.setVapidDetails(
  'mailto:support@task-scheduler.com',
  vapidPublicKey,
  vapidPrivateKey
);

const gauravSub = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/clf99PilU2Q:APA91bHdMLRcg2YuBsimZIZfqS6DTnfCHo_TaRdEezpbCNjRXs9cLSzCsxFv0R1zKtVrhsw3WfvjrGF9hv5636MFqb5HXEAPw0D_C0QJ9LN4suSsxAL-ebyJJAXBlMvsZLeeHCJU2l2b',
  keys: {
    p256dh: 'BEeMTNbICOP5mupBuU4H2oCJ9MqmO2uMoY5m813J5WFi4vr9waxZ8ewE58L00Nlmi3BLDUWi565VwMXk7L7Ydyk',
    auth: '7ltCYNjnnOtBRy5tAwLhHQ'
  }
};

const payload = JSON.stringify({
  title: 'Test Notification',
  body: 'Testing direct push to Gaurav',
  url: '/tasks'
});

async function run() {
  try {
    console.log('Sending push notification to Gaurav...');
    const res = await webpush.sendNotification(gauravSub, payload);
    console.log('Success! Status:', res.statusCode, res.headers, res.body);
  } catch (err) {
    console.error('Error sending:', err.statusCode, err.message, err.body);
  }
}

run();

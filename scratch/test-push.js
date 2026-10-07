const webpush = require('web-push');

const vapidPublicKey = 'BNnfzDUWPasOiywWfzdmVbiK_ty759QaN38x1g2kjblALVAWfpYAzjC-zwu_oiMCF8O204haJ7OdjG15NM1nKWA';
const vapidPrivateKey = 'pxooLKj6LPMaQlnGM9FsqlrAwVG51kYpmqESlKFqhXk';

webpush.setVapidDetails(
  'mailto:support@task-scheduler.com',
  vapidPublicKey,
  vapidPrivateKey
);

const pushSubscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/fHgd1_pt3fQ:APA91bFdApmZ9pGrEmvCpa-7N9sYgHyWvjfdj6NmUAtl0ppBK1o05-APfr8b--kKykUxyGWFYIvYaea6h3JhUe_gnC0tXCXamevOIX1ueATAGLZTomSj88B_gcw6i_9dDX_jWgN3bFz-",
  keys: {
    p256dh: "BGxjFd-8enMFlbSiAuVRHGvTVstG6Y5APectODnXrtC8j9xbnhP3ajFMEIpiQhVMMqHKwkxeKGq_QoaApsr5Ccw",
    auth: "0Un2hbOG06S-40_rJoZSeQ"
  }
};

const payload = JSON.stringify({
  title: '🔥 Agent Magic!',
  body: 'Boom! Push Notifications are now working 100% perfectly!',
  url: '/'
});

webpush.sendNotification(pushSubscription, payload)
  .then(() => console.log('Push sent successfully!'))
  .catch(err => console.error('Error sending push:', err));

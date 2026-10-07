const webpush = require('web-push');

const vapidPublicKey = 'BMbundfQ5670HzG-j0i7eR0pQsik3cdbgx5AIijQFvAGRhWEZLh-nRzGKgKSZNqbSx8J38iE0lKfLSTQmbE091I';
const vapidPrivateKey = 'TI_nomTnUuBoy4zeazskJlPzKDdZPAZ-R167gaLJiVI';

webpush.setVapidDetails(
  'mailto:support@task-scheduler.com',
  vapidPublicKey,
  vapidPrivateKey
);

const pushSubscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/eHWfNZbsLOc:APA91bHRk6JXXInjVHTT7yx8mbxWvh82dHYkKqTuJYrlp1BNRLXdj2PHRnfpXbq_YFtBon8SbabKClP-2UhQZaX65iiBHEWjyTJVsubffw-unK5vq1EPU-exz9yVJAAOmuH9K801mkzS",
  keys: {
    p256dh: "BGOjV3j8HEPr3J3NDPhnjuRD3D6-4JTmxojkvunI1OyhYitij7I3AAzOt5Ru3sxVi6BM_Pippw6PC7kE0gCdLsU",
    auth: "IqVXEnJ0wbkWfOpgZRINgQ"
  }
};

const payload = JSON.stringify({
  title: 'Test Notification from Agent!',
  body: '🎉 Woohoo! Your push notifications are working perfectly now.',
  url: '/'
});

webpush.sendNotification(pushSubscription, payload)
  .then(() => console.log('Push sent successfully!'))
  .catch(err => console.error('Error sending push:', err));

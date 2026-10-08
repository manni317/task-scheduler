/// <reference lib="webworker" />

// @ts-ignore
const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'New Notification', body: 'You have a new update.' };

  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    image: data.image,
    actions: data.actions,
    vibrate: [200, 100, 200, 100, 200], // More aesthetic vibration pattern
    data: {
      url: data.url || '/',
    },
    requireInteraction: true, // Keep notification visible until user interacts for important updates like reject/approve
  };

  event.waitUntil(
    sw.registration.showNotification(data.title, options)
  );
});

sw.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Determine the URL to open (can be passed via data.url)
  const targetUrl = event.notification.data?.url || '/';

  // We want to open this URL, handling both absolute and relative paths
  const urlToOpen = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Find any window that belongs to our app
      const appClient = windowClients.find(client => client.url.startsWith(self.location.origin));
      
      if (appClient) {
        // Focus the existing window
        appClient.focus();
        // Navigate to the target URL if it's not already there
        if (appClient.url !== urlToOpen) {
          return appClient.navigate(urlToOpen);
        }
        return;
      }
      
      // If no app window is open, open a new one
      if (sw.clients.openWindow) {
        return sw.clients.openWindow(urlToOpen);
      }
    })
  );
});

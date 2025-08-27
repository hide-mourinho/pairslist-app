// Give the service worker access to Firebase Messaging.
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "your-api-key", // Will be replaced by build process
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const { notification, data } = payload;
  
  const notificationTitle = notification?.title || 'PairsList';
  const notificationOptions = {
    body: notification?.body || 'New update',
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    tag: data?.listId || 'pairslist',
    data: {
      listId: data?.listId,
      url: data?.url || '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Open',
        icon: '/pwa-64x64.png'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);

  event.notification.close();

  const data = event.notification.data;
  const url = data?.listId ? `/lists/${data.listId}` : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Check if there is already a client open
      for (let client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
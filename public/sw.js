const CACHE_NAME = 'cnol-app-v1.0.1';
const urlsToCache = [
  '/',
  '/mon-espace',
  '/inscription',
  '/cnol-dor',
  '/reservation-ateliers',
  '/reservation-masterclass',
  '/static/css/',
  '/static/js/',
  '/images/cnol-logo-blanc.png',
  '/images/cnol-logo-rouge.png',
  '/logo-cnol.png',
  '/cnol2025-poster.jpg',
  '/success.mp3',
  '/error.mp3',
  '/warning.mp3'
];

// Installation du service worker et mise en cache
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
      .catch(function(error) {
        console.log('Erreur lors de la mise en cache:', error);
      })
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Suppression de l\'ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Stratégie de cache : Network First, puis Cache
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Si la réponse est valide, on la met en cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(function() {
        // Si pas de réseau, on utilise le cache
        return caches.match(event.request)
          .then(function(response) {
            if (response) {
              return response;
            }
            // Page d'erreur hors ligne
            if (event.request.destination === 'document') {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// Notifications push
self.addEventListener('push', function(event) {
  console.log('SW: push event reçu', event);
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Notification CNOL';
  const options = {
    body: data.body || '',
    icon: '/logo-cnol.png',
    badge: '/logo-cnol.png',
    data: data.url || '/',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Ouvrir',
        icon: '/logo-cnol.png'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/logo-cnol.png'
      }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const url = event.notification.data || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      // Si une fenêtre est déjà ouverte, on la focus
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Sinon on ouvre une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Gestion des messages du client
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 
const CACHE_NAME = 'travellog-v1.4.0';
const API_CACHE_NAME = 'travellog-api-v1';
const urlsToCache = [
  './',
  './index.html',
  './app.bundle.js',
  './sw.js',
  './styles/styles.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './favicon.png'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('All resources cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Cache installation failed:', error);
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.pathname.startsWith('/v1/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(API_CACHE_NAME)
              .then(cache => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              return new Response(JSON.stringify({ 
                error: true, 
                message: 'You are offline',
                data: [] 
              }), {
                headers: { 'Content-Type': 'application/json' }
              });
            });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            if (request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            
            if (request.destination === 'image') {
              return caches.match('./icons/icon-192x192.png');
            }
            
            return new Response('Network error happened', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' },
            });
          });
      })
  );
});

self.addEventListener('push', (event) => {
  console.log('Push event received:', event);

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (error) {
      console.error('Error parsing push data:', error);
      data = {
        title: 'TravelLog',
        body: event.data.text()
      };
    }
  } else {
    data = {
      title: 'TravelLog',
      body: 'New story has been shared!'
    };
  }

  const options = {
    body: data.body || 'Check out the latest travel stories!',
    icon: '/favicon.png',
    badge: '/favicon.png',
    image: data.image,
    data: data.data || { url: '/' },
    actions: [
      {
        action: 'view',
        title: 'View Story'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    tag: 'travellog-notification',
    renotify: true,
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'TravelLog', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);
  
  event.notification.close();

  if (event.action === 'view') {
    const urlToOpen = event.notification.data.url || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((windowClients) => {
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event);
  
  if (event.tag === 'sync-stories') {
    event.waitUntil(syncStories());
  }
});

async function syncStories() {
  try {
    const db = await openIDB();
    const stories = await getAllStoriesFromIDB(db);
    
    for (const story of stories) {
      if (story.offline) {
        await submitStoryToAPI(story);
        await deleteStoryFromIDB(db, story.id);
      }
    }
    
    console.log('Background sync completed');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

function openIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TravelLogDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('stories')) {
        db.createObjectStore('stories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('offlineStories')) {
        db.createObjectStore('offlineStories', { keyPath: 'id' });
      }
    };
  });
}

function getAllStoriesFromIDB(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offlineStories'], 'readonly');
    const store = transaction.objectStore('offlineStories');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deleteStoryFromIDB(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offlineStories'], 'readwrite');
    const store = transaction.objectStore('offlineStories');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
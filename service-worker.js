const CACHE = 'producao-v1';
const FILES = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// Show a notification with a text-reply action (asks directly for the meter value)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_LOG_REMINDER') {
    self.registration.showNotification('Registo de produção', {
      body: 'Qual o valor total de metros até agora?',
      tag: 'hourly-log',
      renotify: true,
      requireInteraction: true,
      icon: 'icon-192.png',
      actions: [
        { action: 'log', type: 'text', title: 'Registar valor', placeholder: 'metros' }
      ],
      data: { time: Date.now() }
    });
  }
});

// Handle the reply typed directly in the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'log' && event.reply) {
    const value = event.reply.trim();
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        if (clients.length > 0) {
          clients[0].postMessage({ type: 'NOTIFICATION_LOG', value });
          clients[0].focus();
        } else {
          // No page open: stash it so the page can pick it up when it opens
          return self.registration.showNotification('Valor guardado', {
            body: `Registado ${value} m — abra a app para confirmar.`,
            tag: 'pending-log',
            icon: 'icon-192.png',
            data: { pendingValue: value }
          });
        }
      })
    );
  } else {
    // Plain tap: just open/focus the app
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        if (clients.length > 0) return clients[0].focus();
        return self.clients.openWindow('./index.html');
      })
    );
  }
});

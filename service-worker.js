const CACHE = 'producao-v21';
const FILES = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

let currentLang = 'pt';

const NOTIF_TEXT = {
  pt: { title: 'Registo de produção', body: 'Qual o valor total de metros até agora?', action: 'Registar valor', ph: 'metros', savedTitle: 'Valor guardado', savedBody: (v) => `Registado ${v} m — abra a app para confirmar.` },
  de: { title: 'Produktionserfassung', body: 'Wie viele Meter insgesamt bisher?', action: 'Wert erfassen', ph: 'Meter', savedTitle: 'Wert gespeichert', savedBody: (v) => `${v} m erfasst — App öffnen zum Bestätigen.` }
};

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_LANG') {
    currentLang = event.data.lang === 'de' ? 'de' : 'pt';
  }
  if (event.data && event.data.type === 'SHOW_LOG_REMINDER') {
    const t = NOTIF_TEXT[currentLang];
    self.registration.showNotification(t.title, {
      body: t.body,
      tag: 'hourly-log',
      renotify: true,
      requireInteraction: true,
      icon: 'icon-192.png',
      actions: [
        { action: 'log', type: 'text', title: t.action, placeholder: t.ph }
      ],
      data: { time: Date.now() }
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const t = NOTIF_TEXT[currentLang];

  if (event.action === 'log' && event.reply) {
    const value = event.reply.trim();
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        if (clients.length > 0) {
          clients[0].postMessage({ type: 'NOTIFICATION_LOG', value });
          clients[0].focus();
        } else {
          return self.registration.showNotification(t.savedTitle, {
            body: t.savedBody(value),
            tag: 'pending-log',
            icon: 'icon-192.png',
            data: { pendingValue: value }
          });
        }
      })
    );
  } else {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        if (clients.length > 0) return clients[0].focus();
        return self.clients.openWindow('./index.html');
      })
    );
  }
});

// Manter sincronizado com APP_VERSION em constants.js
const CACHE = 'producao-v1.2';
const FILES = [
  './index.html', './manifest.json', './icon-192.png', './icon-512.png', './badge-monochrome.png',
  './constants.js', './data.js', './entries.js', './render-main.js',
  './reminders.js', './render-drawer.js', './app.js'
];

let currentLang = 'pt';

const NOTIF_TEXT = {
  pt: {
    title: 'Registo de produção', body: 'Qual o valor total de metros até agora?',
    action: 'Registar valor', ph: 'metros',
    savedTitle: 'Valor guardado', savedBody: (v) => `Registado ${v} m — abra a app para confirmar.`,
    statusTitle: (turno) => `Turno ${turno}`,
    statusBody: (total, rate, prediction, time) => `Total hoje: ${total} m\nMédia: ${rate} m/h\nPrevisão: ${prediction} m\nAtualizado às ${time}`
  },
  de: {
    title: 'Produktionserfassung', body: 'Wie viele Meter insgesamt bisher?',
    action: 'Wert erfassen', ph: 'Meter',
    savedTitle: 'Wert gespeichert', savedBody: (v) => `${v} m erfasst — App öffnen zum Bestätigen.`,
    statusTitle: (turno) => `Schicht ${turno}`,
    statusBody: (total, rate, prediction, time) => `Gesamt heute: ${total} m\nØ: ${rate} m/h\nPrognose: ${prediction} m\nAktualisiert um ${time}`
  }
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

  if (event.data && event.data.type === 'UPDATE_STATUS_NOTIF') {
    const t = NOTIF_TEXT[currentLang];
    const p = event.data.payload;
    const timeStr = new Date(p.updatedAt).toLocaleTimeString(currentLang === 'de' ? 'de-DE' : 'pt-PT', { hour: '2-digit', minute: '2-digit' });
    self.registration.showNotification(t.statusTitle(p.turnoLabel), {
      body: t.statusBody(p.total, p.rate, p.prediction, timeStr),
      tag: 'shift-status',
      renotify: false,
      requireInteraction: true,
      icon: 'icon-192.png',
      badge: 'badge-monochrome.png',
      actions: [
        { action: 'log', type: 'text', title: t.action, placeholder: t.ph }
      ],
      data: { time: p.updatedAt, status: true }
    });
  }

  if (event.data && event.data.type === 'CLOSE_STATUS_NOTIF') {
    self.registration.getNotifications({ tag: 'shift-status' }).then((list) => list.forEach((n) => n.close()));
  }
});

self.addEventListener('notificationclick', (event) => {
  const t = NOTIF_TEXT[currentLang];
  const isStatus = event.notification.tag === 'shift-status';

  if (event.action === 'log' && event.reply) {
    const value = event.reply.trim();
    // A notificação fixa não se fecha ao registar por ela — só é substituída
    // pela versão atualizada assim que a app processar o valor.
    if (!isStatus) event.notification.close();
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        if (clients.length > 0) {
          clients[0].postMessage({ type: 'NOTIFICATION_LOG', value });
          if (!isStatus) clients[0].focus();
        } else {
          return self.registration.showNotification(t.savedTitle, {
            body: t.savedBody(value),
            tag: 'pending-log',
            icon: 'icon-192.png',
            badge: 'badge-monochrome.png',
            data: { pendingValue: value }
          });
        }
      })
    );
  } else {
    event.notification.close();
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        if (clients.length > 0) return clients[0].focus();
        return self.clients.openWindow('./index.html');
      })
    );
  }
});

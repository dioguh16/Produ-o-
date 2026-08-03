document.getElementById('btnMenu').onclick = openDrawer;
document.getElementById('btnCloseDrawer').onclick = closeDrawer;
document.getElementById('overlay').onclick = closeDrawer;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js', { updateViaCache: 'none' }).then(reg => {
    swReg = reg;
    if (reg.active) reg.active.postMessage({ type: 'SET_LANG', lang: lang() });
    updateStatusNotification();
    reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (newWorker) newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated') window.location.reload();
      });
    });
  }).catch(() => {});

  navigator.serviceWorker.ready.then(() => updateStatusNotification());

  let refreshedOnce = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshedOnce) return;
    refreshedOnce = true;
    window.location.reload();
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'NOTIFICATION_LOG') {
      const val = parseInt(event.data.value, 10);
      if (!isNaN(val) && val >= 0 && state) addLog(val);
    }
  });
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { catchUpReminders(); renderMain(); }
});

renderAll();
if (state) scheduleNextReminder(false);

// Atalho da app "Registar produção" (ver manifest.json > shortcuts) —
// abre a app já com o campo do valor pronto e o teclado ativo.
(function handleQuickLogShortcut() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('action') !== 'newlog') return;
  history.replaceState(null, '', window.location.pathname);
  let attempts = 0;
  const tryFocus = () => {
    const el = document.getElementById('newValue') || document.getElementById('firstValue');
    if (el) {
      el.focus();
      el.select();
      el.scrollIntoView({ block: 'center' });
    } else if (attempts++ < 20) {
      setTimeout(tryFocus, 100);
    }
  };
  setTimeout(tryFocus, 400);
})();
setInterval(() => {
  const active = document.activeElement;
  const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
  if (!isTyping) renderMain();
}, 30000);

(function handleSplash() {
  const splash = document.getElementById('splashScreen');
  if (!splash) return;
  if (!splashEnabled()) { splash.remove(); return; }
  setTimeout(() => {
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 450);
  }, 1300);
})();

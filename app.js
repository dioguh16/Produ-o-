document.getElementById('btnMenu').onclick = openDrawer;
document.getElementById('btnCloseDrawer').onclick = closeDrawer;
document.getElementById('overlay').onclick = closeDrawer;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').then(reg => {
    swReg = reg;
    if (reg.active) reg.active.postMessage({ type: 'SET_LANG', lang: lang() });
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (newWorker) newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated') window.location.reload();
      });
    });
  }).catch(() => {});

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
setInterval(() => {
  const active = document.activeElement;
  const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
  if (!isTyping) renderMain();
}, 30000);

setTimeout(() => {
  const splash = document.getElementById('splashScreen');
  if (splash) {
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 450);
  }
}, 1300);

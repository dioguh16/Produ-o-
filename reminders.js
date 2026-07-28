function scheduleNextReminder(justLogged) {
  if (!state) return;
  const now = Date.now();
  const shiftEnd = state.shiftStart + (state.shiftLengthH || SHIFT_LENGTH_H) * 3600000;
  if (justLogged) { state.nextReminder = now + 3600000; saveState(state); }
  if (reminderTimeout) clearTimeout(reminderTimeout);
  if (state.nextReminder >= shiftEnd) return;
  const delay = Math.max(state.nextReminder - now, 1000);
  reminderTimeout = setTimeout(fireReminder, delay);
}

function fireReminder() {
  if (!state) return;
  updateStatusNotification();
  state.nextReminder = Date.now() + 3600000;
  saveState(state);
  scheduleNextReminder(false);
}

function catchUpReminders() {
  if (!state) return;
  const shiftEnd = state.shiftStart + (state.shiftLengthH || SHIFT_LENGTH_H) * 3600000;
  const now = Date.now();
  if (state.nextReminder && state.nextReminder <= now && now < shiftEnd) fireReminder();
  else scheduleNextReminder(false);
}

// ---------- NOTIFICAÇÃO FIXA DE TURNO ----------
// Aparece com o 1º registo do dia, atualiza-se a cada novo registo (e a cada hora
// enquanto a app estiver aberta/recente em segundo plano) e fecha-se ao terminar o turno.
function updateStatusNotification() {
  if (!swReg || !swReg.active) return;

  if (!state || state.closed) {
    swReg.active.postMessage({ type: 'CLOSE_STATUS_NOTIF' });
    return;
  }
  if (!notifPrefEnabled() || (('Notification' in window) && Notification.permission !== 'granted')) {
    swReg.active.postMessage({ type: 'CLOSE_STATUS_NOTIF' });
    return;
  }

  const stats = computeLiveStats(state);
  swReg.active.postMessage({
    type: 'UPDATE_STATUS_NOTIF',
    payload: {
      turnoLabel: state.turnoLabel,
      total: stats.totalMetros,
      rate: Math.round(stats.rate * 10) / 10,
      prediction: stats.prediction,
      updatedAt: Date.now()
    }
  });
}

function requestNotifPermissionIfNeeded() {
  const banner = document.getElementById('permBanner');
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    banner.style.display = 'block';
    banner.innerHTML = `${t('enableNotifBanner')}<button class="btn-primary" id="btnEnableNotif">${t('enableNotif')}</button>`;
    document.getElementById('btnEnableNotif').onclick = async () => {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') { banner.style.display = 'none'; showToast(t('notifEnabled')); updateStatusNotification(); }
    };
  } else {
    banner.style.display = 'none';
  }
}

// ---------- DRAWER / MENU ----------
// ---------- TIME PICKER MODAL (native input[type=time]) ----------
let timeModalCallback = null;
